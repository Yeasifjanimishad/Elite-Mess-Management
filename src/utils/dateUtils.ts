export function getRealTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getRealCurrentMonth(): string {
  return getRealTodayStr().slice(0, 7);
}

export function getDaysInMonth(monthStr: string): number {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return 30;
  return new Date(year, month, 0).getDate();
}

export function getMonthDates(monthStr: string): string[] {
  const count = getDaysInMonth(monthStr);
  return Array.from({ length: count }, (_, i) => {
    const dayNum = i + 1;
    return `${monthStr}-${dayNum < 10 ? '0' + dayNum : dayNum}`;
  });
}

export function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return getRealCurrentMonth();
  const date = new Date(year, month, 1); // month is 1-based, so `month` index gives next month
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

export function getPrevMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return getRealCurrentMonth();
  const date = new Date(year, month - 2, 1);
  const py = date.getFullYear();
  const pm = String(date.getMonth() + 1).padStart(2, '0');
  return `${py}-${pm}`;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export function formatMonthLabel(monthStr: string, lang: 'English' | 'Bangla' = 'English'): string {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthNumStr) - 1;
  if (isNaN(year) || isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return monthStr;
  if (lang === 'Bangla') {
    return `${MONTH_NAMES_BN[monthIdx]} ${year}`;
  }
  return `${MONTH_NAMES_EN[monthIdx]} ${year}`;
}

export function formatShortMonth(monthStr: string): string {
  const monthIdx = Number(monthStr.split('-')[1]) - 1;
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return monthStr;
  return MONTH_SHORT_EN[monthIdx];
}

export function formatDateDisplay(dateStr: string, lang: 'English' | 'Bangla' = 'English'): string {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const day = Number(dStr);
  if (isNaN(year) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) return dateStr;
  if (lang === 'Bangla') {
    return `${day} ${MONTH_NAMES_BN[monthIdx]}, ${year}`;
  }
  return `${MONTH_NAMES_EN[monthIdx]} ${day}, ${year}`;
}

export function formatMonthDayLabel(dateStr: string, lang: 'English' | 'Bangla' = 'English'): string {
  const [, mStr, dStr] = dateStr.split('-');
  const monthIdx = Number(mStr) - 1;
  const day = Number(dStr);
  if (isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) return dateStr;
  if (lang === 'Bangla') {
    return `${day} ${MONTH_NAMES_BN[monthIdx]}`;
  }
  return `${MONTH_NAMES_EN[monthIdx]} ${day}`;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/**
 * Returns { today, tomorrow } scoped to the mess's active billing month.
 * If the system clock is inside `activeMonth`, returns real today & tomorrow.
 * Otherwise (e.g. managing August 2026 in advance/retrospect), anchors today & tomorrow
 * cleanly inside `activeMonth` so quick-toggles and default dates stay in the active month.
 */
export function getEffectiveDatesForMonth(activeMonth: string): { today: string; tomorrow: string } {
  const realToday = getRealTodayStr();
  if (realToday.startsWith(activeMonth)) {
    return {
      today: realToday,
      tomorrow: addDaysToDateStr(realToday, 1)
    };
  }
  const daysCount = getDaysInMonth(activeMonth);
  const realDay = new Date().getDate();
  const clampedTodayDay = Math.min(Math.max(1, realDay), Math.max(1, daysCount - 1));
  const today = `${activeMonth}-${String(clampedTodayDay).padStart(2, '0')}`;
  const tomorrow = `${activeMonth}-${String(clampedTodayDay + 1).padStart(2, '0')}`;
  return { today, tomorrow };
}

export function getMonthPickerOptions(activeMonth: string, existingMonths: string[] = []): string[] {
  const set = new Set<string>();
  set.add(activeMonth);
  set.add(getPrevMonth(getPrevMonth(activeMonth)));
  set.add(getPrevMonth(activeMonth));
  set.add(getNextMonth(activeMonth));
  set.add(getNextMonth(getNextMonth(activeMonth)));
  set.add(getRealCurrentMonth());
  existingMonths.forEach(m => {
    if (/^\d{4}-\d{2}$/.test(m)) set.add(m);
  });
  return Array.from(set).sort();
}

export function getWeekRangesForMonth(monthStr: string, isBangla: boolean = false) {
  const daysInMonth = getDaysInMonth(monthStr);
  const shortMonth = formatShortMonth(monthStr);
  const bnMonth = MONTH_NAMES_BN[Number(monthStr.split('-')[1]) - 1] || monthStr;

  const ranges = [
    { id: 1, start: 1, end: 7 },
    { id: 2, start: 8, end: 14 },
    { id: 3, start: 15, end: 21 },
    { id: 4, start: 22, end: 28 },
    ...(daysInMonth > 28 ? [{ id: 5, start: 29, end: daysInMonth }] : [])
  ];

  return ranges.map(r => {
    const s = String(r.start).padStart(2, '0');
    const e = String(r.end).padStart(2, '0');
    return {
      ...r,
      name: isBangla
        ? `সপ্তাহ ${r.id} (${s}-${e} ${bnMonth})`
        : `Week ${r.id} (${shortMonth} ${s} - ${e})`
    };
  });
}

export function parseLockHourMinute(timeStr: string = '22:00'): { hour: number; minute: number } {
  const clean = (timeStr || '22:00').trim().toUpperCase();
  const amPmMatch = clean.match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM)$/);
  if (amPmMatch) {
    let h = Number(amPmMatch[1]);
    const m = Math.min(59, Math.max(0, Number(amPmMatch[2]) || 0));
    const period = amPmMatch[3];
    if (period === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return { hour: Math.min(23, Math.max(0, h)), minute: m };
  }
  const [rawH, rawM] = clean.split(':').map(Number);
  const hour = !isNaN(rawH) ? Math.min(23, Math.max(0, rawH)) : 22;
  const minute = !isNaN(rawM) ? Math.min(59, Math.max(0, rawM)) : 0;
  return { hour, minute };
}

export function parseTime24To12(timeStr: string = '22:00'): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const { hour, minute } = parseLockHourMinute(timeStr);
  const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hour12, minute, period };
}

export function formatTime12To24(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = Math.min(12, Math.max(1, hour12));
  const m = Math.min(59, Math.max(0, minute));
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12hDisplay(timeStr: string = '22:00'): string {
  const { hour12, minute, period } = parseTime24To12(timeStr);
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}
