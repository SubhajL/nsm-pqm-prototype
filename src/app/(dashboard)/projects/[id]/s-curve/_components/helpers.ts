import dynamic from 'next/dynamic';
import type dayjs from 'dayjs';

export const SCurveChart = dynamic(
  () =>
    import('@/components/charts/SCurveChart').then((m) => ({
      default: m.SCurveChart,
    })),
  { ssr: false },
);

export const CPISPITrendChart = dynamic(
  () =>
    import('@/components/charts/CPISPITrendChart').then((m) => ({
      default: m.CPISPITrendChart,
    })),
  { ssr: false },
);

export function formatMonthThai(month: dayjs.Dayjs) {
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const shortYear = (month.year() + 543) % 100;
  return `${thaiMonths[month.month()]} ${shortYear}`;
}
