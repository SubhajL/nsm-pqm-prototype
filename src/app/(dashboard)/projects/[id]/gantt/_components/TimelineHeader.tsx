'use client';

import { Tooltip } from 'antd';

import { formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';

import { COLOR_TODAY, type TimelineConfig, type TimeScale } from './constants';
import { getMonthLabels, getTimelineLabels, getTimelineOffsetPct } from './helpers';

/* ------------------------------------------------------------------ */
/* Timeline Header                                                     */
/* ------------------------------------------------------------------ */

export function TimelineHeader({ timeline, timeScale }: { timeline: TimelineConfig; timeScale: TimeScale }) {
  const labels = getTimelineLabels(timeline, timeScale);
  const todayOffsetPct = getTimelineOffsetPct(timeline.today, timeline);
  const fontSize = timeScale === 'day' ? 10 : 12;

  // For day scale, show month labels on top row + day numbers on bottom row
  const showMonthRow = timeScale === 'day';
  const monthLabels = showMonthRow ? getMonthLabels(timeline) : [];
  const totalHeight = showMonthRow ? 50 : 32;
  const monthRowHeight = 18;
  const dayRowTop = showMonthRow ? monthRowHeight : 0;
  const dayRowHeight = showMonthRow ? totalHeight - monthRowHeight : totalHeight;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: totalHeight,
        borderBottom: `1px solid ${COLORS.borderLight}`,
      }}
    >
      {/* Month row (only for day scale) */}
      {showMonthRow &&
        monthLabels.map((m) => (
          <div
            key={`month-${m.label}`}
            style={{
              position: 'absolute',
              left: `${m.leftPct}%`,
              width: `${m.widthPct}%`,
              top: 0,
              height: monthRowHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: `1px solid ${COLORS.borderLight}`,
              borderBottom: `1px solid ${COLORS.borderLight}`,
              fontSize: 11,
              color: COLORS.textDark,
              fontWeight: 600,
              backgroundColor: COLORS.surfaceCool,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {m.label}
          </div>
        ))}

      {/* Day/Week/Month labels */}
      {labels.map((m, idx) => (
        <div
          key={`${m.label}-${idx}`}
          style={{
            position: 'absolute',
            left: `${m.leftPct}%`,
            width: `${m.widthPct}%`,
            top: dayRowTop,
            height: dayRowHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: `1px solid ${COLORS.borderLight}`,
            fontSize,
            color: COLORS.textDark,
            fontWeight: 500,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {m.label}
        </div>
      ))}

      {/* Today marker in header */}
      <div
        style={{
          position: 'absolute',
          left: `${todayOffsetPct}%`,
          top: 0,
          bottom: 0,
          width: 0,
          borderLeft: `2px dashed ${COLOR_TODAY}`,
          zIndex: 2,
        }}
      />
      <Tooltip title={`วันนี้ (Today): ${formatThaiDateShort(timeline.today.format('YYYY-MM-DD'))}`}>
        <div
          style={{
            position: 'absolute',
            left: `calc(${todayOffsetPct}% - 10px)`,
            top: -2,
            width: 20,
            height: 14,
            backgroundColor: COLOR_TODAY,
            borderRadius: '3px 3px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
          }}
        >
          <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>
            {timeline.today.date()}
          </span>
        </div>
      </Tooltip>
    </div>
  );
}
