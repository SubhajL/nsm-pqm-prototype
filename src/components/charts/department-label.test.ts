import { describe, expect, it } from 'vitest';

import { departmentShortLabel } from './department-label';

describe('departmentShortLabel', () => {
  it('abbreviates regional irrigation offices to สชป.N', () => {
    expect(departmentShortLabel('สำนักงานชลประทานที่ 1')).toBe('สชป.1');
    expect(departmentShortLabel('สำนักงานชลประทานที่ 11')).toBe('สชป.11');
    expect(departmentShortLabel('สำนักงานชลประทานที่ 17')).toBe('สชป.17');
  });

  it('maps known long RID units to their abbreviation', () => {
    expect(departmentShortLabel('สำนักบริหารจัดการน้ำและอุทกวิทยา')).toBe('สบอ.');
    expect(departmentShortLabel('ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร')).toBe('ศทส.');
    expect(departmentShortLabel('สำนักวิจัยและพัฒนา')).toBe('สวพ.');
    expect(departmentShortLabel('กองพัฒนาแหล่งน้ำขนาดกลาง')).toBe('พน.กลาง');
    expect(departmentShortLabel('สำนักพัฒนาแหล่งน้ำขนาดใหญ่')).toBe('พน.ใหญ่');
  });

  it('passes short names through unchanged', () => {
    expect(departmentShortLabel('กองพัสดุ')).toBe('กองพัสดุ');
    expect(departmentShortLabel('กองแผนงาน')).toBe('กผง.');
  });

  it('truncates unknown long names with an ellipsis', () => {
    const result = departmentShortLabel('กองอำนวยการเฉพาะกิจที่ยังไม่มีตัวย่อ');
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBe(11); // 10 chars + ellipsis
  });

  it('returns an em dash for empty / whitespace input', () => {
    expect(departmentShortLabel('')).toBe('—');
    expect(departmentShortLabel('   ')).toBe('—');
  });
});
