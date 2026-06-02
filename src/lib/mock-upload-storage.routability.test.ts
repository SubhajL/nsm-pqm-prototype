import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getSignedDocumentUrl } from './mock-upload-storage';

// ---------------------------------------------------------------------------
// Routability smoke for `getSignedDocumentUrl()`.
//
// Background: a prior PR placed the signed-blob handler at
// `src/app/api/documents/_blob/signed/route.ts`. The `_blob` segment is a
// Next.js App-Router "private folder" convention — it is EXCLUDED from
// routing. The handler's unit tests passed (they `import('./route')`
// directly), but browser requests for the URL the lib emitted 404'd in
// production. This test catches that class of bug by walking from the
// emitted URL back to its source file and asserting the path is fully
// routable.
//
// What "routable" means here (Next.js App Router rules we depend on):
//   - No segment starts with `_` (private folder)
//   - No segment is wrapped in `(...)`  (route group — those are allowed
//     but do not appear in the URL, so encountering one means the URL
//     and the directory layout disagree)
//   - The terminal segment must have a `route.ts` (or `route.tsx`)
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, '../..');

function urlPathFromEmittedUrl(emitted: string): string {
  // The emitter returns a relative URL like
  // `/api/documents/blob/signed?key=...`. Parse with a synthetic origin so
  // we can pull `.pathname` without needing the real host.
  return new URL(emitted, 'http://localhost').pathname;
}

function pathSegmentsOf(urlPath: string): string[] {
  return urlPath.split('/').filter((s) => s.length > 0);
}

describe('getSignedDocumentUrl() routability', () => {
  it('emits a URL whose path has no Next.js private-folder segments', () => {
    const emitted = getSignedDocumentUrl('documents/proj-001/file-1');
    const segments = pathSegmentsOf(urlPathFromEmittedUrl(emitted));
    const offending = segments.filter((s) => s.startsWith('_'));
    expect(offending).toEqual([]);
  });

  it('emits a URL whose path has no route-group segments (parens disagree with URL)', () => {
    const emitted = getSignedDocumentUrl('documents/proj-001/file-1');
    const segments = pathSegmentsOf(urlPathFromEmittedUrl(emitted));
    const offending = segments.filter((s) => s.startsWith('(') && s.endsWith(')'));
    expect(offending).toEqual([]);
  });

  it('points at a real, routable route.ts file on disk', () => {
    const emitted = getSignedDocumentUrl('documents/proj-001/file-1');
    const urlPath = urlPathFromEmittedUrl(emitted); // e.g. /api/documents/blob/signed
    // App Router maps URL `/api/...` to `src/app/api/.../route.ts`.
    const routeFile = resolve(REPO_ROOT, 'src/app', urlPath.replace(/^\//, ''), 'route.ts');
    expect(existsSync(routeFile)).toBe(true);
    expect(statSync(routeFile).isFile()).toBe(true);
  });

  it('the route is registered in the Next build manifest when a build exists', () => {
    // Optional pin: when `.next/server/app-paths-manifest.json` is present,
    // assert the route appears in it. The manifest is the canonical proof
    // that Next compiled and registered the handler. If the file doesn't
    // exist (no build run yet), we skip — the on-disk smoke above is
    // still load-bearing.
    const manifestPath = resolve(REPO_ROOT, '.next/server/app-paths-manifest.json');
    if (!existsSync(manifestPath)) return;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    const emitted = getSignedDocumentUrl('documents/proj-001/file-1');
    const urlPath = urlPathFromEmittedUrl(emitted);
    const expectedKey = `${urlPath}/route`;
    expect(Object.keys(manifest)).toContain(expectedKey);
  });
});
