import React, { useState, useEffect } from 'react';
import {
  FilePieChart,
  Printer,
  FileSpreadsheet,
  Coins,
  ShoppingBag,
  Users,
  ArrowUpRight,
  Search,
  CheckCircle,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Lock,
  Unlock,
  ArrowRight,
  HelpCircle,
  Utensils,
  Wallet,
  Info,
  ChevronRight,
  TrendingUp,
  Check,
  Copy,
  MessageCircle
} from 'lucide-react';
import {
  User,
  MemberMealSheet,
  Deposit,
  BazaarEntry,
  Expense,
  SystemSettings,
  VacationPeriod,
  ClosedMonthRecord
} from '../types';
import { useFeedback } from './FeedbackContext';
import {
  getRealCurrentMonth,
  getMonthDates,
  getDaysInMonth,
  getNextMonth,
  formatMonthLabel,
  getMonthPickerOptions,
  getWeekRangesForMonth,
  getEffectiveDatesForMonth
} from '../utils/dateUtils';
import { getEffectiveDayMeal } from '../utils/mealUtils';

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
  const [selectedUserId, setSelectedUserId] = useState<string>(
    allUsers.find(u => u.id === currentUser.id && u.isActive)?.id ||
      allUsers.find(u => u.isActive)?.id ||
      ''
  );
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosingSuccess, setIsClosingSuccess] = useState(false);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);

  useEffect(() => {
    setSelectedMonth(activeMonth);
  }, [activeMonth]);

  useEffect(() => {
    if (!selectedUserId || !allUsers.some(u => u.id === selectedUserId)) {
      const preferred =
        allUsers.find(u => u.id === currentUser.id && u.isActive)?.id ||
        allUsers.find(u => u.isActive)?.id ||
        '';
      if (preferred) setSelectedUserId(preferred);
    }
  }, [allUsers, currentUser.id, selectedUserId]);

  const isManagerOrAdmin = role === 'Admin' || role === 'Meal Manager';
  const isBangla = settings.language === 'Bangla';
  const currency = settings.currency;

  const { showToast } = useFeedback();

  const monthDates = getMonthDates(selectedMonth);
  const { today, tomorrow } = getEffectiveDatesForMonth(activeMonth);
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
  const archivedSnapshot =
    selectedMonth !== activeMonth
      ? settings.closedMonths?.find(c => c.month === selectedMonth)
      : undefined;

  const isVacation = (userId: string, date: string): boolean => {
    return (
      vacationPeriods?.some(
        vp => vp.userId === userId && date >= vp.startDate && date <= vp.endDate
      ) || false
    );
  };

  const formatDateFriendly = (dateStr: string) => {
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayName = d.toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', { weekday: 'short' });
    const dayNum = String(parts[2]).padStart(2, '0');
    const monthShort = d.toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', { month: 'short' });
    return { dayName, label: `${dayNum} ${monthShort}` };
  };

  // -------------------------------------------------------------------
  // MAIN CORE CALCULATIONS
  // -------------------------------------------------------------------
  const approvedMonthBazaar = monthBazaarEntries.filter(entry => entry.status === 'Approved');
  const approvedMonthDeposits = monthDeposits.filter(d => d.status === 'Approved');

  const totalBazaarCost = approvedMonthBazaar.reduce((sum, entry) => sum + entry.price, 0);
  const totalOtherExpense = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalExpenses = totalBazaarCost + totalOtherExpense;
  const totalApprovedDepositsPool = approvedMonthDeposits.reduce((s, d) => s + d.amount, 0);

  const rawTotalMeals = allUsers
    .filter(u => u.isActive)
    .reduce((sum, user) => {
      let userSum = 0;
      const userSheet = meals.find(s => s.userId === user.id);
      monthDates.forEach(dateStr => {
        const m = getEffectiveDayMeal(userSheet, user, dateStr, settings, today, tomorrow, isVacation(user.id, dateStr));
        const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
        const guest =
          (m.guestBreakfast || 0) * 0.5 +
          (m.guestLunch || 0) * 1.0 +
          (m.guestDinner || 0) * 1.0;
        userSum += own + guest;
      });
      return sum + userSum;
    }, 0);
  const totalMealsInMonth = rawTotalMeals;
  const currentMealRate = totalMealsInMonth > 0 ? totalExpenses / totalMealsInMonth : 0;

  const getUserFinancialRow = (user: User) => {
    const userMealSheet = meals.find(sheet => sheet.userId === user.id);

    let ownMealsCount = 0;
    let guestMealsCount = 0;
    let guestBreakfastCount = 0;
    let guestLunchCount = 0;
    let guestDinnerCount = 0;

    monthDates.forEach(dateStr => {
      const m = getEffectiveDayMeal(userMealSheet, user, dateStr, settings, today, tomorrow, isVacation(user.id, dateStr));
      ownMealsCount += (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      guestBreakfastCount += m.guestBreakfast || 0;
      guestLunchCount += m.guestLunch || 0;
      guestDinnerCount += m.guestDinner || 0;
      guestMealsCount +=
        (m.guestBreakfast || 0) * 0.5 +
        (m.guestLunch || 0) * 1.0 +
        (m.guestDinner || 0) * 1.0;
    });

    const totalUserMeals = ownMealsCount + guestMealsCount;
    const billAmount = totalUserMeals * currentMealRate;

    const totalUserDeposits = approvedMonthDeposits
      .filter(d => d.userId === user.id)
      .reduce((sum, d) => sum + d.amount, 0);

    const archivedCarry = archivedSnapshot?.memberSummaries?.find(
      m => m.userId === user.id
    )?.carryForward;
    const carryForward = archivedCarry !== undefined ? archivedCarry : user.carryForward || 0;
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

  const memberReportRows = allUsers.filter(u => u.isActive).map(getUserFinancialRow);
  const myFinancialRow = memberReportRows.find(r => r.userId === currentUser.id);

  // Totals for Monthly Ledger footer
  const monthlyTotals = memberReportRows.reduce(
    (acc, r) => ({
      ownMeals: acc.ownMeals + r.ownMeals,
      guestMeals: acc.guestMeals + r.guestMeals,
      totalMeals: acc.totalMeals + r.totalMeals,
      carryForward: acc.carryForward + r.carryForward,
      deposits: acc.deposits + r.deposits,
      billAmount: acc.billAmount + r.billAmount,
      balance: acc.balance + r.balance
    }),
    {
      ownMeals: 0,
      guestMeals: 0,
      totalMeals: 0,
      carryForward: 0,
      deposits: 0,
      billAmount: 0,
      balance: 0
    }
  );

  // -------------------------------------------------------------------
  // 1. DAILY REPORT ENGINE
  // -------------------------------------------------------------------
  const dailyReports = monthDates.map(dateStr => {
    let totalDailyMeals = 0;
    let activeDiners = 0;

    allUsers.filter(u => u.isActive).forEach(u => {
      const sheet = meals.find(s => s.userId === u.id);
      const dayMeal = getEffectiveDayMeal(sheet, u, dateStr, settings, today, tomorrow, isVacation(u.id, dateStr));
      const ownCount =
        (dayMeal.breakfast ? 0.5 : 0) + (dayMeal.lunch ? 1.0 : 0) + (dayMeal.dinner ? 1.0 : 0);
      const guestCount =
        (dayMeal.guestBreakfast || 0) * 0.5 +
        (dayMeal.guestLunch || 0) * 1.0 +
        (dayMeal.guestDinner || 0) * 1.0;
      const dailySum = ownCount + guestCount;
      totalDailyMeals += dailySum;
      if (dailySum > 0) activeDiners++;
    });

    const dailyBazaar = approvedMonthBazaar
      .filter(entry => entry.date === dateStr)
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
  const totalDailyOutflowSum = totalDailyBazaarSum + totalDailyOverheadSum;

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
  const selectedUserObj =
    allUsers.find(u => u.id === selectedUserId) ||
    allUsers.find(u => u.id === currentUser.id) ||
    allUsers.find(u => u.isActive) ||
    allUsers[0];

  const selectedUserRow = selectedUserObj ? getUserFinancialRow(selectedUserObj) : undefined;

  const getUserDailyLedger = () => {
    if (!selectedUserRow) return [];
    const sheet = meals.find(s => s.userId === selectedUserRow.userId);
    const targetUser = allUsers.find(u => u.id === selectedUserRow.userId);

    return monthDates.map(dateStr => {
      const onVacation = isVacation(selectedUserRow.userId, dateStr);
      const mStatus = getEffectiveDayMeal(sheet, targetUser, dateStr, settings, today, tomorrow, onVacation);

      const ownCount = onVacation
        ? 0
        : (mStatus.breakfast ? 0.5 : 0) + (mStatus.lunch ? 1.0 : 0) + (mStatus.dinner ? 1.0 : 0);
      const guestCount = onVacation
        ? 0
        : (mStatus.guestBreakfast || 0) * 0.5 +
          (mStatus.guestLunch || 0) * 1.0 +
          (mStatus.guestDinner || 0) * 1.0;
      const totalCount = ownCount + guestCount;

      return {
        date: dateStr,
        onVacation,
        breakfast: !onVacation && mStatus.breakfast,
        lunch: !onVacation && mStatus.lunch,
        dinner: !onVacation && mStatus.dinner,
        guestBreakfast: onVacation ? 0 : mStatus.guestBreakfast || 0,
        guestLunch: onVacation ? 0 : mStatus.guestLunch || 0,
        guestDinner: onVacation ? 0 : mStatus.guestDinner || 0,
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
    const updatedUsersList = allUsers.map(user => {
      const row = getUserFinancialRow(user);
      return {
        ...user,
        carryForward: Number(row.balance.toFixed(2))
      };
    });

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
    onLogAction(
      'Month Reopened',
      `Month (${activeMonthLabel}) reopened successfully by Administrator: ${currentUser.name}.`
    );
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
      csv = `Mess Financial Statement - Monthly Report (${selectedMonthLabel})\n`;
      csv += `Calculated Meal Rate: ${currency}${currentMealRate.toFixed(4)}\n\n`;
      csv += 'Member Name,Own Meals,Guest Meals,Total Meals,Carry Forward,Total Deposits,Bill Amount,Balance,Status\n';
      memberReportRows.forEach(row => {
        csv += `"${row.name}",${row.ownMeals},${row.guestMeals},${row.totalMeals},${row.carryForward.toFixed(2)},${row.deposits.toFixed(2)},${row.billAmount.toFixed(2)},${row.balance.toFixed(2)},"${row.balance >= 0 ? 'Surplus' : 'Deficit'}"\n`;
      });
      filename = `Mess_MonthlyReport_${fileMonthSlug}.csv`;
    } else if (activeTab === 'Daily') {
      csv = `Mess Daily Meals and Outflow Statement (${selectedMonthLabel})\n\n`;
      csv += 'Date,Active Diners,Meals Count,Bazaar Cost,Overhead Expenses,Total Daily Outflow\n';
      dailyReports.forEach(r => {
        csv += `${r.date},${r.activeDiners},${r.mealsCount},${r.bazaarCost.toFixed(2)},${r.overheadCost.toFixed(2)},${r.totalOutflow.toFixed(2)}\n`;
      });
      filename = `Mess_DailyReport_${fileMonthSlug}.csv`;
    } else if (activeTab === 'Weekly') {
      csv = `Mess Weekly Metrics Summary (${selectedMonthLabel})\n\n`;
      csv += 'Week,Total Meals,Bazaar Cost,Overhead Expenses,Weekly Outflow,Estimated Meal Rate\n';
      weeklyReports.forEach(w => {
        csv += `"${w.name}",${w.mealsCount},${w.bazaarCost.toFixed(2)},${w.overheadCost.toFixed(2)},${w.totalOutflow.toFixed(2)},${w.estMealRate.toFixed(4)}\n`;
      });
      filename = `Mess_WeeklyReport_${fileMonthSlug}.csv`;
    } else if (activeTab === 'User' && selectedUserRow) {
      csv = `Mess Member Ledger - ${selectedUserRow.name} (${selectedUserRow.email}) - ${selectedMonthLabel}\n`;
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
      filename = `Mess_UserReport_${selectedUserRow.name.replace(/\s+/g, '_')}_${fileMonthSlug}.csv`;
    } else if (activeTab === 'Bazaar') {
      csv = `Mess Approved Bazaar Outlay Ledger (${selectedMonthLabel})\n\n`;
      csv += 'Date,Item Description,Quantity & Unit,Total Price,Approved Status\n';
      approvedMonthBazaar.forEach(b => {
        csv += `${b.date},"${b.items}","${b.quantity} ${b.unit || ''}",${b.price},"${b.status}"\n`;
      });
      filename = `Mess_BazaarReport_${fileMonthSlug}.csv`;
    } else if (activeTab === 'Deposit') {
      csv = `Mess Verified Deposit Ledger (${selectedMonthLabel})\n\n`;
      csv += 'Date,Member Name,Amount,Payment Method,Transaction ID,Status,Note\n';
      approvedMonthDeposits.forEach(d => {
        const u = allUsers.find(x => x.id === d.userId)?.name || 'Unknown';
        csv += `${d.date},"${u}",${d.amount},"${d.method}","${d.transactionId || ''}","${d.status || 'Approved'}","${d.note || ''}"\n`;
      });
      filename = `Mess_DepositReport_${fileMonthSlug}.csv`;
    } else if (activeTab === 'GuestMeal') {
      csv = `Mess Guest Meals Board & Expenses (${selectedMonthLabel})\n`;
      csv += `Calculated Meal Rate: ${currency}${currentMealRate.toFixed(4)}\n\n`;
      csv += 'Host Member,Guest Breakfasts,Guest Lunches,Guest Dinners,Total Guest Meals,Guest Bill Owed\n';
      memberReportRows.forEach(row => {
        const guestBill = row.guestMeals * currentMealRate;
        csv += `"${row.name}",${row.guestBreakfast},${row.guestLunch},${row.guestDinner},${row.guestMeals},${guestBill.toFixed(2)}\n`;
      });
      filename = `Mess_GuestMealReport_${fileMonthSlug}.csv`;
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printEl = document.getElementById('print-area');
    if (!printEl) {
      window.print();
      return;
    }

    const cloned = printEl.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('.no-print').forEach(el => el.remove());
    const printHeader = cloned.querySelector('.print\\:block');
    if (printHeader) {
      printHeader.classList.remove('hidden');
    }

    const reportTitle = `${settings.systemName || 'Mess Report'} - ${selectedMonthLabel} (${activeTab})`;
    const printableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${reportTitle.replace(/</g, '&lt;')}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Inter', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      line-height: 1.45;
    }
    .print-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      margin-bottom: 16px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
    }
    .print-toolbar button {
      background: #059669;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    h1, h2, h3, h4 { margin: 0 0 6px; color: #0f172a; }
    .grid { display: grid; gap: 12px; margin-bottom: 14px; }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #334155; }
    tfoot td { background: #f1f5f9; font-weight: 800; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .hidden { display: block !important; }
    img { display: none !important; }
    @media print {
      body { padding: 0; }
      .print-toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <span><strong>${reportTitle.replace(/</g, '&lt;')}</strong></span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${cloned.innerHTML}
</body>
</html>`;

    const isInsideIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    if (isInsideIframe) {
      const blob = new Blob(['\uFEFF' + printableHtml], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mess_${activeTab}_Report_${selectedMonth}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(
        isBangla
          ? 'প্রিন্ট-রেডি রিপোর্ট ডাউনলোড হয়েছে! ফাইলটি ব্রাউজারে ওপেন করে "Print / Save as PDF" করুন (লাইভ Vercel সাইটে সরাসরি প্রিন্ট পপআপ খুলবে)।'
          : 'Printable report downloaded! Open the file in your browser and click "Print / Save as PDF" (on your live Vercel site, the Print/PDF dialog opens directly).',
        'info'
      );
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(printableHtml);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1500);
      }, 150);
    } else {
      document.body.removeChild(iframe);
      window.print();
    }
  };

  const filteredRows = memberReportRows.filter(
    row =>
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openMemberDetail = (userId: string) => {
    setSelectedUserId(userId);
    setActiveTab('User');
  };

  const getBalanceStatusLabel = (bal: number) => {
    if (Math.abs(bal) < 0.01) {
      return isBangla ? 'সমান' : 'Settled';
    }
    if (bal > 0) {
      return isBangla ? 'জমা / পাবেন' : 'Refundable';
    }
    return isBangla ? 'বকেয়া / দিবেন' : 'Due to Pay';
  };

  const buildMemberBillSlipText = (row: (typeof memberReportRows)[number]) => {
    const messTitle = settings.systemName || 'Mess Management System';
    const absBal = Math.abs(row.balance).toFixed(2);
    const statusText =
      Math.abs(row.balance) < 0.01
        ? isBangla
          ? 'সমান (Settled)'
          : 'Settled'
        : row.balance > 0
        ? isBangla
          ? `পাবেন +${currency}${absBal}`
          : `Refundable +${currency}${absBal}`
        : isBangla
        ? `বকেয়া (দিতে হবে) ${currency}${absBal}`
        : `Payable Due ${currency}${absBal}`;

    const paymentLines: string[] = [];
    if (row.balance < -0.01) {
      if (settings.bkashNumber?.trim()) {
        paymentLines.push(`bKash: ${settings.bkashNumber.trim()}`);
      }
      if (settings.nagadNumber?.trim()) {
        paymentLines.push(`Nagad: ${settings.nagadNumber.trim()}`);
      }
      if (settings.paymentNote?.trim()) {
        paymentLines.push(`Note: ${settings.paymentNote.trim()}`);
      }
    }

    if (isBangla) {
      return [
        `*${messTitle}* — মাসিক বিল স্লিপ (${selectedMonthLabel})`,
        `সদস্য: ${row.name}`,
        `নিজ মিল: ${row.ownMeals} | অতিথি মিল: ${row.guestMeals} | মোট মিল: ${row.totalMeals}`,
        `মিল রেট: ${currency}${currentMealRate.toFixed(2)}`,
        `মোট মিল বিল: ${currency}${row.billAmount.toFixed(2)}`,
        `আগের জের: ${row.carryForward >= 0 ? '+' : '-'}${currency}${Math.abs(row.carryForward).toFixed(2)}`,
        `চলতি মাসের জমা: ${currency}${row.deposits.toFixed(2)}`,
        `চূড়ান্ত হিসাব: ${statusText}`,
        ...(paymentLines.length > 0 ? ['', ...paymentLines] : []),
      ].join('\n');
    }

    return [
      `*${messTitle}* — Monthly Bill Slip (${selectedMonthLabel})`,
      `Member: ${row.name}`,
      `Meals: ${row.totalMeals} (Own ${row.ownMeals} + Guest ${row.guestMeals})`,
      `Meal Rate: ${currency}${currentMealRate.toFixed(2)}`,
      `Meal Bill: ${currency}${row.billAmount.toFixed(2)}`,
      `Prev. Carry Forward: ${row.carryForward >= 0 ? '+' : '-'}${currency}${Math.abs(row.carryForward).toFixed(2)}`,
      `Month Deposits: ${currency}${row.deposits.toFixed(2)}`,
      `Net Balance: ${statusText}`,
      ...(paymentLines.length > 0 ? ['', ...paymentLines] : []),
    ].join('\n');
  };

  const buildWhatsAppUrl = (phone: string | undefined, text: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    let normalized = digits;
    if (digits.startsWith('01') && digits.length === 11) {
      normalized = `88${digits}`;
    }
    const encoded = encodeURIComponent(text);
    return normalized.length >= 10
      ? `https://wa.me/${normalized}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  };

  const handleCopyBillSlip = async (
    row: (typeof memberReportRows)[number],
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const slip = buildMemberBillSlipText(row);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(slip);
      } else {
        const ta = document.createElement('textarea');
        ta.value = slip;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(
        isBangla
          ? `${row.name}-এর মাসিক বিল স্লিপ কপি হয়েছে!`
          : `Copied ${row.name}'s bill slip to clipboard!`,
        'success'
      );
    } catch {
      showToast(
        isBangla ? 'স্লিপ কপি করা যায়নি।' : 'Could not copy bill slip.',
        'error'
      );
    }
  };

  const totalGuestMealsSum = memberReportRows.reduce((s, r) => s + r.guestMeals, 0);

  return (
    <div className="space-y-5" id="reports-tab">
      {/* SCOPED PRINT STYLES */}
      <style>{`
        @media print {
          aside, header, nav, .no-print {
            display: none !important;
          }
          body, #root, main {
            background-color: white !important;
            color: black !important;
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-area {
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 shrink-0 mt-0.5">
            <FilePieChart size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isBangla ? 'মাসিক হিসাব ও রিপোর্ট' : 'Mess Reports & Billing Summary'}
              </h2>
              {settings.isMonthClosed && selectedMonth === activeMonth ? (
                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <Lock size={10} /> {isBangla ? 'মাস ক্লোজড' : 'Closed'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                  {selectedMonth === activeMonth
                    ? isBangla
                      ? 'চলতি হিসাব'
                      : 'Live Cycle'
                    : isBangla
                    ? 'পুরনো রেকর্ড'
                    : 'Archive'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isBangla
                ? 'এক নজরে মিল রেট, মোট খরচ, জমা টাকা এবং কার কত টাকা পাওনা বা বকেয়া আছে তা সহজে দেখুন।'
                : 'Clear overview of meal rate, total expenses, deposits, and who gets a refund or owes payment.'}
            </p>
          </div>
        </div>

        {/* MONTH SELECTOR & CLOSING / HELP CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFormulaGuide(v => !v)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              showFormulaGuide
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70'
            }`}
          >
            <HelpCircle size={14} />
            <span>{isBangla ? 'হিসাব কীভাবে হয়?' : 'How It Works'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Calendar size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              aria-label={isBangla ? 'মাস নির্বাচন করুন' : 'Select billing month'}
            >
              {monthOptions.map(m => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900">
                  {formatMonthLabel(m, settings.language)}
                  {m === activeMonth ? (isBangla ? ' (চলতি)' : ' (Active)') : ''}
                </option>
              ))}
            </select>
          </div>

          {settings.isMonthClosed ? (
            <div className="flex flex-wrap items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-indigo-700 dark:text-indigo-300 font-bold text-xs">
              <Lock size={13} className="shrink-0" />
              <span>{isBangla ? `${activeMonthLabel} ক্লোজড` : `${activeMonthLabel} Closed`}</span>
              {role === 'Admin' && (
                <>
                  <button
                    onClick={handleReopenMonth}
                    className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    {isBangla ? 'রিওপেন' : 'Reopen'}
                  </button>
                  {onStartNewMonth && (
                    <button
                      onClick={() => onStartNewMonth(nextMonth)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <ArrowRight size={11} />
                      <span>{isBangla ? `${nextMonthLabel} শুরু` : `Start ${nextMonthLabel}`}</span>
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
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Lock size={13} />
                <span>{isBangla ? 'মাস ক্লোজ করুন' : `Close ${activeMonthLabel}`}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* SIMPLE FORMULA & EXPLAINER GUIDE (TOGGLABLE) */}
      {showFormulaGuide && (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl p-4 sm:p-5 space-y-3 no-print">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Info size={14} />
              {isBangla ? 'সহজ ভাষায় মেস হিসাবের নিয়ম' : 'Simple Guide: How Mess Billing Works'}
            </h3>
            <button
              type="button"
              onClick={() => setShowFormulaGuide(false)}
              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {isBangla ? 'বন্ধ করুন' : 'Hide'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="font-bold text-slate-800 dark:text-white mb-1">
                {isBangla ? '১. মিল রেট নির্ণয়' : '1. Meal Rate Formula'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {isBangla
                  ? 'মোট বাজার + অন্যান্য খরচকে মেসের মোট মিল সংখ্যা দিয়ে ভাগ করে প্রতি মিলের খরচ বের হয়। (সকাল = ০.৫, দুপুর = ১, রাত = ১)'
                  : 'Total Expenses (Bazaar + Overheads) ÷ Total Meals eaten. (Breakfast = 0.5, Lunch = 1.0, Dinner = 1.0)'}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="font-bold text-slate-800 dark:text-white mb-1">
                {isBangla ? '২. আপনার মোট বিল' : '2. Your Meal Bill'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {isBangla
                  ? 'আপনার নিজস্ব মিল + অতিথি মিলের যোগফলকে মিল রেট দিয়ে গুণ করলে আপনার চলতি মাসের মোট বিল পাওয়া যায়।'
                  : 'Your Total Meals (Own + Guest) × Current Meal Rate = Total Bill Amount for this month.'}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="font-bold text-slate-800 dark:text-white mb-1">
                {isBangla ? '৩. পাবেন নাকি দিবেন?' : '3. Final Balance (Refund vs Due)'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {isBangla
                  ? '(আগের মাসের জের + চলতি জমা) − মোট বিল। উত্তর (+) হলে আপনি টাকা পাবেন, আর (-) হলে মেসে বকেয়া দিতে হবে।'
                  : '(Carry Forward + Deposits) − Bill. Positive (+) means refundable surplus; negative (−) means due to pay.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PERSONAL QUICK STATUS BANNER FOR LOGGED-IN USER */}
      {myFinancialRow && activeTab !== 'User' && (
        <div
          onClick={() => openMemberDetail(myFinancialRow.userId)}
          className={`rounded-2xl p-4 border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition no-print ${
            myFinancialRow.balance >= 0
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50 hover:border-emerald-400'
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/50 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                myFinancialRow.balance >= 0
                  ? 'bg-emerald-500 text-white'
                  : 'bg-rose-500 text-white'
              }`}
            >
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {isBangla
                  ? `আপনার ব্যক্তিগত সারসংক্ষেপ (${selectedMonthLabel})`
                  : `Your Personal Summary (${selectedMonthLabel})`}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {isBangla ? 'মোট মিল:' : 'Meals:'}{' '}
                  <strong className="tabular-nums">{myFinancialRow.totalMeals}</strong>
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {isBangla ? 'মোট জমা:' : 'Funds:'}{' '}
                  <strong className="tabular-nums text-indigo-600 dark:text-indigo-400">
                    {currency}
                    {(myFinancialRow.carryForward + myFinancialRow.deposits).toLocaleString()}
                  </strong>
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {isBangla ? 'মিল বিল:' : 'Bill:'}{' '}
                  <strong className="tabular-nums">
                    {currency}
                    {myFinancialRow.billAmount.toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-200/60 dark:border-slate-700/50">
            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {getBalanceStatusLabel(myFinancialRow.balance)}
              </span>
              <span
                className={`text-base font-black tabular-nums ${
                  myFinancialRow.balance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {myFinancialRow.balance >= 0 ? '+' : '-'}
                {currency}
                {Math.abs(myFinancialRow.balance).toFixed(2)}
              </span>
            </div>
            <span className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
              <ChevronRight size={16} />
            </span>
          </div>
        </div>
      )}

      {/* LIVE KPI SUMMARY CARDS */}
      {activeTab !== 'User' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 block">
                {isBangla ? 'মেসের মোট খরচ' : 'Total Mess Expenses'}
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                {currency}
                {totalExpenses.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                {isBangla ? 'বাজার:' : 'Bazaar:'} {currency}
                {totalBazaarCost.toLocaleString()} • {isBangla ? 'অন্যান্য:' : 'Extra:'} {currency}
                {totalOtherExpense.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
              <ShoppingBag size={18} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 block">
                {isBangla ? 'মোট মিল সংখ্যা' : 'Total Meals Eaten'}
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                {totalMealsInMonth.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                {isBangla
                  ? `নিজ ${monthlyTotals.ownMeals} + অতিথি ${monthlyTotals.guestMeals}`
                  : `Own ${monthlyTotals.ownMeals} + Guest ${monthlyTotals.guestMeals}`}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
              <Utensils size={18} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-emerald-700/80 dark:text-emerald-400 block">
                {isBangla ? 'প্রতি মিল রেট (লাইভ)' : 'Current Meal Rate'}
              </span>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {currency}
                {currentMealRate.toFixed(2)}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                {isBangla ? 'প্রতি মিল খরচ (খরচ ÷ মিল)' : 'Exact:'} {currency}
                {currentMealRate.toFixed(4)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 block">
                {isBangla ? 'মোট জমা (আমানত)' : 'Total Deposits Collected'}
              </span>
              <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
                {currency}
                {totalApprovedDepositsPool.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                {isBangla
                  ? `হাতে আছে: ${currency}${(totalApprovedDepositsPool - totalExpenses).toLocaleString()}`
                  : `Cash Balance: ${currency}${(totalApprovedDepositsPool - totalExpenses).toLocaleString()}`}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Coins size={18} />
            </div>
          </div>
        </div>
      )}

      {/* REPORT SUB-TABS SELECTOR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2 shadow-sm overflow-x-auto flex gap-1.5 no-print">
        {[
          {
            id: 'Monthly',
            label: isBangla ? 'সবার হিসাব (মাসিক)' : 'Monthly Summary',
            icon: FilePieChart,
            badge: memberReportRows.length
          },
          {
            id: 'User',
            label: isBangla ? 'ব্যক্তিগত খতিয়ান' : 'Member Detail',
            icon: Users
          },
          {
            id: 'Daily',
            label: isBangla ? 'দৈনিক মিল ও খরচ' : 'Daily Breakdown',
            icon: Calendar
          },
          {
            id: 'Weekly',
            label: isBangla ? 'সাপ্তাহিক' : 'Weekly',
            icon: CalendarDays
          },
          {
            id: 'Bazaar',
            label: isBangla ? 'বাজার তালিকা' : 'Bazaar Log',
            icon: ShoppingBag,
            badge: approvedMonthBazaar.length
          },
          {
            id: 'Deposit',
            label: isBangla ? 'জমা তালিকা' : 'Deposits Log',
            icon: Coins,
            badge: approvedMonthDeposits.length
          },
          {
            id: 'GuestMeal',
            label: isBangla ? 'অতিথি মিল' : 'Guest Meals',
            icon: ArrowUpRight
          }
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold leading-none ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ACTION BAR: SEARCH / CONTEXT & EXPORTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 no-print">
        <div className="w-full sm:w-auto flex items-center gap-3">
          {activeTab === 'Monthly' && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder={isBangla ? 'সদস্যের নাম দিয়ে খুঁজুন...' : 'Search member by name...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {activeTab === 'User' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {isBangla ? 'সদস্য:' : 'Member:'}
              </span>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="flex-1 sm:w-56 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold cursor-pointer"
              >
                {allUsers
                  .filter(u => u.isActive)
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.id === currentUser.id ? (isBangla ? ' (আপনি)' : ' (You)') : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {['Daily', 'Weekly', 'Bazaar', 'Deposit', 'GuestMeal'].includes(activeTab) && (
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-1">
              {activeTab === 'Daily' &&
                (isBangla
                  ? `${selectedMonthLabel} মাসের ${daysInMonth} দিনের দৈনিক মিল ও খরচের হিসাব`
                  : `Day-by-day meals and expenses for ${selectedMonthLabel} (${daysInMonth} days)`)}
              {activeTab === 'Weekly' &&
                (isBangla
                  ? `${selectedMonthLabel} মাসের ${weeklyReports.length} সপ্তাহের হিসাব`
                  : `Grouped across ${weeklyReports.length} weeks in ${selectedMonthLabel}`)}
              {activeTab === 'Bazaar' &&
                (isBangla
                  ? `অনুমোদিত বাজার এন্ট্রি (${approvedMonthBazaar.length}টি)`
                  : `Approved bazaar purchases (${approvedMonthBazaar.length} entries)`)}
              {activeTab === 'Deposit' &&
                (isBangla
                  ? `অনুমোদিত জমার রেকর্ড (${approvedMonthDeposits.length}টি)`
                  : `Approved member deposits (${approvedMonthDeposits.length} entries)`)}
              {activeTab === 'GuestMeal' &&
                (isBangla
                  ? `মোট অতিথি মিল: ${totalGuestMealsSum}টি (হোস্ট অনুযায়ী হিসাব)`
                  : `Total guest meals hosted: ${totalGuestMealsSum}`)}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
            title={isBangla ? 'CSV/Excel ফাইল ডাউনলোড করুন' : 'Download Excel/CSV'}
          >
            <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>{isBangla ? 'এক্সেল' : 'Excel / CSV'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
            title={isBangla ? 'প্রিন্ট বা PDF সেভ করুন' : 'Print or Save as PDF'}
          >
            <Printer size={14} className="text-slate-500 dark:text-slate-400" />
            <span>{isBangla ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
          </button>
        </div>
      </div>

      {/* PRINT-READY CONTAINER */}
      <div id="print-area">
        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-extrabold">
            {settings.systemName || 'Mess Report'} - {selectedMonthLabel}
          </h1>
          <p className="text-sm text-slate-500">
            Generated by: {currentUser.name} ({currentUser.role}) on{' '}
            {new Date().toLocaleDateString()}
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
            <div>
              <span className="font-bold block">Total Expenses:</span>
              <span>
                {currency}
                {totalExpenses.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="font-bold block">Total Meals:</span>
              <span>{totalMealsInMonth}</span>
            </div>
            <div>
              <span className="font-bold block">Meal Rate:</span>
              <span className="text-emerald-600 font-extrabold">
                {currency}
                {currentMealRate.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* TAB 1: MONTHLY SUMMARY LEDGER */}
        {activeTab === 'Monthly' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/40 dark:bg-slate-900/40 no-print">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {isBangla
                  ? 'সকল সদস্যের চূড়ান্ত হিসাব (বিস্তারিত দেখতে যেকোনো নামের ওপর ক্লিক করুন)'
                  : 'All Members Billing Table (Click any row to view daily meal breakdown)'}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {isBangla ? 'মিল রেট:' : 'Meal Rate:'}{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {currency}
                  {currentMealRate.toFixed(2)}
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">{isBangla ? 'সদস্য' : 'Member'}</th>
                    <th className="px-3 py-3 text-center">{isBangla ? 'নিজ মিল' : 'Own'}</th>
                    <th className="px-3 py-3 text-center">{isBangla ? 'অতিথি' : 'Guest'}</th>
                    <th className="px-3 py-3 text-center">{isBangla ? 'মোট মিল' : 'Total Meals'}</th>
                    <th className="px-3 py-3 text-center">{isBangla ? 'আগের জের' : 'Prev. Balance'}</th>
                    <th className="px-3 py-3 text-center">{isBangla ? 'চলতি জমা' : 'Deposited'}</th>
                    <th className="px-3 py-3 text-center">{isBangla ? 'মোট বিল' : 'Meal Bill'}</th>
                    <th className="px-4 py-3 text-center">{isBangla ? 'চূড়ান্ত হিসাব' : 'Net Balance'}</th>
                    <th className="px-4 py-3 text-center">{isBangla ? 'অবস্থা' : 'Status'}</th>
                    <th className="px-3 py-3 text-center no-print">{isBangla ? 'বিল স্লিপ' : 'Slip'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredRows.map(row => {
                    const isSelf = row.userId === currentUser.id;
                    return (
                      <tr
                        key={row.userId}
                        onClick={() => openMemberDetail(row.userId)}
                        className={`text-xs text-slate-700 dark:text-slate-300 cursor-pointer transition ${
                          isSelf
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/15 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/25'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                row.avatarUrl ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                              }
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 print:hidden"
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {row.name}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold shrink-0">
                                    {isBangla ? 'আপনি' : 'YOU'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {row.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-center text-slate-500 tabular-nums">
                          {row.ownMeals}
                        </td>
                        <td className="px-3 py-3.5 text-center text-slate-500 tabular-nums">
                          {row.guestMeals > 0 ? row.guestMeals : '-'}
                        </td>
                        <td className="px-3 py-3.5 text-center font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                          {row.totalMeals}
                        </td>

                        <td
                          className={`px-3 py-3.5 text-center font-semibold tabular-nums ${
                            row.carryForward >= 0
                              ? 'text-slate-600 dark:text-slate-300'
                              : 'text-rose-500'
                          }`}
                        >
                          {row.carryForward >= 0 ? '+' : '-'}
                          {currency}
                          {Math.abs(row.carryForward).toLocaleString()}
                        </td>

                        <td className="px-3 py-3.5 text-center font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {currency}
                          {row.deposits.toLocaleString()}
                        </td>

                        <td className="px-3 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {currency}
                          {row.billAmount.toFixed(2)}
                        </td>

                        <td
                          className={`px-4 py-3.5 text-center font-black tabular-nums ${
                            row.balance >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {row.balance >= 0 ? '+' : '-'}
                          {currency}
                          {Math.abs(row.balance).toFixed(2)}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold whitespace-nowrap inline-block ${
                              Math.abs(row.balance) < 0.01
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                : row.balance > 0
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {getBalanceStatusLabel(row.balance)}
                          </span>
                        </td>

                        <td
                          className="px-3 py-3.5 text-center no-print"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={e => handleCopyBillSlip(row, e)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                              title={isBangla ? 'বিল স্লিপ কপি করুন' : 'Copy bill slip'}
                            >
                              <Copy size={13} />
                            </button>
                            <a
                              href={buildWhatsAppUrl(row.phone, buildMemberBillSlipText(row))}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 transition"
                              title={isBangla ? 'হোয়াটসঅ্যাপে পাঠান' : 'Send via WhatsApp'}
                            >
                              <MessageCircle size={13} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                        {isBangla ? 'কোনো সদস্য পাওয়া যায়নি।' : 'No members match your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredRows.length > 0 && !searchQuery && (
                  <tfoot>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white">
                      <td className="px-4 py-3">{isBangla ? 'সর্বমোট (সকল সদস্য)' : 'Total (All Members)'}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{monthlyTotals.ownMeals}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{monthlyTotals.guestMeals}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{monthlyTotals.totalMeals}</td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        {monthlyTotals.carryForward >= 0 ? '+' : '-'}
                        {currency}
                        {Math.abs(monthlyTotals.carryForward).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {currency}
                        {monthlyTotals.deposits.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        {currency}
                        {monthlyTotals.billAmount.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-3 text-center tabular-nums ${
                          monthlyTotals.balance >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {monthlyTotals.balance >= 0 ? '+' : '-'}
                        {currency}
                        {Math.abs(monthlyTotals.balance).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-[10px] text-slate-400">
                        {filteredRows.length} {isBangla ? 'জন' : 'members'}
                      </td>
                      <td className="px-3 py-3 no-print" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DAILY REPORT */}
        {activeTab === 'Daily' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'খেয়েছেন (জন)' : 'Active Diners'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'মোট মিল' : 'Daily Meals'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'বাজার খরচ' : 'Bazaar Cost'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'অন্যান্য খরচ' : 'Overheads'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'দিনের মোট খরচ' : 'Daily Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {dailyReports.map(r => {
                    const hasData = r.mealsCount > 0 || r.totalOutflow > 0;
                    const friendly = formatDateFriendly(r.date);
                    return (
                      <tr
                        key={r.date}
                        className={`text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition ${
                          !hasData ? 'opacity-45' : ''
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {typeof friendly === 'string' ? friendly : friendly.label}
                          </span>
                          {typeof friendly !== 'string' && (
                            <span className="ml-2 text-[10px] text-slate-400 font-semibold">
                              ({friendly.dayName})
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                          {r.activeDiners > 0 ? r.activeDiners : '-'}
                        </td>
                        <td className="px-5 py-3 text-center font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                          {r.mealsCount > 0 ? r.mealsCount : '-'}
                        </td>
                        <td className="px-5 py-3 text-center font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                          {r.bazaarCost > 0 ? `${currency}${r.bazaarCost.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-5 py-3 text-center font-semibold text-rose-500 tabular-nums">
                          {r.overheadCost > 0 ? `${currency}${r.overheadCost.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-5 py-3 text-center font-bold text-slate-800 dark:text-white tabular-nums">
                          {r.totalOutflow > 0 ? `${currency}${r.totalOutflow.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white">
                    <td className="px-5 py-3">{isBangla ? 'মাসের সর্বমোট' : 'Monthly Total'}</td>
                    <td className="px-5 py-3 text-center text-slate-400">-</td>
                    <td className="px-5 py-3 text-center tabular-nums">{totalDailyMealsSum}</td>
                    <td className="px-5 py-3 text-center text-amber-600 dark:text-amber-400 tabular-nums">
                      {currency}
                      {totalDailyBazaarSum.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center text-rose-500 tabular-nums">
                      {currency}
                      {totalDailyOverheadSum.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center tabular-nums">
                      {currency}
                      {totalDailyOutflowSum.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: WEEKLY REPORT */}
        {activeTab === 'Weekly' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {weeklyReports.map(w => (
              <div
                key={w.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{w.name}</h4>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    {w.mealsCount} {isBangla ? 'মিল' : 'Meals'}
                  </span>
                </div>
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isBangla ? 'বাজার খরচ:' : 'Bazaar Cost:'}
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {currency}
                      {w.bazaarCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isBangla ? 'অন্যান্য খরচ:' : 'Overhead Expenses:'}
                    </span>
                    <span className="font-bold text-rose-500 tabular-nums">
                      {currency}
                      {w.overheadCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2 font-bold text-slate-800 dark:text-slate-200">
                    <span>{isBangla ? 'সপ্তাহের মোট খরচ:' : 'Weekly Total:'}</span>
                    <span className="tabular-nums">
                      {currency}
                      {w.totalOutflow.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-emerald-600 dark:text-emerald-400 font-extrabold">
                    <span>{isBangla ? 'আনুমানিক মিল রেট:' : 'Est. Meal Rate:'}</span>
                    <span className="tabular-nums">
                      {currency}
                      {w.estMealRate.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: USER LEDGER */}
        {activeTab === 'User' && selectedUserRow && (
          <div className="space-y-5">
            {/* QUICK SHARE BILL SLIP ACTION BAR */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  {isBangla
                    ? `${selectedUserRow.name}-এর মাসিক বিল স্লিপ শেয়ার করুন`
                    : `Share ${selectedUserRow.name}'s Monthly Bill Slip`}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isBangla
                    ? 'এক ক্লিকে সম্পূর্ণ মিল ও বকেয়া হিসাব কপি করুন অথবা সরাসরি হোয়াটসঅ্যাপে পাঠান।'
                    : 'Copy formatted monthly settlement summary or send directly via WhatsApp.'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyBillSlip(selectedUserRow)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Copy size={14} />
                  <span>{isBangla ? 'বিল স্লিপ কপি' : 'Copy Bill Slip'}</span>
                </button>
                <a
                  href={buildWhatsAppUrl(
                    selectedUserRow.phone,
                    buildMemberBillSlipText(selectedUserRow)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                >
                  <MessageCircle size={14} />
                  <span>{isBangla ? 'হোয়াটসঅ্যাপে পাঠান' : 'Send on WhatsApp'}</span>
                </a>
              </div>
            </div>

            {/* USER PROFILE SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Profile card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <img
                  src={
                    selectedUserRow.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                  }
                  className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-emerald-500/20"
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <h4 className="font-black text-slate-900 dark:text-white truncate">
                    {selectedUserRow.name}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">{selectedUserRow.email}</p>
                  {selectedUserRow.phone && (
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {selectedUserRow.phone}
                    </p>
                  )}
                  <span
                    className={`inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md mt-2 ${
                      selectedUserRow.isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600'
                    }`}
                  >
                    {selectedUserRow.isActive
                      ? isBangla
                        ? 'সক্রিয় সদস্য'
                        : 'Active Member'
                      : isBangla
                      ? 'নিষ্ক্রিয়'
                      : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Funds overview card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isBangla ? 'মোট জমা তহবিল' : 'Total Funds Available'}
                  </span>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">
                        {isBangla ? 'আগের জের:' : 'Prev. Balance:'}
                      </span>
                      <span
                        className={`font-bold text-xs tabular-nums ${
                          selectedUserRow.carryForward >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-500'
                        }`}
                      >
                        {selectedUserRow.carryForward >= 0 ? '+' : '-'}
                        {currency}
                        {Math.abs(selectedUserRow.carryForward).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">
                        {isBangla ? 'চলতি জমা:' : 'Deposited:'}
                      </span>
                      <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {currency}
                        {selectedUserRow.deposits.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-3 flex justify-between text-xs font-extrabold text-slate-900 dark:text-white">
                  <span>{isBangla ? 'সর্বমোট ফান্ড:' : 'Combined Funds:'}</span>
                  <span className="tabular-nums">
                    {currency}
                    {(selectedUserRow.carryForward + selectedUserRow.deposits).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bill & Final Balance card */}
              <div
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm flex flex-col justify-between ${
                  selectedUserRow.balance >= 0
                    ? 'border-emerald-200/70 dark:border-emerald-900/40'
                    : 'border-rose-200/70 dark:border-rose-900/40'
                }`}
              >
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isBangla ? 'মিল ও চূড়ান্ত হিসাব' : 'Meals & Final Settlement'}
                  </span>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">
                        {isBangla ? 'মোট মিল:' : 'Total Meals:'}
                      </span>
                      <span className="font-bold text-xs text-slate-800 dark:text-white tabular-nums">
                        {selectedUserRow.totalMeals} ({selectedUserRow.ownMeals}+
                        {selectedUserRow.guestMeals})
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">
                        {isBangla ? 'মোট বিল:' : 'Meal Bill:'}
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                        {currency}
                        {selectedUserRow.billAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {getBalanceStatusLabel(selectedUserRow.balance)}:
                  </span>
                  <span
                    className={`font-black text-base tabular-nums ${
                      selectedUserRow.balance >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {selectedUserRow.balance >= 0 ? '+' : '-'}
                    {currency}
                    {Math.abs(selectedUserRow.balance).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* DAILY MEALS SHEET LIST FOR INDIVIDUAL */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs">
                  {isBangla
                    ? `${selectedUserRow.name}-এর প্রতিদিনের মিল খতিয়ান (${selectedMonthLabel})`
                    : `Daily Meal History for ${selectedUserRow.name} (${selectedMonthLabel})`}
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  {isBangla ? 'মিল রেট:' : 'Meal Rate:'}{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {currency}
                    {currentMealRate.toFixed(2)}
                  </strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                      <th className="px-3 py-3 text-center">{isBangla ? 'সকাল (০.৫)' : 'Breakfast (0.5)'}</th>
                      <th className="px-3 py-3 text-center">{isBangla ? 'দুপুর (১)' : 'Lunch (1.0)'}</th>
                      <th className="px-3 py-3 text-center">{isBangla ? 'রাত (১)' : 'Dinner (1.0)'}</th>
                      <th className="px-3 py-3 text-center">{isBangla ? 'অতিথি' : 'Guests'}</th>
                      <th className="px-3 py-3 text-center">{isBangla ? 'মোট মিল' : 'Total Meals'}</th>
                      <th className="px-4 py-3 text-center">{isBangla ? 'আনুমানিক খরচ' : 'Est. Cost'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {userDailyLedger.map(d => {
                      const hasAte = d.total > 0;
                      const friendly = formatDateFriendly(d.date);
                      return (
                        <tr
                          key={d.date}
                          className={`text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition ${
                            d.onVacation ? 'bg-amber-50/40 dark:bg-amber-950/10' : !hasAte ? 'opacity-45' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {typeof friendly === 'string' ? friendly : friendly.label}
                            </span>
                            {typeof friendly !== 'string' && (
                              <span className="ml-1.5 text-[10px] text-slate-400">
                                ({friendly.dayName})
                              </span>
                            )}
                            {d.onVacation && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-bold">
                                {isBangla ? 'ছুটি' : 'Vacation'}
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            {d.breakfast ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <Check size={12} />
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            {d.lunch ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <Check size={12} />
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            {d.dinner ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <Check size={12} />
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center text-slate-500">
                            {d.guestBreakfast > 0 || d.guestLunch > 0 || d.guestDinner > 0 ? (
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md text-[10px]">
                                {d.guestBreakfast}B, {d.guestLunch}L, {d.guestDinner}D
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {d.total > 0 ? d.total : '-'}
                          </td>

                          <td className="px-4 py-2.5 text-center font-bold text-slate-800 dark:text-white tabular-nums">
                            {d.cost > 0 ? `${currency}${d.cost.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white">
                      <td className="px-4 py-3" colSpan={5}>
                        {isBangla ? 'মাসের সর্বমোট' : 'Monthly Total'}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        {selectedUserRow.totalMeals}
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {currency}
                        {selectedUserRow.billAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BAZAAR AUDIT REPORT */}
        {activeTab === 'Bazaar' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-xs">
                {isBangla ? 'অনুমোদিত বাজারের তালিকা' : 'Approved Bazaar Purchases'}
              </h4>
              <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                {isBangla ? 'মোট বাজার:' : 'Total Bazaar:'} {currency}
                {totalBazaarCost.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                    <th className="px-5 py-3">{isBangla ? 'বাজারের বিবরণ' : 'Items'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'পরিমাণ' : 'Quantity'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'মোট খরচ' : 'Cost'}</th>
                    <th className="px-5 py-3">{isBangla ? 'বাজার করেছেন' : 'Shoppers'}</th>
                    <th className="px-5 py-3">{isBangla ? 'অনুমোদনকারী' : 'Approved By'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {approvedMonthBazaar.map(b => (
                    <tr key={b.id} className="text-xs text-slate-700 dark:text-slate-300">
                      <td className="px-5 py-3 font-semibold whitespace-nowrap">{b.date}</td>
                      <td className="px-5 py-3 font-bold text-slate-800 dark:text-white">
                        {b.items}
                      </td>
                      <td className="px-5 py-3 text-center text-slate-500">
                        {b.quantity} {b.unit || ''}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {currency}
                        {b.price.toLocaleString()}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {b.assignedTo.map(uid => {
                            const u = allUsers.find(x => x.id === uid);
                            return u ? (
                              <span
                                key={uid}
                                className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                              >
                                {u.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        {b.approvedBy
                          ? allUsers.find(x => x.id === b.approvedBy)?.name || 'Manager'
                          : isBangla
                          ? 'অ্যাডমিন'
                          : 'Admin'}
                      </td>
                    </tr>
                  ))}

                  {approvedMonthBazaar.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                        {isBangla
                          ? `${selectedMonthLabel} মাসে কোনো অনুমোদিত বাজার রেকর্ড নেই।`
                          : `No approved bazaar records found for ${selectedMonthLabel}.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: DEPOSIT AUDIT REPORT */}
        {activeTab === 'Deposit' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-xs">
                {isBangla ? 'অনুমোদিত জমার তালিকা' : 'Approved Member Deposits'}
              </h4>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {isBangla ? 'সর্বমোট জমা:' : 'Total Deposits:'} {currency}
                {totalApprovedDepositsPool.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                    <th className="px-5 py-3">{isBangla ? 'সদস্যের নাম' : 'Member'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'পরিমাণ' : 'Amount'}</th>
                    <th className="px-5 py-3">{isBangla ? 'মাধ্যম' : 'Method'}</th>
                    <th className="px-5 py-3">{isBangla ? 'ট্রানজেকশন আইডি' : 'Reference ID'}</th>
                    <th className="px-5 py-3">{isBangla ? 'নোট' : 'Note'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {approvedMonthDeposits.map(d => {
                    const u = allUsers.find(x => x.id === d.userId);
                    return (
                      <tr key={d.id} className="text-xs text-slate-700 dark:text-slate-300">
                        <td className="px-5 py-3 font-semibold whitespace-nowrap">{d.date}</td>
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                          {u?.name || 'Unknown'}
                        </td>
                        <td className="px-5 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {currency}
                          {d.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide bg-slate-100 dark:bg-slate-800 font-bold">
                            {d.method}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {d.transactionId || '-'}
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-[200px] truncate">
                          {d.note || '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {approvedMonthDeposits.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                        {isBangla
                          ? `${selectedMonthLabel} মাসে কোনো অনুমোদিত জমা পাওয়া যায়নি।`
                          : `No approved deposits found for ${selectedMonthLabel}.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: GUEST MEAL REPORT */}
        {activeTab === 'GuestMeal' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-xs">
                {isBangla ? 'অতিথি মিল ও আনুমানিক বিল' : 'Guest Meals & Estimated Cost'}
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {isBangla ? 'মিল রেট:' : 'Meal Rate:'}{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {currency}
                  {currentMealRate.toFixed(2)}
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3">{isBangla ? 'হোস্ট সদস্য' : 'Host Member'}</th>
                    <th className="px-4 py-3 text-center">{isBangla ? 'সকাল (০.৫)' : 'Breakfast (0.5)'}</th>
                    <th className="px-4 py-3 text-center">{isBangla ? 'দুপুর (১)' : 'Lunch (1.0)'}</th>
                    <th className="px-4 py-3 text-center">{isBangla ? 'রাত (১)' : 'Dinner (1.0)'}</th>
                    <th className="px-4 py-3 text-center">{isBangla ? 'মোট অতিথি মিল' : 'Total Guest Meals'}</th>
                    <th className="px-5 py-3 text-center">{isBangla ? 'অতিথি মিল বিল' : 'Guest Bill'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {memberReportRows.map(row => {
                    const guestBill = row.guestMeals * currentMealRate;
                    const hasGuests = row.guestMeals > 0;
                    return (
                      <tr
                        key={row.userId}
                        className={`text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition ${
                          !hasGuests ? 'opacity-45' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          {row.name}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums">
                          {row.guestBreakfast}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums">
                          {row.guestLunch}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums">
                          {row.guestDinner}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {row.guestMeals}
                        </td>
                        <td className="px-5 py-3.5 text-center font-black text-slate-900 dark:text-slate-200 tabular-nums">
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

      {/* MONTH CLOSING MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setShowCloseModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <Unlock size={18} />
            </button>

            {isClosingSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  {isBangla ? 'মাস সফলভাবে ক্লোজ হয়েছে!' : 'Month Closed Successfully!'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBangla
                    ? 'সবার অবশিষ্ট ব্যালেন্স পরের মাসের আগের জের (Carry Forward) হিসেবে সেভ করা হয়েছে।'
                    : 'Remaining balances have been carried forward to next month.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {isBangla
                        ? `${activeMonthLabel} ক্লোজ ও চূড়ান্ত হিসাব`
                        : `Close & Finalize ${activeMonthLabel}`}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isBangla
                        ? 'সবার পাওনা/বকেয়া ব্যালেন্স স্বয়ংক্রিয়ভাবে পরের মাসে নিয়ে যাওয়া হবে।'
                        : 'Carry forward net balances and lock or start next month.'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isBangla ? 'মোট মিল সংখ্যা:' : 'Total Meals:'}</span>
                    <span className="font-bold text-slate-800 dark:text-white tabular-nums">
                      {totalMealsInMonth}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isBangla ? 'মোট খরচ:' : 'Total Expenses:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {currency}
                      {totalExpenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2 font-bold text-emerald-600 dark:text-emerald-400">
                    <span>{isBangla ? 'চূড়ান্ত মিল রেট:' : 'Final Meal Rate:'}</span>
                    <span className="tabular-nums">
                      {currency}
                      {currentMealRate.toFixed(4)}
                    </span>
                  </div>

                  <div className="pt-1">
                    <span className="font-bold block mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                      {isBangla ? 'পরের মাসে স্থানান্তরযোগ্য ব্যালেন্স:' : 'Carry-Forward Preview:'}
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-2">
                      {memberReportRows.map(row => (
                        <div key={row.userId} className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                            {row.name}
                          </span>
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              row.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'
                            }`}
                          >
                            {row.balance >= 0 ? '+' : '-'}
                            {currency}
                            {Math.abs(row.balance).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 bg-rose-500/5 border border-rose-500/15 p-3.5 rounded-2xl text-xs text-rose-700 dark:text-rose-400">
                  <AlertTriangle size={18} className="shrink-0 text-rose-500" />
                  <p className="leading-relaxed text-[11px]">
                    {isBangla
                      ? 'সতর্কতা: মাস ক্লোজ করার পর এই মাসের মিল, বাজার বা ডিপোজিট পরিবর্তন করা যাবে না। পরের মাসে যেতে "ক্লোজ ও নতুন মাস শুরু" বাটনে ক্লিক করুন।'
                      : 'Closing locks this month and carries remaining balances forward. Choose "Close & Start Next Month" to immediately open the next billing cycle.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowCloseModal(false)}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleCloseMonth}
                    className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                  >
                    {isBangla ? 'শুধু লক ও ক্লোজ' : 'Lock & Close Month'}
                  </button>
                  {onStartNewMonth && role === 'Admin' && (
                    <button
                      onClick={handleCloseAndStartNextMonth}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <ArrowRight size={14} />
                      <span>
                        {isBangla ? `ক্লোজ ও ${nextMonthLabel} শুরু` : `Close & Start ${nextMonthLabel}`}
                      </span>
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
