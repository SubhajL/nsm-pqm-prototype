/**
 * Document upload security primitives.
 *
 * PR-06 hardening: size cap, MIME allowlist, SHA-256 hash, pluggable
 * virus-scan hook. Used by `mock-upload-storage.ts` and exposed as
 * stand-alone helpers so route handlers can compose them.
 *
 * All thresholds are configurable via env so a hosted demo can be tuned
 * without a redeploy.
 */

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Default allowlist covering the documents an อพวช./RID construction
 * project needs to upload: contracts (PDF), drawings (DWG), spreadsheets
 * (XLSX/CSV), site photos (JPG/PNG/WebP), Office docs (DOCX/PPT/PPTX),
 * plain text (TXT).
 *
 * Adding a MIME type here is one half of the change — the matching file
 * extension should still be valid via the route-level extension check
 * (currently delegated to the browser's File.type).
 */
const DEFAULT_ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  // CAD
  'application/acad',
  'application/x-acad',
  'application/autocad_dwg',
  'image/vnd.dwg',
  'image/x-dwg',
  // Plain text + CSV
  'text/plain',
  'text/csv',
  // Generic fallback for binary blobs from form uploads (rejected by
  // default — only enabled if the env override includes it explicitly)
];

function parseMaxUploadBytes(): number {
  const raw = process.env.DOCUMENT_MAX_UPLOAD_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  return Math.floor(parsed);
}

function parseAllowedMimeTypes(): Set<string> {
  const raw = process.env.DOCUMENT_ALLOWED_MIME_TYPES?.trim();
  if (!raw) return new Set(DEFAULT_ALLOWED_MIME_TYPES);
  const entries = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) return new Set(DEFAULT_ALLOWED_MIME_TYPES);
  return new Set(entries);
}

/**
 * Resolved per-call to honor runtime env changes (important for tests
 * that mutate `process.env.DOCUMENT_*` and re-read the limits).
 */
export const MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_BYTES;
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set(
  DEFAULT_ALLOWED_MIME_TYPES,
);

export function getMaxUploadBytes(): number {
  return parseMaxUploadBytes();
}

export function getAllowedMimeTypes(): Set<string> {
  return parseAllowedMimeTypes();
}

export type UploadRejectionReason = 'too_large' | 'mime_not_allowed' | 'empty';

export type ValidateUploadResult =
  | { ok: true }
  | { ok: false; reason: UploadRejectionReason; details: string };

/**
 * Synchronous validation guard run BEFORE the file body touches storage.
 *
 * - Returns `too_large` if size exceeds `DOCUMENT_MAX_UPLOAD_BYTES` (default 50MB).
 * - Returns `empty` if the file has zero bytes (uploads of empty files
 *   typically indicate a client bug or interrupted upload).
 * - Returns `mime_not_allowed` if the mime type isn't in the allowlist.
 *
 * MIME comparison is case-insensitive; the allowlist is normalized to
 * lower-case on read.
 */
export function validateUpload(
  file: File | Blob,
  mimeType: string,
): ValidateUploadResult {
  const size = file.size;

  if (size === 0) {
    return {
      ok: false,
      reason: 'empty',
      details: 'Uploaded file is empty (0 bytes)',
    };
  }

  const maxBytes = getMaxUploadBytes();
  if (size > maxBytes) {
    return {
      ok: false,
      reason: 'too_large',
      details: `File size ${size} bytes exceeds maximum ${maxBytes} bytes`,
    };
  }

  const allowed = getAllowedMimeTypes();
  const normalized = (mimeType ?? '').trim().toLowerCase();
  if (!normalized || !allowed.has(normalized)) {
    return {
      ok: false,
      reason: 'mime_not_allowed',
      details: `MIME type "${mimeType}" is not in the allowlist`,
    };
  }

  return { ok: true };
}

/**
 * Compute a SHA-256 digest of the file body and return it as a
 * lowercase hex string. Uses `crypto.subtle.digest` which is available
 * in Node 18+ and the Edge runtime.
 */
export async function computeSha256(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export type VirusScanStatus = 'pending' | 'clean' | 'infected';

export interface VirusScanResult {
  clean: boolean;
  /** Engine identifier (e.g. "stub", "clamav-0.103") so audit trails know who decided. */
  engine: string;
  /** ISO timestamp the decision was made. */
  scannedAt: string;
  /** Free-form reason / signature name when `clean=false`. */
  reason?: string;
}

/**
 * Pluggable virus-scan adapter. Default implementation returns clean for
 * every input (the demo doesn't ship a real scanner). To plug in
 * ClamAV/Cloudmersive/etc. in production, implement this interface and
 * wire it into `getActiveVirusScanner()` below.
 */
export interface VirusScanHook {
  scan(file: File | Blob, mimeType: string): Promise<VirusScanResult>;
}

class StubVirusScanner implements VirusScanHook {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async scan(file: File | Blob, mimeType: string): Promise<VirusScanResult> {
    return {
      clean: true,
      engine: 'stub',
      scannedAt: new Date().toISOString(),
    };
  }
}

const stubScanner = new StubVirusScanner();

/**
 * Returns the active virus-scan hook. By default returns the stub
 * (always clean). If `VIRUS_SCAN_HOOK_URL` is set, a real adapter
 * should POST the file body to that URL — left as TODO for MVP since
 * no scanner is plugged in yet.
 */
export function getActiveVirusScanner(): VirusScanHook {
  // TODO(post-MVP): when VIRUS_SCAN_HOOK_URL is set, return an adapter
  // that POSTs the file body to the configured ClamAV/Cloudmersive
  // endpoint, parses the response, and returns the canonical
  // VirusScanResult. The shape is intentionally kept identical so
  // callers don't change.
  // Example (post-MVP):
  //   if (process.env.VIRUS_SCAN_HOOK_URL) {
  //     return new RemoteVirusScanner(process.env.VIRUS_SCAN_HOOK_URL);
  //   }
  return stubScanner;
}
