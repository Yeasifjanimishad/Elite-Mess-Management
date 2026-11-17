import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Check, 
  X, 
  ShoppingBag, 
  Calendar, 
  User, 
  FileText, 
  DollarSign,
  AlertCircle,
  Clock,
  ThumbsUp,
  Image as ImageIcon,
  ChevronDown,
  Trash2,
  Users,
  Edit,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType, BazaarEntry, SystemSettings } from '../types';
import { useFeedback } from './FeedbackContext';
import { getRealCurrentMonth, getEffectiveDatesForMonth, formatMonthLabel, getMonthPickerOptions } from '../utils/dateUtils';

interface BazaarTabProps {
  currentUser: UserType;
  role: 'Admin' | 'Meal Manager' | 'Member';
  allUsers: UserType[];
  bazaarEntries: BazaarEntry[];
  onAddBazaarEntry: (entry: Omit<BazaarEntry, 'id'>) => void;
  onEditBazaarEntry: (entry: BazaarEntry) => void;
  onApproveEntry: (id: string, status: 'Approved' | 'Rejected', managerId: string) => void;
  onDeleteEntry: (id: string) => void;
  settings: SystemSettings;
  assignedBazaarPersons: string[];
  onUpdateAssignedPersons: (userIds: string[]) => void;
  onTriggerBazaarReminder?: (userIds: string[], date: string) => void;
}

const translations = {
  Bangla: {
    tabTitle: "মেস বাজার ও হিসাব ব্যবস্থাপনা",
    tabSubtitle: "বাজার খরচের রেকর্ড সংরক্ষণ এবং অ্যাসাইনমেন্ট গেটওয়ে",
    assignedDuties: "বাজারের দায়িত্বপ্রাপ্ত সদস্য",
    assignBtn: "দায়িত্ব পরিবর্তন করুন",
    saveDuties: "সংরক্ষণ করুন",
    cancelDuties: "বাতিল",
    assignedToDesc: "শুধুমাত্র দায়িত্বপ্রাপ্ত সদস্য এবং ম্যানেজার বাজার এন্ট্রি করতে পারবেন।",
    addBazaarBtn: "নতুন বাজার খরচ যুক্ত করুন",
    searchItemPlaceholder: "আইটেম খুঁজুন...",
    allStatus: "সব স্ট্যাটাস",
    pendingStatus: "অনুমোদনের অপেক্ষায়",
    approvedStatus: "অনুমোদিত",
    rejectedStatus: "প্রত্যাখ্যাত",
    allMonths: "সব মাস",
    noEntriesFound: "কোনো বাজার খরচ পাওয়া যায়নি!",
    tableDate: "তারিখ",
    tableItem: "আইটেম ও বিবরণ",
    tableQty: "পরিমাণ ও ইউনিট",
    tablePrice: "দর (Per Unit)",
    tableSubtotal: "সাবটোটাল",
    tableTotal: "সর্বমোট খরচ",
    tableReceipt: "রসিদ",
    tableStatus: "স্ট্যাটাস",
    tableActions: "অ্যাকশন",
    editTooltip: "এডিট করুন",
    deleteTooltip: "ডিলিট করুন",
    approveTooltip: "অনুমোদন দিন",
    rejectTooltip: "প্রত্যাখ্যান করুন",
    modalAddTitle: "বাজার খরচ যুক্ত করার ফরম",
    modalEditTitle: "বাজার খরচ পরিবর্তন করুন",
    itemNameLabel: "আইটেমের নাম (Item Name)",
    quantityLabel: "আইটেমের পরিমাণ (Quantity)",
    unitLabel: "ইউনিট (Unit)",
    priceLabel: "প্রতি ইউনিটের মূল্য (Price Per Unit)",
    subtotalLabel: "সাবটোটাল (Quantity × Price)",
    totalLabel: "সর্বমোট খরচ (অতিরিক্ত খরচসহ বা সমতুল্য)",
    receiptLabel: "রসিদ বা রিসিট ইমেজ (Receipt Image URL)",
    receiptPresetLabel: "অথবা একটি ডেমো রসিদ ছবি বেছে নিন:",
    notesLabel: "বিশেষ নোট (যদি থাকে)",
    submitAddBtn: "খরচ যুক্ত করুন",
    submitEditBtn: "পরিবর্তনগুলো সংরক্ষণ করুন",
    successMsg: "সফলভাবে সম্পন্ন হয়েছে!",
    onlyManagerEditMsg: "শুধুমাত্র মেস ম্যানেজার অনুমোদিত খরচ পরিবর্তন বা মুছে ফেলতে পারবেন।"
  },
  English: {
    tabTitle: "Bazaar Ledger & Expense Claims",
    tabSubtitle: "Official log of mess grocery expenses and assigned buyer duties",
    assignedDuties: "Assigned Bazaar Buyers",
    assignBtn: "Modify Assignments",
    saveDuties: "Save Duties",
    cancelDuties: "Cancel",
    assignedToDesc: "Only assigned buyers and meal managers can log new bazaar entries.",
    addBazaarBtn: "Create Bazaar Entry",
    searchItemPlaceholder: "Search grocery items...",
    allStatus: "All Statuses",
    pendingStatus: "Pending",
    approvedStatus: "Approved",
    rejectedStatus: "Rejected",
    allMonths: "All Months",
    noEntriesFound: "No bazaar ledger entries found!",
    tableDate: "Date",
    tableItem: "Item & Specs",
    tableQty: "Qty & Unit",
    tablePrice: "Rate (Unit)",
    tableSubtotal: "Subtotal",
    tableTotal: "Total Cost",
    tableReceipt: "Receipt",
    tableStatus: "Status",
    tableActions: "Actions",
    editTooltip: "Edit claim",
    deleteTooltip: "Delete claim",
    approveTooltip: "Approve claim",
    rejectTooltip: "Reject claim",
    modalAddTitle: "Create Bazaar Ledger Entry",
    modalEditTitle: "Modify Bazaar Ledger Entry",
    itemNameLabel: "Item Name",
    quantityLabel: "Quantity",
    unitLabel: "Unit",
    priceLabel: "Price Per Unit",
    subtotalLabel: "Subtotal (Quantity × Price)",
    totalLabel: "Total Cost (Including overheads/transport)",
    receiptLabel: "Receipt Image URL",
    receiptPresetLabel: "Or select a sample receipt preset:",
    notesLabel: "Additional Notes / Specifications",
    submitAddBtn: "Log Entry Claim",
    submitEditBtn: "Save Updates",
    successMsg: "Successfully performed!",
    onlyManagerEditMsg: "Only Meal Managers can edit or delete approved ledger entries."
  }
};

const receiptPresets = [
  { name: 'Kacha Bazaar (Veggies & Spices)', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80' },
  { name: 'Meat & Poultry Shop', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
  { name: 'Superstore Daily Receipt', url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=80' },
  { name: 'Grocery Bag Bill', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80' }
];

export default function BazaarTab({
  currentUser,
  role,
  allUsers,
  bazaarEntries,
  onAddBazaarEntry,
  onEditBazaarEntry,
  onApproveEntry,
  onDeleteEntry,
  settings,
  assignedBazaarPersons,
  onUpdateAssignedPersons,
  onTriggerBazaarReminder
}: BazaarTabProps) {

  const { showToast, showConfirm } = useFeedback();

  const isManagerOrAdmin = role === 'Admin' || (role === 'Meal Manager' && settings.mgrCanApproveBazaar !== false);
  const isBangla = settings.language === 'Bangla';
  const t = translations[isBangla ? 'Bangla' : 'English'];
  const activeMonth = settings.activeMonth || getRealCurrentMonth();
  const { today, tomorrow } = getEffectiveDatesForMonth(activeMonth);

  const handleTriggerReminderClick = () => {
    if (onTriggerBazaarReminder) {
      onTriggerBazaarReminder(assignedBazaarPersons, tomorrow);
      showToast(isBangla ? 'বাজারের দায়িত্বের বিজ্ঞপ্তিটি সমস্ত নির্ধারিত সদস্যদের কাছে পাঠানো হয়েছে!' : 'Bazaar duty notification successfully transmitted to all assigned members!', 'success');
    }
  };

  // Buyer Assignment Toggle State
  const [isEditingDuty, setIsEditingDuty] = useState(false);
  const [tempDuties, setTempDuties] = useState<string[]>(assignedBazaarPersons);

  // Search, Status, and Month Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  
  // Extract unique months from existing entries dynamically to populate filter
  const uniqueMonths = getMonthPickerOptions(activeMonth, [
    ...bazaarEntries.map(b => b.date.substring(0, 7)),
    ...(settings.closedMonths?.map(c => c.month) || [])
  ]);
  const [monthFilter, setMonthFilter] = useState<string>(activeMonth);

  useEffect(() => {
    setMonthFilter(activeMonth);
  }, [activeMonth]);

  // Form Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<BazaarEntry | null>(null);

  const [formData, setFormData] = useState({
    date: today,
    items: '',
    quantity: '',
    unit: 'kg',
    price: '',
    totalOverride: '',
    notes: '',
    receiptUrl: ''
  });

  useEffect(() => {
    if (!editEntry) {
      setFormData(prev => ({ ...prev, date: today }));
    }
  }, [today, editEntry]);

  // Receipt image zoom popup
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  const isAssignedToBazaar = assignedBazaarPersons.includes(currentUser.id);
  const canAddBazaar = true;

  // Real-time calculations inside the Form
  const currentSubtotal = Number(formData.quantity || 0) * Number(formData.price || 0);
  const currentTotal = formData.totalOverride ? Number(formData.totalOverride) : currentSubtotal;

  const handleOpenAddModal = () => {
    setEditEntry(null);
    setFormData({
      date: today,
      items: '',
      quantity: '1',
      unit: 'kg',
      price: '',
      totalOverride: '',
      notes: '',
      receiptUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (entry: BazaarEntry) => {
    setEditEntry(entry);
    setFormData({
      date: entry.date,
      items: entry.items,
      quantity: entry.quantity.replace(/[^0-9.]/g, '') || '1',
      unit: entry.unit || 'kg',
      price: entry.price.toString(),
      totalOverride: entry.total ? entry.total.toString() : '',
      notes: entry.notes || '',
      receiptUrl: entry.receiptUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditEntry(null);
  };

  const handleDutyToggle = (userId: string) => {
    if (tempDuties.includes(userId)) {
      setTempDuties(tempDuties.filter(id => id !== userId));
    } else {
      setTempDuties([...tempDuties, userId]);
    }
  };

  const handleSaveDuties = () => {
    onUpdateAssignedPersons(tempDuties);
    setIsEditingDuty(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.isMonthClosed) return;
    if (!formData.items || !formData.price || !formData.quantity) return;

    const finalSubtotal = Number(formData.quantity) * Number(formData.price);
    const finalTotal = formData.totalOverride ? Number(formData.totalOverride) : finalSubtotal;

    if (editEntry) {
      // Modifying existing entry
      onEditBazaarEntry({
        ...editEntry,
        date: formData.date,
        items: formData.items,
        quantity: formData.quantity,
        unit: formData.unit,
        price: Number(formData.price),
        subtotal: finalSubtotal,
        total: finalTotal,
        notes: formData.notes,
        receiptUrl: formData.receiptUrl
      });
    } else {
      // Adding new entry
      onAddBazaarEntry({
        date: formData.date,
        items: formData.items,
        quantity: formData.quantity,
        unit: formData.unit,
        price: Number(formData.price),
        subtotal: finalSubtotal,
        total: finalTotal,
        notes: formData.notes,
        assignedTo: [currentUser.id],
        receiptUrl: formData.receiptUrl,
        status: isManagerOrAdmin ? 'Approved' : 'Pending'
      });
    }

    handleCloseModal();
  };

  // Filter Logic
  const filteredEntries = bazaarEntries.filter(entry => {
    const matchesSearch = entry.items.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (entry.notes && entry.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || entry.status === statusFilter;
    const matchesMonth = monthFilter === 'All' || entry.date.startsWith(monthFilter);
    return matchesSearch && matchesStatus && matchesMonth;
  });

  // Helper to format dates beautifully
  const formatDisplayDate = (dateStr: string) => {
    if (isBangla) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-emerald-600 dark:text-emerald-400" size={24} />
            {t.tabTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t.tabSubtitle}
          </p>
        </div>

        {canAddBazaar && (
          <button
            onClick={handleOpenAddModal}
            disabled={settings.isMonthClosed}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer transition disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            {t.addBazaarBtn}
          </button>
        )}
      </div>

      {/* ASSIGNED BUYERS UTILITY (ROLE-BASED) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users size={16} className="text-emerald-600" />
              {t.assignedDuties}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {t.assignedToDesc}
            </p>
          </div>

          {isManagerOrAdmin && (
            <div>
              {!isEditingDuty ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerReminderClick}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 border border-amber-650 hover:border-amber-700 text-white text-[11px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition flex items-center gap-1 shadow-sm"
                    title="Send bazaar schedule alert notice"
                  >
                    Send Reminder
                  </button>
                  <button
                    onClick={() => {
                      setTempDuties(assignedBazaarPersons);
                      setIsEditingDuty(true);
                    }}
                    className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition"
                  >
                    {t.assignBtn}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDuties}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition"
                  >
                    {t.saveDuties}
                  </button>
                  <button
                    onClick={() => setIsEditingDuty(false)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition"
                  >
                    {t.cancelDuties}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* LIST OF CURRENT DUTIES */}
        <div className="mt-4">
          {!isEditingDuty ? (
            <div className="flex flex-wrap gap-2">
              {assignedBazaarPersons.map(id => {
                const buyer = allUsers.find(u => u.id === id);
                if (!buyer) return null;
                return (
                  <div 
                    key={id} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-bold"
                  >
                    <img src={buyer.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} className="w-4 h-4 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                    <span>{buyer.name}</span>
                  </div>
                );
              })}
              {assignedBazaarPersons.length === 0 && (
                <span className="text-xs font-medium text-slate-400">No buyers assigned. Please assign some.</span>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              {allUsers.filter(u => u.isActive).map(user => {
                const isSelected = tempDuties.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleDutyToggle(user.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border-2 text-left cursor-pointer transition-all text-xs ${
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-850 dark:text-emerald-400' 
                        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <img src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} className="w-5 h-5 rounded-full object-cover shrink-0" alt="" referrerPolicy="no-referrer" />
                    <span className="font-bold truncate">{user.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PENDING BAZAAR CLAIMS APPROVAL QUEUE (ONLY FOR MANAGER / ADMIN) */}
      {isManagerOrAdmin && bazaarEntries.some(b => b.status === 'Pending') && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="text-amber-600 dark:text-amber-400" size={18} />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {isBangla ? 'অনুমোদনের জন্য অপেক্ষমাণ বাজার খরচসমূহ' : 'Awaiting Bazaar Claims Verification'}
            </h3>
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {bazaarEntries.filter(b => b.status === 'Pending').length} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bazaarEntries.filter(b => b.status === 'Pending').map((entry) => {
              const submitter = allUsers.find(u => u.id === (entry.assignedTo[0] || entry.approvedBy)) || { name: 'Member', avatarUrl: '' };
              return (
                <div key={entry.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={submitter.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} className="w-7 h-7 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white text-xs block">{submitter.name}</span>
                        <span className="text-[10px] text-slate-400">{formatDisplayDate(entry.date)}</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2.5 py-1 rounded-lg">
                      {settings.currency}{(entry.total || entry.subtotal || entry.price).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between font-bold">
                      <span>Item:</span>
                      <span className="text-slate-900 dark:text-white">{entry.items}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Qty & Price:</span>
                      <span>{entry.quantity} {entry.unit || 'kg'} × {settings.currency}{entry.price}</span>
                    </div>
                    {entry.notes && (
                      <div className="border-t border-slate-50 dark:border-slate-800 pt-1.5 mt-1 text-slate-400 italic text-[10px]">
                        "{entry.notes}"
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        onApproveEntry(entry.id, 'Approved', currentUser.id);
                        showToast(
                          isBangla 
                            ? `"${entry.items}" খরচ অনুমোদন করা হয়েছে!` 
                            : `Approved bazaar claim: "${entry.items}"`,
                          'success'
                        );
                      }}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <ThumbsUp size={12} /> {isBangla ? 'অনুমোদন দিন' : 'Approve'}
                    </button>
                    <button
                      onClick={() => {
                        onApproveEntry(entry.id, 'Rejected', currentUser.id);
                        showToast(
                          isBangla 
                            ? `"${entry.items}" খরচ বাতিল করা হয়েছে!` 
                            : `Rejected bazaar claim: "${entry.items}"`,
                          'info'
                        );
                      }}
                      className="py-1.5 px-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <X size={12} /> {isBangla ? 'বাতিল' : 'Reject'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-center gap-3">
        
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={t.searchItemPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-700/60 rounded-xl text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="w-full md:w-40 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-700/60 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 cursor-pointer"
          >
            <option value="All">{t.allStatus}</option>
            <option value="Pending">{t.pendingStatus}</option>
            <option value="Approved">{t.approvedStatus}</option>
            <option value="Rejected">{t.rejectedStatus}</option>
          </select>
        </div>

        {/* Month Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Month:</span>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-700/60 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 cursor-pointer"
          >
            <option value="All">{t.allMonths}</option>
            {uniqueMonths.map(m => (
              <option key={m} value={m}>
                {formatMonthLabel(m, settings.language)}{m === activeMonth ? (isBangla ? ' (চলতি)' : ' (Active)') : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BAZAAR CLAIMS LEDGER TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <th className="py-4 px-5">{t.tableDate}</th>
                <th className="py-4 px-5">{t.tableItem}</th>
                <th className="py-4 px-5">{t.tableQty}</th>
                <th className="py-4 px-5">{t.tablePrice}</th>
                <th className="py-4 px-5">{t.tableSubtotal}</th>
                <th className="py-4 px-5">{t.tableTotal}</th>
                <th className="py-4 px-5 text-center">{t.tableReceipt}</th>
                <th className="py-4 px-5 text-center">{t.tableStatus}</th>
                <th className="py-4 px-5 text-center">{t.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredEntries.map((entry) => {
                const assignedUsers = entry.assignedTo.map(uid => allUsers.find(u => u.id === uid)).filter(Boolean);
                const isCreator = entry.assignedTo.includes(currentUser.id);
                
                // Permission logic
                // Managers can edit/delete anything.
                // Standard users can only edit/delete PENDING items they themselves created.
                const canEditEntry = isManagerOrAdmin || (entry.status === 'Pending' && isCreator);
                const canDeleteEntry = isManagerOrAdmin || (entry.status === 'Pending' && isCreator);

                // For approved items, enforce ONLY Manager edit/delete restriction
                const isApproved = entry.status === 'Approved';
                const showManagerNotice = isApproved && !isManagerOrAdmin;

                return (
                  <tr 
                    key={entry.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs text-slate-700 dark:text-slate-300 transition duration-150"
                  >
                    {/* Date */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-semibold">
                        <Calendar size={14} className="text-slate-400" />
                        {formatDisplayDate(entry.date)}
                      </div>
                    </td>

                    {/* Item */}
                    <td className="py-4 px-5">
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white block">{entry.items}</span>
                        {entry.notes && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block max-w-xs truncate font-medium">
                            {entry.notes}
                          </span>
                        )}
                        {/* Who reported */}
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-400">
                          <span>By:</span>
                          {assignedUsers.map((u, idx) => (
                            <span key={u?.id} className="text-slate-500 dark:text-slate-400">
                              {u?.name}{idx < assignedUsers.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-4 px-5 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                      {entry.quantity} {entry.unit || 'kg'}
                    </td>

                    {/* Price per Unit */}
                    <td className="py-4 px-5 whitespace-nowrap font-bold text-slate-500 dark:text-slate-400">
                      {settings.currency}{entry.price}
                    </td>

                    {/* Subtotal */}
                    <td className="py-4 px-5 whitespace-nowrap font-bold text-slate-600 dark:text-slate-300">
                      {settings.currency}{entry.subtotal}
                    </td>

                    {/* Total cost */}
                    <td className="py-4 px-5 whitespace-nowrap font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {settings.currency}{(entry.total || entry.subtotal).toLocaleString()}
                    </td>

                    {/* Receipt */}
                    <td className="py-4 px-5 text-center">
                      {entry.receiptUrl ? (
                        <button
                          onClick={() => setViewingReceipt(entry.receiptUrl || null)}
                          className="inline-flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition"
                        >
                          <ImageIcon size={15} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        entry.status === 'Approved'
                          ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10'
                          : entry.status === 'Rejected'
                          ? 'bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/10'
                          : 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/10'
                      }`}>
                        {entry.status === 'Approved' ? <CheckCircle2 size={11} /> : entry.status === 'Rejected' ? <AlertTriangle size={11} /> : <Clock size={11} />}
                        {isBangla 
                          ? (entry.status === 'Approved' ? 'অনুমোদিত' : entry.status === 'Rejected' ? 'প্রত্যাখ্যাত' : 'অপেক্ষমাণ') 
                          : entry.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Approval buttons for Manager */}
                        {isManagerOrAdmin && entry.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => {
                                onApproveEntry(entry.id, 'Approved', currentUser.id);
                                showToast(
                                  isBangla 
                                    ? `"${entry.items}" খরচ সফলভাবে অনুমোদন করা হয়েছে!` 
                                    : `Successfully approved bazaar ledger entry: "${entry.items}"`,
                                  'success'
                                );
                              }}
                              disabled={settings.isMonthClosed}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg cursor-pointer transition border border-emerald-100 dark:border-emerald-900/30"
                              title={t.approveTooltip}
                            >
                              <ThumbsUp size={13} />
                            </button>
                            <button
                              onClick={() => {
                                onApproveEntry(entry.id, 'Rejected', currentUser.id);
                                showToast(
                                  isBangla 
                                    ? `"${entry.items}" খরচ প্রত্যাখ্যান করা হয়েছে!` 
                                    : `Rejected bazaar ledger entry: "${entry.items}"`,
                                  'info'
                                );
                              }}
                              disabled={settings.isMonthClosed}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer transition border border-rose-100 dark:border-rose-900/30"
                              title={t.rejectTooltip}
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}

                        {/* Edit Button */}
                        {canEditEntry ? (
                          <button
                            onClick={() => handleOpenEditModal(entry)}
                            disabled={settings.isMonthClosed}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30 cursor-pointer transition"
                            title={t.editTooltip}
                          >
                            <Edit size={13} />
                          </button>
                        ) : showManagerNotice ? (
                          <button
                            disabled
                            className="p-1.5 text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-slate-800/80 rounded-lg cursor-not-allowed"
                            title={t.onlyManagerEditMsg}
                          >
                            <Edit size={13} />
                          </button>
                        ) : null}

                        {/* Delete Button */}
                        {canDeleteEntry ? (
                          <button
                            onClick={() => {
                              showConfirm({
                                title: isBangla ? 'খরচ মুছুন' : 'Delete Expense Record',
                                message: isBangla ? 'আপনি কি নিশ্চিতভাবে এই খরচ রেকর্ডটি মুছতে চান?' : 'Are you sure you want to delete this bazaar ledger claim?',
                                confirmLabel: isBangla ? 'মুছুন' : 'Delete',
                                cancelLabel: isBangla ? 'বাতিল' : 'Cancel',
                                onConfirm: () => onDeleteEntry(entry.id)
                              });
                            }}
                            disabled={settings.isMonthClosed}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/30 cursor-pointer transition"
                            title={t.deleteTooltip}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : showManagerNotice ? (
                          <button
                            disabled
                            className="p-1.5 text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-slate-800/80 rounded-lg cursor-not-allowed"
                            title={t.onlyManagerEditMsg}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}

                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-xs mx-auto flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-650">
                        <ShoppingBag size={28} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">{t.noEntriesFound}</p>
                      <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                        {isBangla ? 'কোনো রেকর্ড পাওয়া যায়নি। নতুন একটি এন্ট্রি যোগ করতে ওপরের বোতামটি চাপুন।' : 'No entries found. Try adjusting your filter or create a new entry.'}
                      </p>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BAZAAR ENTRY MODAL (CREATION & EDIT) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={handleCloseModal}
                className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <ShoppingBag className="text-emerald-600" size={20} />
                  {editEntry ? t.modalEditTitle : t.modalAddTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  {editEntry ? 'Update existing claims ledger data with real pricing' : 'Ensure receipt images or details are accurate.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">{t.tableDate}</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Item Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">{t.itemNameLabel}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beef, Onion, Oil..."
                    value={formData.items}
                    onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Grid for Quantity, Unit and Price */}
                <div className="grid grid-cols-3 gap-3">
                  
                  {/* Quantity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">{t.quantityLabel}</label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">{t.unitLabel}</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    >
                      <option value="kg">kg (Kilogram)</option>
                      <option value="Liter">Liter (L)</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="Dozen">Dozen</option>
                      <option value="Packets">Packets</option>
                      <option value="Bags">Bags</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Price */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">{t.priceLabel}</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Subtotal and Total calculations */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.subtotalLabel}</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1 block">
                      {settings.currency}{currentSubtotal.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">{t.totalLabel}</label>
                    <input
                      type="number"
                      placeholder={currentSubtotal.toString()}
                      value={formData.totalOverride}
                      onChange={(e) => setFormData({ ...formData, totalOverride: e.target.value })}
                      className="mt-1 w-full px-3 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 dark:text-emerald-400 font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Receipt image */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">{t.receiptLabel}</label>
                  <input
                    type="url"
                    placeholder="https://example.com/receipt.jpg"
                    value={formData.receiptUrl}
                    onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none"
                  />
                  
                  {/* Preset Selector */}
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.receiptPresetLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {receiptPresets.map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, receiptUrl: preset.url })}
                          className={`text-[9px] font-extrabold px-2 py-1 rounded border cursor-pointer transition-colors ${
                            formData.receiptUrl === preset.url
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">{t.notesLabel}</label>
                  <textarea
                    rows={2}
                    placeholder="Any specific note..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none"
                  ></textarea>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer transition"
                >
                  {editEntry ? t.submitEditBtn : t.submitAddBtn}
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPT PREVIEW ZOOM POPUP */}
      <AnimatePresence>
        {viewingReceipt && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-2 rounded-2xl max-w-2xl w-full relative shadow-2xl"
            >
              <button
                onClick={() => setViewingReceipt(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center border border-slate-700 hover:bg-slate-800 cursor-pointer shadow-lg transition"
              >
                <X size={16} />
              </button>
              {viewingReceipt && (
                <img 
                  src={viewingReceipt} 
                  className="w-full max-h-[500px] object-contain rounded-xl" 
                  referrerPolicy="no-referrer"
                  alt="Receipt Billing Spec" 
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
