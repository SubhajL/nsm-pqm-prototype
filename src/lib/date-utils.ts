import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

/** Convert CE year to Thai Buddhist Era (BE = CE + 543) */
export function toBuddhistYear(ceYear: number): number {
  return ceYear + 543;
}

/** Format ISO date string to Thai display: DD/MM/BBBB */
export function formatThaiDate(isoDate: string): string {
  const d = dayjs(isoDate);
  const day = d.format('DD');
  const month = d.format('MM');
  const beYear = toBuddhistYear(d.year());
  return `${day}/${month}/${beYear}`;
}

/** Format ISO date to Thai short month: "15 ก.ค. 69" */
export function formatThaiDateShort(isoDate: string): string {
  const d = dayjs(isoDate);
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const day = d.date();
  const month = thaiMonths[d.month()];
  const beYear = toBuddhistYear(d.year()) % 100; // Short year: 2569 → 69
  return `${day} ${month} ${beYear}`;
}

/** Format number as Thai Baht */
export function formatBaht(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format number as abbreviated Thai Baht: 12,500,000 → "12.5M฿" */
export function formatBahtShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M฿`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K฿`;
  return `${amount}฿`;
}

/** Format percentage: 0.65 → "65%" */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
