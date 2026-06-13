# Coding Log — Blob upload: store-aware private→public fallback (prod fix)

**Date**: 2026-06-13
**Branch**: `fix/blob-upload-public-store-fallback`
**Scope**: Fix the latent production bug flagged in PR #97 — photo/document
uploads to Vercel Blob fail in every environment because the store is public
but the code forces `access:'private'`.

## Investigation (against the live store)

- The project's ONE Blob store `nsm-pqm-prototype-uploads`
  (`store_KjvBw1W6243w0GjY`, shared by local/preview/prod — the
  `BLOB_READ_WRITE_TOKEN` prefix matches the store id) is **`Access: Public`**.
- `persistBlobUpload` calls `put(..., { access:'private' })` → throws
  `BlobError: Cannot use private access on a public store` on EVERY upload, in
  ALL envs. The intended true-private model never actually worked.
- Live probes confirmed: `put({access:'private'})` throws; `put({access:'public'})`
  succeeds; **`get(key,{access:'private'})` works on the public store** (200 +
  exact bytes) — so the signed-URL serving route was never broken, only uploads.
- The store has been public 71 days; the existing 5 blobs already have public
  URLs. Clients only ever receive the HMAC-signed `/api/documents/blob/signed`
  proxy URL (session + project RBAC gated), never `blob.url`.

## Fix (`src/lib/mock-upload-storage.ts`)

`putBlobStoreAware(relativePath, file, mimeType)`: attempt `access:'private'`;
on the specific `isPublicStorePrivateAccessError` BlobError, fall back to
`access:'public'` (same deterministic key — `addRandomSuffix:false` — so the
signed-URL proxy + serving route are untouched). Cache the discovered public
mode per process (skip the doomed private attempt on later uploads) and
`console.warn` once. `persistBlobUpload` now delegates its `put` to it.

- Works on today's public store, AND a fresh process auto-prefers private — so
  provisioning a private store (`vercel blob create-store --access private`) +
  redeploying transparently restores true-private uploads with no code change.
- Discriminator: `instanceof BlobError` + message substring (v2.x exposes no
  stable machine code; the base-class guard narrows it).

### Security posture
Unchanged vs today (the store was already public). Reads stay gated by the
signed proxy (HMAC + session + RBAC); clients never get `blob.url`. Caveat
documented in code: deterministic public paths are NOT an access boundary —
true-private requires provisioning a private store. (Out of scope: that's an
infra change with cost/plan implications, left to the operator.)

## Comment/doc updates
- `src/app/api/documents/blob/signed/route.ts`, `.../[projectId]/route.ts`,
  `StoredMockUpload.signedUrl` doc, and `src/app/api/AGENTS.md` — corrected the
  stale "private-only" wording and the `_blob` path typo; documented the
  store-aware reality + that only the signed proxy URL reaches clients.

## TDD / verification
- `src/lib/mock-upload-storage.test.ts`: RED→GREEN. New cases —
  `isPublicStorePrivateAccessError` (true case, unrelated BlobError, plain
  Error, non-errors); `putBlobStoreAware` (private-first; public-store
  fallback same key; caches public after fallback; rethrows unrelated
  BlobError). 17/17 green.
- **End-to-end against the REAL public store** via a tsx probe calling the
  actual `persistMockUpload`: warning fired, upload succeeded (`ok:true`,
  public URL + signed proxy URL); probe blob cleaned up; store back to 5 files.
- vitest `--maxWorkers=4` ×3, typecheck, lint, build: see PR.
- Affected upload e2e (batch2/batch4) still green (they use the filesystem
  path per PR #97 — kept deliberately so routine local runs don't pollute the
  shared prod store; the blob fallback is exercised in prod/preview).
