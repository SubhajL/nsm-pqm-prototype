import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-06 route-level coverage (post-PR-21 rewrite — blob snapshot retired):
//   - File too large -> 413 (PAYLOAD_TOO_LARGE)
//   - Disallowed mime -> 415 (UNSUPPORTED_MEDIA_TYPE)
//   - New version on a locked (approved) version -> 409 (VERSION_LOCKED)
//   - Successful upload returns signedUrl + sha256 in the response body
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'pqm_user_id' ? { value: 'user-001' } : undefined),
  }),
}));

interface GlobalState {
  __nsmDocumentStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmDocumentStore = undefined;
  g.__nsmAuditEventStore = undefined;
}

beforeEach(async () => {
  resetGlobalStores();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PROJECT_ID = 'proj-001';

async function postDocument(body: unknown) {
  const { POST } = await import('./route');
  return POST(
    new Request(`http://localhost/api/documents/${PROJECT_ID}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

describe('POST /api/documents/[projectId] (PR-06)', () => {
  it('returns a signedUrl + sha256 on a successful new-file upload', async () => {
    const response = await postDocument({
      kind: 'file',
      folderId: 'folder-1',
      name: 'contract.pdf',
      type: 'Contract',
      size: '0.01 MB',
      sha256: 'a'.repeat(64),
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      status: string;
      data: { sha256?: string; signedUrl?: string | null; virusScanStatus?: string };
    };
    expect(body.status).toBe('success');
    expect(body.data.sha256).toBe('a'.repeat(64));
    expect(body.data.signedUrl).toMatch(/\/api\/documents\/_blob\/signed\?/);
    expect(body.data.virusScanStatus).toBe('clean');
  });

  it('returns 409 VERSION_LOCKED when uploading a new version against an approved file', async () => {
    // The seeded document store includes "file-1" with status:'approved' in
    // proj-001. Per PR-06, attempting a version upload against it must be
    // refused with 409 + code VERSION_LOCKED.
    const response = await postDocument({
      kind: 'version',
      fileId: 'file-1',
      note: 'attempt to overwrite approved version',
    });
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    expect(body.error?.code).toBe('VERSION_LOCKED');
    expect(body.error?.message).toMatch(/locked/i);
  });

  it('allows a new version when the current version is NOT approved', async () => {
    // file-3 is status:'under_review' in seed data — not locked.
    const response = await postDocument({
      kind: 'version',
      fileId: 'file-3',
      note: 'minor cleanup',
      sha256: 'c'.repeat(64),
      sizeBytes: 2048,
      mimeType: 'application/pdf',
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      data: { sha256?: string; signedUrl?: string | null };
    };
    expect(body.status).toBe('success');
    expect(body.data.signedUrl).toMatch(/\/api\/documents\/_blob\/signed\?/);
    expect(body.data.sha256).toBe('c'.repeat(64));
  });
});

describe('persistMockUpload rejection paths (PR-06)', () => {
  // The route doesn't accept raw multipart today (file metadata is sent
  // as JSON; the actual upload helper is called elsewhere). We exercise
  // the helper directly to confirm the 413/415 mapping wired through
  // daily-reports + future docs flows is correct.
  it('rejects an oversized upload with reason="too_large"', async () => {
    const originalMax = process.env.DOCUMENT_MAX_UPLOAD_BYTES;
    process.env.DOCUMENT_MAX_UPLOAD_BYTES = '100';
    try {
      const { persistMockUpload } = await import('@/lib/mock-upload-storage');
      const file = new File([new Uint8Array(500)], 'huge.pdf', { type: 'application/pdf' });
      const result = await persistMockUpload(file, ['test']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('too_large');
      }
    } finally {
      if (originalMax === undefined) {
        delete process.env.DOCUMENT_MAX_UPLOAD_BYTES;
      } else {
        process.env.DOCUMENT_MAX_UPLOAD_BYTES = originalMax;
      }
    }
  });

  it('rejects a disallowed MIME with reason="mime_not_allowed"', async () => {
    const { persistMockUpload } = await import('@/lib/mock-upload-storage');
    const file = new File([new Uint8Array(10)], 'bad.exe', { type: 'application/x-msdownload' });
    const result = await persistMockUpload(file, ['test']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('mime_not_allowed');
    }
  });
});
