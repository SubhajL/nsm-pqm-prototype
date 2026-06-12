import { describe, expect, it } from 'vitest';

import {
  THAI_DATE_FORMAT,
  THAI_MONTH_FORMAT,
  thaiBuddhistLocale,
} from './antd-thai-locale';

interface DatePickerLang {
  locale: string;
  fieldDateFormat?: string;
  fieldMonthFormat?: string;
  fieldYearFormat?: string;
  yearFormat?: string;
  cellYearFormat?: string;
}

function pickerLang(): DatePickerLang {
  const picker = thaiBuddhistLocale.DatePicker as
    | { lang: DatePickerLang }
    | undefined;
  if (!picker) throw new Error('locale is missing the DatePicker section');
  return picker.lang;
}

describe('thaiBuddhistLocale (PR-32)', () => {
  it('keeps the Thai base locale', () => {
    expect(thaiBuddhistLocale.locale).toBe('th');
    expect(pickerLang().locale).toBe('th_TH');
  });

  it('renders input fields and year cells in Buddhist Era', () => {
    const lang = pickerLang();
    expect(lang.fieldDateFormat).toBe(THAI_DATE_FORMAT);
    expect(lang.fieldMonthFormat).toBe(THAI_MONTH_FORMAT);
    expect(lang.fieldYearFormat).toBe('BBBB');
    expect(lang.yearFormat).toBe('BBBB');
    expect(lang.cellYearFormat).toBe('BBBB');
  });

  it('locks the shared format constants to BBBB forms', () => {
    expect(THAI_DATE_FORMAT).toBe('DD/MM/BBBB');
    expect(THAI_MONTH_FORMAT).toBe('MM/BBBB');
  });
});
