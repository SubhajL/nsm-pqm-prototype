import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlobError } from '@vercel/blob';

import {
  __resetBlobStoreAccessCacheForTesting,
  getSignedDocumentUrl,
  isPublicStorePrivateAccessError,
  putBlobStoreAware,
  refreshSignedUrl,
  signSignedUrlPayload,
  verifySignedUrlPayload,
} from './mock-upload-storage';

// Mock only `put`; keep the real BlobError class so `instanceof` works.
vi.mock('@vercel/blob', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vercel/blob')>();
  return { ...actual, put: vi.fn() };
});

// Imported after the mock so this is the mocked fn.
import { put } from '@vercel/blob';
const putMock = vi.mocked(put);

function publicStoreError() {
  // Mirrors the real service message; BlobError prefixes "Vercel Blob: ".
  return new BlobError(
    'Cannot use private access on a public store. The store must be configured with private access.',
  );
}

describe('signSignedUrlPayload / verifySignedUrlPayload', () => {
  it('round-trips a fresh signature within the window', () => {
    const key = 'documents/proj-001/file-1';
    const expires = Math.floor(Date.now() / 1000) + 60;
    const sig = signSignedUrlPayload(key, expires);
    expect(verifySignedUrlPayload(key, expires, sig)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const key = 'documents/proj-001/file-1';
    const expires = Math.floor(Date.now() / 1000) + 60;
    const sig = signSignedUrlPayload(key, expires);
    expect(verifySignedUrlPayload(key, expires, sig.replace(/.$/, '0'))).toBe(false);
  });

  it('rejects an expired signature even if otherwise valid', () => {
    const key = 'documents/proj-001/file-1';
    const expires = Math.floor(Date.now() / 1000) - 60;
    const sig = signSignedUrlPayload(key, expires);
    expect(verifySignedUrlPayload(key, expires, sig)).toBe(false);
  });
});

describe('refreshSignedUrl', () => {
  it('produces a fresh URL with an extended expiry when given a signed URL', () => {
    const originalExpires = Math.floor(Date.now() / 1000) - 1; // already-expired
    const originalSig = signSignedUrlPayload('documents/proj-001/file-1', originalExpires);
    const stale =
      `/api/documents/blob/signed?key=documents%2Fproj-001%2Ffile-1&expires=${originalExpires}&sig=${originalSig}`;

    const refreshed = refreshSignedUrl(stale);
    expect(refreshed).toMatch(/^\/api\/documents\/blob\/signed\?/);

    const params = new URL(refreshed, 'http://localhost').searchParams;
    const newExpires = Number(params.get('expires'));
    expect(newExpires).toBeGreaterThan(originalExpires);
    expect(newExpires).toBeGreaterThan(Math.floor(Date.now() / 1000));
    // Fresh URL must verify successfully end-to-end.
    expect(
      verifySignedUrlPayload(
        params.get('key') ?? '',
        newExpires,
        params.get('sig') ?? '',
      ),
    ).toBe(true);
  });

  it('passes through legacy local-FS paths unchanged', () => {
    const localPath = '/mock-uploads/daily-reports/proj-001/dr-1/photos/123-foo.jpg';
    expect(refreshSignedUrl(localPath)).toBe(localPath);
  });

  it('passes through raw Vercel blob URLs unchanged (pre-fix legacy persistence)', () => {
    const rawBlob =
      'https://blob.vercel-storage.com/documents/proj-001/file-1?token=stub';
    expect(refreshSignedUrl(rawBlob)).toBe(rawBlob);
  });

  it('passes through empty / nullish input', () => {
    expect(refreshSignedUrl('')).toBe('');
  });

  it('passes through a signed-shaped URL that is missing the key param', () => {
    const malformed = '/api/documents/blob/signed?expires=123&sig=abc';
    expect(refreshSignedUrl(malformed)).toBe(malformed);
  });
});

describe('getSignedDocumentUrl', () => {
  it('embeds key + expires + sig in the URL query', () => {
    const url = getSignedDocumentUrl('documents/proj-001/file-1');
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.get('key')).toBe('documents/proj-001/file-1');
    expect(Number(params.get('expires'))).toBeGreaterThan(
      Math.floor(Date.now() / 1000),
    );
    expect(params.get('sig')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('isPublicStorePrivateAccessError', () => {
  it('is true for the public-store private-access BlobError', () => {
    expect(isPublicStorePrivateAccessError(publicStoreError())).toBe(true);
  });

  it('is false for an unrelated BlobError', () => {
    expect(isPublicStorePrivateAccessError(new BlobError('File too large'))).toBe(
      false,
    );
  });

  it('is false for a plain Error with the same message text', () => {
    expect(
      isPublicStorePrivateAccessError(
        new Error('Cannot use private access on a public store.'),
      ),
    ).toBe(false);
  });

  it('is false for non-error values', () => {
    expect(isPublicStorePrivateAccessError(null)).toBe(false);
    expect(isPublicStorePrivateAccessError('public store')).toBe(false);
  });
});

describe('putBlobStoreAware', () => {
  const file = new File(['hello'], 'note.txt', { type: 'text/plain' });
  const key = 'documents/proj-001/note.txt';

  beforeEach(() => {
    putMock.mockReset();
    __resetBlobStoreAccessCacheForTesting();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads with access:private first on a private-capable store', async () => {
    putMock.mockResolvedValueOnce({ url: 'https://store/private', pathname: key } as never);
    const result = await putBlobStoreAware(key, file, 'text/plain');

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      key,
      file,
      expect.objectContaining({ access: 'private', addRandomSuffix: false }),
    );
    expect(result.url).toBe('https://store/private');
  });

  it('falls back to access:public on a public-store BlobError (same key)', async () => {
    putMock
      .mockRejectedValueOnce(publicStoreError())
      .mockResolvedValueOnce({ url: 'https://store/public', pathname: key } as never);

    const result = await putBlobStoreAware(key, file, 'text/plain');

    expect(putMock).toHaveBeenCalledTimes(2);
    expect(putMock).toHaveBeenNthCalledWith(
      1,
      key,
      file,
      expect.objectContaining({ access: 'private', addRandomSuffix: false }),
    );
    expect(putMock).toHaveBeenNthCalledWith(
      2,
      key,
      file,
      expect.objectContaining({ access: 'public', addRandomSuffix: false }),
    );
    expect(result.url).toBe('https://store/public');
  });

  it('caches the public store so later uploads skip the private attempt', async () => {
    putMock
      .mockRejectedValueOnce(publicStoreError())
      .mockResolvedValue({ url: 'https://store/public', pathname: key } as never);

    await putBlobStoreAware(key, file, 'text/plain'); // discovers public (2 calls)
    putMock.mockClear();
    await putBlobStoreAware(key, file, 'text/plain'); // cached → 1 public call

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      key,
      file,
      expect.objectContaining({ access: 'public' }),
    );
  });

  it('rethrows an unrelated BlobError without falling back to public', async () => {
    putMock.mockRejectedValueOnce(new BlobError('Store suspended'));

    await expect(putBlobStoreAware(key, file, 'text/plain')).rejects.toThrow(
      /Store suspended/,
    );
    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      key,
      file,
      expect.objectContaining({ access: 'private' }),
    );
  });
});
