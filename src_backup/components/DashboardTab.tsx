import React, { useState } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Megaphone, 
  History, 
  Sparkles,
  ShoppingBag,
  Coins,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Pin,
  Award,
  Activity,
  Receipt,
  Scale
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { User, MemberMealSheet, Deposit, BazaarEntry, Expense, Notice, ActivityLog, SystemSettings, VacationPeriod } from '../types';
import { useFeedback } from './FeedbackContext';

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
  vacationPeriods
}: DashboardTabProps) {

  const { showToast } = useFeedback();

  // Current Date logic
  const today = '2026-07-18';
  const tomorrow = '2026-07-19';

  const isManagerOrAdmin = role === 'Admin' || role === 'Meal Manager';
  const isBangla = settings.language === 'Bangla';

  // Interactive chart state tab
  const [activeChartTab, setActiveChartTab] = useState<'meals' | 'expenses' | 'deposits' | 'comparison'>('meals');

  // Check if a specific user is on vacation for a specific date
  const isVacation = (userId: string, date: string): boolean => {
    return vacationPeriods?.some(vp => vp.userId === userId && date >= vp.startDate && date <= vp.endDate) || false;
  };

  // HELPER CALCULATIONS
  // Count meals for a given user on a specific date
  const countMealsForDate = (userMealSheet: MemberMealSheet | undefined, date: string): number => {
    if (!userMealSheet) return 0;
    if (isVacation(userMealSheet.userId, date)) return 0; // Automatically OFF during vacation
    if (!userMealSheet.meals[date]) return 0;
    const dayMeal = userMealSheet.meals[date];
    // Breakfast = 0.5, Lunch = 1, Dinner = 1
    const own = (dayMeal.breakfast ? 0.5 : 0) + (dayMeal.lunch ? 1.0 : 0) + (dayMeal.dinner ? 1.0 : 0);
    const guest = (dayMeal.guestBreakfast * 0.5) + (dayMeal.guestLunch * 1.0) + (dayMeal.guestDinner * 1.0);
    return own + guest;
  };

  // Total Meals of the whole mess across the month
  const totalMealsInMonth = meals.reduce((sum, sheet) => {
    let sheetSum = 0;
    Object.keys(sheet.meals).forEach(date => {
      if (isVacation(sheet.userId, date)) return; // skip vacation days
      const m = sheet.meals[date];
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = (m.guestBreakfast * 0.5) + (m.guestLunch * 1.0) + (m.guestDinner * 1.0);
      sheetSum += own + guest;
    });
    return sum + sheetSum;
  }, 0) || 1; // avoid divide by zero

  // Approved Bazaar costs
  const totalBazaarCost = bazaarEntries
    .filter(entry => entry.status === 'Approved')
    .reduce((sum, entry) => sum + entry.price, 0);

  // Other Expenses (Utility, cleaning etc)
  const totalOtherExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const totalExpense = totalBazaarCost + totalOtherExpense;
  const currentMealRate = totalExpense / totalMealsInMonth;

  // Today's total meal counts (individual breakdown)
  const todayBreakdown = meals.reduce((acc, sheet) => {
    if (isVacation(sheet.userId, today)) return acc; // skip vacation days
    const m = sheet.meals[today];
    if (m) {
      acc.breakfast += m.breakfast ? 1 : 0;
      acc.lunch += m.lunch ? 1 : 0;
      acc.dinner += m.dinner ? 1 : 0;
      acc.guestBreakfast += m.guestBreakfast;
      acc.guestLunch += m.guestLunch;
      acc.guestDinner += m.guestDinner;
    }
    return acc;
  }, { breakfast: 0, lunch: 0, dinner: 0, guestBreakfast: 0, guestLunch: 0, guestDinner: 0 });

  const todayTotalMealsCount = (todayBreakdown.breakfast * 0.5) + todayBreakdown.lunch + todayBreakdown.dinner +
    (todayBreakdown.guestBreakfast * 0.5) + todayBreakdown.guestLunch + todayBreakdown.guestDinner;

  // Tomorrow's total meal counts
  const tomorrowBreakdown = meals.reduce((acc, sheet) => {
    if (isVacation(sheet.userId, tomorrow)) return acc; // skip vacation days
    const m = sheet.meals[tomorrow];
    if (m) {
      acc.breakfast += m.breakfast ? 1 : 0;
      acc.lunch += m.lunch ? 1 : 0;
      acc.dinner += m.dinner ? 1 : 0;
      acc.guestBreakfast += m.guestBreakfast;
      acc.guestLunch += m.guestLunch;
      acc.guestDinner += m.guestDinner;
    }
    return acc;
  }, { breakfast: 0, lunch: 0, dinner: 0, guestBreakfast: 0, guestLunch: 0, guestDinner: 0 });

  const tomorrowTotalMealsCount = (tomorrowBreakdown.breakfast * 0.5) + tomorrowBreakdown.lunch + tomorrowBreakdown.dinner +
    (tomorrowBreakdown.guestBreakfast * 0.5) + tomorrowBreakdown.guestLunch + tomorrowBreakdown.guestDinner;

  // Pending deposits count
  const pendingDepositsSum = deposits.filter(d => !d.transactionId && d.method === 'Cash').reduce((sum, d) => sum + d.amount, 0); // simulated cash deposits without ref

  // Pending Bazaar Entries count
  const pendingBazaarCount = bazaarEntries.filter(entry => entry.status === 'Pending').length;
  
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
  
  const todayBazaarApprovedCost = todayBazaarApproved;

  // -------------------------------------------------------------
  // ADVANCED ANALYTICS DASHBOARD MATHEMATICS ENGINE
  // -------------------------------------------------------------

  // 1. Total Monthly Deposit (Approved)
  const totalMonthlyDeposit = deposits
    .filter(d => d.status === 'Approved')
    .reduce((sum, d) => sum + d.amount, 0);

  // 2. Pending Bazaar Entries (Pending status)
  const pendingBazaarList = bazaarEntries.filter(entry => entry.status === 'Pending');
  const totalPendingBazaarCount = pendingBazaarList.length;
  const totalPendingBazaarAmount = pendingBazaarList.reduce((sum, b) => sum + b.price, 0);

  // 3. Pending Deposits (Pending status)
  const pendingDepositsList = deposits.filter(d => d.status === 'Pending');
  const totalPendingDepositsCount = pendingDepositsList.length;
  const totalPendingDepositsAmount = pendingDepositsList.reduce((sum, d) => sum + d.amount, 0);

  // 4. Most & Least Meals (For Active Members)
  const activeUsers = allUsers.filter(u => u.isActive);
  const memberMealCalculations = activeUsers.map(user => {
    const userSheet = meals.find(sheet => sheet.userId === user.id);
    let ownMealsCount = 0;
    let guestMealsCount = 0;
    if (userSheet) {
      Object.keys(userSheet.meals).forEach(date => {
        if (isVacation(user.id, date)) return;
        const m = userSheet.meals[date];
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

  // 5. Highest Expense (Single approved bazaar entry or standard utility expense)
  const bazaarExpenses = bazaarEntries
    .filter(b => b.status === 'Approved')
    .map(b => ({
      title: b.items,
      amount: b.price,
      date: b.date,
      type: 'Bazaar'
    }));
  const otherExpenses = expenses.map(e => ({
    title: `${e.category}${e.note ? ` (${e.note})` : ''}`,
    amount: e.amount,
    date: e.date,
    type: 'Utility'
  }));
  const allExpenseItems = [...bazaarExpenses, ...otherExpenses];
  const highestExpenseRecord = allExpenseItems.length > 0
    ? [...allExpenseItems].sort((a, b) => b.amount - a.amount)[0]
    : null;

  // 6. Highest Deposit (Single approved deposit)
  const approvedDepositsList = deposits
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

  // 7. Interactive Chart Data Processing
  // Prepare daily values for July 2026 (days 1 to 31)
  const dailyChartData = Array.from({ length: 31 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-07-${dayNum < 10 ? '0' + dayNum : dayNum}`;

    // Total meals on this day
    const dayMealsTotal = meals.reduce((sum, sheet) => {
      if (isVacation(sheet.userId, dateStr)) return sum;
      const m = sheet.meals[dateStr];
      if (!m) return sum;
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = (m.guestBreakfast * 0.5) + (m.guestLunch * 1.0) + (m.guestDinner * 1.0);
      return sum + own + guest;
    }, 0);

    // Total approved bazaar expense on this day
    const dayBazaarTotal = bazaarEntries
      .filter(b => b.status === 'Approved' && b.date === dateStr)
      .reduce((sum, b) => sum + b.price, 0);

    // General overhead expense on this day
    const dayOtherTotal = expenses
      .filter(e => e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);

    // Total approved deposit on this day
    const dayDepositTotal = deposits
      .filter(d => d.status === 'Approved' && d.date === dateStr)
      .reduce((sum, d) => sum + d.amount, 0);

    return {
      day: dayNum,
      shortDate: `Jul ${dayNum}`,
      meals: parseFloat(dayMealsTotal.toFixed(1)),
      expense: dayBazaarTotal + dayOtherTotal,
      bazaar: dayBazaarTotal,
      overhead: dayOtherTotal,
      deposit: dayDepositTotal
    };
  });

  // Category distribution for expenses Pie Chart
  const expenseCategoriesDistribution = [
    { name: 'Bazaar/Grocery', value: totalBazaarCost, color: '#10b981' }, // emerald
    { name: 'Gas Utilities', value: expenses.filter(e => e.category === 'Gas').reduce((s, e) => s + e.amount, 0), color: '#f59e0b' }, // amber
    { name: 'Power/Electricity', value: expenses.filter(e => e.category === 'Electricity').reduce((s, e) => s + e.amount, 0), color: '#3b82f6' }, // blue
    { name: 'Broadband/Internet', value: expenses.filter(e => e.category === 'Internet').reduce((s, e) => s + e.amount, 0), color: '#8b5cf6' }, // violet
    { name: 'Water Utilities', value: expenses.filter(e => e.category === 'Water').reduce((s, e) => s + e.amount, 0), color: '#06b6d4' }, // cyan
    { name: 'Mess Cleaning', value: expenses.filter(e => e.category === 'Cleaning').reduce((s, e) => s + e.amount, 0), color: '#ec4899' }, // pink
    { name: 'Cook/Maid Salaries', value: expenses.filter(e => e.category === 'Maid').reduce((s, e) => s + e.amount, 0), color: '#14b8a6' }, // teal
    { name: 'Other Overheads', value: expenses.filter(e => e.category === 'Others').reduce((s, e) => s + e.amount, 0), color: '#64748b' } // slate
  ].filter(item => item.value > 0);

  // If empty, add a small mock category to avoid blank pie charts
  if (expenseCategoriesDistribution.length === 0) {
    expenseCategoriesDistribution.push({ name: 'General Outflow', value: 100, color: '#10b981' });
  }

  // USER INDIVIDUAL SUMMARY
  const userMealsSheet = meals.find(sheet => sheet.userId === currentUser.id);
  
  // Calculate total meals for current user
  let userTotalMeals = 0;
  let userGuestMeals = 0;
  if (userMealsSheet) {
    Object.keys(userMealsSheet.meals).forEach(date => {
      const m = userMealsSheet.meals[date];
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = (m.guestBreakfast * 0.5) + (m.guestLunch * 1.0) + (m.guestDinner * 1.0);
      userTotalMeals += own;
      userGuestMeals += guest;
    });
  }

  const userEstimatedBill = (userTotalMeals + userGuestMeals) * currentMealRate;
  const userTotalDeposits = deposits
    .filter(d => d.userId === currentUser.id && d.status !== 'Pending' && d.status !== 'Rejected')
    .reduce((sum, d) => sum + d.amount, 0);
  const userCarryForward = currentUser.carryForward || 0;
  const userCurrentBalance = userCarryForward + userTotalDeposits - userEstimatedBill;

  // TOMORROW MEAL RESERVATION STATUS (For member interactive edit)
  const tomorrowMeals = userMealsSheet?.meals[tomorrow] || {
    breakfast: true,
    lunch: true,
    dinner: true,
    guestBreakfast: 0,
    guestLunch: 0,
    guestDinner: 0
  };

  const checkIsTomorrowLocked = (): boolean => {
    if (isManagerOrAdmin) return false;
    if (settings.isMonthClosed) return true;
    if (settings.lockOverride) return false; // Lock overridden by Manager

    const now = new Date();
    const [lockHour, lockMinute] = settings.mealLockTime.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour > lockHour || (currentHour === lockHour && currentMinute >= lockMinute)) {
      return true;
    }
    return false;
  };

  const handleToggleTomorrowOwn = (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (settings.isMonthClosed) return;

    if (isVacation(currentUser.id, tomorrow)) {
      showToast(isBangla ? "আপনি আগামীকাল ছুটিতে আছেন! ছুটি বাতিল করে আবার চেষ্টা করুন।" : "You are on vacation tomorrow! Cancel vacation in the Meal Sheet tab to toggle individual meals.", "warning");
      return;
    }

    if (checkIsTomorrowLocked()) {
      showToast(isBangla ? `আগামীকালের মিল লক করা হয়েছে। শেষ সময় ছিল ${settings.mealLockTime}।` : `Meals are locked for tomorrow. The deadline was ${settings.mealLockTime}.`, "warning");
      return;
    }

    const updated = meals.map(sheet => {
      if (sheet.userId === currentUser.id) {
        const currentDayMeals = sheet.meals[tomorrow] || {
          breakfast: true, lunch: true, dinner: true,
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
    onUpdateMeals(updated);
  };

  const handleUpdateGuestTomorrow = (mealType: 'guestBreakfast' | 'guestLunch' | 'guestDinner', delta: number) => {
    if (settings.isMonthClosed) return;

    if (isVacation(currentUser.id, tomorrow)) {
      showToast(isBangla ? "আপনি আগামীকাল ছুটিতে আছেন! অতিথি মিল যোগ করতে ছুটি বাতিল করুন।" : "You are on vacation tomorrow! Cancel vacation in the Meal Sheet tab to adjust guest meals.", "warning");
      return;
    }

    if (checkIsTomorrowLocked()) {
      showToast(isBangla ? `আগামীকালের মিল লক করা হয়েছে। শেষ সময় ছিল ${settings.mealLockTime}।` : `Meals are locked for tomorrow. The deadline was ${settings.mealLockTime}.`, "warning");
      return;
    }

    const updated = meals.map(sheet => {
      if (sheet.userId === currentUser.id) {
        const currentDayMeals = sheet.meals[tomorrow] || {
          breakfast: true, lunch: true, dinner: true,
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
    onUpdateMeals(updated);
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      
      {/* Month Closed Warning Banner */}
      {settings.isMonthClosed && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-400">
          <AlertTriangle className="shrink-0" size={20} />
          <div className="text-sm">
            <span className="font-semibold">Month is Closed!</span> Currently viewing archive mode. All meal sheets, deposit entries, and bazaar configurations are locked as read-only.
          </div>
        </div>
      )}

      {/* Greetings Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Welcome back, {currentUser.name}! <Sparkles className="text-amber-500 animate-pulse" size={20} />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isManagerOrAdmin 
              ? 'Here is an overview of the elite mess operation and expense stats for July 2026.'
              : 'Keep track of your personal meals, estimated bill, and deposits.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>System Date: July 18, 2026</span>
        </div>
      </div>

      {/* STATS BENTO GRID */}
      {isManagerOrAdmin ? (
        /* MANAGER & ADMIN DASHBOARD STATS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4" id="manager-stats">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'আজকের মোট মিল' : "Today's Total Meals"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{todayTotalMealsCount}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>B: {todayBreakdown.breakfast + todayBreakdown.guestBreakfast}</span>
              <span>L: {todayBreakdown.lunch + todayBreakdown.guestLunch}</span>
              <span>D: {todayBreakdown.dinner + todayBreakdown.guestDinner}</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/20 group-hover:bg-emerald-500 transition-all"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'আগামীকালের মিল' : "Tomorrow's Reserved"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{tomorrowTotalMealsCount}</h3>
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <Calendar size={18} />
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>B: {tomorrowBreakdown.breakfast + tomorrowBreakdown.guestBreakfast}</span>
              <span>L: {tomorrowBreakdown.lunch + tomorrowBreakdown.guestLunch}</span>
              <span>D: {tomorrowBreakdown.dinner + tomorrowBreakdown.guestDinner}</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-all"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'বর্তমান মিল রেট' : "Current Meal Rate"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {settings.currency}{currentMealRate.toFixed(2)}
                </h3>
              </div>
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 truncate font-medium">
              {settings.language === 'Bangla' ? 'মোট খরচ' : 'Expenses'}: {settings.currency}{totalExpense} / {totalMealsInMonth} {settings.language === 'Bangla' ? 'মিল' : 'Meals'}
            </p>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-violet-500/20 group-hover:bg-violet-500 transition-all"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'চলতি মাসের মোট খরচ' : "Total Monthly Cost"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {settings.currency}{totalExpense.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Bazaar: {settings.currency}{totalBazaarCost}</span>
              <span>Utility: {settings.currency}{totalOtherExpense}</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/20 group-hover:bg-blue-500 transition-all"></div>
          </div>

          {/* TODAY'S BAZAAR EXPENSE CARD (NEW) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'আজকের বাজার খরচ' : "Today's Bazaar Expense"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {settings.currency}{todayBazaarTotal.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <ShoppingBag size={18} />
              </div>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>{settings.language === 'Bangla' ? 'অনুমোদিত' : 'Approved'}: {settings.currency}{todayBazaarApproved}</span>
              <span>{settings.language === 'Bangla' ? 'অপেক্ষমাণ' : 'Pending'}: {settings.currency}{todayBazaarPending}</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-all"></div>
          </div>

        </div>
      ) : (
        /* MEMBER DASHBOARD STATS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4" id="member-stats">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'আমার মোট মিল' : "My Total Meals"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {userTotalMeals + userGuestMeals} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">Meals</span>
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Own: {userTotalMeals}</span>
              <span>Guest: {userGuestMeals}</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/20 group-hover:bg-emerald-500 transition-all"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'সম্ভাব্য বিল' : "Estimated Bill"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {settings.currency}{userEstimatedBill.toFixed(2)}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-medium">
              {settings.language === 'Bangla' ? 'মিল রেট অনুযায়ী' : 'Based on live meal rate'}: {settings.currency}{currentMealRate.toFixed(2)}
            </p>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/20 group-hover:bg-blue-500 transition-all"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'মোট জমা (ডিপোজিট)' : "Total Deposited"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {settings.currency}{userTotalDeposits.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
                <Coins size={18} />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-medium">
              {settings.language === 'Bangla' ? 'শেষ জমা: ১৫ই জুলাই, ২০২৬' : 'Last Deposit: July 15, 2026'}
            </p>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-violet-500/20 group-hover:bg-violet-500 transition-all"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'বর্তমান ব্যালেন্স' : "Current Balance"}
                </p>
                <h3 className={`text-2xl font-bold mt-1.5 ${userCurrentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {userCurrentBalance >= 0 ? '+' : '-'}{settings.currency}{Math.abs(userCurrentBalance).toFixed(2)}
                </h3>
              </div>
              <div className={`p-2.5 rounded-xl ${userCurrentBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
                {userCurrentBalance >= 0 ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 truncate font-medium">
              {userCurrentBalance >= 0 
                ? (settings.language === 'Bangla' ? 'ধন্যবাদ! আপনার ব্যালেন্স পজিটিভ।' : 'Keep it up! Your balance is positive.')
                : (settings.language === 'Bangla' ? 'অনুগ্রহ করে দ্রুত ডিপোজিট করুন!' : 'Please pay immediate deposit advance!')}
              {userCarryForward !== 0 && ` (${settings.language === 'Bangla' ? 'ক্যারী ফরওয়ার্ড' : 'Carry Forward'}: ${userCarryForward >= 0 ? '+' : ''}${settings.currency}${userCarryForward})`}
            </p>
            <div className={`absolute bottom-0 left-0 w-full h-1 ${userCurrentBalance >= 0 ? 'bg-emerald-500/20 group-hover:bg-emerald-500' : 'bg-rose-500/20 group-hover:bg-rose-500'} transition-all`}></div>
          </div>

          {/* TODAY'S BAZAAR EXPENSE CARD FOR MEMBER TOO */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {settings.language === 'Bangla' ? 'আজকের মেস বাজার' : "Today's Mess Bazaar"}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {settings.currency}{todayBazaarTotal.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <ShoppingBag size={18} />
              </div>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>{settings.language === 'Bangla' ? 'অনুমোদিত' : 'Approved'}: {settings.currency}{todayBazaarApproved}</span>
              <span>{settings.language === 'Bangla' ? 'অপেক্ষমাণ' : 'Pending'}: {settings.currency}{todayBazaarPending}</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-all"></div>
          </div>

        </div>
      )}

      {/* RECENT NOTIFICATIONS & QUICK ACTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT/MID MAIN FEED: TOMORROW'S MEALS RESERVATION (IF MEMBER) OR QUICK ACTIONS (IF MANAGER) & METRICS */}
        <div className="lg:col-span-2 space-y-6">

          {/* TODAY & TOMORROW MESS SUMMARY BAR FOR MEMBERS */}
          {!isManagerOrAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Today's Mess Meals (July 18):
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white bg-white dark:bg-slate-900 px-3 py-1 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800">
                  {todayTotalMealsCount} Meals
                </span>
              </div>
              <div className="flex items-center justify-between sm:border-l sm:border-slate-150 dark:sm:border-slate-800 sm:pl-4">
                <span className="text-xs font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Tomorrow's Mess Meals (July 19):
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white bg-white dark:bg-slate-900 px-3 py-1 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800">
                  {tomorrowTotalMealsCount} Meals
                </span>
              </div>
            </div>
          )}

          {/* INTERACTIVE TOMORROW'S MEAL CONFIG (Visible to all, but especially empowering for Members) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  Tomorrow's Meal Reservation <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">Tomorrow: July 19</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your active meals and add expected guest meals before the deadline at <span className="font-semibold text-emerald-600 dark:text-emerald-400">{settings.mealLockTime} today</span>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isVacation(currentUser.id, tomorrow) ? (
                  <span className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold px-2.5 py-1 rounded-full border border-sky-500/15">
                    ✈ Vacation Active
                  </span>
                ) : checkIsTomorrowLocked() ? (
                  <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-2.5 py-1 rounded-full border border-rose-500/15">
                    🔒 Locked
                  </span>
                ) : settings.lockOverride ? (
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/15">
                    🔓 Override Active
                  </span>
                ) : (
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/15">
                    🔓 Open
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* BREAKFAST CARD */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Breakfast</span>
                  <button
                    onClick={() => handleToggleTomorrowOwn('breakfast')}
                    disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked()}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                      tomorrowMeals.breakfast 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-75'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-75'
                    }`}
                  >
                    {tomorrowMeals.breakfast ? 'Meal ON' : 'Meal OFF'}
                  </button>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Guests:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateGuestTomorrow('guestBreakfast', -1)}
                      disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked() || tomorrowMeals.guestBreakfast <= 0}
                      className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white w-4 text-center">
                      {tomorrowMeals.guestBreakfast}
                    </span>
                    <button
                      onClick={() => handleUpdateGuestTomorrow('guestBreakfast', 1)}
                      disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked() || tomorrowMeals.guestBreakfast >= settings.guestMealLimit}
                      className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* LUNCH CARD */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Lunch</span>
                  <button
                    onClick={() => handleToggleTomorrowOwn('lunch')}
                    disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked()}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                      tomorrowMeals.lunch 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-75'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-75'
                    }`}
                  >
                    {tomorrowMeals.lunch ? 'Meal ON' : 'Meal OFF'}
                  </button>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Guests:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateGuestTomorrow('guestLunch', -1)}
                      disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked() || tomorrowMeals.guestLunch <= 0}
                      className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white w-4 text-center">
                      {tomorrowMeals.guestLunch}
                    </span>
                    <button
                      onClick={() => handleUpdateGuestTomorrow('guestLunch', 1)}
                      disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked() || tomorrowMeals.guestLunch >= settings.guestMealLimit}
                      className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* DINNER CARD */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Dinner</span>
                  <button
                    onClick={() => handleToggleTomorrowOwn('dinner')}
                    disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked()}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                      tomorrowMeals.dinner 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-75'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-75'
                    }`}
                  >
                    {tomorrowMeals.dinner ? 'Meal ON' : 'Meal OFF'}
                  </button>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Guests:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateGuestTomorrow('guestDinner', -1)}
                      disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked() || tomorrowMeals.guestDinner <= 0}
                      className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white w-4 text-center">
                      {tomorrowMeals.guestDinner}
                    </span>
                    <button
                      onClick={() => handleUpdateGuestTomorrow('guestDinner', 1)}
                      disabled={settings.isMonthClosed || isVacation(currentUser.id, tomorrow) || checkIsTomorrowLocked() || tomorrowMeals.guestDinner >= settings.guestMealLimit}
                      className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* VISUAL CHARTS MODULE (ELEGANT MOCKUP OF MEAL RATE & COST BREAKDOWNS) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white">Monthly Expense & Meal Trends</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live system visual analytics of expenses vs meal counts.</p>
              </div>
              <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="px-2 py-1 bg-white dark:bg-slate-700 font-medium shadow-sm rounded text-slate-700 dark:text-white">Expenses</span>
                <span className="px-2 py-1 text-slate-400">Meals</span>
              </div>
            </div>

            {/* HIGH FIDELITY SVG CHART REPRESENTING EXPENSE HISTORY WITH TOOLTIPS */}
            <div className="relative h-60 w-full bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              
              <div className="absolute top-4 left-4 text-xs font-semibold text-slate-400 dark:text-slate-500">৳8,000</div>
              <div className="absolute top-1/2 left-4 text-xs font-semibold text-slate-400 dark:text-slate-500">৳4,000</div>
              <div className="absolute bottom-10 left-4 text-xs font-semibold text-slate-400 dark:text-slate-500">৳0</div>

              {/* The lines */}
              <div className="flex-1 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="currentColor" className="text-slate-200 dark:text-slate-800/60" strokeDasharray="3,3" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="currentColor" className="text-slate-200 dark:text-slate-800/60" strokeDasharray="3,3" />
                  <line x1="0" y1="130" x2="500" y2="130" stroke="currentColor" className="text-slate-200 dark:text-slate-800/60" strokeDasharray="3,3" />

                  {/* Gradient Area under curve */}
                  <defs>
                    <linearGradient id="gradient-chart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Fill area */}
                  <path
                    d="M 10 130 Q 80 50 150 90 T 300 30 T 450 60 Q 480 60 490 130 Z"
                    fill="url(#gradient-chart)"
                  />
                  
                  {/* Curve Path */}
                  <path
                    d="M 10 130 Q 80 50 150 90 T 300 30 T 450 60 Q 480 60 490 70"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Nodes */}
                  <circle cx="10" cy="130" r="4.5" className="fill-emerald-600 stroke-white" strokeWidth="2" />
                  <circle cx="110" cy="70" r="4.5" className="fill-emerald-600 stroke-white" strokeWidth="2" />
                  <circle cx="220" cy="50" r="4.5" className="fill-emerald-600 stroke-white" strokeWidth="2" />
                  <circle cx="330" cy="35" r="4.5" className="fill-emerald-600 stroke-white" strokeWidth="2" />
                  <circle cx="440" cy="58" r="4.5" className="fill-emerald-600 stroke-white" strokeWidth="2" />
                </svg>
              </div>

              {/* X Axis Labels */}
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 px-6 border-t border-slate-100 dark:border-slate-800 pt-2">
                <span>July 01</span>
                <span>July 05</span>
                <span>July 10</span>
                <span>July 15</span>
                <span>July 18 (Today)</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR: QUICK ACTIONS & NOTICES */}
        <div className="space-y-6">
          
          {/* QUICK ACTIONS CARD (Adaptive depending on lock/open month) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-2">
              {isManagerOrAdmin ? (
                <>
                  <button
                    onClick={() => onQuickAction('deposit')}
                    disabled={settings.isMonthClosed}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition text-slate-700 dark:text-slate-300 group disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Coins className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition duration-300 mb-1.5" size={20} />
                    <span className="text-xs font-semibold text-center">Add Deposit</span>
                  </button>

                  <button
                    onClick={() => onQuickAction('bazaar')}
                    disabled={settings.isMonthClosed}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition text-slate-700 dark:text-slate-300 group disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ShoppingBag className="text-amber-600 dark:text-amber-400 group-hover:scale-110 transition duration-300 mb-1.5" size={20} />
                    <span className="text-xs font-semibold text-center">Add Bazaar</span>
                  </button>

                  <button
                    onClick={() => onQuickAction('notice')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition text-slate-700 dark:text-slate-300 group"
                  >
                    <Megaphone className="text-sky-600 dark:text-sky-400 group-hover:scale-110 transition duration-300 mb-1.5" size={20} />
                    <span className="text-xs font-semibold text-center">Post Notice</span>
                  </button>

                  <button
                    onClick={() => onQuickAction('adjustment')}
                    disabled={settings.isMonthClosed}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition text-slate-700 dark:text-slate-300 group disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <FileText className="text-violet-600 dark:text-violet-400 group-hover:scale-110 transition duration-300 mb-1.5" size={20} />
                    <span className="text-xs font-semibold text-center">Meal Adjust</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onQuickAction('vacation')}
                    disabled={settings.isMonthClosed}
                    className="flex flex-col items-center justify-center p-4 col-span-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition text-slate-700 dark:text-slate-300 group disabled:opacity-50"
                  >
                    <Calendar className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition duration-300 mb-2" size={22} />
                    <span className="text-sm font-semibold">Request Vacation Mode</span>
                    <span className="text-[10px] text-slate-400 mt-1">Automatically marks off future meal dates</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* RECENT NOTICES PREVIEW */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Megaphone size={18} className="text-emerald-600 dark:text-emerald-400" /> 
                {isBangla ? 'আজকের নোটিশসমূহ' : "Today's Notices"}
              </h3>
            </div>
            
            <div className="space-y-3">
              {(() => {
                const activeDashboardNotices = notices
                  .filter(n => !n.expiryDate || n.expiryDate >= today)
                  .sort((a, b) => {
                    const pinA = a.isPinned ? 1 : 0;
                    const pinB = b.isPinned ? 1 : 0;
                    if (pinA !== pinB) return pinB - pinA;
                    return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
                  })
                  .slice(0, 3);

                if (activeDashboardNotices.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-450 dark:text-slate-500 font-medium">
                      {isBangla ? 'কোনো নোটিশ বা ঘোষণা নেই' : 'No recent notices available'}
                    </div>
                  );
                }

                return activeDashboardNotices.map((notice) => (
                  <div 
                    key={notice.id} 
                    className={`p-3.5 rounded-xl border text-sm relative overflow-hidden ${
                      notice.isPinned
                        ? 'border-indigo-200 dark:border-indigo-950/60 bg-indigo-500/5 text-indigo-900 dark:text-indigo-300 ring-1 ring-indigo-500/10'
                        : notice.priority === 'High' 
                        ? 'bg-rose-500/5 border-rose-500/10 text-rose-900 dark:text-rose-300' 
                        : notice.priority === 'Medium'
                        ? 'bg-amber-500/5 border-amber-500/10 text-amber-900 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {notice.isPinned && (
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500"></div>
                    )}
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold line-clamp-1 flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        {notice.isPinned && <Pin size={11} className="text-indigo-500 fill-indigo-500 shrink-0 rotate-45" />}
                        {notice.title}
                      </span>
                      <span className={`text-[8px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        notice.isPinned
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25'
                          : notice.priority === 'High' 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                          : 'bg-slate-200/50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {notice.isPinned 
                          ? (isBangla ? 'পিন্ড' : 'Pinned') 
                          : (isBangla 
                              ? (notice.priority === 'High' ? 'উচ্চ' : notice.priority === 'Medium' ? 'মাঝারি' : 'নিম্ন')
                              : notice.priority)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {notice.description}
                    </p>
                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-850 text-[10px] text-slate-400">
                      <span>{isBangla ? 'প্রকাশক:' : 'By:'} {notice.authorName}</span>
                      <span>{notice.date}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* RECENT ACTIVITIES COMPONENT */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <History size={18} className="text-slate-400" /> Recent Activities
            </h3>
            
            <div className="space-y-4">
              {activities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200">
                      <span className="font-semibold text-slate-950 dark:text-white">{activity.userName}</span>{' '}
                      {activity.action}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{activity.details}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
