import React, { useState, useEffect } from 'react';
import { 
  FilePieChart, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  Coins, 
  ShoppingBag, 
  Users, 
  ArrowUpRight, 
  Search,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Lock,
  Unlock,
  Clock,
  ArrowRight,
  HelpCircle,
  Activity,
  Award
} from 'lucide-react';
import { User, MemberMealSheet, Deposit, BazaarEntry, Expense, SystemSettings, MealStatus, VacationPeriod, ClosedMonthRecord } from '../types';
import { useFeedback } from './FeedbackContext';
import {
  getRealCurrentMonth,
  getMonthDates,
  getDaysInMonth,
  getNextMonth,
  formatMonthLabel,
  getMonthPickerOptions,
  getWeekRangesForMonth
} from '../utils/dateUtils';

interface ReportsTabProps {
  allUsers: User[];
  meals: MemberMealSheet[];
  deposits: Deposit[];
  bazaarEntries: BazaarEntry[];
  expenses: Expense[];
  settings: SystemSettings;
  currentUser: User;
  role: 'Admin' | 'Meal Manager' | 'Member';
  onUpdateUsers: (updatedUsers: User[]) => void;
  onUpdateSettings: (updatedSettings: SystemSettings) => void;
  onStartNewMonth?: (targetMonth?: string, options?: { autoCloseAndCarryForward?: boolean }) => void;
  onLogAction: (actionName: string, details: string) => void;
  vacationPeriods?: VacationPeriod[];
}

type ReportSubTab = 'Monthly' | 'Daily' | 'Weekly' | 'User' | 'Bazaar' | 'Deposit' | 'GuestMeal';

export default function ReportsTab({
  allUsers,
  meals,
  deposits,
  bazaarEntries,
  expenses,
  settings,
  currentUser,
  role,
  onUpdateUsers,
  onUpdateSettings,
  onStartNewMonth,
  onLogAction,
  vacationPeriods = []
}: ReportsTabProps) {

  const activeMonth = settings.activeMonth || getRealCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(activeMonth);
  const [activeTab, setActiveTab] = useState<ReportSubTab>('Monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>(allUsers.find(u => u.isActive)?.id || '');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosingSuccess, setIsClosingSuccess] = useState(false);

  useEffect(() => {
    setSelectedMonth(activeMonth);
  }, [activeMonth]);

  const isManagerOrAdmin = role === 'Admin' || role === 'Meal Manager';
  const isBangla = settings.language === 'Bangla';
  const currency = settings.currency;

  const { showToast } = useFeedback();

  const monthDates = getMonthDates(selectedMonth);
  const daysInMonth = getDaysInMonth(selectedMonth);
  const nextMonth = getNextMonth(activeMonth);
  const selectedMonthLabel = formatMonthLabel(selectedMonth, settings.language);
  const activeMonthLabel = formatMonthLabel(activeMonth, settings.language);
  const nextMonthLabel = formatMonthLabel(nextMonth, settings.language);

  const monthOptions = getMonthPickerOptions(activeMonth, [
    selectedMonth,
    ...bazaarEntries.map(b => b.date.slice(0, 7)),
    ...expenses.map(e => e.date.slice(0, 7)),
    ...deposits.map(d => d.date.slice(0, 7)),
    ...(settings.closedMonths?.map(c => c.month) || [])
  ]);

  const monthBazaarEntries = bazaarEntries.filter(entry => entry.date.startsWith(selectedMonth));
  const monthExpenses = expenses.filter(exp => exp.date.startsWith(selectedMonth));
  const monthDeposits = deposits.filter(d => d.date.startsWith(selectedMonth));
  const archivedSnapshot = selectedMonth !== activeMonth
    ? settings.closedMonths?.find(c => c.month === selectedMonth)
    : undefined;

  // Helper to check vacation
  const isVacation = (userId: string, date: string): boolean => {
    return vacationPeriods?.some(vp => vp.userId === userId && date >= vp.startDate && date <= vp.endDate) || false;
  };

  // -------------------------------------------------------------------
  // MAIN CORE CALCULATIONS (ACCURATE MATH ENGINE)
  // -------------------------------------------------------------------
  
  // Total Approved Bazaar Cost
  const totalBazaarCost = monthBazaarEntries
    .filter(entry => entry.status === 'Approved')
    .reduce((sum, entry) => sum + entry.price, 0);

  // Total Utility & Overhead Expenses
  const totalOtherExpense = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalExpenses = totalBazaarCost + totalOtherExpense;

  // Total Meals consumed across the mess (Breakfast = 0.5, Lunch = 1.0, Dinner = 1.0)
  const rawTotalMeals = allUsers.filter(u => u.isActive).reduce((sum, user) => {
    let userSum = 0;
    const userSheet = meals.find(s => s.userId === user.id);
    monthDates.forEach(dateStr => {
      if (isVacation(user.id, dateStr)) return; // skip vacation days
      const m = userSheet?.meals[dateStr] || {
        breakfast: false, lunch: false, dinner: false,
        guestBreakfast: 0, guestLunch: 0, guestDinner: 0
      };
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = ((m.guestBreakfast || 0) * 0.5) + ((m.guestLunch || 0) * 1.0) + ((m.guestDinner || 0) * 1.0);
      userSum += own + guest;
    });
    return sum + userSum;
  }, 0);
  const totalMealsInMonth = rawTotalMeals;

  // Meal Rate = Total Expenses / Total Meals
  const currentMealRate = totalMealsInMonth > 0 ? totalExpenses / totalMealsInMonth : 0;

  // Helper to generate financial row for each user
  const getUserFinancialRow = (user: User) => {
    const userMealSheet = meals.find(sheet => sheet.userId === user.id);
    
    let ownMealsCount = 0;
    let guestMealsCount = 0;
    let guestBreakfastCount = 0;
    let guestLunchCount = 0;
    let guestDinnerCount = 0;

    monthDates.forEach(dateStr => {
      if (isVacation(user.id, dateStr)) return;
      const m = userMealSheet?.meals[dateStr] || {
        breakfast: false, lunch: false, dinner: false,
        guestBreakfast: 0, guestLunch: 0, guestDinner: 0
      };
      ownMealsCount += (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      
      guestBreakfastCount += m.guestBreakfast || 0;
      guestLunchCount += m.guestLunch || 0;
      guestDinnerCount += m.guestDinner || 0;
      guestMealsCount += ((m.guestBreakfast || 0) * 0.5) + ((m.guestLunch || 0) * 1.0) + ((m.guestDinner || 0) * 1.0);
    });

    const totalUserMeals = ownMealsCount + guestMealsCount;
    // User Bill = User Meals x Meal Rate
    const billAmount = totalUserMeals * currentMealRate;
    
    // Total approved deposits
    const totalUserDeposits = monthDeposits
      .filter(d => d.userId === user.id && d.status === 'Approved')
      .reduce((sum, d) => sum + d.amount, 0);

    const archivedCarry = archivedSnapshot?.memberSummaries?.find(m => m.userId === user.id)?.carryForward;
    const carryForward = archivedCarry !== undefined ? archivedCarry : (user.carryForward || 0);
    // Balance = Carry Forward + Deposit - Bill
    const balance = carryForward + totalUserDeposits - billAmount;

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      ownMeals: ownMealsCount,
      guestMeals: guestMealsCount,
      guestBreakfast: guestBreakfastCount,
      guestLunch: guestLunchCount,
      guestDinner: guestDinnerCount,
      totalMeals: totalUserMeals,
      billAmount,
      deposits: totalUserDeposits,
      carryForward,
      balance
    };
  };

  // Compile monthly ledger for active users
  const memberReportRows = allUsers.filter(u => u.isActive).map(getUserFinancialRow);

  // -------------------------------------------------------------------
  // 1. DAILY REPORT ENGINE
  // -------------------------------------------------------------------
  const dailyReports = monthDates.map((dateStr) => {
    let totalDailyMeals = 0;
    let activeDiners = 0;

    meals.forEach(sheet => {
      const dayMeal = sheet.meals[dateStr];
      if (dayMeal) {
        const ownCount = (dayMeal.breakfast ? 0.5 : 0) + (dayMeal.lunch ? 1.0 : 0) + (dayMeal.dinner ? 1.0 : 0);
        const guestCount = ((dayMeal.guestBreakfast || 0) * 0.5) + ((dayMeal.guestLunch || 0) * 1.0) + ((dayMeal.guestDinner || 0) * 1.0);
        const dailySum = ownCount + guestCount;
        totalDailyMeals += dailySum;
        if (dailySum > 0) activeDiners++;
      }
    });

    const dailyBazaar = monthBazaarEntries
      .filter(entry => entry.status === 'Approved' && entry.date === dateStr)
      .reduce((sum, entry) => sum + entry.price, 0);

    const dailyOverhead = monthExpenses
      .filter(exp => exp.date === dateStr)
      .reduce((sum, exp) => sum + exp.amount, 0);

    return {
      date: dateStr,
      mealsCount: totalDailyMeals,
      activeDiners,
      bazaarCost: dailyBazaar,
      overheadCost: dailyOverhead,
      totalOutflow: dailyBazaar + dailyOverhead
    };
  });

  const totalDailyMealsSum = dailyReports.reduce((s, r) => s + r.mealsCount, 0);
  const totalDailyBazaarSum = dailyReports.reduce((s, r) => s + r.bazaarCost, 0);
  const totalDailyOverheadSum = dailyReports.reduce((s, r) => s + r.overheadCost, 0);

  // -------------------------------------------------------------------
  // 2. WEEKLY REPORT ENGINE
  // -------------------------------------------------------------------
  const getWeeklyReports = () => {
    const weeksDef = getWeekRangesForMonth(selectedMonth, isBangla);

    return weeksDef.map(w => {
      let mealsCount = 0;
      let bazaarCost = 0;
      let overheadCost = 0;

      for (let d = w.start; d <= w.end; d++) {
        const r = dailyReports[d - 1];
        if (r) {
          mealsCount += r.mealsCount;
          bazaarCost += r.bazaarCost;
          overheadCost += r.overheadCost;
        }
      }

      const totalOutflow = bazaarCost + overheadCost;
      const estMealRate = mealsCount > 0 ? totalOutflow / mealsCount : 0;

      return {
        ...w,
        mealsCount,
        bazaarCost,
        overheadCost,
        totalOutflow,
        estMealRate
      };
    });
  };

  const weeklyReports = getWeeklyReports();

  // -------------------------------------------------------------------
  // 3. SELECTED USER REPORT DETAILS
  // -------------------------------------------------------------------
  const selectedUserRow = selectedUserId 
    ? getUserFinancialRow(allUsers.find(u => u.id === selectedUserId) || allUsers[0])
    : memberReportRows[0];

  const getUserDailyLedger = () => {
    if (!selectedUserRow) return [];
    const sheet = meals.find(s => s.userId === selectedUserRow.userId);
    if (!sheet) return [];

    return monthDates.map((dateStr) => {
      const mStatus = sheet.meals[dateStr] || {
        breakfast: false, lunch: false, dinner: false,
        guestBreakfast: 0, guestLunch: 0, guestDinner: 0
      };

      const ownCount = (mStatus.breakfast ? 0.5 : 0) + (mStatus.lunch ? 1.0 : 0) + (mStatus.dinner ? 1.0 : 0);
      const guestCount = ((mStatus.guestBreakfast || 0) * 0.5) + ((mStatus.guestLunch || 0) * 1.0) + ((mStatus.guestDinner || 0) * 1.0);
      const totalCount = ownCount + guestCount;

      return {
        date: dateStr,
        breakfast: mStatus.breakfast,
        lunch: mStatus.lunch,
        dinner: mStatus.dinner,
        guestBreakfast: mStatus.guestBreakfast || 0,
        guestLunch: mStatus.guestLunch || 0,
        guestDinner: mStatus.guestDinner || 0,
        total: totalCount,
        cost: totalCount * currentMealRate
      };
    });
  };

  const userDailyLedger = getUserDailyLedger();

  // -------------------------------------------------------------------
  // 4. MONTH CLOSING GATEWAY ACTIONS
  // -------------------------------------------------------------------
  const handleCloseMonth = () => {
    // 1. Calculate and update carryForwards to final remaining balances
    const updatedUsersList = allUsers.map(user => {
      const row = getUserFinancialRow(user);
      return {
        ...user,
        carryForward: Number(row.balance.toFixed(2))
      };
    });

    const totalApprovedDepositsPool = monthDeposits
      .filter(d => d.status === 'Approved')
      .reduce((s, d) => s + d.amount, 0);

    const closedSnapshot: ClosedMonthRecord = {
      month: activeMonth,
      closedAt: new Date().toISOString(),
      closedBy: currentUser.name,
      mealRate: currentMealRate,
      totalMeals: totalMealsInMonth,
      totalExpenses,
      totalDeposits: totalApprovedDepositsPool,
      memberSummaries: memberReportRows.map(r => ({
        userId: r.userId,
        name: r.name,
        totalMeals: r.totalMeals,
        billAmount: r.billAmount,
        deposits: r.deposits,
        carryForward: r.carryForward,
        closingBalance: Number(r.balance.toFixed(2))
      }))
    };

    const nextClosedMonths = [
      closedSnapshot,
      ...(settings.closedMonths || []).filter(c => c.month !== activeMonth)
    ];

    // 2. Lock setting & archive snapshot
    const nextSettings: SystemSettings = {
      ...settings,
      isMonthClosed: true,
      closedMonths: nextClosedMonths
    };

    onUpdateUsers(updatedUsersList);
    onUpdateSettings(nextSettings);
    onLogAction(
      'Month Closed', 
      `Month (${activeMonthLabel}) closed successfully. Meal Rate finalized at ${currency}${currentMealRate.toFixed(4)}. Balances carried forward automatically.`
    );

    setIsClosingSuccess(true);
    setTimeout(() => {
      setIsClosingSuccess(false);
      setShowCloseModal(false);
    }, 2000);
  };

  const handleCloseAndStartNextMonth = () => {
    if (onStartNewMonth) {
      onStartNewMonth(nextMonth, { autoCloseAndCarryForward: true });
      setShowCloseModal(false);
    } else {
      handleCloseMonth();
    }
  };

  const handleReopenMonth = () => {
    const nextSettings: SystemSettings = {
      ...settings,
      isMonthClosed: false
    };

    onUpdateSettings(nextSettings);
    onLogAction('Month Reopened', `Month (${activeMonthLabel}) reopened successfully by Administrator: ${currentUser.name}.`);
    showToast(isBangla ? 'মাসটি পুনরায় উন্মুক্ত করা হয়েছে!' : 'Month has been successfully reopened!', 'success');
  };

  // -------------------------------------------------------------------
  // EXPORT TO CSV / EXCEL ENGINE
  // -------------------------------------------------------------------
  const handleExportCSV = () => {
    let csv = '';
    let filename = '';
    const fileMonthSlug = selectedMonth;

    if (activeTab === 'Monthly') {
      csv = `Elite Mess Financial Statement - Monthly Report (${selectedMonthLabel})\n`;
      csv += `Calculated Meal Rate: ${currency}${currentMealRate.toFixed(4)}\n\n`;
      csv += 'Member Name,Own Meals,Guest Meals,Total Meals,Carry Forward,Total Deposits,Bill Amount,Balance,Status\n';
      memberReportRows.forEach(row => {
        csv += `"${row.name}",${row.ownMeals},${row.guestMeals},${row.totalMeals},${row.carryForward.toFixed(2)},${row.deposits.toFixed(2)},${row.billAmount.toFixed(2)},${row.balance.toFixed(2)},"${row.balance >= 0 ? 'Surplus' : 'Deficit'}"\n`;
      });
      filename = `EliteMess_MonthlyReport_${fileMonthSlug}.csv`;
    } 
    else if (activeTab === 'Daily') {
      csv = `Elite Mess Daily Meals and Outflow Statement (${selectedMonthLabel})\n\n`;
      csv += 'Date,Active Diners,Meals Count,Bazaar Cost,Overhead Expenses,Total Daily Outflow\n';
      dailyReports.forEach(r => {
        csv += `${r.date},${r.activeDiners},${r.mealsCount},${r.bazaarCost.toFixed(2)},${r.overheadCost.toFixed(2)},${r.totalOutflow.toFixed(2)}\n`;
      });
      filename = `EliteMess_DailyReport_${fileMonthSlug}.csv`;
    }
    else if (activeTab === 'Weekly') {
      csv = `Elite Mess Weekly Metrics Summary (${selectedMonthLabel})\n\n`;
      csv += 'Week,Total Meals,Bazaar Cost,Overhead Expenses,Weekly Outflow,Estimated Meal Rate\n';
      weeklyReports.forEach(w => {
        csv += `"${w.name}",${w.mealsCount},${w.bazaarCost.toFixed(2)},${w.overheadCost.toFixed(2)},${w.totalOutflow.toFixed(2)},${w.estMealRate.toFixed(4)}\n`;
      });
      filename = `EliteMess_WeeklyReport_${fileMonthSlug}.csv`;
    }
    else if (activeTab === 'User') {
      csv = `Elite Mess Member Ledger - ${selectedUserRow.name} (${selectedUserRow.email}) - ${selectedMonthLabel}\n`;
      csv += `Calculated Meal Rate: ${currency}${currentMealRate.toFixed(4)}\n\n`;
      csv += `Summary Metrics:\n`;
      csv += `Carry Forward: ${selectedUserRow.carryForward.toFixed(2)}\n`;
      csv += `Deposits: ${selectedUserRow.deposits.toFixed(2)}\n`;
      csv += `Meals Eaten: ${selectedUserRow.totalMeals}\n`;
      csv += `Bill Amount: ${selectedUserRow.billAmount.toFixed(2)}\n`;
      csv += `Remaining Balance: ${selectedUserRow.balance.toFixed(2)}\n\n`;
      csv += 'Date,Breakfast,Lunch,Dinner,Guest Breakfast,Guest Lunch,Guest Dinner,Total Daily Meals,Daily Est Cost\n';
      
      userDailyLedger.forEach(d => {
        csv += `${d.date},${d.breakfast ? 'Yes' : 'No'},${d.lunch ? 'Yes' : 'No'},${d.dinner ? 'Yes' : 'No'},${d.guestBreakfast},${d.guestLunch},${d.guestDinner},${d.total},${d.cost.toFixed(2)}\n`;
      });
      filename = `EliteMess_UserReport_${selectedUserRow.name.replace(/\s+/g, '_')}_${fileMonthSlug}.csv`;
    }
    else if (activeTab === 'Bazaar') {
      csv = `Elite Mess Approved Bazaar Outlay Ledger (${selectedMonthLabel})\n\n`;
      csv += 'Date,Item Description,Quantity & Unit,Total Price,Approved Status\n';
      monthBazaarEntries.filter(b => b.status === 'Approved').forEach(b => {
        csv += `${b.date},"${b.items}","${b.quantity} ${b.unit || ''}",${b.price},"${b.status}"\n`;
      });
      filename = `EliteMess_BazaarReport_${fileMonthSlug}.csv`;
    }
    else if (activeTab === 'Deposit') {
      csv = `Elite Mess Verified Deposit Ledger (${selectedMonthLabel})\n\n`;
      csv += 'Date,Member Name,Amount,Payment Method,Transaction ID,Status,Note\n';
      monthDeposits.filter(d => d.status === 'Approved').forEach(d => {
        const u = allUsers.find(x => x.id === d.userId)?.name || 'Unknown';
        csv += `${d.date},"${u}",${d.amount},"${d.method}","${d.transactionId || ''}","${d.status || 'Approved'}","${d.note || ''}"\n`;
      });
      filename = `EliteMess_DepositReport_${fileMonthSlug}.csv`;
    }
    else if (activeTab === 'GuestMeal') {
      csv = `Elite Mess Guest Meals Board & Expenses (${selectedMonthLabel})\n`;
      csv += `Calculated Meal Rate: ${currency}${currentMealRate.toFixed(4)}\n\n`;
      csv += 'Host Member,Guest Breakfasts,Guest Lunches,Guest Dinners,Total Guest Meals,Guest Bill Owed\n';
      memberReportRows.forEach(row => {
        const guestBill = row.guestMeals * currentMealRate;
        csv += `"${row.name}",${row.guestBreakfast},${row.guestLunch},${row.guestDinner},${row.guestMeals},${guestBill.toFixed(2)}\n`;
      });
      filename = `EliteMess_GuestMealReport_${fileMonthSlug}.csv`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PRINTING/PDF VIEW TRIGGER
  const handlePrint = () => {
    window.print();
  };

  // Filter list rows
  const filteredRows = memberReportRows.filter(row => 
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    row.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="reports-tab">
      
      {/* SCOPED PRINT STYLES */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: white !important;
            color: black !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-white flex items-center gap-2">
            <FilePieChart size={22} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
            {isBangla ? 'মেস রিপোর্ট ও হিসাব ক্লোজিং' : 'Reports & Fiscal Statement'}
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
            {isBangla 
              ? 'ডাইনিং মিল রেট, বিল বণ্টন, বাজার ও আমানতের খতিয়ান এবং চূড়ান্ত মাস শেষ হিসাব ক্লোজিং।' 
              : 'Dining meal rate distributions, member bills, bazaar audit, and final month closing.'}
          </p>
        </div>

        {/* MONTH SELECTOR & CLOSING STATUS / ROLLOVER BUTTON */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900">
                  {formatMonthLabel(m, settings.language)}{m === activeMonth ? (isBangla ? ' (চলতি)' : ' (Active)') : ''}
                </option>
              ))}
            </select>
          </div>

          {settings.isMonthClosed ? (
            <div className="flex flex-wrap items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 px-3.5 py-2 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              <Lock size={14} className="shrink-0" />
              <span>{isBangla ? `${activeMonthLabel} ক্লোজড` : `${activeMonthLabel} Closed`}</span>
              {role === 'Admin' && (
                <>
                  <button
                    onClick={handleReopenMonth}
                    className="ml-2 px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold uppercase transition cursor-pointer"
                  >
                    {isBangla ? 'রিওপেন' : 'Reopen'}
                  </button>
                  {onStartNewMonth && (
                    <button
                      onClick={() => onStartNewMonth(nextMonth)}
                      className="ml-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <ArrowRight size={11} />
                      <span>{isBangla ? `${nextMonthLabel} শুরু করুন` : `Start ${nextMonthLabel}`}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            isManagerOrAdmin && (
              <button
                onClick={() => {
                  setSelectedMonth(activeMonth);
                  setShowCloseModal(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-500/10 transition cursor-pointer"
              >
                <Lock size={14} />
                <span>{isBangla ? `${activeMonthLabel} ক্লোজ / নতুন মাস` : `Close ${activeMonthLabel}`}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* REPORT SUB-TABS SELECTOR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm overflow-x-auto flex gap-1.5 no-print">
        {[
          { id: 'Monthly', label: isBangla ? 'চূড়ান্ত লেজার (মাসিক)' : 'Monthly Ledger', icon: FilePieChart },
          { id: 'Daily', label: isBangla ? 'দৈনিক রিপোর্ট' : 'Daily Report', icon: Calendar },
          { id: 'Weekly', label: isBangla ? 'সাপ্তাহিক রিপোর্ট' : 'Weekly Report', icon: CalendarDays },
          { id: 'User', label: isBangla ? 'সদস্য লেজার' : 'User Ledger', icon: Users },
          { id: 'Bazaar', label: isBangla ? 'বাজার অডিট' : 'Bazaar Audit', icon: ShoppingBag },
          { id: 'Deposit', label: isBangla ? 'আমানত হিসাব' : 'Deposit Ledger', icon: Coins },
          { id: 'GuestMeal', label: isBangla ? 'অতিথি মিল' : 'Guest Meals', icon: ArrowUpRight }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ReportSubTab);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                  : 'text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* LIVE METRICS COUNTERS (Always visible except user tab for focus) */}
      {activeTab !== 'User' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isBangla ? 'মোট বাজার ও ওভারহেড খরচ' : 'Total Mess Expenses'}
            </span>
            <h3 className="text-lg font-black text-slate-850 dark:text-white mt-1">
              {currency}{totalExpenses.toLocaleString()}
            </h3>
            <div className="flex gap-2 text-[10px] text-slate-450 mt-1">
              <span>Bazaar: {currency}{totalBazaarCost}</span>
              <span>Overhead: {currency}{totalOtherExpense}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isBangla ? 'মোট মিল সংখ্যা' : 'Combined Meal Count'}
            </span>
            <h3 className="text-lg font-black text-slate-850 dark:text-white mt-1">
              {totalMealsInMonth.toLocaleString()} <span className="text-xs font-bold text-slate-400">Meals</span>
            </h3>
            <p className="text-[9px] text-slate-450 mt-1">{isBangla ? 'অতিথি মিল সহ মোট হিসাব' : 'Including all user and guest meals'}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isBangla ? 'মিল রেট (লাইভ)' : 'Calculated Meal Rate'}
            </span>
            <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {currency}{currentMealRate.toFixed(4)}
            </h3>
            <p className="text-[9px] text-slate-450 mt-1">{isBangla ? 'মোট খরচ ÷ মোট মিল সংখ্যা' : 'Live: Total Costs / Total Meals'}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isBangla ? 'অনুমোদিত তহবিল আমানত' : 'Total Deposits Pool'}
            </span>
            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {currency}{monthDeposits.filter(d => d.status === 'Approved').reduce((s,d) => s+d.amount,0).toLocaleString()}
            </h3>
            <p className="text-[9px] text-slate-450 mt-1">{isBangla ? `${selectedMonthLabel} এর অনুমোদিত আমানত` : `Approved funds (${selectedMonthLabel})`}</p>
          </div>
        </div>
      )}

      {/* ACTION BAR: SEARCH & EXPORTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
        
        {/* Left Search or drop selector depending on Tab */}
        <div className="w-full sm:w-auto">
          {activeTab === 'Monthly' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder={isBangla ? 'সদস্যের নাম দিয়ে খুঁজুন...' : 'Search member...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {activeTab === 'User' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{isBangla ? 'সদস্য নির্বাচন করুন:' : 'Select Member:'}</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              >
                {allUsers.filter(u => u.isActive).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          {['Daily', 'Weekly', 'Bazaar', 'Deposit', 'GuestMeal'].includes(activeTab) && (
            <div className="text-xs font-bold text-slate-650 dark:text-slate-400">
              {activeTab === 'Daily' && (isBangla ? `${selectedMonthLabel} মাসের ${daysInMonth} দিনের তালিকা` : `Daily schedule list for ${selectedMonthLabel} (Days 1 - ${daysInMonth})`)}
              {activeTab === 'Weekly' && (isBangla ? `${weeklyReports.length}টি ধাপে বিভক্ত সাপ্তাহিক হিসাব` : `Weekly analysis grouped by ${weeklyReports.length} weeks`)}
              {activeTab === 'Bazaar' && (isBangla ? 'অনুমোদিত বাজার খরচসমূহের অডিট খতিয়ান' : `Audit trail for approved bazaar entries (${selectedMonthLabel})`)}
              {activeTab === 'Deposit' && (isBangla ? 'অনুমোদিত আমানতসমূহের মেমো খতিয়ান' : `Verified deposit record registry (${selectedMonthLabel})`)}
              {activeTab === 'GuestMeal' && (isBangla ? 'অতিথি মিলেদের বিবরণী ও হোস্ট অনুযায়ী বিল' : 'Guest meals hosted details and estimates')}
            </div>
          )}
        </div>

        {/* Right download triggers */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
            title="Export Excel/CSV"
          >
            <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-450" />
            <span>{isBangla ? 'এক্সেল ডাউনলোড' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
            title="Export PDF / Print"
          >
            <Printer size={14} className="text-slate-500" />
            <span>{isBangla ? 'পিডিএফ ডাউনলোড' : 'Print / PDF'}</span>
          </button>
        </div>
      </div>

      {/* PRINT-READY CONTAINER - WRAPS REPORT CONTENT */}
      <div id="print-area">
        
        {/* PRINT ONLY REPORT BRANDING */}
        <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-extrabold">{settings.systemName || 'Elite Mess'} - {selectedMonthLabel} Reports</h1>
          <p className="text-sm text-slate-500">
            Exported By: {currentUser.name} ({currentUser.role}) on {new Date().toLocaleDateString()}
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
            <div>
              <span className="font-bold block">Total Outflow (Expenses):</span>
              <span>{currency}{totalExpenses.toFixed(2)}</span>
            </div>
            <div>
              <span className="font-bold block">Combined Meals Eaten:</span>
              <span>{totalMealsInMonth}</span>
            </div>
            <div>
              <span className="font-bold block">Calculated Meal Rate:</span>
              <span className="text-emerald-600 font-extrabold">{currency}{currentMealRate.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: MONTHLY LEDGER */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'Monthly' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">{isBangla ? 'সদস্যের নাম' : 'Member'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'নিজ মিল' : 'Own Meals'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'অতিথি মিল' : 'Guest Meals'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'মোট মিল সংখ্যা' : 'Total Meals'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'ক্যারী ফরওয়ার্ড' : 'Carry Forward'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'চলতি আমানত' : 'Month Deposit'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'মোট বিল' : 'Bill Amount'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'চূড়ান্ত স্থিতি' : 'Net Balance'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'তহবিল স্ট্যাটাস' : 'Treasury Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr 
                      key={row.userId}
                      className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-850 dark:text-white flex items-center gap-2">
                        {Boolean(row.avatarUrl) && <img src={row.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} className="w-5 h-5 rounded-full object-cover shrink-0 print:hidden" alt="" referrerPolicy="no-referrer" />}
                        <div>
                          <span>{row.name}</span>
                          <span className="text-[9px] text-slate-400 block font-normal">{row.email}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center text-slate-500">{row.ownMeals}</td>
                      <td className="px-5 py-3.5 text-center text-slate-500">{row.guestMeals}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">{row.totalMeals}</td>
                      
                      <td className={`px-5 py-3.5 text-center font-semibold ${row.carryForward >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {row.carryForward >= 0 ? '+' : ''}{currency}{row.carryForward.toLocaleString()}
                      </td>

                      <td className="px-5 py-3.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {currency}{row.deposits.toLocaleString()}
                      </td>

                      <td className="px-5 py-3.5 text-center text-slate-800 dark:text-slate-200 font-bold">
                        {currency}{row.billAmount.toFixed(2)}
                      </td>

                      <td className={`px-5 py-3.5 text-center font-black ${row.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {row.balance >= 0 ? '+' : '-'}{currency}{Math.abs(row.balance).toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          row.balance >= 0 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15'
                        }`}>
                          {row.balance >= 0 ? (isBangla ? 'উদ্বৃত্ত (Surplus)' : 'Surplus') : (isBangla ? 'ঘাটতি (Deficit)' : 'Deficit')}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                        {isBangla ? 'কোনো সদস্য পাওয়া যায়নি।' : 'No members match the search filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: DAILY REPORT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'Daily' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'খাবার গ্রহণকারী সদস্য' : 'Active Diners'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'মোট দৈনিক মিল' : 'Daily Meals Count'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'বাজার খরচ' : 'Bazaar approved cost'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'ওভারহেড খরচ' : 'Overheads'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'মোট দৈনিক আউটফ্লো' : 'Combined Daily Outflow'}</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyReports.map((r) => {
                    const hasData = r.mealsCount > 0 || r.totalOutflow > 0;
                    return (
                      <tr 
                        key={r.date}
                        className={`border-b border-slate-100 dark:border-slate-800 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition ${
                          !hasData ? 'opacity-40' : ''
                        }`}
                      >
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{r.date}</td>
                        <td className="px-5 py-3 text-center font-bold text-slate-600 dark:text-slate-400">{r.activeDiners}</td>
                        <td className="px-5 py-3 text-center font-black text-slate-800 dark:text-slate-100">{r.mealsCount}</td>
                        
                        <td className="px-5 py-3 text-center font-semibold text-amber-600">
                          {r.bazaarCost > 0 ? `${currency}${r.bazaarCost.toLocaleString()}` : '-'}
                        </td>
                        
                        <td className="px-5 py-3 text-center font-semibold text-rose-500">
                          {r.overheadCost > 0 ? `${currency}${r.overheadCost.toLocaleString()}` : '-'}
                        </td>

                        <td className="px-5 py-3 text-center font-bold text-slate-800 dark:text-white">
                          {r.totalOutflow > 0 ? `${currency}${r.totalOutflow.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: WEEKLY REPORT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'Weekly' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weeklyReports.map((w) => (
              <div 
                key={w.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                <h4 className="font-extrabold text-sm text-slate-850 dark:text-white">{w.name}</h4>
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-1.5">
                    <span className="text-slate-450">{isBangla ? 'মোট মিল সংখ্যা:' : 'Total Meals:'}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{w.mealsCount} Meals</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-1.5">
                    <span className="text-slate-450">{isBangla ? 'বাজার খরচ:' : 'Bazaar approved:'}</span>
                    <span className="font-bold text-amber-600">{currency}{w.bazaarCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-1.5">
                    <span className="text-slate-450">{isBangla ? 'ওভারহেড বিলসমূহ:' : 'Overhead Expenses:'}</span>
                    <span className="font-bold text-rose-500">{currency}{w.overheadCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <span>{isBangla ? 'মোট সাপ্তাহিক ব্যয়:' : 'Weekly Outflow:'}</span>
                    <span>{currency}{w.totalOutflow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-emerald-600 dark:text-emerald-400 font-extrabold">
                    <span>{isBangla ? 'মিল রেট (আনুমানিক):' : 'Est. Meal Rate:'}</span>
                    <span>{currency}{w.estMealRate.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: USER LEDGER */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'User' && selectedUserRow && (
          <div className="space-y-6">
            
            {/* USER PROFILE SUMMARY CONTAINER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Profile card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                {Boolean(selectedUserRow.avatarUrl) && (
                  <img src={selectedUserRow.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} className="w-14 h-14 rounded-full object-cover shrink-0 border border-slate-200" alt="" referrerPolicy="no-referrer" />
                )}
                <div className="min-w-0">
                  <h4 className="font-black text-slate-850 dark:text-white truncate">{selectedUserRow.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{selectedUserRow.email}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">{selectedUserRow.phone}</p>
                  <span className={`inline-block text-[8px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded mt-2 ${
                    selectedUserRow.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {selectedUserRow.isActive ? (isBangla ? 'সক্রিয়' : 'Active Member') : (isBangla ? 'নিষ্ক্রিয়' : 'Inactive')}
                  </span>
                </div>
              </div>

              {/* Wallet overview card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    {isBangla ? 'আমানত খতিয়ান' : 'Deposits & Carry Forward'}
                  </span>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <span className="text-[10px] text-slate-450 block">{isBangla ? 'ক্যারী ফরওয়ার্ড:' : 'Carry Fwd:'}</span>
                      <span className={`font-bold text-xs ${selectedUserRow.carryForward >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {selectedUserRow.carryForward >= 0 ? '+' : ''}{currency}{selectedUserRow.carryForward}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-450 block">{isBangla ? 'চলতি আমানত:' : 'Deposited:'}</span>
                      <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{currency}{selectedUserRow.deposits}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-50 dark:border-slate-800 pt-2.5 mt-2.5 flex justify-between text-xs font-bold text-slate-850 dark:text-white">
                  <span>{isBangla ? 'সর্বমোট প্রাপ্ত ফান্ড:' : 'Total Funds Available:'}</span>
                  <span>{currency}{(selectedUserRow.carryForward + selectedUserRow.deposits).toLocaleString()}</span>
                </div>
              </div>

              {/* Bill & Balance card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-8 -translate-y-8" />
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    {isBangla ? 'মিল সংখ্যা ও আনুমানিক বিল' : 'Meals & Final Net Bill'}
                  </span>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <span className="text-[10px] text-slate-450 block">{isBangla ? 'মিল সংখ্যা:' : 'Meals Count:'}</span>
                      <span className="font-bold text-xs text-slate-800 dark:text-white">{selectedUserRow.totalMeals} Meals</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-450 block">{isBangla ? 'মিল বিল:' : 'Bill Owed:'}</span>
                      <span className="font-bold text-xs text-slate-850 dark:text-slate-200">{currency}{selectedUserRow.billAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-50 dark:border-slate-800 pt-2.5 mt-2.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-450">{isBangla ? 'চূড়ান্ত নিট ব্যালেন্স:' : 'Net Ledger Balance:'}</span>
                  <span className={`font-black text-sm ${selectedUserRow.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {selectedUserRow.balance >= 0 ? '+' : '-'}{currency}{Math.abs(selectedUserRow.balance).toFixed(2)}
                  </span>
                </div>
              </div>

            </div>

            {/* DAILY MEALS SHEET LIST FOR INDIVIDUAL */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs">{isBangla ? 'চলতি মাসের মিল গ্রহণের দিনপঞ্জি' : 'Calendar logs & Est Daily Cost'}</h4>
                <span className="text-[10px] text-slate-450 font-medium">Meal Rate: {currency}{currentMealRate.toFixed(4)}</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-center">Breakfast (0.5)</th>
                      <th className="px-5 py-3 text-center">Lunch (1.0)</th>
                      <th className="px-5 py-3 text-center">Dinner (1.0)</th>
                      <th className="px-5 py-3 text-center">Guests (B, L, D)</th>
                      <th className="px-5 py-3 text-center">Total Meals</th>
                      <th className="px-5 py-3 text-center">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDailyLedger.map((d) => {
                      const hasAte = d.total > 0;
                      return (
                        <tr 
                          key={d.date}
                          className={`border-b border-slate-50 dark:border-slate-800 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition ${
                            !hasAte ? 'opacity-40' : ''
                          }`}
                        >
                          <td className="px-5 py-2.5 font-semibold text-slate-600 dark:text-slate-400">{d.date}</td>
                          
                          <td className="px-5 py-2.5 text-center">
                            <span className={d.breakfast ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                              {d.breakfast ? '✔' : '✖'}
                            </span>
                          </td>

                          <td className="px-5 py-2.5 text-center">
                            <span className={d.lunch ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                              {d.lunch ? '✔' : '✖'}
                            </span>
                          </td>

                          <td className="px-5 py-2.5 text-center">
                            <span className={d.dinner ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                              {d.dinner ? '✔' : '✖'}
                            </span>
                          </td>

                          <td className="px-5 py-2.5 text-center text-slate-500">
                            {(d.guestBreakfast > 0 || d.guestLunch > 0 || d.guestDinner > 0) ? (
                              <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded text-[10px]">
                                {d.guestBreakfast}B, {d.guestLunch}L, {d.guestDinner}D
                              </span>
                            ) : '-'}
                          </td>

                          <td className="px-5 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                            {d.total > 0 ? d.total : '-'}
                          </td>

                          <td className="px-5 py-2.5 text-center font-bold text-slate-800 dark:text-white">
                            {d.cost > 0 ? `${currency}${d.cost.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5: BAZAAR AUDIT REPORT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'Bazaar' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-xs">{isBangla ? 'অনুমোদিত সকল বাজার বিবরণী তালিকা' : 'Approved bazaar vouchers log'}</h4>
              <span className="text-xs font-bold text-amber-600">{isBangla ? 'মোট বাজার খরচ:' : 'Bazaar Total:'} {currency}{totalBazaarCost.toLocaleString()}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Item details</th>
                    <th className="px-5 py-3 text-center">Quantity</th>
                    <th className="px-5 py-3 text-center">Price / Costs</th>
                    <th className="px-5 py-3">Assigned Spenders</th>
                    <th className="px-5 py-3">Verify Action By</th>
                  </tr>
                </thead>
                <tbody>
                  {monthBazaarEntries.filter(b => b.status === 'Approved').map((b) => (
                    <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <td className="px-5 py-3 font-semibold">{b.date}</td>
                      <td className="px-5 py-3 font-bold text-slate-800 dark:text-white">{b.items}</td>
                      <td className="px-5 py-3 text-center text-slate-500">{b.quantity} {b.unit || ''}</td>
                      <td className="px-5 py-3 text-center font-bold text-emerald-600">{currency}{b.price}</td>
                      
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {b.assignedTo.map(uid => {
                            const u = allUsers.find(x => x.id === uid);
                            return u ? (
                              <span key={uid} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">{u.name}</span>
                            ) : null;
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-3 text-slate-450 italic text-[11px]">
                        {b.approvedBy ? (allUsers.find(x => x.id === b.approvedBy)?.name || 'Manager') : 'System Admin'}
                      </td>
                    </tr>
                  ))}

                  {monthBazaarEntries.filter(b => b.status === 'Approved').length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-450 font-medium">
                        {isBangla ? 'কোনো অনুমোদিত বাজার রেকর্ড নেই।' : 'No approved bazaar records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 6: DEPOSIT AUDIT REPORT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'Deposit' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-xs">{isBangla ? 'সদস্যদের অনুমোদিত চূড়ান্ত ডিপোজিটের খতিয়ান' : 'Verified wallet deposits log'}</h4>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{isBangla ? 'সর্বমোট আমানত:' : 'Deposits Total:'} {currency}{monthDeposits.filter(d => d.status === 'Approved').reduce((s,d)=>s+d.amount,0).toLocaleString()}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Depositor Member</th>
                    <th className="px-5 py-3 text-center">Amount</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3">Reference ID</th>
                    <th className="px-5 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDeposits.filter(d => d.status === 'Approved').map((d) => {
                    const u = allUsers.find(x => x.id === d.userId);
                    return (
                      <tr key={d.id} className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <td className="px-5 py-3 font-semibold">{d.date}</td>
                        <td className="px-5 py-3 font-bold text-slate-850 dark:text-white">{u?.name || 'Unknown'}</td>
                        <td className="px-5 py-3 text-center font-bold text-indigo-600">{currency}{d.amount.toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-slate-100 dark:bg-slate-800 font-bold">{d.method}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-emerald-600 font-bold">{d.transactionId || '-'}</td>
                        <td className="px-5 py-3 text-slate-500 italic text-[11px] max-w-[200px] truncate">{d.note || '-'}</td>
                      </tr>
                    );
                  })}

                  {monthDeposits.filter(d => d.status === 'Approved').length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-450 font-medium">
                        {isBangla ? 'কোনো অনুমোদিত আমানত পাওয়া যায়নি।' : 'No verified deposits found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 7: GUEST MEAL REPORT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'GuestMeal' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-xs">{isBangla ? 'মেসের সদস্যদের অতিথি মিল ও বিল বণ্টন বিবরণী' : 'Guest meals audit and estimates'}</h4>
              <span className="text-[10px] text-slate-450 font-medium">Meal Rate: {currency}{currentMealRate.toFixed(4)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">Host Member</th>
                    <th className="px-5 py-3 text-center">Guest Breakfasts (0.5)</th>
                    <th className="px-5 py-3 text-center">Guest Lunches (1.0)</th>
                    <th className="px-5 py-3 text-center">Guest Dinners (1.0)</th>
                    <th className="px-5 py-3 text-center">Weighted Guest Meals</th>
                    <th className="px-5 py-3 text-center">Est Guest Meal Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {memberReportRows.map((row) => {
                    const guestBill = row.guestMeals * currentMealRate;
                    const hasGuests = row.guestMeals > 0;
                    return (
                      <tr 
                        key={row.userId} 
                        className={`border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition ${
                          !hasGuests ? 'opacity-40' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 font-bold text-slate-850 dark:text-white">{row.name}</td>
                        <td className="px-5 py-3.5 text-center text-slate-500">{row.guestBreakfast}</td>
                        <td className="px-5 py-3.5 text-center text-slate-500">{row.guestLunch}</td>
                        <td className="px-5 py-3.5 text-center text-slate-500">{row.guestDinner}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-indigo-600">{row.guestMeals} Meals</td>
                        <td className="px-5 py-3.5 text-center font-black text-slate-850 dark:text-slate-200">
                          {guestBill > 0 ? `${currency}${guestBill.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MONTH CLOSING MODAL GATEWAY (PORTAL BACKDROP) */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative">
            
            <button 
              onClick={() => setShowCloseModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
            >
              <Unlock size={18} />
            </button>

            {isClosingSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  {isBangla ? 'মাস সফলভাবে বন্ধ করা হয়েছে!' : 'Month Closed Successfully!'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBangla 
                    ? 'সকল সদস্যের চূড়ান্ত অবশিষ্ট ব্যালেন্স পরবর্তী মাসের ক্যারী ফরওয়ার্ড হিসেবে স্থানান্তরিত করা হয়েছে।' 
                    : 'Remaining balances have been copied to each member\'s carry forward account.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800/80 pb-4">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
                    <Lock size={20} className="animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-850 dark:text-white">
                      {isBangla ? `চূড়ান্ত মাস সমাপ্তি (${activeMonthLabel})` : `Close & Finalize ${activeMonthLabel}`}
                    </h3>
                    <p className="text-xs text-slate-450">
                      {isBangla ? 'চলতি চক্রের হিসাব ক্লোজিং এবং উদ্বৃত্ত স্থানান্তর গেটওয়ে।' : 'Carry forward net balances and lock or start next month.'}
                    </p>
                  </div>
                </div>

                {/* Audit summary */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-450">{isBangla ? 'চূড়ান্ত মিল সংখ্যা:' : 'Total Meals Eaten:'}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{totalMealsInMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">{isBangla ? 'সর্বমোট বাজার ও ডাইনিং খরচ:' : 'Total Dining Expenses:'}</span>
                    <span className="font-bold text-slate-850 dark:text-white">{currency}{totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2 font-bold text-emerald-600">
                    <span>{isBangla ? 'চূড়ান্ত মিল রেট:' : 'Final Meal Rate:'}</span>
                    <span>{currency}{currentMealRate.toFixed(4)}</span>
                  </div>

                  <div className="pt-2">
                    <span className="font-bold block mb-1 text-[10px] uppercase tracking-wider text-slate-400">
                      {isBangla ? 'ব্যালেন্স স্থানান্তর বিবরণী:' : 'Wallet Carry-Forward Preview:'}
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-2">
                      {memberReportRows.map(row => (
                        <div key={row.userId} className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{row.name}</span>
                          <span className={`font-mono font-bold ${row.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {row.balance >= 0 ? '+' : ''}{currency}{row.balance.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alert Warning */}
                <div className="flex gap-2.5 bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-2xl text-xs text-rose-700 dark:text-rose-400">
                  <AlertTriangle size={18} className="shrink-0 text-rose-500" />
                  <p className="leading-relaxed text-[11px]">
                    {isBangla 
                      ? 'সতর্কতা: মাস বন্ধ করার পর মেম্বাররা আর তাদের মিল পরিবর্তন করতে পারবেন না এবং বাজার বা ডিপোজিটের কোনো নতুন দাবী করা যাবে না। পরের মাসে যেতে "নতুন মাস শুরু করুন" বাটনে ক্লিক করুন।' 
                      : 'Closing locks the active month and copies remaining balances to carry-forward. Use "Close & Start Next Month" to immediately open the next billing cycle.'}
                  </p>
                </div>

                {/* Submit buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-50 dark:border-slate-800">
                  <button
                    onClick={() => setShowCloseModal(false)}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleCloseMonth}
                    className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 transition cursor-pointer"
                  >
                    {isBangla ? 'শুধু লক ও ক্লোজ করুন' : 'Lock & Finalize Closing'}
                  </button>
                  {onStartNewMonth && role === 'Admin' && (
                    <button
                      onClick={handleCloseAndStartNextMonth}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/15 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <ArrowRight size={14} />
                      <span>{isBangla ? `ক্লোজ ও ${nextMonthLabel} শুরু` : `Close & Start ${nextMonthLabel}`}</span>
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
