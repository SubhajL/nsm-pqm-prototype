'use client';

import { Typography } from 'antd';

import { COLORS } from '@/theme/antd-theme';

import {
  COLOR_BASELINE_BAR,
  COLOR_COMPLETED,
  COLOR_IN_PROGRESS,
  COLOR_MILESTONE,
  COLOR_TODAY,
} from './constants';

const { Text } = Typography;

/* ------------------------------------------------------------------ */
/* Legend                                                               */
/* ------------------------------------------------------------------ */

export function GanttLegend() {
  const items: { color: string; label: string; type: 'square' | 'diamond' | 'line' }[] = [
    { color: COLOR_BASELINE_BAR, label: 'แผนงาน (Baseline)', type: 'square' },
    { color: COLOR_IN_PROGRESS, label: 'ความคืบหน้าจริง (Actual)', type: 'square' },
    { color: COLOR_COMPLETED, label: 'เสร็จสิ้น (Complete)', type: 'square' },
    { color: COLOR_MILESTONE, label: 'จุดสำคัญ (Milestone)', type: 'diamond' },
    { color: COLOR_TODAY, label: 'วันนี้ (Today)', type: 'line' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        padding: '12px 0 0',
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {item.type === 'square' && (
            <div
              style={{
                width: 14,
                height: 14,
                backgroundColor: item.color,
                borderRadius: 2,
              }}
            />
          )}
          {item.type === 'diamond' && (
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: item.color,
                transform: 'rotate(45deg)',
              }}
            />
          )}
          {item.type === 'line' && (
            <div
              style={{
                width: 20,
                height: 0,
                borderTop: `2px dashed ${item.color}`,
              }}
            />
          )}
          <Text style={{ fontSize: 13, color: COLORS.textDark }}>
            {item.label}
          </Text>
        </div>
      ))}
    </div>
  );
}
