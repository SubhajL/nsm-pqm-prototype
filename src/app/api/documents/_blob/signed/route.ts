export const dynamic = 'force-dynamic';

import { BlobNotFoundError, get } from '@vercel/blob';

import { verifySignedUrlPayload } from '@/lib/mock-upload-storage';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';

/**
 * Phase 0 — Signed-URL resolver for private blob downloads.
 *
 * `mock-upload-storage.ts::getSignedDocumentUrl()` produces URLs that point
 * at this route, embedding `(key, expires, sig)` query params. Every signed
 * URL surface (document download redirect, daily-report photo `<img src>`,
 * attachment links) flows through here. Without this handler the original
 * private-blob URLs 404 in a browser because Vercel's private-blob URLs
 * require server-side auth that browsers don't carry.
 *
 * Access decisions (in order):
 *   1. HMAC + expiry verify  → rejects forged or stale URLs.
 *   2. Cookie session lookup → rejects unauthenticated callers (defence in
 *      depth — a leaked URL alone isn't enough).
 *   3. Project access check  → rejects callers without visibility into the
 *      blob's owning project. The project id is parsed from the key's
 *      second segment (after the resource-type prefix).
 *   4. Action gate           → documents require `view_document`; daily-
 *      report assets ride on project visibility (no separate action).
 *
 * On success the route **streams** the blob bytes back. We previously
 * 302'd to `blob.url`, but Vercel's private-blob URLs need a server-side
 * token in the request, so a browser following a redirect to one of those
 * URLs cannot fetch it. `get(key, { access: 'private' })` performs the
 * authenticated fetch on the server and returns a ReadableStream the
 * route hands back unchanged.
 *
 * Cache headers are forced to `private, no-store` so the response never
 * outlives the 5-minute HMAC window in a browser / shared cache. `Vary:
 * Cookie` ensures a per-session cache key when downstream proxies do
 * cache.
 *
 * Audit trail: the upstream `/api/documents/[projectId]/[fileId]/download`
 * route already emits a `view_document` audit before redirecting here.
 * Re-emitting in this handler would double-count, so this route stays
 * quiet — direct `<img src>` fetches of signed URLs are audited at the
 * page-view level instead.
 */

const SUPPORTED_RESOURCE_TYPES = new Set(['documents', 'daily-reports']);

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { status: 'error', error: { code, message } },
    { status },
  );
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const expiresRaw = url.searchParams.get('expires');
  const sig = url.searchParams.get('sig');

  if (!key || !expiresRaw || !sig) {
    return jsonError(
      400,
      'INVALID_SIGNATURE',
      'key, expires, and sig query parameters are all required',
    );
  }

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires)) {
    return jsonError(
      400,
      'INVALID_SIGNATURE',
      'expires must be a unix-seconds integer',
    );
  }

  if (!verifySignedUrlPayload(key, expires, sig)) {
    return jsonError(
      401,
      'SIGNATURE_INVALID',
      'Signed-URL signature is invalid or has expired',
    );
  }

  const segments = key.split('/').filter((s) => s.length > 0);
  if (segments.length < 2) {
    return jsonError(
      400,
      'INVALID_KEY',
      'Blob key must include a resource type and a project id',
    );
  }

  const [resourceType, projectId] = segments;
  if (!SUPPORTED_RESOURCE_TYPES.has(resourceType)) {
    return jsonError(
      400,
      'UNSUPPORTED_RESOURCE',
      `Resource type "${resourceType}" is not signable`,
    );
  }

  const accessGuard = await requireProjectAccess(projectId);
  if (accessGuard) return accessGuard;

  if (resourceType === 'documents') {
    const currentUser = await getCurrentApiUser();
    if (!(await canPerformProjectAction(currentUser, projectId, 'view_document'))) {
      return forbiddenResponse('view_document');
    }
    // Audit emission lives upstream in `/api/documents/[projectId]/[fileId]/download`
    // so the same view doesn't get logged twice.
  }

  let blob;
  try {
    blob = await get(key, { access: 'private' });
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      return jsonError(404, 'BLOB_NOT_FOUND', `Blob "${key}" not found`);
    }
    // `@vercel/blob` collapses other failure modes (rate-limit / service
    // unavailable / network) into a generic `BlobError`. Surface them as
    // 500 — the demo doesn't need finer-grained retry signals.
    return jsonError(
      500,
      'BLOB_FETCH_FAILED',
      err instanceof Error ? err.message : 'Failed to fetch blob bytes',
    );
  }

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return jsonError(404, 'BLOB_NOT_FOUND', `Blob "${key}" has no content`);
  }

  // Stream bytes through untouched. Cache-Control is forced to no-store
  // so a browser can't reuse the response after the HMAC `expires`
  // window lapses; `Vary: Cookie` makes the cache key per-session for
  // any proxy that does cache despite that.
  return new Response(blob.stream, {
    status: 200,
    headers: {
      'Content-Type': blob.blob.contentType,
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
      'Content-Length': String(blob.blob.size),
    },
  });
}
