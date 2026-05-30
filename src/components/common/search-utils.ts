/**
 * PR-A3 — case-insensitive substring check used by every list / table
 * filter site so search behaves consistently across the app (UX gap G7).
 * Pure; no DOM, no React.
 *
 * Thai has no letter case, so `toLowerCase()` is a no-op for Thai
 * codepoints. The fold is still applied uniformly to keep the contract
 * predictable on mixed Thai/Latin haystacks like "PJ-2569-0012
 * โครงการ…".
 */
export function caseInsensitiveIncludes(haystack: string, needle: string): boolean {
  if (needle.length === 0) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
