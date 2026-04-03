# Charts — ECharts Components

**Technology**: Apache ECharts 5.x via `echarts-for-react`
**Parent Context**: [../../CLAUDE.md](../../../CLAUDE.md)

## Rules

- **MUST** use `'use client'` on every chart component
- **MUST** wrap chart imports with `dynamic(() => import(...), { ssr: false })` when used in page components
- **MUST** use theme colors from `@/theme/antd-theme.ts` — never hardcode hex values in chart options
- **MUST** set `notMerge={true}` on ReactECharts to prevent option accumulation on re-renders
- **MUST** format numbers with Thai locale: `Intl.NumberFormat('th-TH')` in tooltip formatters
- **SHOULD** set explicit `height` via style prop — never rely on auto-height for charts

## Component Inventory

| Component | Type | Used In | Key Features |
|---|---|---|---|
| `EChartsWrapper.tsx` | Generic | All charts | SSR-safe wrapper, theme injection, resize observer |
| `PortfolioBarChart.tsx` | Stacked Bar | 1.1, 6.1 | Horizontal bars, department grouping |
| `ProjectDonutChart.tsx` | Donut/Pie | 1.1, 6.1 | Project type breakdown, legend |
| `SCurveChart.tsx` | Multi-line | 2.4 | PV/EV/AC curves, today marker, area fill |
| `CPISPITrendChart.tsx` | Dual-line | 2.4 | Reference line at 1.0, monthly x-axis |
| `RiskHeatMap.tsx` | Custom Heatmap | 4.1 | 5x5 grid, color cells, risk count labels |
| `RiskTrendChart.tsx` | Line | 4.1 | Open vs Closed over time |
| `RadarChart.tsx` | Radar/Spider | 6.2 | 5-axis evaluation, filled area |
| `CircularProgress.tsx` | Gauge | 2.1 | Percentage ring, center label |

## Pattern — Creating a New Chart Component

```typescript
'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { CHART_COLORS } from '@/theme/antd-theme';

interface Props {
  data: SomeDataType[];
  height?: number;
}

export function MyChart({ data, height = 400 }: Props) {
  const option: EChartsOption = {
    // Build option from data
    color: [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning],
    tooltip: { trigger: 'axis' },
    // ...
  };

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}
```

## S-Curve Specific Notes

The S-Curve (Screen 2.4) is the most complex chart. It requires:
- 3 series: PV (dashed blue), EV (solid green), AC (solid orange)
- X-axis: Thai months (เม.ย. through ก.ย.)
- Y-axis: Thai Baht formatted (e.g., "8.1M฿")
- Vertical "today" marker line via `markLine`
- Area between PV and EV can show schedule variance visually
- Data source: `src/data/evm-data.json` with monthly snapshots

## Risk Heat Map Notes

The 5x5 Risk Matrix (Screen 4.1) is NOT a standard ECharts chart type. Build it as:
- Use ECharts `heatmap` series type
- Custom `visualMap` with 4 color ranges: green (1-4), yellow (5-9), orange (10-15), red (16-25)
- Overlay scatter points for individual risk positions
- X-axis labels: bilingual likelihood levels
- Y-axis labels: bilingual impact levels
