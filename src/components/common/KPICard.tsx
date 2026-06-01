'use client';

import { Card, Statistic } from 'antd';
import type { KeyboardEvent, ReactNode } from 'react';
import { COLORS } from '@/theme/antd-theme';
import type { KpiTone } from '@/lib/dashboard-kpi-context';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  color?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  extraContent?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  /**
   * P-C1 — optional KPI context. `delta` shows a comparison line
   * ("+2 vs baseline") tinted by `tone`. `freshness` shows when the
   * underlying data last changed ("Updated 5 min ago"). Both are
   * additive — existing callers continue to render unchanged.
   */
  delta?: { label: string; tone: KpiTone };
  freshness?: string;
}

const TONE_COLORS: Record<KpiTone, string> = {
  positive: COLORS.successText,
  negative: COLORS.errorText,
  neutral: COLORS.textMuted,
};

export function KPICard({
  title,
  value,
  icon,
  subtitle,
  color = COLORS.primary,
  prefix,
  suffix,
  extraContent,
  active = false,
  onClick,
  delta,
  freshness,
}: KPICardProps) {
  const isInteractive = Boolean(onClick);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      hoverable={isInteractive}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-pressed={isInteractive ? active : undefined}
      style={{
        borderRadius: 8,
        cursor: isInteractive ? 'pointer' : 'default',
        borderColor: active ? color : COLORS.borderSoft,
        boxShadow: active ? `0 0 0 2px ${color}33, 0 8px 20px rgba(0,0,0,0.10)` : '0 2px 10px rgba(0,0,0,0.08)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            fontSize: 24,
            color,
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <Statistic
            title={title}
            value={value}
            prefix={prefix}
            suffix={suffix}
            valueStyle={{ fontSize: 28, fontWeight: 600, color }}
          />
          {subtitle && (
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
              {subtitle}
            </div>
          )}
          {delta && (
            <div
              style={{
                fontSize: 12,
                color: TONE_COLORS[delta.tone],
                marginTop: 4,
                fontWeight: 500,
              }}
              aria-label={`การเปลี่ยนแปลง (Change): ${delta.label}`}
            >
              {delta.label}
            </div>
          )}
          {freshness && (
            <div
              style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}
              aria-label={`สถานะข้อมูล (Data freshness): ${freshness}`}
            >
              {freshness}
            </div>
          )}
          {extraContent && <div style={{ marginTop: 12 }}>{extraContent}</div>}
        </div>
      </div>
    </Card>
  );
}
