import { put } from '@vercel/blob';
import { createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  computeSha256,
  getActiveVirusScanner,
  validateUpload,
  type ValidateUploadResult,
  type VirusScanStatus,
} from '@/lib/document-security';

function sanitizeFilename(filename: string) {
  const parts = filename.split('.');
  const extension = parts.length > 1 ? parts.pop() : '';
  const basename = parts.join('.') || 'file';
  const safeBase = basename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file';
  const safeExt = extension?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export interface StoredMockUpload {
  filename: string;
  url: string;
  /**
   * Short-lived URL the client should use to fetch the file. For
   * private Vercel-Blob writes this is the proxied `/api/documents/...
   * /download?token=...` URL; for local-FS dev writes it equals `url`.
   */
  signedUrl: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  virusScanStatus: VirusScanStatus;
  virusScanCheckedAt: string;
}

export interface PersistMockUploadRejection {
  ok: false;
  reason: 'too_large' | 'mime_not_allowed' | 'empty' | 'infected';
  details: string;
}

export type PersistMockUploadResult =
  | ({ ok: true } & StoredMockUpload)
  | PersistMockUploadRejection;

function buildStoredPath(segments: string[], finalFilename: string) {
  return path.join(...segments, finalFilename).replace(/\\/g, '/');
}

function shouldUseBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isHostedRuntime() {
  return process.env.VERCEL === '1';
}

/**
 * Default signed-URL TTL for blob fetches. Used by both the writer
 * (returning an initial signedUrl) and the on-demand `/download`
 * route. Aligned with the 5-minute window mandated by PR-06.
 */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

function getSigningSecret(): string {
  return (
    process.env.DOCUMENT_DOWNLOAD_SIGNING_SECRET?.trim() ||
    process.env.PROJECT_DEMO_STATE_FILE ||
    'demo-document-signing-secret-pr06'
  );
}

/**
 * Generate a short-lived HMAC-signed URL pointing at the in-app
 * download route. The blob itself is `access: 'private'`, so this URL
 * grants temporary read access through our authn/authz guard.
 *
 * The `blobKey` is the Vercel-Blob pathname (the same value returned
 * by `put()` as `relativePath`). It is encoded into the URL so the
 * download route can resolve back to the underlying blob.
 */
export function getSignedDocumentUrl(
  blobKey: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = signSignedUrlPayload(blobKey, expiresAt);
  const params = new URLSearchParams({
    key: blobKey,
    expires: String(expiresAt),
    sig: signature,
  });
  return `/api/documents/_blob/signed?${params.toString()}`;
}

/**
 * Re-sign a previously persisted signed URL so the caller gets a fresh
 * 5-minute window. Signed URLs in this prototype have a finite TTL (300s
 * by default) — persisting them as the canonical asset URL on document
 * files / daily-report photos will work for a single render but expire
 * before any later detail view. The fix is to keep the persisted URL
 * (which encodes the blob `key` as a query param), then re-sign it at
 * response time. Pass-through behaviour for legacy `/mock-uploads/...`
 * paths (local-FS uploads), Vercel-direct URLs, or anything that doesn't
 * match the proxied shape.
 */
export function refreshSignedUrl(maybePersistedUrl: string): string {
  if (!maybePersistedUrl || !maybePersistedUrl.includes('/api/documents/_blob/signed')) {
    return maybePersistedUrl;
  }
  try {
    // Parsing with a synthetic origin is fine — only the searchParams matter.
    const parsed = new URL(maybePersistedUrl, 'http://localhost');
    const key = parsed.searchParams.get('key');
    if (!key) return maybePersistedUrl;
    return getSignedDocumentUrl(key);
  } catch {
    return maybePersistedUrl;
  }
}

export function signSignedUrlPayload(blobKey: string, expiresAt: number): string {
  const secret = getSigningSecret();
  return createHmac('sha256', secret).update(`${blobKey}:${expiresAt}`).digest('hex');
}

export function verifySignedUrlPayload(
  blobKey: string,
  expiresAt: number,
  signature: string,
): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (expiresAt < nowSeconds) return false;
  const expected = signSignedUrlPayload(blobKey, expiresAt);
  if (expected.length !== signature.length) return false;
  // Constant-time-ish compare. Both strings are equal-length hex so
  // a naive scan is acceptable for the demo.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

async function persistBlobUpload(
  file: File,
  relativePath: string,
  mimeType: string,
  sha256: string,
  virusScanStatus: VirusScanStatus,
  virusScanCheckedAt: string,
): Promise<StoredMockUpload> {
  const blob = await put(relativePath, file, {
    access: 'private',
    addRandomSuffix: false,
    contentType: mimeType,
  });

  return {
    filename: file.name,
    url: blob.url,
    signedUrl: getSignedDocumentUrl(relativePath),
    mimeType: mimeType || blob.contentType || 'application/octet-stream',
    sizeBytes: file.size,
    sha256,
    virusScanStatus,
    virusScanCheckedAt,
  };
}

async function persistFilesystemUpload(
  file: File,
  relativePath: string,
  mimeType: string,
  sha256: string,
  virusScanStatus: VirusScanStatus,
  virusScanCheckedAt: string,
): Promise<StoredMockUpload> {
  const absolutePath = path.join(process.cwd(), 'public', 'mock-uploads', relativePath);
  const arrayBuffer = await file.arrayBuffer();

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(arrayBuffer));

  const url = `/mock-uploads/${relativePath}`;
  return {
    filename: file.name,
    url,
    // Local FS uploads are not private — the path is publicly served by
    // Next.js out of `public/`. Returning `url` as the signedUrl keeps
    // the response shape uniform.
    signedUrl: url,
    mimeType: mimeType || 'application/octet-stream',
    sizeBytes: file.size,
    sha256,
    virusScanStatus,
    virusScanCheckedAt,
  };
}

export async function persistMockUpload(
  file: File,
  segments: string[],
): Promise<PersistMockUploadResult> {
  const declaredMimeType = file.type || 'application/octet-stream';

  // 1. Validate before touching storage.
  const validation: ValidateUploadResult = validateUpload(file, declaredMimeType);
  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reason,
      details: validation.details,
    };
  }

  // 2. Hash the bytes once. computeSha256 reads the body — we then
  //    pass the SAME file object onward; `arrayBuffer()` is idempotent
  //    in Node.
  const sha256 = await computeSha256(file);

  // 3. Run the virus scan. Stub returns clean by default; a real
  //    adapter could reject infected files.
  const scanner = getActiveVirusScanner();
  const scan = await scanner.scan(file, declaredMimeType);
  if (!scan.clean) {
    return {
      ok: false,
      reason: 'infected',
      details: `Virus scan rejected file: ${scan.reason ?? 'no reason given'} (engine=${scan.engine})`,
    };
  }

  // 4. Persist.
  const safeFilename = sanitizeFilename(file.name);
  const timestamp = Date.now();
  const finalFilename = `${timestamp}-${safeFilename}`;
  const relativePath = buildStoredPath(segments, finalFilename);

  let stored: StoredMockUpload;
  if (shouldUseBlobStorage()) {
    stored = await persistBlobUpload(
      file,
      relativePath,
      declaredMimeType,
      sha256,
      'clean',
      scan.scannedAt,
    );
  } else if (isHostedRuntime()) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required for uploads in hosted environments',
    );
  } else {
    stored = await persistFilesystemUpload(
      file,
      relativePath,
      declaredMimeType,
      sha256,
      'clean',
      scan.scannedAt,
    );
  }

  return { ok: true, ...stored };
}
