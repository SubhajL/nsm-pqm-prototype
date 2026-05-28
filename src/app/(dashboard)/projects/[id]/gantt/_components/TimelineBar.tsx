'use client';

import { Tooltip } from 'antd';
import dayjs from 'dayjs';

import { formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';

import {
  COLOR_BASELINE_BAR,
  COLOR_MILESTONE,
  COLOR_TODAY,
  type TimelineConfig,
  type ViewMode,
} from './constants';
import { getBarMetrics, getProgressColor, getTimelineOffsetPct } from './helpers';

/* ------------------------------------------------------------------ */
/* Timeline Bar Component                                              */
/* ------------------------------------------------------------------ */

export function TimelineBar({
  startDate,
  endDate,
  progress,
  type,
  isParent,
  timeline,
  viewMode,
  baselineStartDate,
  baselineEndDate,
}: {
  startDate: string;
  endDate: string;
  progress: number;
  type: string;
  isParent: boolean;
  timeline: TimelineConfig;
  viewMode: ViewMode;
  baselineStartDate?: string;
  baselineEndDate?: string;
}) {
  const todayOffsetPct = getTimelineOffsetPct(timeline.today, timeline);
  const bStart = baselineStartDate ?? startDate;
  const bEnd = baselineEndDate ?? endDate;

  // Milestone: render diamond marker(s)
  if (type === 'milestone') {
    const currentOffsetDays = dayjs(startDate).diff(timeline.projectStart, 'day');
    const currentLeftPct = Math.min(100, Math.max(0, (currentOffsetDays / timeline.totalDays) * 100));
    const baselineOffsetDays = dayjs(bStart).diff(timeline.projectStart, 'day');
    const baselineLeftPct = Math.min(100, Math.max(0, (baselineOffsetDays / timeline.totalDays) * 100));

    const showBaseline = viewMode === 'baseline' || viewMode === 'compare';
    const showCurrent = viewMode === 'current' || viewMode === 'compare';

    return (
      <div style={{ position: 'relative', width: '100%', height: 28 }}>
        <div
          style={{
            position: 'absolute', left: `${todayOffsetPct}%`, top: 0, bottom: 0,
            width: 0, borderLeft: `2px dashed ${COLOR_TODAY}`, zIndex: 2,
          }}
        />
        {showBaseline && (
          <Tooltip title={`Baseline: ${formatThaiDateShort(bStart)}`}>
            <div
              data-testid="baseline-milestone"
              style={{
                position: 'absolute',
                left: `calc(${baselineLeftPct}% - 7px)`,
                top: viewMode === 'compare' ? 2 : 7,
                width: 12, height: 12,
                backgroundColor: COLOR_BASELINE_BAR, border: `2px solid ${COLORS.textDisabled}`,
                transform: 'rotate(45deg)', zIndex: 1,
              }}
            />
          </Tooltip>
        )}
        {showCurrent && (
          <Tooltip title={`${formatThaiDateShort(startDate)}`}>
            <div
              style={{
                position: 'absolute',
                left: `calc(${currentLeftPct}% - 7px)`,
                top: viewMode === 'compare' ? 14 : 7,
                width: 14, height: 14,
                backgroundColor: COLOR_MILESTONE,
                transform: 'rotate(45deg)', zIndex: 1,
              }}
            />
          </Tooltip>
        )}
      </div>
    );
  }

  const barRadius = isParent ? 2 : 4;

  // Baseline bar metrics
  const baselineMetrics = getBarMetrics(bStart, bEnd, 0, timeline);
  // Current bar metrics
  const currentMetrics = getBarMetrics(startDate, endDate, progress, timeline);
  const barColor = getProgressColor(progress);

  const showBaseline = viewMode === 'baseline' || viewMode === 'compare';
  const showCurrent = viewMode === 'current' || viewMode === 'compare';

  // Layout heights depending on view mode
  const totalHeight = viewMode === 'compare' ? 36 : 28;
  const baselineBarHeight = viewMode === 'compare' ? (isParent ? 8 : 10) : (isParent ? 10 : 18);
  const currentBarHeight = viewMode === 'compare' ? (isParent ? 8 : 14) : (isParent ? 10 : 18);
  const baselineTop = viewMode === 'compare' ? 2 : (isParent ? 9 : 5);
  const currentTop = viewMode === 'compare' ? (baselineTop + baselineBarHeight + 2) : (isParent ? 9 : 5);

  return (
    <div style={{ position: 'relative', width: '100%', height: totalHeight }}>
      {/* Today marker */}
      <div
        style={{
          position: 'absolute', left: `${todayOffsetPct}%`, top: 0, bottom: 0,
          width: 0, borderLeft: `2px dashed ${COLOR_TODAY}`, zIndex: 2,
        }}
      />

      {/* Baseline bar */}
      {showBaseline && (
        <Tooltip
          title={`Baseline: ${formatThaiDateShort(bStart)} - ${formatThaiDateShort(bEnd)}`}
        >
          <div
            data-testid="baseline-bar"
            style={{
              position: 'absolute',
              left: `${baselineMetrics.leftPct}%`,
              top: baselineTop,
              width: `${baselineMetrics.widthPct}%`,
              height: baselineBarHeight,
              backgroundColor: COLOR_BASELINE_BAR,
              borderRadius: barRadius,
              border: viewMode === 'compare' ? `1px dashed ${COLORS.textDisabled}` : undefined,
            }}
          />
        </Tooltip>
      )}

      {/* Current bar with progress fill */}
      {showCurrent && (
        <Tooltip
          title={`${formatThaiDateShort(startDate)} - ${formatThaiDateShort(endDate)} | ${Math.round(progress * 100)}%`}
        >
          <div
            style={{
              position: 'absolute',
              left: `${currentMetrics.leftPct}%`,
              top: currentTop,
              width: `${currentMetrics.widthPct}%`,
              height: currentBarHeight,
              backgroundColor: COLOR_BASELINE_BAR,
              borderRadius: barRadius,
              overflow: 'hidden',
            }}
          >
            {currentMetrics.progressWidthPct > 0 && (
              <div
                style={{
                  width: `${(progress * 100)}%`,
                  height: '100%',
                  backgroundColor: barColor,
                  borderRadius: barRadius,
                  transition: 'width 0.3s ease',
                }}
              />
            )}
          </div>
        </Tooltip>
      )}

      {/* Parent bracket ends */}
      {isParent && showCurrent && (
        <>
          <div
            style={{
              position: 'absolute',
              left: `${currentMetrics.leftPct}%`,
              top: currentTop + currentBarHeight - 1,
              width: 6, height: 6,
              backgroundColor: COLORS.textMuted,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${currentMetrics.leftPct + currentMetrics.widthPct}% - 6px)`,
              top: currentTop + currentBarHeight - 1,
              width: 6, height: 6,
              backgroundColor: COLORS.textMuted,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }}
          />
        </>
      )}
    </div>
  );
}
