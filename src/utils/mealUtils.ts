import { MealStatus, MemberMealSheet, SystemSettings, User } from '../types';
import { getRealTodayStr } from './dateUtils';

export const EMPTY_DAY_MEAL: MealStatus = {
  breakfast: false,
  lunch: false,
  dinner: false,
  guestBreakfast: 0,
  guestLunch: 0,
  guestDinner: 0,
};

/**
 * Resolves the effective meal reservation status for a user on a given date.
 * - Vacation days are always OFF.
 * - Explicit saved entries in `sheet.meals[date]` take precedence.
 * - For today and all upcoming days in an open active month (or future active months),
 *   when no explicit entry exists yet and both global `settings.defaultMealOn` and
 *   per-member `user.defaultMealOn` are enabled, Breakfast, Lunch, and Dinner start ON automatically.
 */
export function getEffectiveDayMeal(
  sheet: MemberMealSheet | undefined,
  user: User | undefined,
  date: string,
  settings: Pick<SystemSettings, 'defaultMealOn' | 'isMonthClosed' | 'activeMonth'>,
  today: string,
  _tomorrow: string,
  isUserOnVacation: boolean
): MealStatus {
  if (isUserOnVacation) {
    return { ...EMPTY_DAY_MEAL };
  }

  const explicit = sheet?.meals[date];
  if (explicit) {
    return explicit;
  }

  const activeMonth = settings.activeMonth || today.slice(0, 7);
  const dateMonth = date.slice(0, 7);
  const realToday = getRealTodayStr();
  const realCurrentMonth = realToday.slice(0, 7);

  let minAutoDate = '9999-99-99';
  if (activeMonth === realCurrentMonth) {
    minAutoDate = realToday;
  } else if (activeMonth > realCurrentMonth) {
    minAutoDate = `${activeMonth}-01`;
  }

  const isAutoEligibleDate = dateMonth === activeMonth && date >= minAutoDate;

  if (
    isAutoEligibleDate &&
    !settings.isMonthClosed &&
    settings.defaultMealOn &&
    user?.isActive &&
    user.defaultMealOn !== false
  ) {
    return {
      breakfast: true,
      lunch: true,
      dinner: true,
      guestBreakfast: 0,
      guestLunch: 0,
      guestDinner: 0,
    };
  }

  return { ...EMPTY_DAY_MEAL };
}
