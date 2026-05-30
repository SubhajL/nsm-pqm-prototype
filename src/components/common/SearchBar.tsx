'use client';

import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { useEffect, useState } from 'react';

/**
 * PR-A3 — debounced search Input. The pure `caseInsensitiveIncludes`
 * helper used by consumer lists/tables lives in `./search-utils.ts` so
 * it can be unit-tested without JSX.
 */

export interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Debounce window, in ms. Defaults to 300. Set 0 to disable. */
  debounceMs?: number;
  /** AntD `allowClear` pass-through; defaults true. */
  allowClear?: boolean;
  /** Required ARIA label so the input is announced (UX gap G4). */
  ariaLabel?: string;
}

/**
 * Debounced search Input. The visible value tracks user keystrokes
 * immediately so the field is responsive; `onChange` fires only after
 * the user pauses for `debounceMs`. Call sites can also pass
 * `debounceMs={0}` for instant search (e.g. fuzzy-match on small lists).
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'ค้นหา… (Search…)',
  debounceMs = 300,
  allowClear = true,
  ariaLabel = 'ค้นหา (Search)',
}: SearchBarProps) {
  const [draft, setDraft] = useState(value);

  // Keep the local draft in sync if the parent resets the value (e.g.
  // route change clears the search).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    if (debounceMs <= 0) {
      onChange(draft);
      return;
    }
    const timer = setTimeout(() => onChange(draft), debounceMs);
    return () => clearTimeout(timer);
    // We intentionally exclude `onChange` from deps — call sites may
    // pass a new function each render; we still only want to fire on
    // draft changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, debounceMs, value]);

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      placeholder={placeholder}
      allowClear={allowClear}
      prefix={<SearchOutlined aria-hidden />}
      aria-label={ariaLabel}
    />
  );
}
