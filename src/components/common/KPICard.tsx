'use client';

import { Card, Statistic } from 'antd';
import type { KeyboardEvent, ReactNode } from 'react';
import { COLORS } from '@/theme/antd-theme';

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
}

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
        borderColor: active ? color : '#f0f0f0',
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
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {subtitle}
            </div>
          )}
          {extraContent && <div style={{ marginTop: 12 }}>{extraContent}</div>}
        </div>
      </div>
    </Card>
  );
}
