import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Coins, 
  User, 
  Calendar, 
  CreditCard, 
  FileText, 
  Hash, 
  ArrowUpRight,
  Filter,
  CheckCircle,
  X,
  Trash2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Save,
  Clock,
  ArrowDownRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { User as UserType, Deposit, SystemSettings, MemberMealSheet, BazaarEntry, Expense } from '../types';
import { motion } from 'motion/react';
import { useFeedback } from './FeedbackContext';

interface DepositTabProps {
  currentUser: UserType;
  role: 'Admin' | 'Meal Manager' | 'Member';
  allUsers: UserType[];
  deposits: Deposit[];
  onAddDeposit: (deposit: Omit<Deposit, 'id'>) => void;
  onDeleteDeposit: (id: string) => void;
  onApproveDeposit: (id: string, status: 'Approved' | 'Rejected') => void;
  onUpdateUser: (user: UserType) => void;
  meals: MemberMealSheet[];
  bazaarEntries: BazaarEntry[];
  expenses: Expense[];
  settings: SystemSettings;
}

export default function DepositTab({
  currentUser,
  role,
  allUsers,
  deposits,
  onAddDeposit,
  onDeleteDeposit,
  onApproveDeposit,
  onUpdateUser,
  meals,
  bazaarEntries,
  expenses,
  settings
}: DepositTabProps) {

  const isManagerOrAdmin = role === 'Admin' || (role === 'Meal Manager' && settings.mgrCanAddDeposit !== false);
  const isBangla = settings.language === 'Bangla';

  const { showToast, showConfirm } = useFeedback();

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [memberFilter, setMemberFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // New Deposit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    userId: currentUser.role === 'Member' ? currentUser.id : '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Cash' as 'Cash' | 'bKash' | 'Nagad' | 'Bank',
    transactionId: '',
    note: ''
  });

  // Carry Forward Editing State
  const [editingCarryForwardUserId, setEditingCarryForwardUserId] = useState<string | null>(null);
  const [carryForwardInput, setCarryForwardInput] = useState<string>('');

  // -------------------------------------------------------------------
  // SYSTEM FINANCIAL MATH ENGINE
  // -------------------------------------------------------------------
  
  // Total approved bazaar costs
  const totalBazaarCost = bazaarEntries
    .filter(entry => entry.status === 'Approved')
    .reduce((sum, entry) => sum + entry.price, 0);

  // Overhead expenses
  const totalOtherExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalExpenses = totalBazaarCost + totalOtherExpense;

  // Total meals consumed across the mess
  const totalMealsInMonth = meals.reduce((sum, sheet) => {
    let sheetSum = 0;
    Object.keys(sheet.meals).forEach(date => {
      const m = sheet.meals[date];
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = (m.guestBreakfast * 0.5) + (m.guestLunch * 1.0) + (m.guestDinner * 1.0);
      sheetSum += own + guest;
    });
    return sum + sheetSum;
  }, 0) || 1;

  // Live meal rate
  const currentMealRate = totalExpenses / totalMealsInMonth;

  // -------------------------------------------------------------------
  // MEMBER-SPECIFIC CALCULATIONS
  // -------------------------------------------------------------------
  
  const getUserMealsCount = (userId: string) => {
    const sheet = meals.find(s => s.userId === userId);
    if (!sheet) return 0;
    let sum = 0;
    Object.keys(sheet.meals).forEach(date => {
      const m = sheet.meals[date];
      const own = (m.breakfast ? 0.5 : 0) + (m.lunch ? 1.0 : 0) + (m.dinner ? 1.0 : 0);
      const guest = (m.guestBreakfast * 0.5) + (m.guestLunch * 1.0) + (m.guestDinner * 1.0);
      sum += own + guest;
    });
    return sum;
  };

  const getUserEstimatedBill = (userId: string) => getUserMealsCount(userId) * currentMealRate;
  
  const getUserTotalDeposits = (userId: string) => {
    return deposits
      .filter(d => d.userId === userId && d.status !== 'Pending' && d.status !== 'Rejected')
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getUserCarryForward = (userId: string) => {
    const userObj = allUsers.find(u => u.id === userId);
    return userObj?.carryForward || 0;
  };

  const getUserCurrentBalance = (userId: string) => {
    return getUserCarryForward(userId) + getUserTotalDeposits(userId) - getUserEstimatedBill(userId);
  };

  // -------------------------------------------------------------------
  // AGGREGATE TREASURY STATISTICS
  // -------------------------------------------------------------------
  
  const totalApprovedDeposits = deposits
    .filter(d => d.status !== 'Pending' && d.status !== 'Rejected')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalPendingDeposits = deposits
    .filter(d => d.status === 'Pending')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalCarryForwardSum = allUsers
    .filter(u => u.isActive)
    .reduce((sum, u) => sum + (u.carryForward || 0), 0);

  // Treasury Net Pool = Approved deposits + Initial Carry Forwards - Actual mess expenses
  const netTreasuryBalance = totalApprovedDeposits + totalCarryForwardSum - totalExpenses;

  // List of members and their financial overview (for dues list)
  const memberBalancesList = allUsers
    .filter(u => u.isActive)
    .map(u => {
      const balance = getUserCurrentBalance(u.id);
      return {
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        carryForward: getUserCarryForward(u.id),
        deposits: getUserTotalDeposits(u.id),
        bill: getUserEstimatedBill(u.id),
        balance,
        due: balance < 0 ? Math.abs(balance) : 0
      };
    });

  const totalPendingDuesSum = memberBalancesList.reduce((sum, m) => sum + m.due, 0);

  // -------------------------------------------------------------------
  // SEARCH / FILTERING LOGIC FOR TRANSACTIONS
  // -------------------------------------------------------------------
  
  // Members can only see their own history, Managers see all
  const visibleDeposits = isManagerOrAdmin 
    ? deposits 
    : deposits.filter(d => d.userId === currentUser.id);

  const filteredDeposits = visibleDeposits.filter(d => {
    const userObj = allUsers.find(u => u.id === d.userId);
    const matchesSearch = userObj?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (d.note && d.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (d.transactionId && d.transactionId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesMethod = methodFilter === 'All' || d.method === methodFilter;
    const matchesMember = memberFilter === 'All' || d.userId === memberFilter;
    
    // Default legacy undefined deposits as 'Approved'
    const depositStatus = d.status || 'Approved';
    const matchesStatus = statusFilter === 'All' || depositStatus === statusFilter;

    return matchesSearch && matchesMethod && matchesMember && matchesStatus;
  });

  // -------------------------------------------------------------------
  // CORE HANDLERS
  // -------------------------------------------------------------------
  
  const handleOpenModal = () => {
    setDuplicateWarning(null);
    setIsModalOpen(true);
    if (currentUser.role !== 'Member') {
      const firstActive = allUsers.find(u => u.isActive);
      if (firstActive) {
        setFormData(prev => ({ ...prev, userId: firstActive.id }));
      }
    } else {
      setFormData(prev => ({ ...prev, userId: currentUser.id }));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDuplicateWarning(null);
    setFormData({
      userId: currentUser.role === 'Member' ? currentUser.id : '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      transactionId: '',
      note: ''
    });
  };

  // CHECK DUPLICATES BEFORE SUBMITTING
  const handleFormChange = (fields: Partial<typeof formData>) => {
    const nextFormData = { ...formData, ...fields };
    setFormData(nextFormData);

    // Dynamic duplicate verification check
    if (nextFormData.userId && nextFormData.amount && Number(nextFormData.amount) > 0) {
      const amt = Number(nextFormData.amount);
      
      // 1. Check same transaction ID
      if (nextFormData.transactionId) {
        const txId = nextFormData.transactionId.trim().toLowerCase();
        const hasTxDuplicate = deposits.some(d => d.transactionId?.trim().toLowerCase() === txId);
        if (hasTxDuplicate) {
          setDuplicateWarning(
            isBangla 
              ? `সতর্কতা: এই ট্রানজেকশন আইডি (${nextFormData.transactionId}) ইতোমধ্যে সিস্টেমে অন্তর্ভুক্ত রয়েছে!` 
              : `Warning: This transaction ID (${nextFormData.transactionId}) already exists in the system!`
          );
          return;
        }
      }

      // 2. Check same user, same amount, same date
      const hasDateDuplicate = deposits.some(
        d => d.userId === nextFormData.userId && 
             d.amount === amt && 
             d.date === nextFormData.date
      );
      if (hasDateDuplicate) {
        const mName = allUsers.find(u => u.id === nextFormData.userId)?.name || 'Member';
        setDuplicateWarning(
          isBangla
            ? `সতর্কতা: ${mName} এর নামে এই তারিখে (${nextFormData.date}) ইতোমধ্যে ${settings.currency}${amt} জমার রেকর্ড রয়েছে!`
            : `Warning: ${mName} already has a deposit of ${settings.currency}${amt} recorded on ${nextFormData.date}!`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.isMonthClosed) return;
    if (!formData.userId || !formData.amount || Number(formData.amount) <= 0) return;

    const amt = Number(formData.amount);
    
    // Prevent duplicate submission with block if transaction ID matches exactly
    if (formData.transactionId) {
      const txId = formData.transactionId.trim().toLowerCase();
      if (deposits.some(d => d.transactionId?.trim().toLowerCase() === txId)) {
        showToast(isBangla ? 'ভুল: একই ট্রানজেকশন আইডি দুইবার ব্যবহার করা যাবে না!' : 'Error: Duplicate Transaction ID detected!', 'error');
        return;
      }
    }

    // Members submit deposit requests as 'Pending', Managers submit as 'Approved'
    const finalStatus = isManagerOrAdmin ? 'Approved' : 'Pending';

    onAddDeposit({
      userId: formData.userId,
      amount: amt,
      date: formData.date,
      method: formData.method,
      transactionId: formData.transactionId ? formData.transactionId.trim() : undefined,
      note: formData.note ? formData.note.trim() : undefined,
      status: finalStatus
    });

    showToast(
      isManagerOrAdmin 
        ? (isBangla ? 'আমানত সফলভাবে জমা করা হয়েছে!' : 'Deposit recorded successfully!')
        : (isBangla ? 'আমানতের দাবি জমা দেওয়া হয়েছে! ম্যানেজারের অনুমোদনের অপেক্ষা করুন।' : 'Deposit request submitted successfully! Awaiting manager review.'),
      'success'
    );

    handleCloseModal();
  };

  // Carry forward settings edit
  const handleStartEditCarryForward = (user: UserType) => {
    setEditingCarryForwardUserId(user.id);
    setCarryForwardInput(String(user.carryForward || 0));
  };

  const handleSaveCarryForward = (user: UserType) => {
    const val = Number(carryForwardInput);
    if (isNaN(val)) return;

    onUpdateUser({
      ...user,
      carryForward: val
    });
    setEditingCarryForwardUserId(null);
  };

  return (
    <div className="space-y-6" id="deposits-tab">
      
      {/* ------------------------------------------------------------------- */}
      {/* BENTO STATS CARDS */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Deposits Stat */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Coins size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isBangla ? 'মোট সংগৃহীত ডিপোজিট' : 'Total Deposits pool'}
            </span>
            <span className="text-xl font-black text-slate-850 dark:text-white mt-1 block">
              {settings.currency}{totalApprovedDeposits.toLocaleString()}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/20 group-hover:bg-emerald-500 transition-all"></div>
        </div>

        {/* Pending Deposits Stat */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isBangla ? 'অপেক্ষমাণ জমা (অনুমোদন প্রয়োজন)' : 'Pending Deposit Requests'}
            </span>
            <span className={`text-xl font-black mt-1 block ${totalPendingDeposits > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>
              {settings.currency}{totalPendingDeposits.toLocaleString()}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-all"></div>
        </div>

        {/* Net Treasury balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isBangla ? 'তহবিলের বর্তমান স্থিতি (ক্যাশ)' : 'Current Treasury Balance'}
            </span>
            <span className={`text-xl font-black mt-1 block ${netTreasuryBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {settings.currency}{netTreasuryBalance.toLocaleString()}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-500/20 group-hover:bg-sky-500 transition-all"></div>
        </div>

        {/* Total Pending Dues (Owed to the mess) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isBangla ? 'মোট বকেয়া খতিয়ান' : 'Total Outstanding Dues'}
            </span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-455 mt-1 block">
              {settings.currency}{totalPendingDuesSum.toLocaleString()}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500/20 group-hover:bg-rose-500 transition-all"></div>
        </div>

      </div>

      {/* ------------------------------------------------------------------- */}
      {/* PENDING APPROVAL QUEUE (ONLY FOR MANAGER) */}
      {/* ------------------------------------------------------------------- */}
      {isManagerOrAdmin && deposits.some(d => d.status === 'Pending') && (
        <div className="bg-amber-550/5 border border-amber-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="text-amber-600 dark:text-amber-400" size={18} />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {isBangla ? 'অনুমোদনের জন্য অপেক্ষমাণ আমানতসমূহ' : 'Awaiting Deposit Verification'}
            </h3>
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {deposits.filter(d => d.status === 'Pending').length} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deposits.filter(d => d.status === 'Pending').map((deposit) => {
              const u = allUsers.find(user => user.id === deposit.userId) || { name: 'Unknown User', avatarUrl: '' };
              return (
                <div key={deposit.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-xs relative flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={u.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white text-xs block">{u.name}</span>
                        <span className="text-[10px] text-slate-400">{deposit.date}</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2.5 py-1 rounded-lg">
                      {settings.currency}{deposit.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-[11px] space-y-1 text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Method:</span>
                      <span className="font-bold uppercase text-slate-700 dark:text-slate-300">{deposit.method}</span>
                    </div>
                    {deposit.transactionId && (
                      <div className="flex justify-between">
                        <span>Ref ID:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{deposit.transactionId}</span>
                      </div>
                    )}
                    {deposit.note && (
                      <div className="border-t border-slate-50 dark:border-slate-800 pt-1.5 mt-1.5 italic text-slate-450">
                        "{deposit.note}"
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/80">
                    <button
                      onClick={() => onApproveDeposit(deposit.id, 'Approved')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <ThumbsUp size={12} /> {isBangla ? 'অনুমোদন দিন' : 'Approve'}
                    </button>
                    <button
                      onClick={() => onApproveDeposit(deposit.id, 'Rejected')}
                      className="py-1.5 px-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <ThumbsDown size={12} /> {isBangla ? 'বাতিল' : 'Reject'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* OUTSTANDING MEMBER DEBT / PENDING DUES BOARD */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
            <AlertCircle className="text-rose-500" size={16} />
            {isBangla ? 'সদস্যদের বকেয়া ও আমানতের বিবরণী (লাইভ)' : 'Live Member Balance & Outstanding Dues'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isBangla 
              ? 'ক্যারী ফরওয়ার্ড ব্যালেন্স এবং চলতি মাসের আমানত থেকে আনুমানিক ডাইনিং মিল বিল বিয়োগ করে এই ব্যালেন্স হিসাব করা হয়।' 
              : 'Live balance is calculated dynamically: Balance = Carry Forward + Month Deposits - Estimated dining bills.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3 text-center">Carry Forward</th>
                <th className="px-5 py-3 text-center">Month Deposits</th>
                <th className="px-5 py-3 text-center">Estimated Bill</th>
                <th className="px-5 py-3 text-center">Current Balance</th>
                <th className="px-5 py-3 text-center">Outstanding Dues</th>
              </tr>
            </thead>
            <tbody>
              {memberBalancesList.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 dark:border-slate-800 text-xs hover:bg-slate-50/40 dark:hover:bg-slate-850/10 transition">
                  {/* User profile */}
                  <td className="px-5 py-3 flex items-center gap-2.5">
                    <img src={m.avatarUrl} className="w-6.5 h-6.5 rounded-full object-cover" />
                    <span className="font-semibold text-slate-800 dark:text-white">{m.name}</span>
                  </td>

                  {/* Carry Forward */}
                  <td className="px-5 py-3 text-center">
                    <div className="font-semibold flex items-center justify-center gap-1">
                      <span className={m.carryForward >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}>
                        {m.carryForward >= 0 ? '+' : ''}{settings.currency}{m.carryForward.toLocaleString()}
                      </span>
                    </div>
                  </td>

                  {/* Current month deposits */}
                  <td className="px-5 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                    {settings.currency}{m.deposits.toLocaleString()}
                  </td>

                  {/* Bill */}
                  <td className="px-5 py-3 text-center font-semibold text-slate-550 dark:text-slate-400">
                    {settings.currency}{m.bill.toFixed(2)}
                  </td>

                  {/* Calculated Balance */}
                  <td className="px-5 py-3 text-center">
                    <span className={`font-bold ${m.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {m.balance >= 0 ? '+' : ''}{settings.currency}{m.balance.toFixed(2)}
                    </span>
                  </td>

                  {/* Status / Pending Dues */}
                  <td className="px-5 py-3 text-center">
                    {m.due > 0 ? (
                      <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full text-[10px] font-black border border-rose-500/15">
                        {isBangla ? 'বকেয়া' : 'Pending Due'}: {settings.currency}{m.due.toFixed(2)}
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-500/15">
                        {isBangla ? 'পরিশোধিত' : 'Paid / Surplus'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* CARRY FORWARD BALANCES PANEL (ONLY MANAGER) */}
      {/* ------------------------------------------------------------------- */}
      {isManagerOrAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
              <Plus className="text-indigo-500" size={16} />
              {isBangla ? 'সদস্যদের ক্যারী ফরওয়ার্ড ব্যালেন্স পরিবর্তন' : 'Manage Carry Forward Balances'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isBangla 
                ? 'গত মাসের শেষ ব্যালেন্স (পজিটিভ বা নেগেটিভ) এখানে সংশোধন করতে পারেন যা এই মাসের শুরুতে স্বয়ংক্রিয়ভাবে যোগ হবে।' 
                : 'Modify each user\'s leftover balance from last month. It acts as their starting wallet balance.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allUsers.filter(u => u.isActive).map((user) => {
              const isEditing = editingCarryForwardUserId === user.id;
              return (
                <div key={user.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 bg-slate-50/30 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={user.avatarUrl} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-white text-xs truncate">{user.name}</span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        value={carryForwardInput}
                        onChange={(e) => setCarryForwardInput(e.target.value)}
                        className="w-18 text-xs font-black p-1 text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-800 dark:text-white"
                        placeholder="0"
                      />
                      <button
                        onClick={() => handleSaveCarryForward(user)}
                        className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                        title="Save"
                      >
                        <Save size={12} />
                      </button>
                      <button
                        onClick={() => setEditingCarryForwardUserId(null)}
                        className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold font-mono ${user.carryForward && user.carryForward < 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {user.carryForward && user.carryForward >= 0 ? '+' : ''}{settings.currency}{(user.carryForward || 0).toLocaleString()}
                      </span>
                      {!settings.isMonthClosed && (
                        <button
                          onClick={() => handleStartEditCarryForward(user)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SEARCH / FILTERS BAR */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Text Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={isBangla ? 'ট্রানজেকশন, মেমো বা নাম দিয়ে খুঁজুন...' : 'Search by ID, name, notes...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Payment Method filter dropdown */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
            >
              <option value="All">{isBangla ? 'সব পেমেন্ট মেথড' : 'All Methods'}</option>
              <option value="Cash">Cash</option>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Bank">Bank</option>
            </select>
          </div>

          {/* User selector filter (Admin/Manager only) */}
          {isManagerOrAdmin && (
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold max-w-[150px]"
            >
              <option value="All">{isBangla ? 'সব সদস্য' : 'All Members'}</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
          >
            <option value="All">{isBangla ? 'সব স্থিতি' : 'All Status'}</option>
            <option value="Approved">{isBangla ? 'অনুমোদিত' : 'Approved'}</option>
            <option value="Pending">{isBangla ? 'অপেক্ষমাণ' : 'Pending'}</option>
            <option value="Rejected">{isBangla ? 'বাতিলকৃত' : 'Rejected'}</option>
          </select>
        </div>

        {/* Add deposit button */}
        {!settings.isMonthClosed && (
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition"
          >
            <Plus size={16} /> 
            {isManagerOrAdmin 
              ? (isBangla ? 'আমানত রেকর্ড করুন' : 'Record Deposit')
              : (isBangla ? 'আমানতের দাবি জমা দিন' : 'Request Deposit')}
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* HISTORIC DEPOSITS LIST TABLE */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3">{isBangla ? 'সদস্য' : 'Member'}</th>
                <th className="px-5 py-3 text-center">{isBangla ? 'পরিমাণ' : 'Amount'}</th>
                <th className="px-5 py-3">{isBangla ? 'জমার তারিখ' : 'Deposit Date'}</th>
                <th className="px-5 py-3">{isBangla ? 'মেথড' : 'Method'}</th>
                <th className="px-5 py-3">{isBangla ? 'ট্রানজেকশন রেফারেন্স' : 'Transaction Reference'}</th>
                <th className="px-5 py-3">{isBangla ? 'স্থিতি' : 'Status'}</th>
                <th className="px-5 py-3">{isBangla ? 'নোট' : 'Notes'}</th>
                {isManagerOrAdmin && !settings.isMonthClosed && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDeposits.map((deposit) => {
                const u = allUsers.find(user => user.id === deposit.userId) || { name: 'Unknown User', avatarUrl: '' };
                const depStatus = deposit.status || 'Approved';
                
                return (
                  <tr 
                    key={deposit.id} 
                    className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-750 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                  >
                    {/* User */}
                    <td className="px-5 py-3.5 flex items-center gap-2.5">
                      <img src={u.avatarUrl} className="w-6.5 h-6.5 rounded-full object-cover" />
                      <span className="font-semibold text-slate-850 dark:text-white">{u.name}</span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded">
                        {settings.currency}{deposit.amount.toLocaleString()}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      {deposit.date}
                    </td>

                    {/* Method */}
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        deposit.method === 'Cash' 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' 
                          : deposit.method === 'bKash'
                          ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400'
                          : deposit.method === 'Nagad'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                      }`}>
                        {deposit.method}
                      </span>
                    </td>

                    {/* Reference */}
                    <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {deposit.transactionId || (
                        <span className="text-[10px] text-slate-400 italic">No ref ID</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        depStatus === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : depStatus === 'Pending'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {depStatus}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={deposit.note}>
                      {deposit.note || <span className="text-slate-400 italic">No notes</span>}
                    </td>

                    {/* Actions */}
                    {isManagerOrAdmin && !settings.isMonthClosed && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            showConfirm({
                              title: isBangla ? 'আমানত রেকর্ড মুছুন' : 'Delete Deposit Record',
                              message: isBangla ? 'আপনি কি নিশ্চিতভাবে এই আমানত রেকর্ডটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this deposit record?',
                              confirmLabel: isBangla ? 'মুছুন' : 'Delete',
                              cancelLabel: isBangla ? 'বাতিল' : 'Cancel',
                              onConfirm: () => onDeleteDeposit(deposit.id)
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredDeposits.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-xs mx-auto flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-650">
                        <Coins size={28} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {isBangla ? 'কোনো আমানতের রেকর্ড পাওয়া যায়নি' : 'No deposit records found'}
                      </p>
                      <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                        {isBangla ? 'ফিল্টার অথবা অনুসন্ধান প্যারামিটার পরিবর্তন করে আবার চেষ্টা করুন।' : 'Adjust filters or search parameters or create a new deposit.'}
                      </p>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* RECORD DEPOSIT FORM MODAL */}
      {/* ------------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-white">
                  {isManagerOrAdmin 
                    ? (isBangla ? 'আমানত রেকর্ড করুন' : 'Record Member Deposit')
                    : (isBangla ? 'আমানতের দাবি জমা দিন' : 'Request Deposit Credit')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isManagerOrAdmin
                    ? (isBangla ? 'সিস্টেমের ক্যাশ লেজারে সরাসরি সদস্যের আমানত যোগ করুন।' : 'Input payment cash or electronic vouchers into the system treasury ledger.')
                    : (isBangla ? 'আপনার পেমেন্ট বিবরণী দিয়ে দাবি জমা দিন, যা ম্যানেজার যাচাই করে অনুমোদন দিবেন।' : 'Submit transaction receipt. Your manager will verify and credit it to your account.')}
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {duplicateWarning && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2 animate-pulse">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'সদস্য নির্বাচন করুন' : 'Select Member'}
                </label>
                <select
                  required
                  disabled={currentUser.role === 'Member'}
                  value={formData.userId}
                  onChange={(e) => handleFormChange({ userId: e.target.value })}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  <option value="">{isBangla ? '-- সক্রিয় সদস্য নির্বাচন করুন --' : '-- Choose active member --'}</option>
                  {allUsers.filter(u => u.isActive).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'পরিমাণ' : 'Amount'} ({settings.currency})
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    required
                    value={formData.amount}
                    onChange={(e) => handleFormChange({ amount: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'পরিশোধের তারিখ' : 'Date Paid'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => handleFormChange({ date: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'পেমেন্ট মেথড' : 'Payment Method'}
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => handleFormChange({ method: e.target.value as any })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="Cash">Cash (নগদ টাকা)</option>
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="Nagad">Nagad (নগদ)</option>
                    <option value="Bank">Bank (ব্যাংক ট্রান্সফার)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>{isBangla ? 'ট্রানজেকশন আইডি' : 'Transaction ID / Ref'}</span>
                    {formData.method !== 'Cash' && <span className="text-rose-500 font-bold">*</span>}
                  </label>
                  <input
                    type="text"
                    required={formData.method !== 'Cash'}
                    placeholder="e.g. BKX39210L"
                    value={formData.transactionId}
                    onChange={(e) => handleFormChange({ transactionId: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'মেমো / নোট' : 'Memo / Note'}
                </label>
                <input
                  type="text"
                  placeholder={isBangla ? 'যেমন: অ্যাডভান্স পেমেন্ট, গ্যাস বিল সমন্বয় ইত্যাদি' : 'e.g. advance payment, room charge adjusted, etc'}
                  value={formData.note}
                  onChange={(e) => handleFormChange({ note: e.target.value })}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  {isBangla ? 'বাতিল করুন' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/15 transition"
                >
                  {isManagerOrAdmin 
                    ? (isBangla ? 'আমানত সংরক্ষণ করুন' : 'Save Deposit')
                    : (isBangla ? 'অনুমোদনের জন্য পাঠান' : 'Submit Claim')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
