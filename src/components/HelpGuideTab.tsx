import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  UserCheck,
  User as UserIcon,
  ArrowRight,
  Trash2,
  Loader2,
  HelpCircle,
  CheckCircle2,
  Utensils,
  ShoppingBag,
  Coins,
  FilePieChart,
  Settings as SettingsIcon,
  Bell,
  Users,
  Calendar,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import {
  User,
  UserRole,
  SystemSettings,
  MemberMealSheet,
  Deposit,
  BazaarEntry,
  Expense,
  VacationPeriod
} from '../types';
import {
  getRealCurrentMonth,
  getMonthDates,
  getEffectiveDatesForMonth,
  formatMonthLabel,
  formatTime12hDisplay
} from '../utils/dateUtils';
import { getEffectiveDayMeal } from '../utils/mealUtils';

interface HelpGuideTabProps {
  currentUser: User;
  role: UserRole;
  allUsers: User[];
  meals: MemberMealSheet[];
  deposits: Deposit[];
  bazaarEntries: BazaarEntry[];
  expenses: Expense[];
  settings: SystemSettings;
  assignedBazaarPersons: string[];
  vacationPeriods: VacationPeriod[];
  onNavigateTab: (tab: string) => void;
}

interface ManualSection {
  id: string;
  title: string;
  bnTitle: string;
  summary: string;
  bnSummary: string;
  steps: string[];
  bnSteps: string[];
  targetTab: string;
  tabLabel: string;
  bnTabLabel: string;
  aiPrompt: string;
  bnAiPrompt: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

export default function HelpGuideTab({
  currentUser,
  role,
  allUsers,
  meals,
  deposits,
  bazaarEntries,
  expenses,
  settings,
  assignedBazaarPersons,
  vacationPeriods,
  onNavigateTab,
}: HelpGuideTabProps) {
  const isBangla = settings.language === 'Bangla';
  const currency = settings.currency || '৳';
  const activeMonth = settings.activeMonth || getRealCurrentMonth();
  const activeMonthLabel = formatMonthLabel(activeMonth, settings.language);
  const lockTimeDisplay = formatTime12hDisplay(settings.mealLockTime);

  const [subView, setSubView] = useState<'manual' | 'ai'>('manual');

  // Compute live context summary for the manual & AI assistant
  const monthDates = getMonthDates(activeMonth);
  const { today, tomorrow } = getEffectiveDatesForMonth(activeMonth);
  const isVac = (uid: string, date: string) =>
    vacationPeriods?.some(vp => vp.userId === uid && date >= vp.startDate && date <= vp.endDate) || false;

  const activeUsers = allUsers.filter(u => u.isActive);
  const approvedBazaarTotal = bazaarEntries
    .filter(b => b.status === 'Approved' && b.date.startsWith(activeMonth))
    .reduce((s, b) => s + b.price, 0);
  const otherExpenseTotal = expenses
    .filter(e => e.date.startsWith(activeMonth))
    .reduce((s, e) => s + e.amount, 0);
  const totalMessExpense = approvedBazaarTotal + otherExpenseTotal;

  let totalMessMeals = 0;
  let myOwnMeals = 0;
  let myGuestMeals = 0;
  const userMealTotals = new Map<string, number>();

  activeUsers.forEach(u => {
    const sheet = meals.find(m => m.userId === u.id);
    let userMeals = 0;
    monthDates.forEach(d => {
      const m = getEffectiveDayMeal(sheet, u, d, settings, today, tomorrow, isVac(u.id, d));
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0);
      const guest = (m.guestBreakfast || 0) * 0.5 + (m.guestLunch || 0) + (m.guestDinner || 0);
      userMeals += own + guest;
      if (u.id === currentUser.id) {
        myOwnMeals += own;
        myGuestMeals += guest;
      }
    });
    userMealTotals.set(u.id, userMeals);
    totalMessMeals += userMeals;
  });

  const currentMealRate = totalMessMeals > 0 ? totalMessExpense / totalMessMeals : 0;
  const myTotalMeals = myOwnMeals + myGuestMeals;
  const myEstimatedBill = myTotalMeals * currentMealRate;
  const myApprovedDeposits = deposits
    .filter(d => d.userId === currentUser.id && d.date.startsWith(activeMonth) && d.status === 'Approved')
    .reduce((s, d) => s + d.amount, 0);
  const myBalance = (currentUser.carryForward || 0) + myApprovedDeposits - myEstimatedBill;
  const pendingBazaarCount = bazaarEntries.filter(b => b.status === 'Pending' && b.date.startsWith(activeMonth)).length;
  const pendingDepositsCount = deposits.filter(d => d.status === 'Pending' && d.date.startsWith(activeMonth)).length;
  const assignedBuyersNames = assignedBazaarPersons
    .map(id => allUsers.find(u => u.id === id)?.name)
    .filter((n): n is string => Boolean(n));

  // Admin-only sensitive mess summary (never exposed to Member or Meal Manager)
  const adminSummary =
    role === 'Admin'
      ? (() => {
          const totalApprovedDeposits = deposits
            .filter(d => d.date.startsWith(activeMonth) && d.status === 'Approved')
            .reduce((s, d) => s + d.amount, 0);
          const totalCarryForward = activeUsers.reduce((s, u) => s + (u.carryForward || 0), 0);
          const dueMembers = activeUsers
            .map(u => {
              const uMeals = userMealTotals.get(u.id) || 0;
              const uBill = uMeals * currentMealRate;
              const uDeposits = deposits
                .filter(d => d.userId === u.id && d.date.startsWith(activeMonth) && d.status === 'Approved')
                .reduce((s, d) => s + d.amount, 0);
              const bal = (u.carryForward || 0) + uDeposits - uBill;
              return { name: u.name, role: u.role, balance: Number(bal.toFixed(2)) };
            })
            .filter(m => m.balance < 0);

          return {
            totalApprovedBazaar: Number(approvedBazaarTotal.toFixed(2)),
            totalUtilityBills: Number(otherExpenseTotal.toFixed(2)),
            totalApprovedDeposits: Number(totalApprovedDeposits.toFixed(2)),
            netMessCashBalance: Number((totalCarryForward + totalApprovedDeposits - totalMessExpense).toFixed(2)),
            membersWithDueCount: dueMembers.length,
            totalMembersDue: Number(dueMembers.reduce((s, m) => s + Math.abs(m.balance), 0).toFixed(2)),
            dueMembersList: dueMembers,
          };
        })()
      : undefined;

  // Role-specific User Manual sections
  const memberManualSections: ManualSection[] = [
    {
      id: 'mem-meals',
      icon: Utensils,
      title: '1. Daily Meals, Guest Meals & Cutoff Time',
      bnTitle: '১. প্রতিদিনের মিল, অতিথি মিল ও লক টাইম',
      summary: `Reserve or turn off tomorrow's Breakfast (0.5), Lunch (1.0), and Dinner (1.0) before ${lockTimeDisplay}.`,
      bnSummary: `প্রতিদিন রাত/সময় ${lockTimeDisplay}-এর আগে আগামীকালের সকাল (০.৫), দুপুর (১.০) ও রাতের (১.০) মিল অন/অফ করুন।`,
      steps: [
        'Use Dashboard or Meal Sheet to toggle tomorrow’s Breakfast, Lunch, or Dinner.',
        `You can add up to ${settings.guestMealLimit} guest meals per slot before the daily cutoff (${lockTimeDisplay}).`,
        'Going home or away? Add a Vacation Period in Meal Sheet so your meals pause automatically.',
        `Auto-Meal Default is currently ${settings.defaultMealOn ? 'ON' : 'OFF'} for new unedited days.`,
      ],
      bnSteps: [
        'ড্যাশবোর্ড বা মিল শিট থেকে আগামীকালের নাস্তা, দুপুর বা রাতের মিল চালু/বন্ধ করুন।',
        `লক টাইমের (${lockTimeDisplay}) আগে প্রতিটি বেলায় সর্বোচ্চ ${settings.guestMealLimit}টি পর্যন্ত অতিথি মিল যোগ করতে পারবেন।`,
        'বাড়িতে গেলে বা ছুটিতে থাকলে মিল শিটে Vacation Period যোগ করুন—মিল অটো বন্ধ থাকবে।',
        `বর্তমানে ডিফল্ট মিল পলিসি ${settings.defaultMealOn ? 'চালু (AUTO-ON)' : 'বন্ধ (OFF)'} অবস্থায় আছে।`,
      ],
      targetTab: 'MealSheet',
      tabLabel: 'Open Meal Sheet',
      bnTabLabel: 'মিল শিট খুলুন',
      aiPrompt: 'How do meal weights, guest meals, and the daily meal cutoff time work for my account?',
      bnAiPrompt: 'আমার অ্যাকাউন্টে মিলের হিসাব, অতিথি মিল ও ডেইলি লক টাইম কীভাবে কাজ করে?',
    },
    {
      id: 'mem-bazaar',
      icon: ShoppingBag,
      title: '2. Bazaar Duty & AI Receipt Scanning',
      bnTitle: '২. বাজারের দায়িত্ব ও AI রসিদ স্ক্যান',
      summary: 'Check assigned buyers, upload or capture your receipt photo, and let AI auto-fill item details.',
      bnSummary: 'কার কার বাজার করার কথা দেখুন, রসিদের ছবি আপলোড বা ক্যামেরায় তুলে AI দিয়ে অটো-ফিল করে খরচ জমা দিন।',
      steps: [
        'Open Bazaar Log to see who is currently assigned for mess shopping.',
        'Click "Create Bazaar Entry", then choose Upload Photo or Take Photo to attach the receipt.',
        'Tap "AI Scan Receipt" on the attached photo preview to auto-fill items, quantity, unit, price, and notes.',
        'Submitted claims stay Pending until the Meal Manager or Admin approves them.',
      ],
      bnSteps: [
        'Bazaar Log ট্যাবে গিয়ে দেখুন বর্তমানে বাজারের দায়িত্বে কারা আছেন (আপনার দায়িত্ব হলে নোটিফিকেশন পাবেন)।',
        '"নতুন বাজার খরচ" এ ক্লিক করে গ্যালারি থেকে Upload বা Camera দিয়ে Take Photo করে রসিদের ছবি দিন।',
        'ছবির পাশে থাকা "AI রসিদ স্ক্যান (Auto-Fill)" বাটনে ক্লিক করলে আইটেম, পরিমাণ ও দাম অটো-ফিল হয়ে যাবে।',
        'সাবমিট করার পর ম্যানেজার/অ্যাডমিন অনুমোদন করলে তা মাসিক হিসেবে যুক্ত হবে।',
      ],
      targetTab: 'Bazaar',
      tabLabel: 'Go to Bazaar Log',
      bnTabLabel: 'বাজার লগ দেখুন',
      aiPrompt: 'How do I submit a bazaar receipt using the camera and AI receipt scanner?',
      bnAiPrompt: 'ক্যামেরা ও AI রসিদ স্ক্যানার ব্যবহার করে আমি কীভাবে বাজারের খরচ সাবমিট করব?',
    },
    {
      id: 'mem-deposit',
      icon: Coins,
      title: '3. Deposits, Dues Banner & bKash/Nagad Pay',
      bnTitle: '৩. ডিপোজিট জমা, বকেয়া সতর্কতা ও বিকাশ/নগদ',
      summary: 'Monitor your live balance, copy bKash/Nagad mess numbers in 1 click, and submit deposit claims.',
      bnSummary: 'আপনার লাইভ ব্যালেন্স দেখুন, ১-ক্লিকে বিকাশ/নগদ নম্বর কপি করে টাকা পাঠান এবং ডিপোজিট রিকোয়েস্ট দিন।',
      steps: [
        'If your balance goes negative, a Quick Due Banner appears on Dashboard and Deposits with payable amount.',
        'Copy the mess bKash or Nagad number directly from the banner and send money.',
        'Click "Pay via bKash / Nagad" or "Request Deposit", enter your Transaction ID, and submit for approval.',
      ],
      bnSteps: [
        'আপনার ব্যালেন্স নেগেটিভ (বকেয়া) হলে ড্যাশবোর্ড ও ডিপোজিট পেজে লাল/কমলা বকেয়া ব্যানার দেখাবে।',
        'ব্যানার থেকে ১-ক্লিকে মেসের বিকাশ বা নগদ নম্বর কপি করে টাকা পাঠান।',
        '"bKash জমা" বা "Nagad জমা" বাটনে ক্লিক করে ট্রানজেকশন আইডি (TrxID) সহ রিকোয়েস্ট পাঠান।',
      ],
      targetTab: 'Deposits',
      tabLabel: 'Open Deposits',
      bnTabLabel: 'ডিপোজিট ট্যাবে যান',
      aiPrompt: 'My mess balance shows a due amount. How is it calculated and how do I pay via bKash/Nagad?',
      bnAiPrompt: 'আমার ব্যালেন্স বকেয়া দেখাচ্ছে—এটা কীভাবে হিসাব হয় এবং বিকাশ/নগদে কীভাবে জমা দেব?',
    },
    {
      id: 'mem-reports',
      icon: FilePieChart,
      title: '4. Monthly Reports, Bill Slip & Notifications',
      bnTitle: '৪. মাসিক রিপোর্ট, বিল স্লিপ ও নোটিফিকেশন',
      summary: 'View the live meal rate, inspect your daily meal history, and copy/share your bill slip.',
      bnSummary: 'লাইভ মিল রেট, আপনার প্রতিদিনের মিলের খতিয়ান এবং ১-ক্লিকে মাসিক বিল স্লিপ কপি/শেয়ার করুন।',
      steps: [
        'Live Meal Rate = (Approved Bazaar + Utility Overheads) ÷ Total Mess Meals.',
        'Open Reports → Member Detail to check your Carry Forward, Deposits, Meal Bill, and Net Balance.',
        'Open Activity Log anytime to review your own personal logins, meal edits, bazaar entries, and deposits.',
        'Click the top-right Palette icon anytime for your personal theme, or the Bell icon for alerts.',
      ],
      bnSteps: [
        'মিল রেট = (অনুমোদিত বাজার খরচ + অন্যান্য বিল) ÷ মেসের মোট মিল।',
        'Reports → ব্যক্তিগত খতিয়ান-এ গিয়ে আপনার আগের জের, জমা, বিল এবং চূড়ান্ত হিসাব দেখুন।',
        '"বিল স্লিপ কপি" বা "হোয়াটসঅ্যাপে পাঠান" বাটন দিয়ে পুরো হিসাবের স্লিপ সংরক্ষণ করুন।',
        'Activity Log থেকে শুধু আপনার নিজের লগইন, মিল, বাজার ও ডিপোজিটের ইতিহাস দেখতে পারবেন; এছাড়া উপরে Palette (থিম) ও Bell (নোটিফিকেশন) রয়েছে।',
      ],
      targetTab: 'Reports',
      tabLabel: 'View Reports',
      bnTabLabel: 'রিপোর্ট দেখুন',
      aiPrompt: 'Explain how my monthly bill and carry forward balance are calculated.',
      bnAiPrompt: 'আমার মাসিক বিল ও আগের জের (Carry Forward) কীভাবে হিসাব করা হয় বুঝিয়ে দাও।',
    },
  ];

  const managerManualSections: ManualSection[] = [
    {
      id: 'mgr-approvals',
      icon: CheckCircle2,
      title: '1. Verifying Bazaar Claims & Deposit Requests',
      bnTitle: '১. বাজার খরচ ও ডিপোজিট রিকোয়েস্ট অনুমোদন',
      summary: 'Review member-submitted bazaar receipts and mobile banking deposits before they affect meal rate.',
      bnSummary: 'সদস্যদের জমা দেওয়া বাজারের রসিদ ও বিকাশ/নগদ ডিপোজিট যাচাই করে অনুমোদন বা বাতিল করুন।',
      badge: pendingBazaarCount + pendingDepositsCount > 0 ? `${pendingBazaarCount + pendingDepositsCount} Pending` : undefined,
      steps: [
        `Bazaar approval permission is currently ${settings.mgrCanApproveBazaar !== false ? 'ENABLED' : 'RESTRICTED by Admin'}.`,
        'Open Bazaar Log to inspect receipt photos (zoom in by clicking the thumbnail) and Approve/Reject pending claims.',
        `Deposit approval permission is currently ${settings.mgrCanAddDeposit !== false ? 'ENABLED' : 'RESTRICTED by Admin'}.`,
        'In Deposits, verify Transaction IDs against your bKash/Nagad SMS before approving.',
      ],
      bnSteps: [
        `বাজার অনুমোদন পারমিশন বর্তমানে ${settings.mgrCanApproveBazaar !== false ? 'চালু আছে' : 'অ্যাডমিন কর্তৃক সীমাবদ্ধ'}।`,
        'Bazaar Log-এ পেন্ডিং খরচের রসিদ ছবি বড় করে দেখে Approve বা Reject করুন।',
        `ডিপোজিট অনুমোদন পারমিশন বর্তমানে ${settings.mgrCanAddDeposit !== false ? 'চালু আছে' : 'অ্যাডমিন কর্তৃক সীমাবদ্ধ'}।`,
        'Deposits ট্যাবে সদস্যদের TrxID যাচাই করে Approve দিলে ব্যালেন্সে যোগ হবে।',
      ],
      targetTab: 'Bazaar',
      tabLabel: 'Review Pending Queue',
      bnTabLabel: 'পেন্ডিং তালিকা দেখুন',
      aiPrompt: 'What should I verify before approving pending bazaar claims and bKash/Nagad deposits?',
      bnAiPrompt: 'পেন্ডিং বাজার খরচ ও বিকাশ/নগদ ডিপোজিট অনুমোদনের আগে আমার কী কী যাচাই করা উচিত?',
    },
    {
      id: 'mgr-bazaar-rotate',
      icon: ShoppingBag,
      title: '2. Bazaar Duty Assignment & Smart Auto-Rotation',
      bnTitle: '২. বাজারের দায়িত্ব বণ্টন ও স্মার্ট অটো-রোটেশন',
      summary: 'Assign buyers manually or use 1-click Auto-Rotate to cycle duties fairly across active members.',
      bnSummary: 'ম্যানুয়ালি বাজারকারী নির্ধারণ করুন অথবা ১-ক্লিকে Auto-Rotate দিয়ে পর্যায়ক্রমে সবার দায়িত্ব দিন।',
      steps: [
        'In Bazaar Log → Assigned Bazaar Buyers, click "Auto-Rotate" to advance duty to the next active member(s).',
        'Updating or rotating assignments automatically notifies the selected buyers in their Notification Center.',
        'Click "Send Reminder" anytime to push an extra alert for tomorrow’s shopping.',
      ],
      bnSteps: [
        'Bazaar Log → বাজারের দায়িত্বপ্রাপ্ত সদস্য অংশে "অটো রোটেশন" ক্লিক করলে পরের সক্রিয় মেম্বাররা দায়িত্ব পাবে।',
        'দায়িত্ব পরিবর্তন বা রোটেশন করলে নির্বাচিত সদস্যদের কাছে সাথে সাথে নোটিফিকেশন চলে যাবে।',
        'প্রয়োজনে "Send Reminder" বাটনে ক্লিক করে অতিরিক্ত রিমাইন্ডার পাঠাতে পারবেন।',
      ],
      targetTab: 'Bazaar',
      tabLabel: 'Manage Bazaar Duties',
      bnTabLabel: 'বাজারের দায়িত্ব দেখুন',
      aiPrompt: 'How does Smart Bazaar Auto-Rotation choose the next buyers and notify them?',
      bnAiPrompt: 'স্মার্ট বাজার অটো-রোটেশন কীভাবে পরবর্তী সদস্য নির্বাচন করে এবং নোটিফিকেশন পাঠায়?',
    },
    {
      id: 'mgr-meals-expenses',
      icon: Utensils,
      title: '3. Meal Overrides, Adjustments & Utility Bills',
      bnTitle: '৩. মিল ওভাররাইড, অ্যাডজাস্টমেন্ট ও ইউটিলিটি বিল',
      summary: 'Edit any member’s meal even after cutoff, record gas/electricity/maid bills, and pin notices.',
      bnSummary: 'লক টাইমের পরও যেকোনো মেম্বারের মিল সংশোধন করুন, গ্যাস/বিদ্যুৎ/বুয়া বিল লিখুন ও নোটিশ দিন।',
      steps: [
        'On Dashboard or Meal Sheet, select any active member from the dropdown to adjust tomorrow’s meals.',
        'In Meal Sheet, you can apply manager adjustments with a reason for past discrepancies.',
        `Record Gas, Electricity, Water, Internet, or Maid expenses in Utilities & Bills (${settings.mgrCanAddExpense !== false ? 'Enabled' : 'Restricted'}).`,
        'Use Notice Board to publish mess announcements and pin urgent updates to the Dashboard.',
      ],
      bnSteps: [
        'ড্যাশবোর্ড বা মিল শিটে ড্রপডাউন থেকে যেকোনো সদস্যের মিল চালু/বন্ধ বা অতিথি মিল সমন্বয় করতে পারবেন।',
        'মিল শিটে প্রয়োজনে কারণসহ Manager Adjustment যোগ করা যাবে।',
        `গ্যাস, বিদ্যুৎ, ইন্টারনেট বা বুয়া বিল "বিল ও খরচ" ট্যাবে যোগ করুন (${settings.mgrCanAddExpense !== false ? 'অনুমোদিত' : 'সীমাবদ্ধ'})।`,
        'জরুরি ঘোষণা নোটিশ বোর্ডে পিন (Pin) করে ড্যাশবোর্ডে শীর্ষে দেখাতে পারবেন।',
      ],
      targetTab: 'MealSheet',
      tabLabel: 'Open Meal Sheet',
      bnTabLabel: 'মিল শিট পরিচালনা',
      aiPrompt: 'Give me best practices as a Meal Manager to keep daily meal counts and utility expenses accurate.',
      bnAiPrompt: 'মিল ম্যানেজার হিসেবে প্রতিদিনের মিল ও ইউটিলিটি হিসাব নির্ভুল রাখার সেরা নিয়মগুলো কী?',
    },
    {
      id: 'mgr-reports',
      icon: FilePieChart,
      title: '4. Sharing Bill Slips & Monitoring Audit Logs',
      bnTitle: '৪. বিল স্লিপ শেয়ার ও অ্যাক্টিভিটি লগ পর্যবেক্ষণ',
      summary: 'Send 1-click WhatsApp/copied bill slips to members and inspect audit history.',
      bnSummary: 'সদস্যদের ১-ক্লিকে WhatsApp বা কপি করা মাসিক বিল স্লিপ পাঠান এবং অডিট লগ দেখুন।',
      steps: [
        'Open Reports → Monthly Summary and click the Copy or WhatsApp icon on any member row.',
        'Use Excel / CSV or Print / PDF buttons for month-end mess meetings.',
        'Check Activity Log to track every meal change, deposit, bazaar approval, and duty update.',
      ],
      bnSteps: [
        'Reports → সবার হিসাব (মাসিক) টেবিলের ডানপাশে থাকা Copy বা WhatsApp আইকনে ক্লিক করে স্লিপ পাঠান।',
        'মাস শেষে মিটিংয়ের জন্য Excel / CSV বা Print / PDF ডাউনলোড করতে পারবেন।',
        'Activity Log থেকে কে কখন মিল, ডিপোজিট বা বাজার পরিবর্তন করেছে তার বিস্তারিত ইতিহাস দেখুন।',
      ],
      targetTab: 'Reports',
      tabLabel: 'Open Reports & Slips',
      bnTabLabel: 'রিপোর্ট ও বিল স্লিপ',
      aiPrompt: 'How do I export monthly reports and share WhatsApp bill slips with members?',
      bnAiPrompt: 'মাসিক রিপোর্ট এক্সপোর্ট এবং মেম্বারদের WhatsApp-এ বিল স্লিপ কীভাবে পাঠাব?',
    },
  ];

  const adminManualSections: ManualSection[] = [
    {
      id: 'adm-config',
      icon: SettingsIcon,
      title: '1. Global Mess Configuration & bKash/Nagad Setup',
      bnTitle: '১. গ্লোবাল মেস সেটিংস ও বিকাশ/নগদ সেটআপ',
      summary: 'Configure mess name, daily meal lock time, language, currency, and mobile payment numbers.',
      bnSummary: 'মেসের নাম, ডেইলি মিল লক টাইম, ভাষা, মুদ্রা ও মেসের বিকাশ/নগদ নম্বর সেট করুন।',
      steps: [
        'Go to Settings → General Configuration to update Mess Name, Daily Meal Lock Time (12h), Currency, and Max Guest Meals.',
        'Set your mess bKash Number, Nagad Number, and Payment Note—members with dues see them automatically.',
        'Toggle "Default Meal Reservation Status (AUTO-ON)" to decide whether active members default to Meal ON daily.',
      ],
      bnSteps: [
        'Settings → সাধারণ সেটিংস থেকে মেসের নাম, মিল লক টাইম, মুদ্রা ও সর্বোচ্চ অতিথি মিল নির্ধারণ করুন।',
        'বিকাশ নম্বর, নগদ নম্বর ও পেমেন্ট নোট সেট করলে বকেয়া মেম্বারদের ড্যাশবোর্ডে দ্রুত পরিশোধ ব্যানার দেখাবে।',
        '"ডিফল্ট মিল রিজার্ভেশন চালু রাখুন" টগল দিয়ে দৈনিক অটো-অন মিল পলিসি নিয়ন্ত্রণ করুন।',
      ],
      targetTab: 'Settings',
      tabLabel: 'Open Settings',
      bnTabLabel: 'সেটিংস খুলুন',
      aiPrompt: 'What Settings should an Admin configure first when launching a new mess cycle?',
      bnAiPrompt: 'নতুন মেস পরিচালনার শুরুতে অ্যাডমিন হিসেবে Settings-এ কোন অপশনগুলো আগে সেট করা উচিত?',
    },
    {
      id: 'adm-roles',
      icon: Users,
      title: '2. Member Registry, Manager Permissions & Persona Preview',
      bnTitle: '২. সদস্য পরিচালনা, ম্যানেজার পারমিশন ও প্রিভিউ',
      summary: 'Control member roles, toggle what Meal Managers can do, and preview any member account.',
      bnSummary: 'সদস্যদের রোল নির্ধারণ, ম্যানেজারের ক্ষমতা নিয়ন্ত্রণ এবং মেম্বার ভিউ প্রিভিউ করুন।',
      steps: [
        'In Members tab, add new members, update phone numbers (used for WhatsApp slips), promote Meal Managers, or toggle active status.',
        'In Settings → Manager Permissions Panel, toggle whether Meal Managers can Approve Bazaar, Add Deposits, Add Expenses, Manage Users, or Publish Notices.',
        'Use "Switch Member View" at the bottom of the sidebar to preview the app as any Member or Meal Manager.',
      ],
      bnSteps: [
        'Members ট্যাবে নতুন সদস্য যোগ, ফোন নম্বর আপডেট (WhatsApp-এর জন্য), ও Meal Manager নিয়োগ করুন।',
        'Settings → ম্যানেজার অ্যাক্সেস পারমিশন থেকে ম্যানেজার কী কী করতে পারবেন তা চালু/বন্ধ করুন।',
        'সাইডবারের নিচে "মেম্বার প্রিভিউ" ড্রপডাউন দিয়ে যেকোনো মেম্বার বা ম্যানেজারের অ্যাকাউন্ট প্রিভিউ করুন।',
      ],
      targetTab: 'Users',
      tabLabel: 'Manage Members',
      bnTabLabel: 'মেম্বার তালিকা খুলুন',
      aiPrompt: 'How should I configure Meal Manager permissions and safely manage inactive members?',
      bnAiPrompt: 'মিল ম্যানেজারের পারমিশন কীভাবে সেট করব এবং নিষ্ক্রিয় সদস্যদের হিসাব কীভাবে ম্যানেজ করব?',
    },
    {
      id: 'adm-closing',
      icon: Calendar,
      title: '3. Month Closing, Carry-Forward Rollover & Backups',
      bnTitle: '৩. মাস ক্লোজিং, ক্যারী ফরওয়ার্ড রোলওভার ও ব্যাকআপ',
      summary: 'Lock the month-end ledger, archive snapshots, carry balances forward, and export full JSON backups.',
      bnSummary: 'মাস শেষে হিসাব লক করুন, ব্যালেন্স পরবর্তী মাসে ক্যারী ফরওয়ার্ড করুন ও সম্পূর্ণ ডাটাবেস ব্যাকআপ রাখুন।',
      steps: [
        'Before closing a month, verify all Pending Bazaar claims and Pending Deposits are resolved.',
        'In Reports or Settings, close the billing month or roll over to the next month with "Carry Forward" enabled so member surplus/dues transfer cleanly.',
        'Closed months remain viewable as read-only archives in Reports.',
        'Download full JSON snapshots in Settings → Database Backup & Restore before major changes.',
      ],
      bnSteps: [
        'মাস ক্লোজ করার আগে সব পেন্ডিং বাজার এবং পেন্ডিং ডিপোজিট অনুমোদন বা নিষ্পত্তি নিশ্চিত করুন।',
        'Reports বা Settings থেকে মাস ক্লোজ করুন বা Carry Forward সহ পরের মাসে রোলওভার করুন।',
        'ক্লোজ হওয়া মাসগুলো Reports থেকে রিড-অনলি আর্কাইভ হিসেবে দেখা যাবে।',
        'Settings → ব্যাকআপ থেকে নিয়মিত পূর্ণ JSON ব্যাকআপ ডাউনলোড ও প্রয়োজনে রিস্টোর করুন।',
      ],
      targetTab: 'Reports',
      tabLabel: 'Month Closing & Reports',
      bnTabLabel: 'মাস ক্লোজিং ও রিপোর্ট',
      aiPrompt: 'Walk me through the safest checklist for closing a billing month and carrying forward balances.',
      bnAiPrompt: 'মাস ক্লোজ করা এবং ব্যালেন্স পরের মাসে ক্যারী ফরওয়ার্ড করার নিরাপদ ধাপগুলো কী কী?',
    },
    {
      id: 'adm-audit',
      icon: ShieldCheck,
      title: '4. Audit Trail, Notifications & AI Tools',
      bnTitle: '৪. অডিট লগ, নোটিফিকেশন ও AI টুলস',
      summary: 'Track every financial edit with IP/device metadata and leverage AI Receipt Scanning & Mess Assistant.',
      bnSummary: 'প্রতিটি পরিবর্তনের অডিট ট্রেল পর্যবেক্ষণ করুন এবং AI রসিদ স্ক্যানার ও সহায়ক ব্যবহার করুন।',
      steps: [
        'Every login, meal edit, deposit, bazaar approval, and role transition is recorded in Activity Log.',
        'Use the Notification Center (top-right Bell) to broadcast meal, bazaar, or deposit due reminders.',
        'Encourage buyers to use Bazaar AI Receipt Scan to speed up entry and reduce manual typos.',
      ],
      bnSteps: [
        'লগইন, মিল পরিবর্তন, ডিপোজিট, বাজার অনুমোদন ও রোল পরিবর্তনের প্রতিটি রেকর্ড Activity Log-এ সংরক্ষিত থাকে।',
        'উপরের Bell আইকনে থাকা Notification Center থেকে সবাইকে মিল, বাজার বা বকেয়ার রিমাইন্ডার পাঠান।',
        'দ্রুত ও নির্ভুল বাজার এন্ট্রির জন্য AI রসিদ স্ক্যানার ব্যবহার করুন।',
      ],
      targetTab: 'AuditLogs',
      tabLabel: 'View Activity Log',
      bnTabLabel: 'অ্যাক্টিভিটি লগ দেখুন',
      aiPrompt: 'Analyze our current mess numbers and suggest improvements for fairness and cost efficiency.',
      bnAiPrompt: 'আমাদের বর্তমান মেসের হিসাব বিশ্লেষণ করে খরচ কমানো ও ব্যবস্থাপনা উন্নতির পরামর্শ দাও।',
    },
  ];

  const activeSections =
    role === 'Admin'
      ? adminManualSections
      : role === 'Meal Manager'
      ? managerManualSections
      : memberManualSections;

  // AI Assistant state
  const welcomeMessage: ChatMessage = {
    id: 'ai-welcome',
    role: 'assistant',
    content: isBangla
      ? `হ্যালো ${currentUser.name}! আমি আপনার মেস ম্যানেজমেন্ট AI সহায়ক। আপনার বর্তমান রোল (${role}) এবং ${activeMonthLabel} মাসের লাইভ হিসাব অনুযায়ী এই ওয়েব অ্যাপ ব্যবহার, মিল রেট, বকেয়া, বাজার রোটেশন বা মেস পরিচালনা বিষয়ে যেকোনো প্রশ্ন বা পরামর্শ চাইতে পারেন।`
      : `Hi ${currentUser.name}! I'm your Mess Management AI Assistant. Based on your ${role} account and live ${activeMonthLabel} mess data, ask me anything about using the app, meal calculations, bazaar rotation, deposits, or tips to manage your mess better.`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (subView === 'ai') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, subView]);

  const suggestedQuestions =
    role === 'Admin'
      ? isBangla
        ? [
            'নতুন মাস চালু ও ক্যারী ফরওয়ার্ড কীভাবে করব?',
            'আমাদের বর্তমান মিল রেট ও খরচ বিশ্লেষণ করে পরামর্শ দাও',
            'ম্যানেজার পারমিশন এবং বিকাশ/নগদ নম্বর কোথায় সেট করব?',
            'মিল লক টাইম ও ডিফল্ট মিল পলিসি কীভাবে কাজ করে?',
          ]
        : [
            'How do I close this month and carry forward balances?',
            'Analyze our current meal rate and suggest cost tips',
            'Where do I configure bKash/Nagad and Manager permissions?',
            'How does the Member View switcher work?',
          ]
      : role === 'Meal Manager'
      ? isBangla
        ? [
            'পেন্ডিং বাজার ও ডিপোজিট অনুমোদন করার সঠিক নিয়ম কী?',
            'বাজারের দায়িত্ব অটো-রোটেশন কীভাবে কাজ করে?',
            'সদস্যদের WhatsApp-এ মাসিক বিল স্লিপ কীভাবে পাঠাব?',
            'আমাদের বর্তমান মিল রেট কমাতে কী পরামর্শ দেবে?',
          ]
        : [
            'What should I check before approving Bazaar & Deposits?',
            'How does Bazaar Auto-Rotation work?',
            'How do I send WhatsApp bill slips to members?',
            'Any advice to manage utility bills and meal rate fairly?',
          ]
      : isBangla
      ? [
          'আমার বর্তমান মিল, বিল ও বকেয়া হিসাব বুঝিয়ে দাও',
          'বিকাশ/নগদে কীভাবে দ্রুত বকেয়া জমা দেব?',
          'রসিদের ছবি তুলে AI দিয়ে কীভাবে বাজার খরচ এন্ট্রি দেব?',
          'ছুটিতে থাকলে মিল কীভাবে অটো বন্ধ রাখব?',
        ]
      : [
          'Explain my current meals, bill, and balance',
          'How do I submit a bKash/Nagad deposit for my due?',
          'How does AI Receipt Scanner auto-fill bazaar entries?',
          'How do I pause my meals using Vacation Mode?',
        ];

  const handleSendPrompt = async (promptText?: string) => {
    const query = (promptText ?? inputText).trim();
    if (!query || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!promptText) setInputText('');
    setIsSending(true);
    setStreamingId(null);

    const assistantMsgId = `ai-${Date.now()}`;

    try {
      const apiMessages = nextHistory
        .filter(m => !m.isError && m.id !== 'ai-welcome')
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }));

      const baseContext: Record<string, unknown> = {
        userName: currentUser.name,
        role,
        language: settings.language,
        messName: settings.systemName,
        activeMonth: activeMonthLabel,
        currency,
        isMonthClosed: settings.isMonthClosed,
        mealLockTime: lockTimeDisplay,
        defaultMealOn: settings.defaultMealOn,
        guestMealLimit: settings.guestMealLimit,
        hasBkash: Boolean(settings.bkashNumber?.trim()),
        hasNagad: Boolean(settings.nagadNumber?.trim()),
        currentMealRate: Number(currentMealRate.toFixed(2)),
        myTotalMeals: Number(myTotalMeals.toFixed(1)),
        myEstimatedBill: Number(myEstimatedBill.toFixed(2)),
        myApprovedDeposits: Number(myApprovedDeposits.toFixed(2)),
        myCarryForward: Number((currentUser.carryForward || 0).toFixed(2)),
        myBalance: Number(myBalance.toFixed(2)),
        assignedBazaarBuyers: assignedBuyersNames,
      };

      const roleScopedContext: Record<string, unknown> =
        role === 'Member'
          ? baseContext
          : {
              ...baseContext,
              activeMembersCount: activeUsers.length,
              totalMessMeals: Number(totalMessMeals.toFixed(1)),
              totalMessExpense: Number(totalMessExpense.toFixed(2)),
              pendingBazaarCount,
              pendingDepositsCount,
              managerPermissions: {
                approveBazaar: settings.mgrCanApproveBazaar !== false,
                addDeposit: settings.mgrCanAddDeposit !== false,
                addExpense: settings.mgrCanAddExpense !== false,
                manageUsers: Boolean(settings.mgrCanManageUsers),
                publishNotice: settings.mgrCanPublishNotice !== false,
              },
              ...(role === 'Admin' && adminSummary ? { adminSummary } : {}),
            };

      const resp = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          stream: true,
          messages: apiMessages,
          context: roleScopedContext,
        }),
      });

      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok) {
        const errPayload = await resp.json().catch(() => ({}));
        throw new Error(errPayload?.error || `AI request failed (HTTP ${resp.status})`);
      }

      if (contentType.includes('text/event-stream') && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';
        let createdBubble = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            const line = rawEvent
              .split('\n')
              .find(l => l.startsWith('data:'));
            if (!line) continue;

            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            const evt = JSON.parse(jsonStr) as { chunk?: string; done?: boolean; error?: string };
            if (evt.error) {
              throw new Error(evt.error);
            }
            if (evt.chunk) {
              accumulated += evt.chunk;
              if (!createdBubble) {
                createdBubble = true;
                setStreamingId(assistantMsgId);
                setMessages(prev => [
                  ...prev,
                  { id: assistantMsgId, role: 'assistant', content: accumulated },
                ]);
              } else {
                setMessages(prev =>
                  prev.map(m => (m.id === assistantMsgId ? { ...m, content: accumulated } : m))
                );
              }
            }
          }
        }

        if (!accumulated.trim()) {
          throw new Error('AI returned an empty response.');
        }
      } else {
        const payload = await resp.json().catch(() => ({}));
        if (!payload?.reply) {
          throw new Error(payload?.error || 'AI returned an empty response.');
        }
        setMessages(prev => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: String(payload.reply),
          },
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== assistantMsgId),
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          isError: true,
          content:
            err?.message ||
            (isBangla
              ? 'AI সহায়কের সাথে সংযোগ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
              : 'Could not reach the AI assistant. Please try again.'),
        },
      ]);
    } finally {
      setIsSending(false);
      setStreamingId(null);
    }
  };

  const handleAskFromManual = (prompt: string) => {
    setSubView('ai');
    handleSendPrompt(prompt);
  };

  const getRoleBadgeIcon = (r: UserRole) => {
    if (r === 'Admin') return <ShieldCheck size={14} />;
    if (r === 'Meal Manager') return <UserCheck size={14} />;
    return <UserIcon size={14} />;
  };

  return (
    <div className="space-y-6" id="help-guide-tab">
      {/* HEADER + SUB-VIEW SWITCHER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            {subView === 'manual' ? <BookOpen size={22} /> : <Bot size={22} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isBangla ? 'ব্যবহার নির্দেশিকা ও AI সহায়ক' : 'User Manual & AI Assistant'}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-bold">
                {getRoleBadgeIcon(role)}
                <span>
                  {role} {isBangla ? 'গাইড' : 'Guide'}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isBangla
                ? 'আপনার অ্যাকাউন্ট রোল অনুযায়ী সম্পূর্ণ ব্যবহারবিধি দেখুন অথবা AI সহায়কের কাছ থেকে যেকোনো সাহায্য ও পরামর্শ নিন।'
                : 'Role-tailored step-by-step manual for your account plus an AI assistant for instant help and mess advice.'}
            </p>
          </div>
        </div>

        {/* TOP SUB-TABS */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setSubView('manual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition ${
              subView === 'manual'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen size={15} />
            <span>{isBangla ? 'ইউজার ম্যানুয়াল' : 'User Manual'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('ai')}
            className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition ${
              subView === 'ai'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={15} />
            <span>{isBangla ? 'AI সহায়ক' : 'AI Assistant'}</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SUB-VIEW 1: ROLE-BASED USER MANUAL */}
      {/* =================================================================== */}
      {subView === 'manual' && (
        <div className="space-y-5">
          {/* LIVE ACCOUNT SNAPSHOT */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                {isBangla ? 'চলতি মাস:' : 'Month:'} {activeMonthLabel}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                {isBangla ? 'মিল লক:' : 'Lock:'} {lockTimeDisplay}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                {isBangla ? 'মিল রেট:' : 'Meal Rate:'} {currency}
                {currentMealRate.toFixed(2)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold">
                {isBangla ? 'অতিথি সীমা:' : 'Guest Limit:'} {settings.guestMealLimit}/slot
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
              {getRoleBadgeIcon(role)}
              <span>
                {isBangla ? `শুধু ${role} অ্যাকাউন্ট গাইড` : `${role} Account Only`}
              </span>
            </span>
          </div>

          {/* MANUAL CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeSections.map(section => {
              const Icon = section.icon;
              const title = isBangla ? section.bnTitle : section.title;
              const summary = isBangla ? section.bnSummary : section.summary;
              const steps = isBangla ? section.bnSteps : section.steps;
              const tabLabel = isBangla ? section.bnTabLabel : section.tabLabel;
              const aiPrompt = isBangla ? section.bnAiPrompt : section.aiPrompt;

              return (
                <div
                  key={section.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Icon size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                            {title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {summary}
                          </p>
                        </div>
                      </div>
                      {section.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold shrink-0">
                          {section.badge}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 pt-1">
                      {steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                        >
                          <span className="w-4.5 h-4.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleAskFromManual(aiPrompt)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Sparkles size={12} />
                      <span>{isBangla ? 'AI-কে জিজ্ঞাসা করুন' : 'Ask AI'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateTab(section.targetTab)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <span>{tabLabel}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA TO OPEN AI ASSISTANT */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-emerald-500/10 to-sky-500/10 border border-indigo-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
                <Lightbulb size={18} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {isBangla ? 'আরও কোনো প্রশ্ন বা পরামর্শ দরকার?' : 'Need tailored help or mess advice?'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {isBangla
                    ? 'AI সহায়ককে বাংলা, বাংলিশ বা ইংরেজিতে যেকোনো প্রশ্ন করুন—অ্যাপের নিয়ম থেকে শুরু করে হিসাব ও খরচ কমানোর পরামর্শ পাবেন।'
                    : 'Chat with the Mess AI Assistant in Bangla, Banglish, or English for instant app help or smart mess advice.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubView('ai')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer transition shrink-0 shadow-sm"
            >
              <Bot size={15} />
              <span>{isBangla ? 'AI চ্যাট শুরু করুন' : 'Open AI Assistant'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-VIEW 2: LIVE AI ASSISTANT CHAT */}
      {/* =================================================================== */}
      {subView === 'ai' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Chat Header + Quick Prompts */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bot size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {isBangla ? 'স্মার্ট মেস AI সহায়ক' : 'Smart Mess AI Assistant'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBangla
                      ? `${role} কনটেক্সট সংযুক্ত · বাংলা / Banglish / English সাপোর্টেড`
                      : `Connected to ${role} context · Supports English, Bangla & Banglish`}
                  </p>
                </div>
              </div>

              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMessages([welcomeMessage])}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <Trash2 size={13} />
                  <span>{isBangla ? 'চ্যাট ক্লিয়ার' : 'Clear Chat'}</span>
                </button>
              )}
            </div>

            {/* Suggested Prompt Chips */}
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSendPrompt(q)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  <HelpCircle size={12} className="text-indigo-500 shrink-0" />
                  <span className="text-left">{q}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[460px] min-h-[300px] overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30">
            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.isError
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {msg.isError ? <AlertCircle size={15} /> : <Bot size={15} />}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-emerald-600 text-white font-medium rounded-tr-sm'
                        : msg.isError
                        ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-tl-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {isSending && !streamingId && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                  {isBangla ? 'উত্তর তৈরি হচ্ছে...' : 'Thinking...'}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Composer */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={isSending}
              placeholder={
                isBangla
                  ? 'এই ওয়েব অ্যাপ বা মেস হিসাব নিয়ে যেকোনো প্রশ্ন লিখুন...'
                  : 'Ask anything about this app or mess management...'
              }
              className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition shrink-0"
            >
              {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span className="hidden sm:inline">{isBangla ? 'পাঠান' : 'Send'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
