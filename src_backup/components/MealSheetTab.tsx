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
  CalendarDays,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { User, MemberMealSheet, MealStatus, SystemSettings, VacationPeriod } from '../types';
import { useFeedback } from './FeedbackContext';

interface MealSheetTabProps {
  currentUser: User;
  role: 'Admin' | 'Meal Manager' | 'Member';
  allUsers: User[];
  meals: MemberMealSheet[];
  onUpdateMeals: (updatedMeals: MemberMealSheet[]) => void;
  settings: SystemSettings;
  vacationPeriods: VacationPeriod[];
  onAddVacation: (userId: string, startDate: string, endDate: string) => void;
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
  onCancelVacation,
  onLogAction,
  onUpdateSettings
}: MealSheetTabProps) {

  const { showToast } = useFeedback();

  const isManagerOrAdmin = role === 'Admin' || role === 'Meal Manager';
  const isBangla = settings.language === 'Bangla';
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedCell, setFocusedCell] = useState<{ userId: string; date: string } | null>(null);

  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth);
  
  // Generating list of date strings for selected month
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    return `${selectedMonth}-${dayNum < 10 ? '0' + dayNum : dayNum}`;
  });

  // Cell Editing state
  const [editingCell, setEditingCell] = useState<{
    userId: string;
    userName: string;
    date: string;
    mealsState: MealStatus;
    reason: string;
  } | null>(null);

  // Vacation states
  const [vacationStart, setVacationStart] = useState(`${selectedMonth}-19`);
  const [vacationEnd, setVacationEnd] = useState(`${selectedMonth}-25`);
  const [vacationUser, setVacationUser] = useState(currentUser.id);
  const [vacationError, setVacationError] = useState('');

  // Update vacation defaults when month changes
  React.useEffect(() => {
    setVacationStart(`${selectedMonth}-19`);
    setVacationEnd(`${selectedMonth}-25`);
  }, [selectedMonth]);

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

    onAddVacation(vacationUser, vacationStart, vacationEnd);
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
    if (settings.isMonthClosed) return { locked: true, reason: 'Month is closed' };

    // Members cannot edit past dates or today
    if (date <= '2026-07-18') {
      return { locked: true, reason: 'Past and today\'s meals cannot be modified by members' };
    }

    const isTomorrow = date === '2026-07-19';
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
          breakfast: true, lunch: true, dinner: true,
          guestBreakfast: 0, guestLunch: 0, guestDinner: 0
        });

    const hasOwn = dayMeal.breakfast || dayMeal.lunch || dayMeal.dinner;
    const totalGuests = (dayMeal.guestBreakfast || 0) + (dayMeal.guestLunch || 0) + (dayMeal.guestDinner || 0);
    const isLocked = settings.isMonthClosed || checkIsLockedForMember(date).locked;

    let cellLabel = '';
    let bgColorClass = '';
    let textColorClass = '';

    if (isUserVacationActive) {
      bgColorClass = 'bg-sky-50 dark:bg-sky-950/25 hover:bg-sky-100 dark:hover:bg-sky-950/45 border-sky-200/50';
      textColorClass = 'text-sky-600 dark:text-sky-450 font-bold';
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

    Object.keys(sheet.meals).forEach(date => {
      // Skip if the date is not part of the currently selected month
      if (!date.startsWith(selectedMonth)) return;

      if (isVacation(sheet.userId, date)) {
        return; // skip meals, they are OFF automatically during vacation
      }
      const m = sheet.meals[date];
      if (!m) return;
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
        breakfast: true, lunch: true, dinner: true,
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
          breakfast: true, lunch: true, dinner: true,
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
      breakfast: true, lunch: true, dinner: true,
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
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6" id="mealsheet-tab">
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600 dark:text-emerald-400" size={22} />
            Digital Meal Sheet ({selectedMonth === '2026-06' ? 'June 2026' : selectedMonth === '2026-07' ? 'July 2026' : selectedMonth === '2026-08' ? 'August 2026' : selectedMonth})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isManagerOrAdmin 
              ? 'Grid representation of the entire mess. Click on any cell to override meal reservations or guest allocations.' 
              : 'Your personal row in the system grid. Displays daily status and accumulated monthly meals.'}
          </p>
        </div>
        
        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/30"></span>
            <span className="text-slate-600 dark:text-slate-400">Full (Green)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/30"></span>
            <span className="text-slate-600 dark:text-slate-400">Partial (Yellow)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500/30"></span>
            <span className="text-slate-600 dark:text-slate-400">OFF (Red)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700"></span>
            <span className="text-slate-600 dark:text-slate-400">Locked (Gray)</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER INTERFACE PANEL */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 max-w-2xl">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search members by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Month selector */}
          <div className="relative w-full sm:w-48">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="2026-06">June 2026</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-08">August 2026</option>
            </select>
          </div>
        </div>

        {/* Keyboard interaction tips */}
        <div className="text-[10px] font-bold text-slate-450 dark:text-slate-500 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg">
          <span className="text-emerald-500">⌨️ Tip:</span>
          <span>Click sheet. Use arrow keys to navigate. Space/Enter to edit.</span>
        </div>
      </div>

      {/* HORIZONTALLY & VERTICALLY SCROLLABLE TABLE CONTAINER */}
      <div 
        className="relative max-h-[550px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        tabIndex={0}
        onKeyDown={handleTableKeyDown}
        id="sheets-table-container"
      >
        <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              {/* Sticky Top-Left Corner cell */}
              <th className="sticky left-0 top-0 z-35 w-44 px-4 py-3 bg-slate-100 dark:bg-slate-950 border-r border-b border-slate-200 dark:border-slate-850 text-slate-800 dark:text-white font-bold shadow-sm">
                Members
              </th>
              
              {/* Sticky Dates Columns */}
              {dates.map((date, index) => {
                const dayNum = index + 1;
                const isToday = date === `${selectedMonth}-18` || (selectedMonth === '2026-07' && dayNum === 18);
                return (
                  <th 
                    key={date} 
                    className={`sticky top-0 z-20 w-12 px-1 py-3 text-center border-b border-r border-slate-200 dark:border-slate-855 bg-slate-100 dark:bg-slate-950 ${isToday ? 'text-emerald-600 dark:text-emerald-405 font-extrabold ring-1 ring-emerald-500/20' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    {dayNum}
                  </th>
                );
              })}

              {/* Sticky Summary columns */}
              <th className="sticky top-0 z-20 w-20 px-2 py-3 text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-855 bg-slate-100 dark:bg-slate-950">Own</th>
              <th className="sticky top-0 z-20 w-20 px-2 py-3 text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-855 bg-slate-100 dark:bg-slate-950">Guest</th>
              <th className="sticky top-0 z-20 w-24 px-2 py-3 text-center text-emerald-700 dark:text-emerald-405 border-b border-slate-200 dark:border-slate-855 bg-slate-100 dark:bg-slate-950">Final</th>
            </tr>
          </thead>
          <tbody>
            {visibleMeals.length === 0 ? (
              <tr>
                <td colSpan={dates.length + 4} className="px-6 py-12 text-center text-xs text-slate-400 italic bg-white dark:bg-slate-900">
                  No members matched your search.
                </td>
              </tr>
            ) : (
              visibleMeals.map((sheet) => {
                const u = allUsers.find(user => user.id === sheet.userId) || { name: 'Unknown User', avatarUrl: '' };
                const totals = calculateRowTotals(sheet);

                return (
                  <tr 
                    key={sheet.userId} 
                    className="border-b border-slate-150 dark:border-slate-850 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                  >
                    {/* Sticky left member cell */}
                    <td className="sticky left-0 z-10 px-4 py-3 bg-white dark:bg-slate-900 border-r border-slate-150 dark:border-slate-850 font-semibold text-slate-800 dark:text-white shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} 
                          alt={u.name} 
                          className="w-6 h-6 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-semibold truncate text-slate-800 dark:text-white max-w-[110px]" title={u.name}>{u.name}</span>
                      </div>
                    </td>

                    {/* Dates cells */}
                    {dates.map((date) => {
                      const { cellLabel, bgColorClass, textColorClass, dayMeal, isLocked } = getCellData(sheet, date);
                      const isToday = date === '2026-07-18';
                      const isCellFocused = focusedCell && focusedCell.userId === sheet.userId && focusedCell.date === date;
                      const canEdit = isManagerOrAdmin || (sheet.userId === currentUser.id && date >= '2026-07-19');

                      return (
                        <td 
                          key={date}
                          onClick={() => handleCellClick(sheet, u.name, date)}
                          className={`text-center py-2.5 px-0.5 border-r border-slate-150 dark:border-slate-855 select-none cursor-pointer group/cell relative ${bgColorClass} ${textColorClass} ${isCellFocused ? 'ring-2 ring-emerald-500/80 ring-offset-1 dark:ring-offset-slate-900 z-10 relative scale-105 shadow-md font-black' : ''} ${isToday && !isCellFocused ? 'ring-1 ring-emerald-500/30' : ''}`}
                          title="Click to view details or edit"
                        >
                          <span className="font-bold text-[10px]">{cellLabel}</span>
                          
                          {/* Elegant Hover Breakdown Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 text-slate-200 text-[10px] rounded-lg p-2.5 opacity-0 pointer-events-none group-hover/cell:opacity-100 transition-opacity duration-200 z-50 shadow-xl border border-slate-800">
                            <p className="font-bold border-b border-slate-800 pb-1 mb-1.5 text-white flex justify-between">
                              <span>{selectedMonth === '2026-06' ? 'June' : selectedMonth === '2026-07' ? 'July' : selectedMonth === '2026-08' ? 'August' : 'Selected'} {date.split('-')[2]}</span>
                              {isLocked && <Lock size={10} className="text-slate-400" />}
                            </p>
                            <div className="grid grid-cols-2 gap-y-1 text-[10px]">
                              <span className="text-slate-400">Breakfast:</span>
                              <span className="font-medium text-right">{dayMeal.breakfast ? 'ON (0.5)' : 'OFF'}</span>
                              <span className="text-slate-400">Lunch:</span>
                              <span className="font-medium text-right">{dayMeal.lunch ? 'ON (1.0)' : 'OFF'}</span>
                              <span className="text-slate-400">Dinner:</span>
                              <span className="font-medium text-right">{dayMeal.dinner ? 'ON (1.0)' : 'OFF'}</span>
                              <span className="text-slate-400 border-t border-slate-800 pt-1 mt-0.5">Guests (B/L/D):</span>
                              <span className="font-medium text-right border-t border-slate-800 pt-1 mt-0.5">
                                {dayMeal.guestBreakfast}/{dayMeal.guestLunch}/{dayMeal.guestDinner}
                              </span>
                            </div>
                            {canEdit && !settings.isMonthClosed && (
                              <p className="text-[9px] text-emerald-400 mt-2 font-semibold text-center flex items-center justify-center gap-1">
                                <Edit3 size={9} /> Click to adjust
                              </p>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Summaries cells */}
                    <td className="px-2 py-3 text-center border-r border-slate-150 dark:border-slate-855 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-900/10">
                      {totals.totalMeals.toFixed(1)}
                    </td>
                    <td className="px-2 py-3 text-center border-r border-slate-150 dark:border-slate-855 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-900/10">
                      {totals.totalGuestMeals.toFixed(1)}
                    </td>
                    <td className="px-2 py-3 text-center font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                      {totals.finalMeals.toFixed(1)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Bottom Row for Column Totals */}
          {visibleMeals.length > 0 && (
            <tfoot className="sticky bottom-0 z-25 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
              <tr className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                {/* Sticky Left footer label cell */}
                <td className="sticky left-0 bottom-0 z-30 px-4 py-3 bg-slate-150 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-extrabold text-slate-800 dark:text-white shadow-sm">
                  Daily Totals
                </td>

                {/* Dynamically calculated daily totals columns */}
                {dates.map((date) => {
                  const colTotals = calculateDailyColumnTotals(date);
                  const isToday = date === '2026-07-18';
                  return (
                    <td 
                      key={`foot-${date}`}
                      className={`text-center py-2.5 px-0.5 border-r border-slate-200 dark:border-slate-800 font-extrabold text-[10px] group/foot relative ${isToday ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-405' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {colTotals.finalTotal.toFixed(1)}

                      {/* Daily Totals Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-slate-950 text-slate-200 text-[10px] rounded-lg p-2.5 opacity-0 pointer-events-none group-hover/foot:opacity-100 transition-opacity duration-200 z-50 shadow-2xl border border-slate-800">
                        <p className="font-bold border-b border-slate-800 pb-1 mb-1.5 text-white text-center">Meals Count</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Own:</span>
                            <span className="font-bold text-white">{colTotals.ownTotal.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Guests:</span>
                            <span className="font-bold text-white">{colTotals.guestTotal.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  );
                })}

                {/* Overall Totals */}
                <td className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold bg-slate-150/40 dark:bg-slate-900/30">
                  {visibleMeals.reduce((acc, sheet) => acc + calculateRowTotals(sheet).totalMeals, 0).toFixed(1)}
                </td>
                <td className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold bg-slate-150/40 dark:bg-slate-900/30">
                  {visibleMeals.reduce((acc, sheet) => acc + calculateRowTotals(sheet).totalGuestMeals, 0).toFixed(1)}
                </td>
                <td className="px-2 py-3 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-black">
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
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Override Reservation
                </span>
                <h3 className="text-lg font-bold text-slate-850 dark:text-white mt-0.5">
                  {editingCell.userName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <CalendarDays size={14} className="text-slate-400" />
                  Date: {editingCell.date}
                </p>
              </div>
              <button 
                onClick={() => setEditingCell(null)}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Editing Form fields */}
            <div className="space-y-5">
              
              {/* MEMBER OWN MEAL SETTINGS */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Member's Reserve Status
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
                      className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Breakfast</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
                      className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lunch</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
                      className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dinner</span>
                  </label>
                </div>
              </div>

              {/* GUEST MEAL ALOCATIONS */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Users size={14} className="text-slate-400" /> Guest Meal Counts
                </h4>
                
                <div className="space-y-3">
                  
                  {/* Breakfast guest */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Guest Breakfast</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const current = editingCell.mealsState.guestBreakfast || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestBreakfast: Math.max(0, current - 1) }
                          });
                        }}
                        className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-slate-850 dark:text-white w-6 text-center">
                        {editingCell.mealsState.guestBreakfast || 0}
                      </span>
                      <button
                        onClick={() => {
                          const current = editingCell.mealsState.guestBreakfast || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestBreakfast: Math.min(settings.guestMealLimit, current + 1) }
                          });
                        }}
                        className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Lunch guest */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Guest Lunch</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const current = editingCell.mealsState.guestLunch || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestLunch: Math.max(0, current - 1) }
                          });
                        }}
                        className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-slate-850 dark:text-white w-6 text-center">
                        {editingCell.mealsState.guestLunch || 0}
                      </span>
                      <button
                        onClick={() => {
                          const current = editingCell.mealsState.guestLunch || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestLunch: Math.min(settings.guestMealLimit, current + 1) }
                          });
                        }}
                        className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Dinner guest */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Guest Dinner</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const current = editingCell.mealsState.guestDinner || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestDinner: Math.max(0, current - 1) }
                          });
                        }}
                        className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-slate-850 dark:text-white w-6 text-center">
                        {editingCell.mealsState.guestDinner || 0}
                      </span>
                      <button
                        onClick={() => {
                          const current = editingCell.mealsState.guestDinner || 0;
                          setEditingCell({
                            ...editingCell,
                            mealsState: { ...editingCell.mealsState, guestDinner: Math.min(settings.guestMealLimit, current + 1) }
                          });
                        }}
                        className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold"
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
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Reason for Adjustment <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Emergency bypass / member requested off manually"
                    value={editingCell.reason}
                    onChange={(e) => setEditingCell({ ...editingCell, reason: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>
              )}

            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCell}
                className="px-4.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/15 transition flex items-center gap-1.5"
              >
                <Save size={14} /> Update Cell
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MEAL LOCK OVERRIDES AND VACATION MANAGEMENT PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* PANEL 1: VACATION MODE SYSTEM */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl space-y-4 shadow-xs" id="vacation-panel">
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
              <CalendarDays className="text-sky-500" size={18} />
              Vacation Mode Planner
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add vacation days. All meals during this range become OFF automatically, and original schedule resumes after.
            </p>
          </div>

          {/* VACATION MODE ENTRY FORM */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold text-slate-550 dark:text-slate-350 uppercase tracking-wider">
              Schedule New Vacation
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  min="2026-07-01"
                  max="2026-07-31"
                  value={vacationStart}
                  onChange={(e) => setVacationStart(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  min="2026-07-01"
                  max="2026-07-31"
                  value={vacationEnd}
                  onChange={(e) => setVacationEnd(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                />
              </div>
            </div>

            {isManagerOrAdmin && (
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Apply to Member</label>
                <select
                  value={vacationUser}
                  onChange={(e) => setVacationUser(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                >
                  {allUsers.filter(u => u.isActive).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            {vacationError && (
              <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                ⚠️ {vacationError}
              </p>
            )}

            <button
              onClick={handleCreateVacation}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              Set Vacation Mode
            </button>
          </div>

          {/* ACTIVE VACATIONS LIST */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Registered Vacation Sabbaticals ({visibleVacations.length})
            </h4>
            {visibleVacations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1 text-center">No active vacations planned for this month.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {visibleVacations.map(vp => {
                  const targetUser = allUsers.find(x => x.id === vp.userId);
                  return (
                    <div key={vp.id} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-slate-850 dark:text-white">
                          {isManagerOrAdmin ? targetUser?.name : 'My Sabbatical'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {vp.startDate} to {vp.endDate}
                        </p>
                      </div>
                      <button
                        onClick={() => onCancelVacation(vp.id)}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2: MEAL LOCK CONFIG & OVERRIDES */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
                <Lock className="text-amber-500" size={18} />
                Meal Lock & Emergency Override
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configured Lock Time: <span className="font-bold text-emerald-600 dark:text-emerald-450">{settings.mealLockTime}</span>. Standard members cannot edit tomorrow's meals after this deadline.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 p-4 rounded-xl space-y-3">
              <h4 className="text-[10px] font-bold text-slate-550 dark:text-slate-350 uppercase tracking-wider">
                Live Lock Status
              </h4>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  settings.lockOverride 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15'
                    : checkIsLockedForMember('2026-07-19').locked
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15'
                }`}>
                  {settings.lockOverride ? '🔓 OVERRIDDEN' : checkIsLockedForMember('2026-07-19').locked ? '🔒 LOCKED' : '🔓 OPEN'}
                </span>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {settings.lockOverride 
                    ? 'Managers have temporarily suspended the lock. Members can edit.' 
                    : checkIsLockedForMember('2026-07-19').locked 
                      ? 'Daily lock is in force. Only managers can make changes.' 
                      : 'Standard lockout applies at ' + settings.mealLockTime + ' today.'}
                </p>
              </div>

              {isManagerOrAdmin && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1.5 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-750 dark:text-slate-200">Bypass Lock for Members</p>
                    <p className="text-[10px] text-slate-400">Allow standard members to bypass the lock time restriction.</p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = { ...settings, lockOverride: !settings.lockOverride };
                      onUpdateSettings(updated);
                      onLogAction('Lock Override Trigger', `Meal lock override ${!settings.lockOverride ? 'ENABLED' : 'DISABLED'} by Manager.`);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.lockOverride 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                  >
                    {settings.lockOverride ? 'Disable Override' : 'Enable Override'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-900 mt-4 text-[11px] text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-550 dark:text-slate-350 block uppercase tracking-wider">💡 Operational Notes:</span>
            <p>1. Default meals are automatically marked ON for all members daily.</p>
            <p>2. Past dates cannot be modified by members under any circumstances.</p>
            <p>3. Guest meals are included in each member's final monthly total counts.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
