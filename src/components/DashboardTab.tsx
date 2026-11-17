import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Megaphone,
  History,
  ShoppingBag,
  Coins,
  FileText,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Pin,
  Lock,
  Unlock,
  Plane,
  Clock,
  Award,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { User, MemberMealSheet, Deposit, BazaarEntry, Expense, Notice, ActivityLog, SystemSettings, VacationPeriod } from '../types';
import { useFeedback } from './FeedbackContext';
import {
  getRealCurrentMonth,
  getMonthDates,
  formatMonthLabel,
  formatShortMonth,
  formatDateDisplay,
  formatMonthDayLabel,
  getEffectiveDatesForMonth,
  parseLockHourMinute,
  formatTime12hDisplay
} from '../utils/dateUtils';

interface DashboardTabProps {
  currentUser: User;
  role: 'Admin' | 'Meal Manager' | 'Member';
  allUsers: User[];
  meals: MemberMealSheet[];
  deposits: Deposit[];
  bazaarEntries: BazaarEntry[];
  expenses: Expense[];
  notices: Notice[];
  activities: ActivityLog[];
  settings: SystemSettings;
  onQuickAction: (actionType: 'deposit' | 'bazaar' | 'notice' | 'adjustment' | 'vacation') => void;
  onUpdateMeals: (updatedMeals: MemberMealSheet[]) => void;
  onNavigateTab?: (tab: string) => void;
  vacationPeriods: VacationPeriod[];
}

export default function DashboardTab({
  currentUser,
  role,
  allUsers,
  meals,
  deposits,
  bazaarEntries,
  expenses,
  notices,
  activities,
  settings,
  onQuickAction,
  onUpdateMeals,
  onNavigateTab,
  vacationPeriods
}: DashboardTabProps) {

  const { showToast } = useFeedback();

  // Current Active Month & Date logic
  const activeMonth = settings.activeMonth || getRealCurrentMonth();
  const { today, tomorrow } = getEffectiveDatesForMonth(activeMonth);
  const monthDates = getMonthDates(activeMonth);
  const activeMonthLabel = formatMonthLabel(activeMonth, settings.language);
  const shortMonthLabel = formatShortMonth(activeMonth);

  const monthBazaarEntries = bazaarEntries.filter(entry => entry.date.startsWith(activeMonth));
  const monthExpenses = expenses.filter(exp => exp.date.startsWith(activeMonth));
  const monthDeposits = deposits.filter(d => d.date.startsWith(activeMonth));

  const isManagerOrAdmin = role === 'Admin' || role === 'Meal Manager';
  const isBangla = settings.language === 'Bangla';

  // Interactive chart state tab
  const [activeChartTab, setActiveChartTab] = useState<'meals' | 'expenses' | 'deposits' | 'comparison'>('meals');
  // Unified side feed tab to keep 1st look calm and uncluttered
  const [activeFeedTab, setActiveFeedTab] = useState<'notices' | 'activities' | 'highlights'>('notices');

  // Check if a specific user is on vacation for a specific date
  const isVacation = (userId: string, date: string): boolean => {
    return vacationPeriods?.some(vp => vp.userId === userId && date >= vp.startDate && date <= vp.endDate) || false;
  };

  // Total Meals of the whole mess across the active month
  const rawTotalMealsInMonth = allUsers.filter(u => u.isActive).reduce((sum, user) => {
    let userSum = 0;
    const userSheet = meals.find(s => s.userId === user.id);
    monthDates.forEach(dateStr => {
      if (isVacation(user.id, dateStr)) return;
      const m = userSheet?.meals[dateStr];
      if (!m) return;
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = ((m.guestBreakfast || 0) * 0.5) + ((m.guestLunch || 0) * 1.0) + ((m.guestDinner || 0) * 1.0);
      userSum += own + guest;
    });
    return sum + userSum;
  }, 0);
  const totalMealsInMonth = rawTotalMealsInMonth || 1;

  // Approved Bazaar costs for active month
  const totalBazaarCost = monthBazaarEntries
    .filter(entry => entry.status === 'Approved')
    .reduce((sum, entry) => sum + entry.price, 0);

  // Other Expenses (Utility, cleaning etc) for active month
  const totalOtherExpense = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const totalExpense = totalBazaarCost + totalOtherExpense;
  const currentMealRate = totalExpense / totalMealsInMonth;

  // Today's total meal counts
  const todayBreakdown = allUsers.filter(u => u.isActive).reduce((acc, user) => {
    if (isVacation(user.id, today)) return acc;
    const userSheet = meals.find(s => s.userId === user.id);
    const m = userSheet?.meals[today] || {
      breakfast: false, lunch: false, dinner: false,
      guestBreakfast: 0, guestLunch: 0, guestDinner: 0
    };
    acc.breakfast += m.breakfast ? 1 : 0;
    acc.lunch += m.lunch ? 1 : 0;
    acc.dinner += m.dinner ? 1 : 0;
    acc.guestBreakfast += m.guestBreakfast || 0;
    acc.guestLunch += m.guestLunch || 0;
    acc.guestDinner += m.guestDinner || 0;
    return acc;
  }, { breakfast: 0, lunch: 0, dinner: 0, guestBreakfast: 0, guestLunch: 0, guestDinner: 0 });

  const todayTotalMealsCount = (todayBreakdown.breakfast * 0.5) + todayBreakdown.lunch + todayBreakdown.dinner +
    (todayBreakdown.guestBreakfast * 0.5) + todayBreakdown.guestLunch + todayBreakdown.guestDinner;

  // Tomorrow's total meal counts
  const tomorrowBreakdown = allUsers.filter(u => u.isActive).reduce((acc, user) => {
    if (isVacation(user.id, tomorrow)) return acc;
    const userSheet = meals.find(s => s.userId === user.id);
    const m = userSheet?.meals[tomorrow] || {
      breakfast: false, lunch: false, dinner: false,
      guestBreakfast: 0, guestLunch: 0, guestDinner: 0
    };
    acc.breakfast += m.breakfast ? 1 : 0;
    acc.lunch += m.lunch ? 1 : 0;
    acc.dinner += m.dinner ? 1 : 0;
    acc.guestBreakfast += m.guestBreakfast || 0;
    acc.guestLunch += m.guestLunch || 0;
    acc.guestDinner += m.guestDinner || 0;
    return acc;
  }, { breakfast: 0, lunch: 0, dinner: 0, guestBreakfast: 0, guestLunch: 0, guestDinner: 0 });

  const tomorrowTotalMealsCount = (tomorrowBreakdown.breakfast * 0.5) + tomorrowBreakdown.lunch + tomorrowBreakdown.dinner +
    (tomorrowBreakdown.guestBreakfast * 0.5) + tomorrowBreakdown.guestLunch + tomorrowBreakdown.guestDinner;

  // Today's Bazaar stats
  const todayBazaarEntries = bazaarEntries.filter(entry => entry.date === today);
  const todayBazaarTotal = todayBazaarEntries
    .filter(entry => entry.status !== 'Rejected')
    .reduce((sum, entry) => sum + (entry.total || entry.subtotal || entry.price), 0);
  const todayBazaarApproved = todayBazaarEntries
    .filter(entry => entry.status === 'Approved')
    .reduce((sum, entry) => sum + (entry.total || entry.subtotal || entry.price), 0);
  const todayBazaarPending = todayBazaarEntries
    .filter(entry => entry.status === 'Pending')
    .reduce((sum, entry) => sum + (entry.total || entry.subtotal || entry.price), 0);

  // Pending Bazaar & Deposits
  const pendingBazaarList = monthBazaarEntries.filter(entry => entry.status === 'Pending');
  const totalPendingBazaarCount = pendingBazaarList.length;
  const totalPendingBazaarAmount = pendingBazaarList.reduce((sum, b) => sum + b.price, 0);

  const pendingDepositsList = monthDeposits.filter(d => d.status === 'Pending');
  const totalPendingDepositsCount = pendingDepositsList.length;
  const totalPendingDepositsAmount = pendingDepositsList.reduce((sum, d) => sum + d.amount, 0);

  // Most & Least Meals (Active Members)
  const activeUsers = allUsers.filter(u => u.isActive);
  const memberMealCalculations = activeUsers.map(user => {
    const userSheet = meals.find(sheet => sheet.userId === user.id);
    let ownMealsCount = 0;
    let guestMealsCount = 0;
    if (userSheet) {
      monthDates.forEach(date => {
        if (isVacation(user.id, date)) return;
        const m = userSheet.meals[date];
        if (!m) return;
        ownMealsCount += (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
        guestMealsCount += (m.guestBreakfast * 0.5) + (m.guestLunch * 1.0) + (m.guestDinner * 1.0);
      });
    }
    return {
      user,
      total: ownMealsCount + guestMealsCount,
      own: ownMealsCount,
      guest: guestMealsCount
    };
  });

  const sortedMembersByMeals = [...memberMealCalculations].sort((a, b) => b.total - a.total);
  const mostMealsRecord = sortedMembersByMeals.length > 0 ? sortedMembersByMeals[0] : null;
  const leastMealsRecord = sortedMembersByMeals.length > 0 ? sortedMembersByMeals[sortedMembersByMeals.length - 1] : null;

  // Highest Expense
  const bazaarExpenses = monthBazaarEntries
    .filter(b => b.status === 'Approved')
    .map(b => ({
      title: b.items,
      amount: b.price,
      date: b.date,
      type: 'Bazaar'
    }));
  const otherExpenses = monthExpenses.map(e => ({
    title: `${e.category}${e.note ? ` (${e.note})` : ''}`,
    amount: e.amount,
    date: e.date,
    type: 'Utility'
  }));
  const allExpenseItems = [...bazaarExpenses, ...otherExpenses];
  const highestExpenseRecord = allExpenseItems.length > 0
    ? [...allExpenseItems].sort((a, b) => b.amount - a.amount)[0]
    : null;

  // Highest Deposit
  const approvedDepositsList = monthDeposits
    .filter(d => d.status === 'Approved')
    .map(d => {
      const user = allUsers.find(u => u.id === d.userId);
      return {
        userName: user ? user.name : 'Unknown Member',
        amount: d.amount,
        date: d.date,
        method: d.method,
        txId: d.transactionId
      };
    });
  const highestDepositRecord = approvedDepositsList.length > 0
    ? [...approvedDepositsList].sort((a, b) => b.amount - a.amount)[0]
    : null;

  // Interactive Chart Data Processing
  const dailyChartData = monthDates.map((dateStr, i) => {
    const dayNum = i + 1;

    const dayMealsTotal = meals.reduce((sum, sheet) => {
      if (isVacation(sheet.userId, dateStr)) return sum;
      const m = sheet.meals[dateStr];
      if (!m) return sum;
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = (m.guestBreakfast * 0.5) + (m.guestLunch * 1.0) + (m.guestDinner * 1.0);
      return sum + own + guest;
    }, 0);

    const dayBazaarTotal = monthBazaarEntries
      .filter(b => b.status === 'Approved' && b.date === dateStr)
      .reduce((sum, b) => sum + b.price, 0);

    const dayOtherTotal = monthExpenses
      .filter(e => e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);

    const dayDepositTotal = monthDeposits
      .filter(d => d.status === 'Approved' && d.date === dateStr)
      .reduce((sum, d) => sum + d.amount, 0);

    return {
      day: dayNum,
      shortDate: `${shortMonthLabel} ${dayNum}`,
      meals: parseFloat(dayMealsTotal.toFixed(1)),
      expense: dayBazaarTotal + dayOtherTotal,
      bazaar: dayBazaarTotal,
      overhead: dayOtherTotal,
      deposit: dayDepositTotal
    };
  });

  // Category distribution for expenses Pie Chart (Active Month)
  const expenseCategoriesDistribution = [
    { name: isBangla ? 'বাজার খরচ' : 'Bazaar / Grocery', value: totalBazaarCost, color: '#10b981' },
    { name: isBangla ? 'গ্যাস বিল' : 'Gas Utilities', value: monthExpenses.filter(e => e.category === 'Gas').reduce((s, e) => s + e.amount, 0), color: '#f59e0b' },
    { name: isBangla ? 'বিদ্যুৎ বিল' : 'Electricity', value: monthExpenses.filter(e => e.category === 'Electricity').reduce((s, e) => s + e.amount, 0), color: '#3b82f6' },
    { name: isBangla ? 'ইন্টারনেট' : 'Internet', value: monthExpenses.filter(e => e.category === 'Internet').reduce((s, e) => s + e.amount, 0), color: '#8b5cf6' },
    { name: isBangla ? 'পানি বিল' : 'Water', value: monthExpenses.filter(e => e.category === 'Water').reduce((s, e) => s + e.amount, 0), color: '#06b6d4' },
    { name: isBangla ? 'পরিচ্ছন্নতা' : 'Cleaning', value: monthExpenses.filter(e => e.category === 'Cleaning').reduce((s, e) => s + e.amount, 0), color: '#ec4899' },
    { name: isBangla ? 'বুয়া / শেফ' : 'Cook / Maid', value: monthExpenses.filter(e => e.category === 'Maid').reduce((s, e) => s + e.amount, 0), color: '#14b8a6' },
    { name: isBangla ? 'অন্যান্য' : 'Other Overheads', value: monthExpenses.filter(e => e.category === 'Others').reduce((s, e) => s + e.amount, 0), color: '#64748b' }
  ].filter(item => item.value > 0);

  // USER INDIVIDUAL SUMMARY (Scoped to Active Month)
  const userMealsSheet = meals.find(sheet => sheet.userId === currentUser.id);
  let userTotalMeals = 0;
  let userGuestMeals = 0;
  if (userMealsSheet) {
    monthDates.forEach(date => {
      if (isVacation(currentUser.id, date)) return;
      const m = userMealsSheet.meals[date];
      if (!m) return;
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = ((m.guestBreakfast || 0) * 0.5) + ((m.guestLunch || 0) * 1.0) + ((m.guestDinner || 0) * 1.0);
      userTotalMeals += own;
      userGuestMeals += guest;
    });
  }

  const userEstimatedBill = (userTotalMeals + userGuestMeals) * currentMealRate;
  const userApprovedMonthDeposits = monthDeposits
    .filter(d => d.userId === currentUser.id && d.status !== 'Pending' && d.status !== 'Rejected');
  const userTotalDeposits = userApprovedMonthDeposits.reduce((sum, d) => sum + d.amount, 0);
  const lastUserDepositDate = userApprovedMonthDeposits.length > 0
    ? [...userApprovedMonthDeposits].sort((a, b) => b.date.localeCompare(a.date))[0].date
    : null;
  const userCarryForward = currentUser.carryForward || 0;
  const userCurrentBalance = userCarryForward + userTotalDeposits - userEstimatedBill;

  // TOMORROW MEAL RESERVATION STATUS
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUser.id);

  useEffect(() => {
    if (currentUser?.id) {
      setSelectedMemberId(currentUser.id);
    }
  }, [currentUser?.id]);

  const targetUserId = isManagerOrAdmin ? (selectedMemberId || currentUser.id) : currentUser.id;
  const targetUser = allUsers.find(u => u.id === targetUserId) || currentUser;
  const targetMealsSheet = meals.find(sheet => sheet.userId === targetUserId);
  const tomorrowMeals = targetMealsSheet?.meals[tomorrow] || {
    breakfast: false,
    lunch: false,
    dinner: false,
    guestBreakfast: 0,
    guestLunch: 0,
    guestDinner: 0
  };

  const checkIsTomorrowLocked = (): boolean => {
    if (isManagerOrAdmin) return false;
    if (settings.isMonthClosed) return true;
    if (settings.lockOverride) return false;

    const now = new Date();
    const { hour: lockHour, minute: lockMinute } = parseLockHourMinute(settings.mealLockTime);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour > lockHour || (currentHour === lockHour && currentMinute >= lockMinute)) {
      return true;
    }
    return false;
  };

  const handleToggleTomorrowOwn = (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (settings.isMonthClosed) {
      showToast(isBangla ? "মেস মাস বন্ধ রাখা হয়েছে।" : "Mess month is closed.", "error");
      return;
    }

    if (isVacation(targetUserId, tomorrow)) {
      showToast(
        isBangla
          ? `${targetUser.name} আগামীকাল ছুটিতে আছেন! মিল পরিবর্তন করতে ছুটি বাতিল করুন।`
          : `${targetUser.name} is on vacation tomorrow! Cancel vacation in the Meal Sheet tab to toggle individual meals.`,
        "warning"
      );
      return;
    }

    if (!isManagerOrAdmin && checkIsTomorrowLocked()) {
      showToast(
        isBangla
          ? `আগামীকালের মিল লক করা হয়েছে। শেষ সময় ছিল ${formatTime12hDisplay(settings.mealLockTime)}।`
          : `Meals are locked for tomorrow. The deadline was ${formatTime12hDisplay(settings.mealLockTime)}.`,
        "warning"
      );
      return;
    }

    let sheetFound = false;
    const updated = meals.map(sheet => {
      if (sheet.userId === targetUserId) {
        sheetFound = true;
        const currentDayMeals = sheet.meals[tomorrow] || {
          breakfast: false, lunch: false, dinner: false,
          guestBreakfast: 0, guestLunch: 0, guestDinner: 0
        };
        return {
          ...sheet,
          meals: {
            ...sheet.meals,
            [tomorrow]: {
              ...currentDayMeals,
              [mealType]: !currentDayMeals[mealType]
            }
          }
        };
      }
      return sheet;
    });

    if (!sheetFound) {
      updated.push({
        userId: targetUserId,
        meals: {
          [tomorrow]: {
            breakfast: mealType === 'breakfast',
            lunch: mealType === 'lunch',
            dinner: mealType === 'dinner',
            guestBreakfast: 0,
            guestLunch: 0,
            guestDinner: 0
          }
        }
      });
    }

    onUpdateMeals(updated);
    showToast(
      isBangla
        ? `${targetUser.name}-এর আগামীকালের ${mealType === 'breakfast' ? 'সকালের' : mealType === 'lunch' ? 'দুপুরের' : 'রাতের'} মিল পরিবর্তিত হয়েছে`
        : `Updated tomorrow's ${mealType} for ${targetUser.name}`,
      'success'
    );
  };

  const handleUpdateGuestTomorrow = (mealType: 'guestBreakfast' | 'guestLunch' | 'guestDinner', delta: number) => {
    if (settings.isMonthClosed) {
      showToast(isBangla ? "মেস মাস বন্ধ রাখা হয়েছে।" : "Mess month is closed.", "error");
      return;
    }

    if (isVacation(targetUserId, tomorrow)) {
      showToast(
        isBangla
          ? `${targetUser.name} আগামীকাল ছুটিতে আছেন! অতিথি মিল যোগ করতে ছুটি বাতিল করুন।`
          : `${targetUser.name} is on vacation tomorrow! Cancel vacation in the Meal Sheet tab to adjust guest meals.`,
        "warning"
      );
      return;
    }

    if (!isManagerOrAdmin && checkIsTomorrowLocked()) {
      showToast(
        isBangla
          ? `আগামীকালের মিল লক করা হয়েছে। শেষ সময় ছিল ${formatTime12hDisplay(settings.mealLockTime)}।`
          : `Meals are locked for tomorrow. The deadline was ${formatTime12hDisplay(settings.mealLockTime)}.`,
        "warning"
      );
      return;
    }

    let sheetFound = false;
    const updated = meals.map(sheet => {
      if (sheet.userId === targetUserId) {
        sheetFound = true;
        const currentDayMeals = sheet.meals[tomorrow] || {
          breakfast: false, lunch: false, dinner: false,
          guestBreakfast: 0, guestLunch: 0, guestDinner: 0
        };
        const currentCount = currentDayMeals[mealType] || 0;
        const newCount = Math.max(0, Math.min(settings.guestMealLimit, currentCount + delta));
        return {
          ...sheet,
          meals: {
            ...sheet.meals,
            [tomorrow]: {
              ...currentDayMeals,
              [mealType]: newCount
            }
          }
        };
      }
      return sheet;
    });

    if (!sheetFound) {
      updated.push({
        userId: targetUserId,
        meals: {
          [tomorrow]: {
            breakfast: false,
            lunch: false,
            dinner: false,
            guestBreakfast: mealType === 'guestBreakfast' ? Math.max(0, delta) : 0,
            guestLunch: mealType === 'guestLunch' ? Math.max(0, delta) : 0,
            guestDinner: mealType === 'guestDinner' ? Math.max(0, delta) : 0
          }
        }
      });
    }

    onUpdateMeals(updated);
  };

  const isTargetOnVacation = isVacation(targetUserId, tomorrow);
  const isTargetLocked = !isManagerOrAdmin && checkIsTomorrowLocked();
  const mealControlsDisabled = settings.isMonthClosed || isTargetOnVacation || isTargetLocked;

  const mealSlots: Array<{
    key: 'breakfast' | 'lunch' | 'dinner';
    guestKey: 'guestBreakfast' | 'guestLunch' | 'guestDinner';
    label: string;
    weight: string;
  }> = [
    {
      key: 'breakfast',
      guestKey: 'guestBreakfast',
      label: isBangla ? 'সকালের নাস্তা' : 'Breakfast',
      weight: '0.5'
    },
    {
      key: 'lunch',
      guestKey: 'guestLunch',
      label: isBangla ? 'দুপুরের খাবার' : 'Lunch',
      weight: '1.0'
    },
    {
      key: 'dinner',
      guestKey: 'guestDinner',
      label: isBangla ? 'রাতের খাবার' : 'Dinner',
      weight: '1.0'
    }
  ];

  const activeDashboardNotices = notices
    .filter(n => !n.expiryDate || n.expiryDate >= today)
    .sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    })
    .slice(0, 3);

  return (
    <div className="space-y-6" id="dashboard-tab">

      {/* Month Closed Warning Banner */}
      {settings.isMonthClosed && (
        <div className="flex items-start sm:items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-800 dark:text-amber-300">
          <AlertTriangle className="shrink-0 mt-0.5 sm:mt-0" size={20} />
          <div className="text-sm leading-relaxed">
            <span className="font-bold">
              {isBangla ? 'মাসটি ক্লোজ করা হয়েছে!' : 'Month is Closed!'}
            </span>{' '}
            {isBangla
              ? 'বর্তমানে আর্কাইভ মোডে আছেন। সব মিল শিট, ডিপোজিট এবং বাজার এন্ট্রি রিড-অনলি হিসেবে লক করা আছে।'
              : 'Currently viewing archive mode. All meal sheets, deposit entries, and bazaar configurations are locked as read-only.'}
          </div>
        </div>
      )}

      {/* 1. CLEAN GREETING HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isBangla ? `স্বাগতম, ${currentUser.name}` : `Welcome back, ${currentUser.name}`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
            <span>{role}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDateDisplay(today, settings.language)}</span>
          </p>
        </div>

        {/* Pending Approvals Shortcut Pill for Admin/Manager (only when needed) */}
        {isManagerOrAdmin && (totalPendingBazaarCount > 0 || totalPendingDepositsCount > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {totalPendingBazaarCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab ? onNavigateTab('Bazaar') : onQuickAction('bazaar')}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <Clock size={14} />
                <span>
                  {isBangla ? `${totalPendingBazaarCount}টি বাজার পেন্ডিং` : `${totalPendingBazaarCount} Bazaar Pending`}
                </span>
                <ArrowRight size={13} />
              </button>
            )}
            {totalPendingDepositsCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab ? onNavigateTab('Deposits') : onQuickAction('deposit')}
                className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <Coins size={14} />
                <span>
                  {isBangla ? `${totalPendingDepositsCount}টি ডিপোজিট পেন্ডিং` : `${totalPendingDepositsCount} Deposits Pending`}
                </span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. ROOMY 4-CARD SUMMARY (Zero clutter, easy 1st-look scan) */}
      {isManagerOrAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="manager-stats">

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isBangla ? 'আজকের ও আগামীকালের মিল' : "Today & Tomorrow Meals"}
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums font-mono">
                  {todayTotalMealsCount}
                  <span className="text-xs font-semibold text-slate-400 ml-2">
                    ({isBangla ? 'কাল:' : 'Tom:'} {tomorrowTotalMealsCount})
                  </span>
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                <Users size={18} />
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
              {isBangla ? 'আজ:' : 'Today:'} B {todayBreakdown.breakfast + todayBreakdown.guestBreakfast} · L {todayBreakdown.lunch + todayBreakdown.guestLunch} · D {todayBreakdown.dinner + todayBreakdown.guestDinner}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isBangla ? 'বর্তমান মিল রেট' : 'Current Meal Rate'}
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums font-mono">
                  {settings.currency}{currentMealRate.toFixed(2)}
                </h3>
              </div>
              <div className="p-2.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums truncate">
              {rawTotalMealsInMonth} {isBangla ? 'মোট মিল এই মাসে' : 'total meals this month'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isBangla ? 'মাসের মোট খরচ' : 'Monthly Total Cost'}
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums font-mono">
                  {settings.currency}{totalExpense.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums truncate">
              {isBangla ? 'বাজার:' : 'Bazaar:'} {settings.currency}{totalBazaarCost.toLocaleString()} · {isBangla ? 'অন্যান্য:' : 'Utility:'} {settings.currency}{totalOtherExpense.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isBangla ? 'আজকের বাজার খরচ' : "Today's Bazaar"}
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums font-mono">
                  {settings.currency}{todayBazaarTotal.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                <ShoppingBag size={18} />
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums truncate">
              {isBangla ? 'অনুমোদিত:' : 'Approved:'} {settings.currency}{todayBazaarApproved} · {isBangla ? 'পেন্ডিং:' : 'Pending:'} {settings.currency}{todayBazaarPending}
            </p>
          </div>

        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="member-stats">

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isBangla ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}
                </p>
                <h3 className={`text-2xl font-extrabold mt-1.5 tabular-nums font-mono ${userCurrentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {userCurrentBalance >= 0 ? '+' : '-'}{settings.currency}{Math.abs(userCurrentBalance).toFixed(2)}
                </h3>
              </div>
              <div className={`p-2.5 rounded-xl shrink-0 ${userCurrentBalance >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                {userCurrentBalance >= 0 ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {userCurrentBalance >= 0
                ? (isBangla ? 'ব্যালেন্স পজিটিভ আছে' : 'Balance is positive')
                : (isBangla ? 'বকেয়া আছে — ডিপোজিট করুন' : 'Due balance — please deposit')}
              {userCarryForward !== 0 && ` · ${isBangla ? 'জের:' : 'Prev:'} ${userCarryForward >= 0 ? '+' : ''}${settings.currency}${userCarryForward}`}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isBangla ? 'আমার মোট মিল' : 'My Total Meals'}
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums font-mono">
                  {userTotalMeals + userGuestMeals}
                  <span className="text-xs font-semibold text-slate-400 ml-2">
                    ({isBangla ? `নিজ ${userTotalMeals}` : `Own ${userTotalMeals}`})
                  </span>
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                <Users size={18} />
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums truncate">
              {isBangla ? `মেস আজ: ${todayTotalMealsCount} · কাল: ${tomorrowTotalMealsCount}` : `Mess today: ${todayTotalMealsCount} · Tom: ${tomorrowTotalMealsCount}`}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isBangla ? 'সম্ভাব্য বিল' : 'Estimated Bill'}
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums font-mono">
                  {settings.currency}{userEstimatedBill.toFixed(2)}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums truncate">
              {isBangla ? 'বর্তমান মিল রেট:' : 'Live meal rate:'} {settings.currency}{currentMealRate.toFixed(2)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isBangla ? 'মোট জমা (ডিপোজিট)' : 'Total Deposited'}
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums font-mono">
                  {settings.currency}{userTotalDeposits.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
                <Coins size={18} />
              </div>
            </div>
            <p className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium truncate tabular-nums">
              {lastUserDepositDate
                ? `${isBangla ? 'শেষ জমা:' : 'Last:'} ${formatDateDisplay(lastUserDepositDate, settings.language)}`
                : `${isBangla ? 'আজকের বাজার:' : "Today's Bazaar:"} ${settings.currency}${todayBazaarTotal.toLocaleString()}`}
            </p>
          </div>

        </div>
      )}

      {/* 3. PRIMARY WORKSPACE: MEAL TOGGLE + ANALYTICS ON LEFT, QUICK ACTIONS + TABBED UPDATES ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-6">

          {/* TOMORROW'S MEAL RESERVATION */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {isBangla ? 'আগামীকালের মিল নির্ধারণ' : "Tomorrow's Meal Reservation"}
                  </h2>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    · {formatMonthDayLabel(tomorrow)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isBangla
                    ? `শেষ সময়: আজ ${formatTime12hDisplay(settings.mealLockTime)}`
                    : `Daily cutoff at ${formatTime12hDisplay(settings.mealLockTime)}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {isManagerOrAdmin && (
                  <select
                    aria-label="Select member for tomorrow meals"
                    value={targetUserId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {allUsers.filter(u => u.isActive).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}){u.id === currentUser.id ? (isBangla ? ' (আপনি)' : ' (You)') : ''}
                      </option>
                    ))}
                  </select>
                )}

                <span className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap ${
                  isTargetOnVacation
                    ? 'text-sky-600 dark:text-sky-400'
                    : isTargetLocked
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isTargetOnVacation ? <Plane size={14} /> : isTargetLocked ? <Lock size={14} /> : <Unlock size={14} />}
                  {isTargetOnVacation
                    ? (isBangla ? 'ছুটি' : 'Vacation')
                    : isTargetLocked
                    ? (isBangla ? 'লক' : 'Locked')
                    : settings.lockOverride
                    ? (isBangla ? 'ওভাররাইড' : 'Override')
                    : (isBangla ? 'খোলা' : 'Open')}
                </span>

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('MealSheet')}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>{isBangla ? 'পূর্ণ শিট' : 'Full Sheet'}</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {mealSlots.map((slot) => {
                const isMealOn = tomorrowMeals[slot.key];
                const guestCount = tomorrowMeals[slot.guestKey] || 0;

                return (
                  <div
                    key={slot.key}
                    className={`rounded-xl p-4 border transition-colors flex flex-col justify-between gap-3.5 ${
                      isMealOn
                        ? 'border-emerald-500/35 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                          {slot.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {slot.weight} {isBangla ? 'মিল' : 'meal'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleTomorrowOwn(slot.key)}
                        disabled={mealControlsDisabled}
                        className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                          isMealOn
                            ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50'
                        }`}
                      >
                        {isMealOn ? (isBangla ? 'চালু (ON)' : 'Meal ON') : (isBangla ? 'বন্ধ (OFF)' : 'Meal OFF')}
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/70 dark:border-slate-800 pt-2.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        {isBangla ? 'অতিথি' : 'Guests'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateGuestTomorrow(slot.guestKey, -1)}
                          disabled={mealControlsDisabled || guestCount <= 0}
                          aria-label={`Decrease ${slot.label} guests`}
                          className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition"
                        >
                          -
                        </button>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white w-6 text-center tabular-nums font-mono">
                          {guestCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateGuestTomorrow(slot.guestKey, 1)}
                          disabled={mealControlsDisabled || guestCount >= settings.guestMealLimit}
                          aria-label={`Increase ${slot.label} guests`}
                          className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INTERACTIVE MONTHLY ANALYTICS CHART */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {activeChartTab === 'comparison' ? <PieChartIcon size={18} className="text-emerald-600 dark:text-emerald-400" /> : <BarChart3 size={18} className="text-emerald-600 dark:text-emerald-400" />}
                  {isBangla ? `${activeMonthLabel}-এর খরচ ও মিল বিশ্লেষণ` : `Monthly Analytics · ${activeMonthLabel}`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isBangla
                    ? 'প্রতিদিনের মিল, খরচ এবং জমার লাইভ পরিসংখ্যান।'
                    : 'Daily overview of meals, expenses, and deposits.'}
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto overflow-x-auto max-w-full">
                {([
                  { id: 'meals', label: isBangla ? 'মিল' : 'Meals' },
                  { id: 'expenses', label: isBangla ? 'খরচ' : 'Expenses' },
                  { id: 'deposits', label: isBangla ? 'জমা' : 'Deposits' },
                  { id: 'comparison', label: isBangla ? 'ক্যাটাগরি' : 'Breakdown' }
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveChartTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
                      activeChartTab === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full min-w-0">
              {activeChartTab === 'meals' && (
                <ResponsiveContainer width="100%" height={256} minWidth={0}>
                  <AreaChart data={dailyChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mealsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                      labelFormatter={(label) => `${shortMonthLabel} ${label}`}
                      formatter={(value: any) => [`${value} ${isBangla ? 'মিল' : 'Meals'}`, isBangla ? 'মোট মিল' : 'Total Meals']}
                    />
                    <Area type="monotone" dataKey="meals" stroke="#10b981" strokeWidth={2.5} fill="url(#mealsAreaGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeChartTab === 'expenses' && (
                <ResponsiveContainer width="100%" height={256} minWidth={0}>
                  <BarChart data={dailyChartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                      labelFormatter={(label) => `${shortMonthLabel} ${label}`}
                      formatter={(value: any, name: any) => [`${settings.currency}${Number(value).toLocaleString()}`, name === 'bazaar' ? (isBangla ? 'বাজার' : 'Bazaar') : (isBangla ? 'অন্যান্য' : 'Utility')]}
                    />
                    <Bar dataKey="bazaar" stackId="exp" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="overhead" stackId="exp" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {activeChartTab === 'deposits' && (
                <ResponsiveContainer width="100%" height={256} minWidth={0}>
                  <AreaChart data={dailyChartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="depositAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                      labelFormatter={(label) => `${shortMonthLabel} ${label}`}
                      formatter={(value: any) => [`${settings.currency}${Number(value).toLocaleString()}`, isBangla ? 'জমা' : 'Deposited']}
                    />
                    <Area type="monotone" dataKey="deposit" stroke="#6366f1" strokeWidth={2.5} fill="url(#depositAreaGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeChartTab === 'comparison' && (
                expenseCategoriesDistribution.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {isBangla ? `${activeMonthLabel}-এ এখনো কোনো খরচ অনুমোদিত হয়নি।` : `No approved expenses recorded in ${activeMonthLabel} yet.`}
                    </p>
                    {isManagerOrAdmin && (
                      <button
                        type="button"
                        onClick={() => onQuickAction('bazaar')}
                        className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        {isBangla ? 'প্রথম বাজার যোগ করুন' : 'Log First Bazaar Entry'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center h-full">
                    <div className="h-56 w-full min-w-0">
                      <ResponsiveContainer width="100%" height={224} minWidth={0}>
                        <PieChart>
                          <Pie
                            data={expenseCategoriesDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {expenseCategoriesDistribution.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '12px',
                              color: '#f8fafc',
                              fontSize: '12px'
                            }}
                            formatter={(value: any) => `${settings.currency}${Number(value).toLocaleString()}`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {expenseCategoriesDistribution.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 truncate">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="truncate">{cat.name}</span>
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums font-mono shrink-0">
                            {settings.currency}{cat.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: QUICK ACTIONS + CLEAN TABBED UPDATES (NOTICES / ACTIVITY / HIGHLIGHTS) */}
        <div className="space-y-6">

          {/* QUICK ACTIONS CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {isBangla ? 'দ্রুত অ্যাকশন' : 'Quick Actions'}
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              {isManagerOrAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => onQuickAction('deposit')}
                    disabled={settings.isMonthClosed}
                    className="flex flex-col items-center justify-center min-h-[76px] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <Coins className="text-emerald-600 dark:text-emerald-400 mb-1.5" size={20} />
                    <span className="text-xs font-bold text-center whitespace-nowrap">
                      {isBangla ? 'ডিপোজিট যোগ' : 'Add Deposit'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickAction('bazaar')}
                    disabled={settings.isMonthClosed}
                    className="flex flex-col items-center justify-center min-h-[76px] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-amber-500/10 hover:border-amber-500/30 transition text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <ShoppingBag className="text-amber-600 dark:text-amber-400 mb-1.5" size={20} />
                    <span className="text-xs font-bold text-center whitespace-nowrap">
                      {isBangla ? 'বাজার যোগ' : 'Add Bazaar'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickAction('notice')}
                    className="flex flex-col items-center justify-center min-h-[76px] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-sky-500/10 hover:border-sky-500/30 transition text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Megaphone className="text-sky-600 dark:text-sky-400 mb-1.5" size={20} />
                    <span className="text-xs font-bold text-center whitespace-nowrap">
                      {isBangla ? 'নোটিশ পোস্ট' : 'Post Notice'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickAction('adjustment')}
                    disabled={settings.isMonthClosed}
                    className="flex flex-col items-center justify-center min-h-[76px] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-violet-500/10 hover:border-violet-500/30 transition text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <FileText className="text-violet-600 dark:text-violet-400 mb-1.5" size={20} />
                    <span className="text-xs font-bold text-center whitespace-nowrap">
                      {isBangla ? 'মিল অ্যাডজাস্ট' : 'Meal Adjust'}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onQuickAction('vacation')}
                    disabled={settings.isMonthClosed}
                    className="flex flex-col items-center justify-center p-4 col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition text-slate-700 dark:text-slate-200 disabled:opacity-50 cursor-pointer"
                  >
                    <Calendar className="text-emerald-600 dark:text-emerald-400 mb-1.5" size={20} />
                    <span className="text-sm font-bold">
                      {isBangla ? 'ছুটি (Vacation) আবেদন' : 'Request Vacation Mode'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isBangla ? 'ছুটির দিনে মিল স্বয়ংক্রিয়ভাবে বন্ধ থাকবে' : 'Automatically marks off meal dates'}
                    </span>
                  </button>

                  {onNavigateTab && (
                    <>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('Deposits')}
                        className="flex flex-col items-center justify-center min-h-[68px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <Coins className="text-emerald-600 dark:text-emerald-400 mb-1" size={18} />
                        <span className="text-xs font-bold whitespace-nowrap">
                          {isBangla ? 'আমার ডিপোজিট' : 'My Deposits'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigateTab('Reports')}
                        className="flex flex-col items-center justify-center min-h-[68px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-500/10 hover:border-blue-500/30 transition text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <BarChart3 className="text-blue-600 dark:text-blue-400 mb-1" size={18} />
                        <span className="text-xs font-bold whitespace-nowrap">
                          {isBangla ? 'মাসিক রিপোর্ট' : 'Monthly Report'}
                        </span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* UNIFIED TABBED UPDATES & INSIGHTS PANEL */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
              <button
                type="button"
                onClick={() => setActiveFeedTab('notices')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeFeedTab === 'notices'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Megaphone size={13} />
                <span>{isBangla ? 'নোটিশ' : 'Notices'}</span>
                {activeDashboardNotices.length > 0 && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ({activeDashboardNotices.length})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFeedTab('activities')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeFeedTab === 'activities'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <History size={13} />
                <span>{isBangla ? 'কার্যক্রম' : 'Activity'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFeedTab('highlights')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeFeedTab === 'highlights'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Award size={13} />
                <span>{isBangla ? 'হাইলাইটস' : 'Highlights'}</span>
              </button>
            </div>

            {/* TAB 1: NOTICES */}
            {activeFeedTab === 'notices' && (
              <div className="space-y-3">
                {activeDashboardNotices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    {isBangla ? 'কোনো নোটিশ বা ঘোষণা নেই' : 'No recent notices available'}
                  </div>
                ) : (
                  activeDashboardNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className={`p-3.5 rounded-xl border text-sm ${
                        notice.isPinned
                          ? 'border-indigo-500/30 bg-indigo-500/[0.06] text-slate-900 dark:text-slate-100'
                          : notice.priority === 'High'
                          ? 'bg-rose-500/[0.06] border-rose-500/20 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold line-clamp-1 flex items-center gap-1.5">
                          {notice.isPinned && <Pin size={12} className="text-indigo-500 shrink-0 rotate-45" />}
                          {notice.title}
                        </span>
                        <span className={`text-[11px] font-bold shrink-0 ${
                          notice.isPinned
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : notice.priority === 'High'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {notice.isPinned
                            ? (isBangla ? 'পিন্ড' : 'Pinned')
                            : (isBangla
                                ? (notice.priority === 'High' ? 'জরুরি' : notice.priority === 'Medium' ? 'মাঝারি' : 'সাধারণ')
                                : notice.priority)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                        {notice.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{notice.authorName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{notice.date}</span>
                      </div>
                    </div>
                  ))
                )}

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('Notices')}
                    className="w-full py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 rounded-xl transition cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <span>{isBangla ? 'সব নোটিশ দেখুন' : 'View All Notices'}</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}

            {/* TAB 2: RECENT ACTIVITIES */}
            {activeFeedTab === 'activities' && (
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    {isBangla ? 'এখনো কোনো কার্যক্রম রেকর্ড হয়নি' : 'No recent activity recorded yet'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 4).map((activity) => (
                      <div key={activity.id} className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0 text-xs">
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                          <span className="font-bold text-slate-950 dark:text-white">{activity.userName}</span>{' '}
                          {activity.action}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{activity.details}</p>
                        <span className="text-[11px] text-slate-400 mt-1 block tabular-nums">
                          {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {isManagerOrAdmin && onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('AuditLogs')}
                    className="w-full py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 rounded-xl transition cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <span>{isBangla ? 'পূর্ণ অডিট লগ দেখুন' : 'View Audit Logs'}</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}

            {/* TAB 3: MONTHLY HIGHLIGHTS */}
            {activeFeedTab === 'highlights' && (
              <div className="space-y-2.5">
                {mostMealsRecord && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {isBangla ? 'সর্বোচ্চ মিল' : 'Most Meals'}
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{mostMealsRecord.user.name}</p>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono shrink-0">
                      {mostMealsRecord.total} {isBangla ? 'মিল' : 'meals'}
                    </span>
                  </div>
                )}

                {leastMealsRecord && sortedMembersByMeals.length > 1 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {isBangla ? 'সর্বনিম্ন মিল' : 'Least Meals'}
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{leastMealsRecord.user.name}</p>
                    </div>
                    <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 tabular-nums font-mono shrink-0">
                      {leastMealsRecord.total} {isBangla ? 'মিল' : 'meals'}
                    </span>
                  </div>
                )}

                {highestExpenseRecord && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {isBangla ? 'সর্বোচ্চ একক খরচ' : 'Highest Expense'}
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={highestExpenseRecord.title}>
                        {highestExpenseRecord.title}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 tabular-nums font-mono shrink-0">
                      {settings.currency}{highestExpenseRecord.amount.toLocaleString()}
                    </span>
                  </div>
                )}

                {highestDepositRecord && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {isBangla ? 'সর্বোচ্চ ডিপোজিট' : 'Top Deposit'}
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{highestDepositRecord.userName}</p>
                    </div>
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 tabular-nums font-mono shrink-0">
                      {settings.currency}{highestDepositRecord.amount.toLocaleString()}
                    </span>
                  </div>
                )}

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('Reports')}
                    className="w-full py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 rounded-xl transition cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <span>{isBangla ? 'পূর্ণ মাসিক রিপোর্ট' : 'Full Monthly Report'}</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
