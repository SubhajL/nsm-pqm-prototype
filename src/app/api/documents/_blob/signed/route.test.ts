import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signSignedUrlPayload } from '@/lib/mock-upload-storage';

// ---------------------------------------------------------------------------
// Phase 0 — Demo-blocker: the `/_blob/signed` route resolves an HMAC-signed
// query into a 302 redirect to the underlying Vercel Blob URL, after verifying
// the caller's session has access to the owning project. Without this route,
// any private-blob download in the prototype 404s after the existing
// `/api/documents/[projectId]/[fileId]/download` 302.
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'pqm_user_id' ? { value: 'user-001' } : undefined,
  }),
}));

// `@vercel/blob`'s `get()` hits a real network endpoint; stub it for tests
// so the route's stream-from-blob behaviour is observable without env wiring.
// Class declarations live INSIDE the factory because `vi.mock` is hoisted
// above the file's top-level statements.
vi.mock('@vercel/blob', () => {
  class FakeBlobNotFoundError extends Error {
    constructor() {
      super('Blob not found');
      this.name = 'BlobNotFoundError';
    }
  }
  return {
    get: vi.fn(async (key: string) => ({
      statusCode: 200,
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`bytes-for-${key}`));
          controller.close();
        },
      }),
      headers: new Headers(),
      blob: {
        url: `https://blob.vercel-storage.com/${key}?token=stub`,
        downloadUrl: `https://blob.vercel-storage.com/${key}?token=stub&download=1`,
        pathname: key,
        contentDisposition: 'inline',
        cacheControl: 'public, max-age=0, must-revalidate',
        uploadedAt: new Date(),
        etag: 'stub-etag',
        contentType: 'application/octet-stream',
        size: 1024,
      },
    })),
    BlobNotFoundError: FakeBlobNotFoundError,
  };
});

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buildSignedUrl(key: string, expiresInSeconds = 300): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const sig = signSignedUrlPayload(key, expires);
  const params = new URLSearchParams({ key, expires: String(expires), sig });
  return `http://localhost/api/documents/_blob/signed?${params.toString()}`;
}

async function callRoute(url: string): Promise<Response> {
  const { GET } = await import('./route');
  return GET(new Request(url));
}

describe('GET /api/documents/_blob/signed (Phase 0)', () => {
  it('returns 400 when required query params are missing', async () => {
    const response = await callRoute(
      'http://localhost/api/documents/_blob/signed?key=documents/proj-001/file-1',
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('INVALID_SIGNATURE');
  });

  it('returns 401 when the signature is invalid', async () => {
    const tampered = buildSignedUrl('documents/proj-001/file-1').replace(
      /sig=[^&]+/,
      'sig=deadbeef',
    );
    const response = await callRoute(tampered);
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('SIGNATURE_INVALID');
  });

  it('returns 401 when the signature is expired', async () => {
    const key = 'documents/proj-001/file-1';
    const expires = Math.floor(Date.now() / 1000) - 60; // 1 min in the past
    const sig = signSignedUrlPayload(key, expires);
    const url = `http://localhost/api/documents/_blob/signed?key=${key}&expires=${expires}&sig=${sig}`;
    const response = await callRoute(url);
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('SIGNATURE_INVALID');
  });

  it('streams the blob bytes on a valid documents request, with no-store cache headers', async () => {
    const url = buildSignedUrl('documents/proj-001/file-1');
    const response = await callRoute(url);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    // Cache headers MUST be locked down so the response can't outlive the
    // 5-minute HMAC window in a browser or shared cache.
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
    const body = await response.text();
    expect(body).toBe('bytes-for-documents/proj-001/file-1');
  });

  it('streams the blob bytes on a valid daily-reports key', async () => {
    const key = 'daily-reports/proj-001/dr-1/photos/123-foo.jpg';
    const url = buildSignedUrl(key);
    const response = await callRoute(url);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe(`bytes-for-${key}`);
  });

  it('returns 400 for keys without a recognised resource-type prefix', async () => {
    const url = buildSignedUrl('rogue/proj-001/file-1');
    const response = await callRoute(url);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('UNSUPPORTED_RESOURCE');
  });

  it('returns 400 for keys missing the project-id segment', async () => {
    const url = buildSignedUrl('documents');
    const response = await callRoute(url);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('INVALID_KEY');
  });

  it('returns 403 when the caller cannot see the owning project', async () => {
    // user-001 (System Admin) sees every real project; targeting a non-existent
    // project triggers the `requireProjectAccess` → 403 path.
    const url = buildSignedUrl('documents/proj-non-existent/file-1');
    const response = await callRoute(url);
    expect(response.status).toBe(403);
  });

  it('returns 404 when the blob is missing', async () => {
    const blobModule = await import('@vercel/blob');
    const getMock = blobModule.get as unknown as ReturnType<typeof vi.fn>;
    const NotFound = blobModule.BlobNotFoundError as new () => Error;
    getMock.mockRejectedValueOnce(new NotFound());

    const url = buildSignedUrl('documents/proj-001/file-missing');
    const response = await callRoute(url);
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('BLOB_NOT_FOUND');
  });

  it('returns 500 when the blob fetch fails for an unrecognised reason', async () => {
    const blobModule = await import('@vercel/blob');
    const getMock = blobModule.get as unknown as ReturnType<typeof vi.fn>;
    getMock.mockRejectedValueOnce(new Error('upstream broke'));

    const url = buildSignedUrl('documents/proj-001/file-1');
    const response = await callRoute(url);
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('BLOB_FETCH_FAILED');
  });
});
