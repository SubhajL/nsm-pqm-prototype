import { describe, expect, it } from 'vitest';

import {
  getSignedDocumentUrl,
  refreshSignedUrl,
  signSignedUrlPayload,
  verifySignedUrlPayload,
} from './mock-upload-storage';

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
      `/api/documents/_blob/signed?key=documents%2Fproj-001%2Ffile-1&expires=${originalExpires}&sig=${originalSig}`;

    const refreshed = refreshSignedUrl(stale);
    expect(refreshed).toMatch(/^\/api\/documents\/_blob\/signed\?/);

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
    const malformed = '/api/documents/_blob/signed?expires=123&sig=abc';
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
