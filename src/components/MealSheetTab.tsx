import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Edit3, 
  HelpCircle, 
  Users, 
  Plus, 
  Minus,
  Save,
  Lock,
  Unlock,
  Plane,
  AlertCircle,
  Info,
  CalendarDays,
  FileSpreadsheet,
  Search,
  Keyboard
} from 'lucide-react';
import { User, MemberMealSheet, MealStatus, SystemSettings, VacationPeriod } from '../types';
import { useFeedback } from './FeedbackContext';
import {
  getRealCurrentMonth,
  getDaysInMonth,
  getMonthDates,
  formatMonthLabel,
  formatDateDisplay,
  getEffectiveDatesForMonth,
  getMonthPickerOptions
} from '../utils/dateUtils';

interface MealSheetTabProps {
  currentUser: User;
  role: 'Admin' | 'Meal Manager' | 'Member';
  allUsers: User[];
  meals: MemberMealSheet[];
  onUpdateMeals: (updatedMeals: MemberMealSheet[]) => void;
  settings: SystemSettings;
  vacationPeriods: VacationPeriod[];
  onAddVacation: (userId: string, startDate: string, endDate: string) => void;
  onUpdateVacation?: (id: string, userId: string, startDate: string, endDate: string) => void;
  onCancelVacation: (id: string) => void;
  onLogAction: (actionName: string, details: string, oldValue?: string, newValue?: string) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
}

export default function MealSheetTab({
  currentUser,
  role,
  allUsers,
  meals,
  onUpdateMeals,
  settings,
  vacationPeriods,
  onAddVacation,
  onUpdateVacation,
  onCancelVacation,
  onLogAction,
  onUpdateSettings
}: MealSheetTabProps) {

  const { showToast } = useFeedback();

  const isManagerOrAdmin = role === 'Admin' || role === 'Meal Manager';
  const isBangla = settings.language === 'Bangla';
  const activeMonth = settings.activeMonth || getRealCurrentMonth();
  const { today, tomorrow } = getEffectiveDatesForMonth(activeMonth);
  const [selectedMonth, setSelectedMonth] = useState(activeMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedCell, setFocusedCell] = useState<{ userId: string; date: string } | null>(null);

  React.useEffect(() => {
    setSelectedMonth(activeMonth);
  }, [activeMonth]);

  const daysInMonth = getDaysInMonth(selectedMonth);
  const dates = getMonthDates(selectedMonth);
  const monthOptions = getMonthPickerOptions(
    activeMonth,
    [
      selectedMonth,
      ...(settings.closedMonths?.map(c => c.month) || [])
    ]
  );

  // Cell Editing state
  const [editingCell, setEditingCell] = useState<{
    userId: string;
    userName: string;
    date: string;
    mealsState: MealStatus;
    reason: string;
  } | null>(null);

  // Vacation states
  const defaultVacStartDay = today.startsWith(selectedMonth) ? today.split('-')[2] : '01';
  const defaultVacEndNum = Math.min(Number(defaultVacStartDay) + 6, daysInMonth);
  const [vacationStart, setVacationStart] = useState(`${selectedMonth}-${defaultVacStartDay}`);
  const [vacationEnd, setVacationEnd] = useState(`${selectedMonth}-${String(defaultVacEndNum).padStart(2, '0')}`);
  const [vacationUser, setVacationUser] = useState(currentUser.id);
  const [vacationError, setVacationError] = useState('');
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null);

  // Update vacation defaults when month or currentUser changes
  React.useEffect(() => {
    const startDay = today.startsWith(selectedMonth) ? today.split('-')[2] : '01';
    const endDay = Math.min(Number(startDay) + 6, getDaysInMonth(selectedMonth));
    setVacationStart(`${selectedMonth}-${startDay}`);
    setVacationEnd(`${selectedMonth}-${String(endDay).padStart(2, '0')}`);
    if (!editingVacationId) {
      setVacationUser(currentUser.id);
    }
  }, [selectedMonth, currentUser.id, editingVacationId, today]);

  const handleEditVacationClick = (vp: VacationPeriod) => {
    setEditingVacationId(vp.id);
    setVacationStart(vp.startDate);
    setVacationEnd(vp.endDate);
    setVacationUser(vp.userId);
    setVacationError('');
  };

  const handleCancelEditVacation = () => {
    setEditingVacationId(null);
    setVacationStart(`${selectedMonth}-19`);
    setVacationEnd(`${selectedMonth}-25`);
    setVacationUser(currentUser.id);
    setVacationError('');
  };

  const handleCreateVacation = () => {
    setVacationError('');
    if (!vacationStart || !vacationEnd) {
      setVacationError('Please select both start and end dates.');
      return;
    }
    if (vacationEnd < vacationStart) {
      setVacationError('End Date cannot be earlier than Start Date.');
      return;
    }

    const startDay = parseInt(vacationStart.split('-')[2]);
    const endDay = parseInt(vacationEnd.split('-')[2]);
    if (isNaN(startDay) || isNaN(endDay) || startDay < 1 || endDay > daysInMonth) {
      setVacationError(`Please select valid dates in ${selectedMonth}.`);
      return;
    }

    if (editingVacationId) {
      if (onUpdateVacation) {
        onUpdateVacation(editingVacationId, vacationUser, vacationStart, vacationEnd);
      } else {
        onCancelVacation(editingVacationId);
        onAddVacation(vacationUser, vacationStart, vacationEnd);
      }
      setEditingVacationId(null);
      showToast(isBangla ? 'ছুটির সময়সূচী আপডেট হয়েছে।' : 'Vacation period updated.', 'success');
    } else {
      const existing = vacationPeriods.find(vp => vp.userId === vacationUser);
      if (existing && onUpdateVacation) {
        onUpdateVacation(existing.id, vacationUser, vacationStart, vacationEnd);
        showToast(isBangla ? 'ছুটির সময়সূচী আপডেট হয়েছে।' : 'Vacation period updated.', 'success');
      } else {
        onAddVacation(vacationUser, vacationStart, vacationEnd);
        showToast(isBangla ? 'নতুন ছুটি সেড্যুল করা হয়েছে।' : 'Vacation schedule created.', 'success');
      }
    }
  };

  const visibleVacations = isManagerOrAdmin 
    ? vacationPeriods 
    : vacationPeriods.filter(vp => vp.userId === currentUser.id);

  // Helper to determine if a user is on vacation for a date
  const isVacation = (userId: string, date: string): boolean => {
    return vacationPeriods?.some(vp => vp.userId === userId && date >= vp.startDate && date <= vp.endDate) || false;
  };

  // Lock status check for a member
  const checkIsLockedForMember = (date: string): { locked: boolean; reason?: string } => {
    if (isManagerOrAdmin) return { locked: false };
    if (settings.isMonthClosed && date.startsWith(activeMonth)) return { locked: true, reason: 'Month is closed' };
    if (date.slice(0, 7) < activeMonth) return { locked: true, reason: 'Past month is locked' };

    // Members cannot edit past dates or today
    if (date <= today) {
      return { locked: true, reason: 'Past and today\'s meals cannot be modified by members' };
    }

    const isTomorrow = date === tomorrow;
    if (isTomorrow) {
      if (settings.lockOverride) return { locked: false }; // Manager override is active

      const now = new Date();
      const [lockHour, lockMinute] = settings.mealLockTime.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (currentHour > lockHour || (currentHour === lockHour && currentMinute >= lockMinute)) {
        return { locked: true, reason: `Locked at ${settings.mealLockTime} (Lock time passed)` };
      }
    }

    return { locked: false };
  };

  // Helper to determine status and label of a cell
  const getCellData = (sheet: MemberMealSheet, date: string) => {
    const isUserVacationActive = isVacation(sheet.userId, date);

    const dayMeal = isUserVacationActive 
      ? { breakfast: false, lunch: false, dinner: false, guestBreakfast: 0, guestLunch: 0, guestDinner: 0 }
      : (sheet.meals[date] || {
          breakfast: false, lunch: false, dinner: false,
          guestBreakfast: 0, guestLunch: 0, guestDinner: 0
        });

    const hasOwn = dayMeal.breakfast || dayMeal.lunch || dayMeal.dinner;
    const totalGuests = (dayMeal.guestBreakfast || 0) + (dayMeal.guestLunch || 0) + (dayMeal.guestDinner || 0);
    const isLocked = settings.isMonthClosed || checkIsLockedForMember(date).locked;

    let cellLabel = '';
    let bgColorClass = '';
    let textColorClass = '';

    if (isUserVacationActive) {
      bgColorClass = 'bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-950/50 border-sky-200/70 dark:border-sky-800/60';
      textColorClass = 'text-sky-600 dark:text-sky-400 font-bold';
      cellLabel = '✈ VAC';
    } else if (isLocked) {
      bgColorClass = 'bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/50 dark:hover:bg-slate-800/70 border-slate-200 dark:border-slate-800';
      textColorClass = 'text-slate-400 dark:text-slate-500 font-bold';
      cellLabel = hasOwn ? '✔' : '✖';
    } else if (!hasOwn && totalGuests === 0) {
      bgColorClass = 'bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 border-rose-100/50 dark:border-rose-950/30';
      textColorClass = 'text-rose-600 dark:text-rose-400 font-bold';
      cellLabel = '✖';
    } else if (dayMeal.breakfast && dayMeal.lunch && dayMeal.dinner) {
      bgColorClass = 'bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border-emerald-100/50 dark:border-emerald-950/30';
      textColorClass = 'text-emerald-700 dark:text-emerald-400 font-bold';
      cellLabel = '✔';
    } else {
      bgColorClass = 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 border-amber-100/50 dark:border-amber-950/30';
      textColorClass = 'text-amber-700 dark:text-amber-400 font-bold';
      cellLabel = hasOwn ? '✔' : '✖';
    }

    if (totalGuests > 0 && !isUserVacationActive) {
      cellLabel += ` G${totalGuests}`;
    }

    return {
      dayMeal,
      cellLabel,
      bgColorClass,
      textColorClass,
      totalGuests,
      isLocked
    };
  };

  // Row summaries calculation
  const calculateRowTotals = (sheet: MemberMealSheet) => {
    let totalMeals = 0;
    let totalGuestMeals = 0;

    dates.forEach(date => {
      if (isVacation(sheet.userId, date)) {
        return; // skip meals, they are OFF automatically during vacation
      }
      const m = sheet.meals[date] || {
        breakfast: false, lunch: false, dinner: false,
        guestBreakfast: 0, guestLunch: 0, guestDinner: 0
      };
      // breakfast = 0.5 meal, lunch = 1, dinner = 1
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0);
      const guest = ((m.guestBreakfast || 0) * 0.5) + ((m.guestLunch || 0) * 1) + ((m.guestDinner || 0) * 1);
      
      totalMeals += own;
      totalGuestMeals += guest;
    });

    return {
      totalMeals,
      totalGuestMeals,
      finalMeals: totalMeals + totalGuestMeals
    };
  };

  // Column totals calculation
  const calculateDailyColumnTotals = (dateStr: string) => {
    let ownTotal = 0;
    let guestTotal = 0;

    visibleMeals.forEach(sheet => {
      if (isVacation(sheet.userId, dateStr)) return;
      const m = sheet.meals[dateStr] || {
        breakfast: false, lunch: false, dinner: false,
        guestBreakfast: 0, guestLunch: 0, guestDinner: 0
      };
      ownTotal += (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      guestTotal += ((m.guestBreakfast || 0) * 0.5) + ((m.guestLunch || 0) * 1.0) + ((m.guestDinner || 0) * 1.0);
    });

    return {
      ownTotal,
      guestTotal,
      finalTotal: ownTotal + guestTotal
    };
  };

  // Google Sheets keyboard arrow key cell selection handler
  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // If the modal is open, ignore keyboard navigation
    if (editingCell) return;

    if (!focusedCell) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (visibleMeals.length > 0 && dates.length > 0) {
          setFocusedCell({ userId: visibleMeals[0].userId, date: dates[0] });
          e.preventDefault();
        }
      }
      return;
    }

    const rowIndex = visibleMeals.findIndex(sheet => sheet.userId === focusedCell.userId);
    const colIndex = dates.indexOf(focusedCell.date);

    if (rowIndex === -1 || colIndex === -1) return;

    let newRowIndex = rowIndex;
    let newColIndex = colIndex;

    switch (e.key) {
      case 'ArrowUp':
        if (rowIndex > 0) newRowIndex = rowIndex - 1;
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (rowIndex < visibleMeals.length - 1) newRowIndex = rowIndex + 1;
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (colIndex > 0) newColIndex = colIndex - 1;
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (colIndex < dates.length - 1) newColIndex = colIndex + 1;
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        const sheet = visibleMeals[rowIndex];
        const uObj = allUsers.find(x => x.id === sheet.userId) || { name: 'Unknown' };
        handleCellClick(sheet, uObj.name, focusedCell.date);
        e.preventDefault();
        break;
      default:
        return;
    }

    setFocusedCell({
      userId: visibleMeals[newRowIndex].userId,
      date: dates[newColIndex]
    });
  };

  // Open editing modal
  const handleCellClick = (sheet: MemberMealSheet, userName: string, date: string) => {
    // Also update focused cell on mouse click for seamless alignment
    setFocusedCell({ userId: sheet.userId, date });

    if (settings.isMonthClosed) return;
    
    // Non-managers can only view (or edit their own row if unlocked)
    if (!isManagerOrAdmin) {
      if (sheet.userId !== currentUser.id) return;
      
      const lockCheck = checkIsLockedForMember(date);
      if (lockCheck.locked) {
        showToast(isBangla ? `এই তারিখের এডিট লক করা হয়েছে: ${lockCheck.reason}` : `This date is locked for editing: ${lockCheck.reason}`, 'warning');
        return;
      }

      if (isVacation(sheet.userId, date)) {
        showToast(isBangla ? "আপনি এই তারিখে ছুটিতে আছেন। এডিট করতে ছুটি বাতিল করুন।" : "You are on vacation on this date. Cancel your vacation to edit.", 'warning');
        return;
      }
    }

    const dayMeal = isVacation(sheet.userId, date)
      ? { breakfast: false, lunch: false, dinner: false, guestBreakfast: 0, guestLunch: 0, guestDinner: 0 }
      : (sheet.meals[date] || {
          breakfast: false, lunch: false, dinner: false,
          guestBreakfast: 0, guestLunch: 0, guestDinner: 0
        });

    setEditingCell({
      userId: sheet.userId,
      userName,
      date,
      mealsState: { ...dayMeal },
      reason: ''
    });
  };

  // Save edited cell
  const handleSaveCell = () => {
    if (!editingCell) return;

    if (isManagerOrAdmin) {
      if (!editingCell.reason.trim()) {
        showToast(isBangla ? "হিসাব ম্যানুয়াল পরিবর্তনের জন্য একটি কারণ অবশ্যই উল্লেখ করতে হবে।" : "Please specify a mandatory reason for this manual adjustment.", 'error');
        return;
      }
    }

    const updated = meals.map(sheet => {
      if (sheet.userId === editingCell.userId) {
        return {
          ...sheet,
          meals: {
            ...sheet.meals,
            [editingCell.date]: editingCell.mealsState
          }
        };
      }
      return sheet;
    });

    onUpdateMeals(updated);

    // Dynamic logging for audit logs
    const targetSheet = meals.find(sheet => sheet.userId === editingCell.userId);
    const oldDayMeal = targetSheet?.meals[editingCell.date] || {
      breakfast: false, lunch: false, dinner: false,
      guestBreakfast: 0, guestLunch: 0, guestDinner: 0
    };

    const oldMealLabel = `Breakfast:${oldDayMeal.breakfast ? 'ON' : 'OFF'}, Lunch:${oldDayMeal.lunch ? 'ON' : 'OFF'}, Dinner:${oldDayMeal.dinner ? 'ON' : 'OFF'}, Guests(B:${oldDayMeal.guestBreakfast || 0}, L:${oldDayMeal.guestLunch || 0}, D:${oldDayMeal.guestDinner || 0})`;
    const newMealLabel = `Breakfast:${editingCell.mealsState.breakfast ? 'ON' : 'OFF'}, Lunch:${editingCell.mealsState.lunch ? 'ON' : 'OFF'}, Dinner:${editingCell.mealsState.dinner ? 'ON' : 'OFF'}, Guests(B:${editingCell.mealsState.guestBreakfast}, L:${editingCell.mealsState.guestLunch}, D:${editingCell.mealsState.guestDinner})`;

    const isGuestChange = (oldDayMeal.guestBreakfast || 0) !== editingCell.mealsState.guestBreakfast ||
                         (oldDayMeal.guestLunch || 0) !== editingCell.mealsState.guestLunch ||
                         (oldDayMeal.guestDinner || 0) !== editingCell.mealsState.guestDinner;

    if (isManagerOrAdmin) {
      onLogAction(
        'Meal Adjustments', 
        `Manager adjusted ${editingCell.userName}'s meals for ${editingCell.date}. Reason: ${editingCell.reason}`,
        oldMealLabel,
        newMealLabel
      );
    } else {
      const actionCategory = isGuestChange ? 'Guest Meals' : 'Meal Updates';
      onLogAction(
        actionCategory, 
        `${editingCell.userName} updated tomorrow's meals for ${editingCell.date}`,
        oldMealLabel,
        newMealLabel
      );
    }

    setEditingCell(null);
  };

  // Only show the currentUser's row if they are a standard Member, filtered by search query
  const baseMeals = isManagerOrAdmin 
    ? meals 
    : meals.filter(sheet => sheet.userId === currentUser.id);

  const visibleMeals = baseMeals.filter(sheet => {
    const userObj = allUsers.find(u => u.id === sheet.userId);
    if (!userObj) return false;
    return userObj.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5" id="mealsheet-tab">

      {/* Header & Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isBangla ? `মিল শিট · ${formatMonthLabel(selectedMonth, settings.language)}` : `Digital Meal Sheet · ${formatMonthLabel(selectedMonth, settings.language)}`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {isManagerOrAdmin
                ? (isBangla
                    ? 'সকল মেম্বারের মাসিক মিল। যেকোনো ঘরের মিল বা গেস্ট সংখ্যা পরিবর্তন করতে ক্লিক করুন।'
                    : 'Click any cell to adjust a member’s meals or guest counts for that day.')
                : (isBangla
                    ? 'আপনার দৈনিক মিলের তালিকা। আনলক থাকা দিনে ক্লিক করে মিল পরিবর্তন করুন।'
                    : 'Your monthly meal schedule. Click an unlocked day to update your meals.')}
            </p>
          </div>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 px-3.5 py-2 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/25 border border-emerald-500/40" />
            <span className="text-slate-600 dark:text-slate-300">{isBangla ? 'পূর্ণ' : 'Full'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/25 border border-amber-500/40" />
            <span className="text-slate-600 dark:text-slate-300">{isBangla ? 'আংশিক' : 'Partial'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/25 border border-rose-500/40" />
            <span className="text-slate-600 dark:text-slate-300">{isBangla ? 'বন্ধ' : 'OFF'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-500/25 border border-sky-500/40" />
            <span className="text-slate-600 dark:text-slate-300">{isBangla ? 'ছুটি' : 'Vacation'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
            <span className="text-slate-600 dark:text-slate-300">{isBangla ? 'লকড' : 'Locked'}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER INTERFACE PANEL */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 max-w-2xl">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder={isBangla ? 'নাম দিয়ে মেম্বার খুঁজুন...' : 'Search members by name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
            />
          </div>

          {/* Month selector */}
          <div className="relative w-full sm:w-52">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m} value={m}>
                  {formatMonthLabel(m, settings.language)}{m === activeMonth ? (isBangla ? ' (সক্রিয়)' : ' (Active)') : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Keyboard interaction tips */}
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 px-3 py-2 rounded-xl">
          <Keyboard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{isBangla ? 'অ্যারো কী দিয়ে ঘুরুন, Enter/Space দিয়ে এডিট করুন' : 'Use arrow keys to move, Enter or Space to edit'}</span>
        </div>
      </div>

      {/* HORIZONTALLY & VERTICALLY SCROLLABLE TABLE CONTAINER */}
      <div
        className="relative max-h-[550px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
        tabIndex={0}
        onKeyDown={handleTableKeyDown}
        id="sheets-table-container"
      >
        <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              {/* Sticky Top-Left Corner cell */}
              <th className="sticky left-0 top-0 z-35 w-44 px-4 py-3 bg-slate-100 dark:bg-slate-950 border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold">
                {isBangla ? 'মেম্বার' : 'Members'}
              </th>

              {/* Sticky Dates Columns */}
              {dates.map((date, index) => {
                const dayNum = index + 1;
                const isToday = date === today;
                return (
                  <th
                    key={date}
                    className={`sticky top-0 z-20 w-12 px-1 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800 tabular-nums ${
                      isToday
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {dayNum}
                  </th>
                );
              })}

              {/* Sticky Summary columns */}
              <th className="sticky top-0 z-20 w-20 px-2 py-3 text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                {isBangla ? 'নিজ' : 'Own'}
              </th>
              <th className="sticky top-0 z-20 w-20 px-2 py-3 text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                {isBangla ? 'অতিথি' : 'Guest'}
              </th>
              <th className="sticky top-0 z-20 w-24 px-2 py-3 text-center text-emerald-700 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                {isBangla ? 'মোট' : 'Final'}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleMeals.length === 0 ? (
              <tr>
                <td colSpan={dates.length + 4} className="px-6 py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
                  {isBangla ? 'কোনো মেম্বার পাওয়া যায়নি।' : 'No members matched your search.'}
                </td>
              </tr>
            ) : (
              visibleMeals.map((sheet) => {
                const u = allUsers.find(user => user.id === sheet.userId) || { name: 'Unknown User', avatarUrl: '' };
                const totals = calculateRowTotals(sheet);

                return (
                  <tr
                    key={sheet.userId}
                    className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Sticky left member cell */}
                    <td className="sticky left-0 z-10 px-4 py-2.5 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                          alt={u.name}
                          className="w-6 h-6 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-semibold truncate text-slate-800 dark:text-white max-w-[110px]" title={u.name}>{u.name}</span>
                      </div>
                    </td>

                    {/* Dates cells */}
                    {dates.map((date) => {
                      const { cellLabel, bgColorClass, textColorClass, dayMeal, isLocked } = getCellData(sheet, date);
                      const isToday = date === today;
                      const isCellFocused = focusedCell && focusedCell.userId === sheet.userId && focusedCell.date === date;
                      const canEdit = isManagerOrAdmin || (sheet.userId === currentUser.id && !checkIsLockedForMember(date).locked);

                      return (
                        <td
                          key={date}
                          onClick={() => handleCellClick(sheet, u.name, date)}
                          className={`text-center py-2.5 px-0.5 border-r border-slate-100 dark:border-slate-800 select-none cursor-pointer group/cell relative ${bgColorClass} ${textColorClass} ${isCellFocused ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900 z-10 relative font-black' : ''} ${isToday && !isCellFocused ? 'ring-1 ring-inset ring-emerald-500/35' : ''}`}
                          title={isBangla ? 'বিস্তারিত দেখতে বা এডিট করতে ক্লিক করুন' : 'Click to view details or edit'}
                        >
                          <span className="font-bold text-[10px]">{cellLabel}</span>

                          {/* Elegant Hover Breakdown Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 text-slate-200 text-[10px] rounded-xl p-2.5 opacity-0 pointer-events-none group-hover/cell:opacity-100 transition-opacity duration-150 z-50 shadow-xl border border-slate-800">
                            <p className="font-bold border-b border-slate-800 pb-1 mb-1.5 text-white flex justify-between">
                              <span>{formatMonthLabel(selectedMonth, settings.language)} {date.split('-')[2]}</span>
                              {isLocked && <Lock size={10} className="text-slate-400" />}
                            </p>
                            <div className="grid grid-cols-2 gap-y-1 text-[10px]">
                              <span className="text-slate-400">{isBangla ? 'সকাল:' : 'Breakfast:'}</span>
                              <span className="font-medium text-right">{dayMeal.breakfast ? 'ON (0.5)' : 'OFF'}</span>
                              <span className="text-slate-400">{isBangla ? 'দুপুর:' : 'Lunch:'}</span>
                              <span className="font-medium text-right">{dayMeal.lunch ? 'ON (1.0)' : 'OFF'}</span>
                              <span className="text-slate-400">{isBangla ? 'রাত:' : 'Dinner:'}</span>
                              <span className="font-medium text-right">{dayMeal.dinner ? 'ON (1.0)' : 'OFF'}</span>
                              <span className="text-slate-400 border-t border-slate-800 pt-1 mt-0.5">{isBangla ? 'অতিথি:' : 'Guests (B/L/D):'}</span>
                              <span className="font-medium text-right border-t border-slate-800 pt-1 mt-0.5">
                                {dayMeal.guestBreakfast}/{dayMeal.guestLunch}/{dayMeal.guestDinner}
                              </span>
                            </div>
                            {canEdit && !settings.isMonthClosed && (
                              <p className="text-[9px] text-emerald-400 mt-2 font-semibold text-center flex items-center justify-center gap-1">
                                <Edit3 size={9} /> {isBangla ? 'এডিট করতে ক্লিক করুন' : 'Click to adjust'}
                              </p>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Summaries cells */}
                    <td className="px-2 py-2.5 text-center border-r border-slate-100 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/20 tabular-nums">
                      {totals.totalMeals.toFixed(1)}
                    </td>
                    <td className="px-2 py-2.5 text-center border-r border-slate-100 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/20 tabular-nums">
                      {totals.totalGuestMeals.toFixed(1)}
                    </td>
                    <td className="px-2 py-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/8 tabular-nums">
                      {totals.finalMeals.toFixed(1)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Bottom Row for Column Totals */}
          {visibleMeals.length > 0 && (
            <tfoot className="sticky bottom-0 z-25 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
              <tr className="text-[11px] font-bold uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                {/* Sticky Left footer label cell */}
                <td className="sticky left-0 bottom-0 z-30 px-4 py-3 bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 font-extrabold text-slate-800 dark:text-white">
                  {isBangla ? 'দৈনিক মোট' : 'Daily Totals'}
                </td>

                {/* Dynamically calculated daily totals columns */}
                {dates.map((date) => {
                  const colTotals = calculateDailyColumnTotals(date);
                  const isToday = date === today;
                  return (
                    <td
                      key={`foot-${date}`}
                      className={`text-center py-2.5 px-0.5 border-r border-slate-200 dark:border-slate-800 font-bold text-[10px] group/foot relative tabular-nums ${
                        isToday ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {colTotals.finalTotal.toFixed(1)}

                      {/* Daily Totals Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-slate-950 text-slate-200 text-[10px] rounded-xl p-2.5 opacity-0 pointer-events-none group-hover/foot:opacity-100 transition-opacity duration-150 z-50 shadow-2xl border border-slate-800">
                        <p className="font-bold border-b border-slate-800 pb-1 mb-1.5 text-white text-center">
                          {isBangla ? 'মিল সংখ্যা' : 'Meals Count'}
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">{isBangla ? 'নিজ:' : 'Own:'}</span>
                            <span className="font-bold text-white">{colTotals.ownTotal.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">{isBangla ? 'অতিথি:' : 'Guests:'}</span>
                            <span className="font-bold text-white">{colTotals.guestTotal.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  );
                })}

                {/* Overall Totals */}
                <td className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold bg-slate-100/70 dark:bg-slate-900/50 tabular-nums">
                  {visibleMeals.reduce((acc, sheet) => acc + calculateRowTotals(sheet).totalMeals, 0).toFixed(1)}
                </td>
                <td className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold bg-slate-100/70 dark:bg-slate-900/50 tabular-nums">
                  {visibleMeals.reduce((acc, sheet) => acc + calculateRowTotals(sheet).totalGuestMeals, 0).toFixed(1)}
                </td>
                <td className="px-2 py-3 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-500/12 font-extrabold tabular-nums">
                  {visibleMeals.reduce((acc, sheet) => acc + calculateRowTotals(sheet).finalMeals, 0).toFixed(1)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* POPUP MODAL FOR CELL EDITING */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">

            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-[11px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {isBangla ? 'মিল পরিবর্তন করুন' : 'Update Meals'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {editingCell.userName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <CalendarDays size={14} className="text-slate-400" />
                  <span>{formatDateDisplay(editingCell.date, settings.language)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Editing Form fields */}
            <div className="space-y-5">

              {/* MEMBER OWN MEAL SETTINGS */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2.5">
                  {isBangla ? 'নিজস্ব মিল (চালু/বন্ধ)' : 'Own Meals'}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer transition-colors ${
                    editingCell.mealsState.breakfast
                      ? 'border-emerald-500/50 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingCell.mealsState.breakfast}
                      onChange={(e) => setEditingCell({
                        ...editingCell,
                        mealsState: {
                          ...editingCell.mealsState,
                          breakfast: e.target.checked
                        }
                      })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{isBangla ? 'সকাল' : 'Breakfast'}</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer transition-colors ${
                    editingCell.mealsState.lunch
                      ? 'border-emerald-500/50 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingCell.mealsState.lunch}
                      onChange={(e) => setEditingCell({
                        ...editingCell,
                        mealsState: {
                          ...editingCell.mealsState,
                          lunch: e.target.checked
                        }
                      })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{isBangla ? 'দুপুর' : 'Lunch'}</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer transition-colors ${
                    editingCell.mealsState.dinner
                      ? 'border-emerald-500/50 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingCell.mealsState.dinner}
                      onChange={(e) => setEditingCell({
                        ...editingCell,
                        mealsState: {
                          ...editingCell.mealsState,
                          dinner: e.target.checked
                        }
                      })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{isBangla ? 'রাত' : 'Dinner'}</span>
                  </label>
                </div>
              </div>

              {/* GUEST MEAL ALLOCATIONS */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <Users size={14} className="text-slate-400" />
                  <span>{isBangla ? 'অতিথি মিল সংখ্যা' : 'Guest Meal Counts'}</span>
                </h4>

                <div className="space-y-2.5">

                  {/* Breakfast guest */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{isBangla ? 'অতিথি সকাল' : 'Guest Breakfast'}</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const current = editingCell.mealsState.guestBreakfast || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestBreakfast: Math.max(0, current - 1) }
                          });
                        }}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-slate-900 dark:text-white w-6 text-center tabular-nums">
                        {editingCell.mealsState.guestBreakfast || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = editingCell.mealsState.guestBreakfast || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestBreakfast: Math.min(settings.guestMealLimit, current + 1) }
                          });
                        }}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Lunch guest */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{isBangla ? 'অতিথি দুপুর' : 'Guest Lunch'}</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const current = editingCell.mealsState.guestLunch || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestLunch: Math.max(0, current - 1) }
                          });
                        }}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-slate-900 dark:text-white w-6 text-center tabular-nums">
                        {editingCell.mealsState.guestLunch || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = editingCell.mealsState.guestLunch || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestLunch: Math.min(settings.guestMealLimit, current + 1) }
                          });
                        }}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Dinner guest */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{isBangla ? 'অতিথি রাত' : 'Guest Dinner'}</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const current = editingCell.mealsState.guestDinner || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestDinner: Math.max(0, current - 1) }
                          });
                        }}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-slate-900 dark:text-white w-6 text-center tabular-nums">
                        {editingCell.mealsState.guestDinner || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = editingCell.mealsState.guestDinner || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestDinner: Math.min(settings.guestMealLimit, current + 1) }
                          });
                        }}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* MANDATORY REASON FOR MANAGER ADJUSTMENTS */}
              {isManagerOrAdmin && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    {isBangla ? 'পরিবর্তনের কারণ' : 'Reason for Adjustment'} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder={isBangla ? 'যেমন: মেম্বারের অনুরোধে অফ করা হয়েছে' : 'e.g. Member requested manual update'}
                    value={editingCell.reason}
                    onChange={(e) => setEditingCell({ ...editingCell, reason: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-medium"
                  />
                </div>
              )}

            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveCell}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} /> {isBangla ? 'সেভ করুন' : 'Update Cell'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MEAL LOCK OVERRIDES AND VACATION MANAGEMENT PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

        {/* PANEL 1: VACATION MODE SYSTEM */}
        <div
          id="vacation-panel"
          className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-2xl flex flex-col justify-between gap-5"
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Plane size={19} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {isBangla ? 'ছুটি ও মিল বন্ধ প্ল্যানার' : 'Vacation Planner'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {isBangla
                    ? 'নির্দিষ্ট তারিখের জন্য মিল অটো বন্ধ রাখুন। ছুটি শেষে আগের শিডিউল আবার চালু হবে।'
                    : 'Pause all meals for selected dates. Your regular schedule resumes automatically afterward.'}
                </p>
              </div>
            </div>

            {/* VACATION MODE ENTRY FORM */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-sky-500" />
                  <span>
                    {editingVacationId
                      ? (isBangla ? 'ছুটির তারিখ পরিবর্তন করুন' : 'Edit Vacation Dates')
                      : (isBangla ? 'নতুন ছুটি যোগ করুন' : 'Schedule Vacation')}
                  </span>
                </h4>
                {editingVacationId && (
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    {isBangla ? 'এডিট মোড' : 'Editing'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {isBangla ? 'শুরুর তারিখ' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    min={`${selectedMonth}-01`}
                    max={`${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`}
                    value={vacationStart}
                    onChange={(e) => setVacationStart(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {isBangla ? 'শেষ তারিখ' : 'End Date'}
                  </label>
                  <input
                    type="date"
                    min={`${selectedMonth}-01`}
                    max={`${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`}
                    value={vacationEnd}
                    onChange={(e) => setVacationEnd(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500"
                  />
                </div>
              </div>

              {isManagerOrAdmin && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {isBangla ? 'মেম্বার নির্বাচন করুন' : 'Member'}
                  </label>
                  <select
                    value={vacationUser}
                    onChange={(e) => setVacationUser(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500 cursor-pointer"
                  >
                    {allUsers.filter(u => u.isActive).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {vacationError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{vacationError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleCreateVacation}
                  className="flex-1 min-h-[38px] py-2 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  {editingVacationId
                    ? (isBangla ? 'ছুটি আপডেট করুন' : 'Update Vacation')
                    : (isBangla ? 'ছুটি নিশ্চিত করুন' : 'Set Vacation Mode')}
                </button>
                {editingVacationId && (
                  <button
                    type="button"
                    onClick={handleCancelEditVacation}
                    className="min-h-[38px] py-2 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel Edit'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ACTIVE VACATIONS LIST */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isBangla
                  ? `নির্ধারিত ছুটি (${visibleVacations.length})`
                  : `Planned Vacations (${visibleVacations.length})`}
              </h4>
            </div>

            {visibleVacations.length === 0 ? (
              <div className="bg-white/70 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700/80 rounded-xl py-4 px-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBangla
                    ? 'এই মাসে এখনো কোনো ছুটি যোগ করা হয়নি।'
                    : 'No vacations scheduled for this month.'}
                </p>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-0.5">
                {visibleVacations.map(vp => {
                  const targetUser = allUsers.find(x => x.id === vp.userId);
                  const dayCount = Math.max(
                    1,
                    Math.round((new Date(vp.endDate).getTime() - new Date(vp.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                  );
                  return (
                    <div
                      key={vp.id}
                      className="flex justify-between items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-xs shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {isManagerOrAdmin
                            ? targetUser?.name
                            : (isBangla ? 'আমার ছুটি' : 'My Vacation')}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {formatDateDisplay(vp.startDate, settings.language)} – {formatDateDisplay(vp.endDate, settings.language)}
                          <span className="text-slate-400 dark:text-slate-500"> · {dayCount} {isBangla ? 'দিন' : dayCount === 1 ? 'day' : 'days'}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditVacationClick(vp)}
                          className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          {isBangla ? 'এডিট' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancelVacation(vp.id)}
                          className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          {isBangla ? 'বাতিল' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2: MEAL LOCK CONFIG & OVERRIDES */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-2xl flex flex-col justify-between gap-5">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Lock size={19} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {isBangla ? 'দৈনিক মিল লক ও ওভাররাইড' : 'Meal Lock & Override'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {isBangla ? (
                    <>
                      প্রতিদিন <span className="font-bold text-emerald-600 dark:text-emerald-400">{settings.mealLockTime}</span>-এর পর মেম্বাররা পরের দিনের মিল পরিবর্তন করতে পারবেন না।
                    </>
                  ) : (
                    <>
                      Daily cutoff is <span className="font-bold text-emerald-600 dark:text-emerald-400">{settings.mealLockTime}</span>. Members cannot change tomorrow&apos;s meals after this time.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Live Lock Status Card */}
            {(() => {
              const tomorrowLocked = checkIsLockedForMember(tomorrow).locked;
              const isUnlockedState = settings.lockOverride || !tomorrowLocked;

              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl space-y-3.5 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        settings.lockOverride
                          ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                          : tomorrowLocked
                            ? 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isUnlockedState ? <Unlock size={17} /> : <Lock size={17} />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {settings.lockOverride
                          ? (isBangla ? 'ওভাররাইড চালু (সবাই এডিট করতে পারবে)' : 'Override Active · Open for All')
                          : tomorrowLocked
                            ? (isBangla ? 'আজকের জন্য লক করা আছে' : 'Locked for Members')
                            : (isBangla ? 'এডিটের জন্য খোলা আছে' : 'Open for Edits')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {settings.lockOverride
                          ? (isBangla
                              ? 'ম্যানেজার সাময়িকভাবে সময়সীমা তুলে দিয়েছেন। মেম্বাররা এখন মিল পরিবর্তন করতে পারবে।'
                              : 'Managers temporarily lifted the deadline so members can update tomorrow’s meals.')
                          : tomorrowLocked
                            ? (isBangla
                                ? 'দৈনিক সময়সীমা শেষ হয়েছে। এখন শুধু ম্যানেজার বা অ্যাডমিন পরিবর্তন করতে পারবেন।'
                                : 'Daily cutoff has passed. Only managers or admins can adjust tomorrow’s meals.')
                            : (isBangla
                                ? `আজ রাত/সন্ধ্যা ${settings.mealLockTime} পর্যন্ত মেম্বাররা মিল পরিবর্তন করতে পারবেন।`
                                : `Members can still update tomorrow’s meals until ${settings.mealLockTime} today.`)}
                      </p>
                    </div>
                  </div>

                  {isManagerOrAdmin && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {isBangla ? 'মেম্বারদের জন্য লক ওভাররাইড' : 'Bypass Lock for Members'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {isBangla
                            ? 'সময়সীমা পার হলেও মেম্বারদের এডিট করার অনুমতি দিন।'
                            : 'Allow members to edit tomorrow’s meals even after cutoff.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...settings, lockOverride: !settings.lockOverride };
                          onUpdateSettings(updated);
                          onLogAction('Lock Override Trigger', `Meal lock override ${!settings.lockOverride ? 'ENABLED' : 'DISABLED'} by Manager.`);
                        }}
                        className={`min-h-[36px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer whitespace-nowrap ${
                          settings.lockOverride
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {settings.lockOverride
                          ? (isBangla ? 'ওভাররাইড বন্ধ করুন' : 'Disable Override')
                          : (isBangla ? 'ওভাররাইড চালু করুন' : 'Enable Override')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Operational Notes Card */}
          <div className="p-4 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Info size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isBangla ? 'গুরুত্বপূর্ণ নিয়মাবলী' : 'Quick Meal Rules'}</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                {isBangla
                  ? 'প্রতিদিন ডিফল্টভাবে মেম্বারদের মিল চালু (ON) থাকে।'
                  : 'Default meals stay ON daily unless turned OFF or paused via Vacation.'}
              </li>
              <li>
                {isBangla
                  ? 'অতীত বা আজকের তারিখের মিল মেম্বাররা পরিবর্তন করতে পারবেন না।'
                  : 'Past and today’s meals are locked for standard members.'}
              </li>
              <li>
                {isBangla
                  ? 'অতিথি (Guest) মিল মাসিক মোট মিলের সাথে যোগ হয়।'
                  : 'Guest meals automatically count toward each member’s monthly total.'}
              </li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
