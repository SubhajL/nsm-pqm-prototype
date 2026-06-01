'use client';

import { Button, Tooltip } from 'antd';
import { BulbFilled, BulbOutlined, DesktopOutlined } from '@ant-design/icons';

import { useThemePreference } from '@/hooks/useThemePreference';
import type { ThemeChoice } from '@/lib/theme-preference';

/**
 * Sprint 4 (E1) — Header-mounted dark-mode toggle.
 *
 * Three-state cycle: light → dark → system → light. The icon + tooltip
 * communicate the CURRENT explicit choice (not the resolved theme) so
 * the user can tell when "system" is in control vs an explicit pick.
 *
 * Bilingual `aria-label` per CLAUDE.md A11y rules.
 */

const ICON_FOR_CHOICE: Record<ThemeChoice, React.ReactNode> = {
  light: <BulbOutlined style={{ fontSize: 18 }} />,
  dark: <BulbFilled style={{ fontSize: 18 }} />,
  system: <DesktopOutlined style={{ fontSize: 18 }} />,
};

const LABEL_FOR_CHOICE: Record<
  ThemeChoice,
  { tooltip: string; ariaLabel: string }
> = {
  light: {
    tooltip: 'โหมดสว่าง — คลิกเพื่อเปลี่ยนเป็นโหมดมืด (Light — click for dark)',
    ariaLabel: 'โหมดธีม: สว่าง (Theme: light)',
  },
  dark: {
    tooltip: 'โหมดมืด — คลิกเพื่อให้ระบบตัดสิน (Dark — click to follow system)',
    ariaLabel: 'โหมดธีม: มืด (Theme: dark)',
  },
  system: {
    tooltip: 'ตามระบบ — คลิกเพื่อใช้โหมดสว่าง (System — click for light)',
    ariaLabel: 'โหมดธีม: ตามระบบ (Theme: system)',
  },
};

export function ThemeToggle() {
  const { choice, cycle } = useThemePreference();
  const labels = LABEL_FOR_CHOICE[choice];

  return (
    <Tooltip title={labels.tooltip}>
      <Button
        type="text"
        icon={ICON_FOR_CHOICE[choice]}
        onClick={cycle}
        aria-label={labels.ariaLabel}
      />
    </Tooltip>
  );
}
