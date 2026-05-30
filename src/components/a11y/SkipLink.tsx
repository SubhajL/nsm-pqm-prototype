'use client';

import { COLORS } from '@/theme/antd-theme';

/**
 * Default DOM id that `<main>` content should expose for the skip-link
 * target. The element MUST be focusable: render it with `tabIndex={-1}`
 * so keyboard activation of the link can move focus into the region.
 */
export const SKIP_LINK_TARGET_ID = 'main-content';

/**
 * Skip-to-content link (WCAG SC 2.4.1 "Bypass Blocks").
 *
 * Visually hidden until focused, at which point it surfaces in the
 * top-left of the viewport so keyboard users can jump past the sidebar
 * and header. Activating the link moves both the visual scroll AND the
 * keyboard focus to `#main-content` via the native fragment-navigation
 * behavior plus a programmatic `focus()` for assistive tech that does
 * not move focus on `:target`.
 */
export function SkipLink({
  targetId = SKIP_LINK_TARGET_ID,
  label = 'ข้ามไปยังเนื้อหาหลัก (Skip to main content)',
}: {
  targetId?: string;
  label?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      onClick={(event) => {
        // Mirror native fragment nav for assistive tech that doesn't
        // move focus on `:target`. We control the scroll explicitly so
        // `preventScroll: true` keeps focus() from racing with us.
        const target = document.getElementById(targetId);
        if (target !== null) {
          event.preventDefault();
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: 'start' });
        }
      }}
      className="pqm-skip-link"
      // Inline styles are the OFF-FOCUS state. Focused styles live in
      // globals.css under `.pqm-skip-link:focus` so we get pseudo-class
      // pickup without a JS focus handler.
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        // Off-screen until focused. `transform: translateY(-200%)`
        // keeps the element painted (so screen readers find it) but
        // outside the viewport.
        transform: 'translateY(-200%)',
        background: COLORS.primary,
        color: COLORS.white,
        padding: '8px 16px',
        fontWeight: 600,
        textDecoration: 'none',
        zIndex: 10_000,
      }}
    >
      {label}
    </a>
  );
}
