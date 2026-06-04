/**
 * Short y-axis labels for RID org units on the "Status by Department"
 * chart. Official RID unit names are long (e.g.
 * "สำนักบริหารจัดการน้ำและอุทกวิทยา") and unreadable when stacked on a
 * horizontal bar axis, so the axis shows a compact abbreviation while the
 * tooltip shows the full name (see `PortfolioBarChart`).
 *
 * Pure + framework-free so it can be unit-tested under vitest's node env.
 */

/** Regional irrigation offices follow a strict numeric pattern. */
const REGIONAL_OFFICE_PATTERN = /^สำนักงานชลประทานที่\s*(\d+)$/;

/**
 * Official-ish RID abbreviations for the non-numeric units. Keyed by the
 * exact canonical Thai name in `src/data/org-structure.json`. Extend this
 * map when a new unit is assigned to a project so the axis stays compact.
 */
const UNIT_ABBREVIATIONS: Record<string, string> = {
  'สำนักบริหารจัดการน้ำและอุทกวิทยา': 'สบอ.',
  'กองพัฒนาแหล่งน้ำขนาดกลาง': 'พน.กลาง',
  'สำนักพัฒนาแหล่งน้ำขนาดใหญ่': 'พน.ใหญ่',
  'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร': 'ศทส.',
  'สำนักวิจัยและพัฒนา': 'สวพ.',
  'สำนักบริหารโครงการ': 'สบก.',
  'กองพัสดุ': 'กองพัสดุ',
  'กองการเงินและบัญชี': 'กง.การเงิน',
  'สำนักงานเลขานุการกรม': 'สลก.',
  'สำนักกฎหมายและที่ดิน': 'สกม.',
  'สำนักบริหารทรัพยากรบุคคล': 'สบค.',
  'สำนักสำรวจด้านวิศวกรรมและธรณีวิทยา': 'สสธ.',
  'สำนักออกแบบวิศวกรรมและสถาปัตยกรรม': 'สอก.',
  'สถาบันพัฒนาการชลประทาน': 'สพช.',
  'สำนักงานจัดรูปที่ดินกลาง': 'สจด.',
  'สำนักเครื่องจักรกล': 'สคก.',
  'กองแผนงาน': 'กผง.',
  'กลุ่มตรวจสอบภายใน': 'ตสน.',
  'กลุ่มพัฒนาระบบบริหาร': 'กพร.',
  'กองพัฒนาการบริหารจัดการน้ำและการมีส่วนร่วม': 'กพม.',
  'กองประสานงานโครงการอันเนื่องมาจากพระราชดำริ': 'กปร.',
  'หน่วยงานภายนอก (ที่ปรึกษา)': 'ภายนอก',
};

/** Names at or below this length render in full on the axis. */
const PASSTHROUGH_MAX_LENGTH = 10;

/**
 * Maps a full RID unit name to a compact axis label.
 *
 * - `สำนักงานชลประทานที่ N` → `สชป.N`
 * - known units → their abbreviation from `UNIT_ABBREVIATIONS`
 * - already-short names → unchanged
 * - anything else long → truncated with an ellipsis (keeps the axis tidy;
 *   the full name still shows in the tooltip)
 */
export function departmentShortLabel(fullName: string): string {
  const name = (fullName ?? '').trim();
  if (!name) return '—';

  const regional = name.match(REGIONAL_OFFICE_PATTERN);
  if (regional) return `สชป.${regional[1]}`;

  if (UNIT_ABBREVIATIONS[name]) return UNIT_ABBREVIATIONS[name];

  if (name.length > PASSTHROUGH_MAX_LENGTH) {
    return `${name.slice(0, PASSTHROUGH_MAX_LENGTH)}…`;
  }
  return name;
}
