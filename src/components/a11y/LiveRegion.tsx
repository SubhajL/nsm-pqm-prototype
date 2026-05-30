'use client';

import { useEffect, useRef } from 'react';

import {
  type Politeness,
  registerLiveRegion,
  unregisterLiveRegion,
} from './announcer';

/**
 * Visually-hidden ARIA live region (WCAG SC 4.1.3).
 *
 * Mount exactly one per politeness at the top of the app shell. The
 * component owns no state; it merely registers its DOM node with the
 * {@link ./announcer announcer module}, which is the public API for any
 * code path that needs to announce to assistive tech (toast wrappers,
 * validation summaries, route-change handlers).
 *
 * Why a separate component instead of a `useEffect` in `layout.tsx`?
 * The DOM node must exist for the lifetime of the app — putting the
 * registration in a top-level component decouples app shell from the
 * announcer implementation.
 */
export function LiveRegion({
  politeness = 'polite',
}: {
  politeness?: Politeness;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    registerLiveRegion(politeness, node);
    return () => unregisterLiveRegion(politeness, node);
  }, [politeness]);

  return (
    <div
      ref={ref}
      // ARIA roles per APG: status = polite implicit; alert = assertive.
      // We still pass `aria-live` explicitly so screen readers without
      // ARIA-role support fall back to live-region semantics.
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
      // Visually-hidden but exposed to assistive tech. Inline styles so
      // this works even before `globals.css` loads on the first paint.
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    />
  );
}
