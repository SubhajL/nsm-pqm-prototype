import { afterEach, describe, expect, it } from 'vitest';

import {
  computeSha256,
  getActiveVirusScanner,
  getAllowedMimeTypes,
  getMaxUploadBytes,
  validateUpload,
} from '@/lib/document-security';

// Helpers --------------------------------------------------------------------

function makeFile(bytes: number, mimeType = 'application/pdf', name = 'doc.pdf'): File {
  const buffer = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) buffer[i] = (i * 7) & 0xff;
  return new File([buffer], name, { type: mimeType });
}

function makeBlob(content: string, mimeType = 'application/pdf'): Blob {
  return new Blob([content], { type: mimeType });
}

describe('document-security: validateUpload', () => {
  const originalMax = process.env.DOCUMENT_MAX_UPLOAD_BYTES;
  const originalAllowed = process.env.DOCUMENT_ALLOWED_MIME_TYPES;

  afterEach(() => {
    if (originalMax === undefined) {
      delete process.env.DOCUMENT_MAX_UPLOAD_BYTES;
    } else {
      process.env.DOCUMENT_MAX_UPLOAD_BYTES = originalMax;
    }
    if (originalAllowed === undefined) {
      delete process.env.DOCUMENT_ALLOWED_MIME_TYPES;
    } else {
      process.env.DOCUMENT_ALLOWED_MIME_TYPES = originalAllowed;
    }
  });

  it('rejects an empty file with reason="empty"', () => {
    const result = validateUpload(makeFile(0), 'application/pdf');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty');
      expect(result.details).toMatch(/empty/);
    }
  });

  it('rejects a file larger than the configured limit with reason="too_large"', () => {
    process.env.DOCUMENT_MAX_UPLOAD_BYTES = '100';
    const result = validateUpload(makeFile(200), 'application/pdf');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too_large');
      expect(result.details).toMatch(/200/);
      expect(result.details).toMatch(/100/);
    }
  });

  it('rejects a disallowed mime type with reason="mime_not_allowed"', () => {
    const result = validateUpload(makeFile(10), 'application/x-evil-binary');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('mime_not_allowed');
    }
  });

  it('accepts a within-limits PDF upload', () => {
    const result = validateUpload(makeFile(1024), 'application/pdf');
    expect(result.ok).toBe(true);
  });

  it('accepts a within-limits PNG upload', () => {
    const result = validateUpload(makeFile(2048, 'image/png', 'photo.png'), 'image/png');
    expect(result.ok).toBe(true);
  });

  it('honors DOCUMENT_ALLOWED_MIME_TYPES env override', () => {
    process.env.DOCUMENT_ALLOWED_MIME_TYPES = 'application/x-evil-binary,text/csv';

    const allowed = validateUpload(makeFile(10, 'application/x-evil-binary'), 'application/x-evil-binary');
    expect(allowed.ok).toBe(true);

    const blocked = validateUpload(makeFile(10), 'application/pdf');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe('mime_not_allowed');
    }
  });

  it('getMaxUploadBytes defaults to 50 MB when env is unset', () => {
    delete process.env.DOCUMENT_MAX_UPLOAD_BYTES;
    expect(getMaxUploadBytes()).toBe(50 * 1024 * 1024);
  });

  it('getAllowedMimeTypes includes common Office + image + CAD MIMEs by default', () => {
    delete process.env.DOCUMENT_ALLOWED_MIME_TYPES;
    const allowed = getAllowedMimeTypes();
    expect(allowed.has('application/pdf')).toBe(true);
    expect(allowed.has('image/jpeg')).toBe(true);
    expect(allowed.has('image/png')).toBe(true);
    expect(allowed.has('image/webp')).toBe(true);
    expect(allowed.has('image/vnd.dwg')).toBe(true);
    expect(allowed.has('application/acad')).toBe(true);
    expect(allowed.has('text/csv')).toBe(true);
    expect(allowed.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    expect(allowed.has('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
    expect(allowed.has('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true);
  });

  it('ignores invalid DOCUMENT_MAX_UPLOAD_BYTES values and falls back to default', () => {
    process.env.DOCUMENT_MAX_UPLOAD_BYTES = 'not-a-number';
    expect(getMaxUploadBytes()).toBe(50 * 1024 * 1024);

    process.env.DOCUMENT_MAX_UPLOAD_BYTES = '-5';
    expect(getMaxUploadBytes()).toBe(50 * 1024 * 1024);
  });
});

describe('document-security: computeSha256', () => {
  it('produces a deterministic SHA-256 hex digest for the same input', async () => {
    const a = await computeSha256(makeBlob('hello world'));
    const b = await computeSha256(makeBlob('hello world'));
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).toMatch(/^[0-9a-f]+$/);
  });

  it('matches the known SHA-256 of "hello world"', async () => {
    // Well-known reference vector. Same value reported by `echo -n
    // 'hello world' | sha256sum`.
    const expected =
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    const actual = await computeSha256(makeBlob('hello world'));
    expect(actual).toBe(expected);
  });

  it('produces different digests for different inputs', async () => {
    const a = await computeSha256(makeBlob('hello world'));
    const b = await computeSha256(makeBlob('hello worle')); // off by one
    expect(a).not.toBe(b);
  });
});

describe('document-security: virus-scan stub', () => {
  it('returns clean=true by default', async () => {
    const scanner = getActiveVirusScanner();
    const result = await scanner.scan(makeBlob('clean payload'), 'application/pdf');
    expect(result.clean).toBe(true);
    expect(result.engine).toBe('stub');
    expect(result.scannedAt).toMatch(/T/);
  });
});
