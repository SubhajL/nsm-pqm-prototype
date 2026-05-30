'use client';

import type { ReactNode } from 'react';

import { COLORS } from '@/theme/antd-theme';
import { SPACING, TYPE_SCALE } from '@/theme/scales';

/**
 * PR-A3 — semantic form-section grouping (`<fieldset>` + `<legend>`).
 * W3C-WAI Forms Tutorial designates this as the primary structure for
 * any related control group; closes UX gap G8 (long forms lack
 * structure). Adopt for Daily Report, New Project, and any multi-block
 * form going forward.
 *
 * AntD's default browser-reset zeroes out the legend padding, so we
 * override with explicit padding tokens to keep the visual rhythm.
 */

export interface FormSectionProps {
  /** Legend text — bilingual, e.g. "ข้อมูลพื้นฐาน (Basic info)". */
  title: string;
  /** Optional hint shown beneath the legend; plain text only. */
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <fieldset
      style={{
        border: 'none',
        padding: 0,
        margin: 0,
        marginBottom: SPACING['2xl'],
      }}
    >
      <legend
        style={{
          // Override browser default (which floats above the box) and
          // make the legend sit inline like a section heading.
          width: '100%',
          padding: 0,
          marginBottom: SPACING.sm,
          fontSize: TYPE_SCALE.lg.size,
          lineHeight: TYPE_SCALE.lg.lineHeight,
          fontWeight: 600,
          color: COLORS.textDark,
        }}
      >
        {title}
      </legend>
      {description !== undefined && (
        <div
          style={{
            marginTop: 0,
            marginBottom: SPACING.md,
            fontSize: TYPE_SCALE.sm.size,
            color: COLORS.textMuted,
          }}
        >
          {description}
        </div>
      )}
      {children}
    </fieldset>
  );
}
