import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  CreditCard, 
  Trash2, 
  Tag, 
  Calendar, 
  FileText,
  X,
  PieChart
} from 'lucide-react';
import { Expense, SystemSettings, User } from '../types';
import { motion } from 'motion/react';
import { useFeedback } from './FeedbackContext';
import { getRealCurrentMonth, getEffectiveDatesForMonth, formatMonthLabel, getMonthPickerOptions } from '../utils/dateUtils';

interface ExpenseTabProps {
  currentUser: User;
  role: 'Admin' | 'Meal Manager' | 'Member';
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  settings: SystemSettings;
}

export default function ExpenseTab({
  currentUser,
  role,
  expenses,
  onAddExpense,
  onDeleteExpense,
  settings
}: ExpenseTabProps) {

  const { showToast, showConfirm } = useFeedback();
  const isBangla = settings.language === 'Bangla';
  const isManagerOrAdmin = role === 'Admin' || (role === 'Meal Manager' && settings.mgrCanAddExpense !== false);
  const activeMonth = settings.activeMonth || getRealCurrentMonth();
  const { today } = getEffectiveDatesForMonth(activeMonth);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [monthFilter, setMonthFilter] = useState<string>(activeMonth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Gas' as any,
    amount: '',
    date: today,
    note: ''
  });

  useEffect(() => {
    setMonthFilter(activeMonth);
  }, [activeMonth]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, date: today }));
  }, [today]);

  const monthOptions = getMonthPickerOptions(activeMonth, [
    ...expenses.map(e => e.date.slice(0, 7)),
    ...(settings.closedMonths?.map(c => c.month) || [])
  ]);

  const categories = ['Bazaar', 'Gas', 'Electricity', 'Internet', 'Water', 'Cleaning', 'Maid', 'Others'];

  const handleOpenModal = () => {
    setFormData(prev => ({ ...prev, date: today }));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      category: 'Gas',
      amount: '',
      date: today,
      note: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.isMonthClosed) return;
    if (!formData.amount || Number(formData.amount) <= 0) return;

    onAddExpense({
      category: formData.category,
      amount: Number(formData.amount),
      date: formData.date,
      note: formData.note || undefined
    });

    handleCloseModal();
  };

  const monthScopedExpenses = monthFilter === 'All'
    ? expenses
    : expenses.filter(e => e.date.startsWith(monthFilter));

  const totalOtherExpenses = monthScopedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by Category for visual chart
  const categoryTotals = monthScopedExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as { [cat: string]: number });

  // Filter
  const filteredExpenses = monthScopedExpenses.filter(exp => {
    const matchesSearch = exp.note?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          exp.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'All' || exp.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Color mapper for Categories
  const getCatColor = (cat: string) => {
    switch (cat) {
      case 'Gas': return 'bg-orange-500 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20';
      case 'Electricity': return 'bg-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20';
      case 'Internet': return 'bg-indigo-500 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20';
      case 'Water': return 'bg-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20';
      case 'Cleaning': return 'bg-teal-500 text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20';
      case 'Maid': return 'bg-rose-500 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20';
      case 'Bazaar': return 'bg-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20';
      default: return 'bg-slate-500 text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20';
    }
  };

  return (
    <div className="space-y-6" id="expenses-tab">
      
      {/* BENTO GRID: STATS & PROGRESS CATEGORY CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TOTAL SUMMARY CARD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl w-max">
              <CreditCard size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Total Utility & Helper Costs
              </span>
              <span className="text-3xl font-black text-slate-850 dark:text-white mt-1 block">
                {settings.currency}{totalOtherExpenses.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Utility and helper fees are distributed equally on meal rates as fixed overheads, ensuring everyone pays a fair share of housing costs.
            </p>
          </div>
        </div>

        {/* CATEGORY PROGRESS BAR BENTO */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
            <PieChart size={18} className="text-rose-500" /> Category-wise Overhead Distribution
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            {categories.filter(cat => cat !== 'Bazaar').map(cat => {
              const amount = categoryTotals[cat] || 0;
              const percentage = totalOtherExpenses > 0 ? (amount / totalOtherExpenses) * 100 : 0;
              const colorInfo = getCatColor(cat).split(' ')[0]; // extract bg-color
              
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{cat}</span>
                    <span className="text-slate-400">{settings.currency}{amount} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colorInfo} rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category Dropdown Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Month Dropdown Filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
          >
            <option value="All">{isBangla ? 'সব মাস' : 'All Months'}</option>
            {monthOptions.map(m => (
              <option key={m} value={m}>
                {formatMonthLabel(m, settings.language)}{m === activeMonth ? (isBangla ? ' (চলতি)' : ' (Active)') : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Add utility expense button */}
        {isManagerOrAdmin && !settings.isMonthClosed && (
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition"
          >
            <Plus size={16} /> Record Overhead Cost
          </button>
        )}
      </div>

      {/* EXPENSE TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Cost Amount</th>
                <th className="px-5 py-3">Payment Date</th>
                <th className="px-5 py-3">Expense Notes / Invoice Detail</th>
                {isManagerOrAdmin && !settings.isMonthClosed && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const colorClasses = getCatColor(expense.category);
                const badgeBg = colorClasses.split(' ').slice(2).join(' '); // extract bg-classes
                const badgeText = colorClasses.split(' ').slice(1,2)[0]; // extract text-classes

                return (
                  <tr 
                    key={expense.id} 
                    className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                  >
                    {/* Category */}
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${badgeBg} ${badgeText}`}>
                        {expense.category}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-850 dark:text-white text-sm">
                        {settings.currency}{expense.amount.toLocaleString()}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-450" />
                        {expense.date}
                      </span>
                    </td>

                    {/* Note */}
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} className="text-slate-400 shrink-0" />
                        {expense.note || <span className="text-slate-400 italic">No notes provided</span>}
                      </span>
                    </td>

                    {/* Actions */}
                    {isManagerOrAdmin && !settings.isMonthClosed && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            showConfirm({
                              title: isBangla ? 'ওভারহেড খরচ মুছুন' : 'Delete Overhead Expense',
                              message: isBangla 
                                ? 'আপনি কি নিশ্চিতভাবে এই ওভারহেড খরচটি মুছে ফেলতে চান?' 
                                : 'Are you sure you want to delete this overhead expense entry?',
                              confirmLabel: isBangla ? 'মুছুন' : 'Delete',
                              cancelLabel: isBangla ? 'বাতিল' : 'Cancel',
                              onConfirm: () => {
                                onDeleteExpense(expense.id);
                                showToast(
                                  isBangla 
                                    ? 'ওভারহেড খরচ সফলভাবে মুছে ফেলা হয়েছে।' 
                                    : 'Overhead expense entry has been successfully deleted.',
                                  'success'
                                );
                              }
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                          title="Delete Overhead Entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 font-medium">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-xs mx-auto flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-650">
                        <CreditCard size={28} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {settings.language === 'Bangla' ? 'কোনো ওভারহেড খরচ রেকর্ড পাওয়া যায়নি' : 'No overhead expenses registered'}
                      </p>
                      <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                        {settings.language === 'Bangla' ? 'ইউটিলিটি বিল এবং অন্যান্য খরচের জন্য ওপরের বোতামটি চাপুন।' : 'Use the record button above to register utility bills or overheads.'}
                      </p>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD UTILITY FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-white">
                  Record Mess Overhead Cost
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add non-meal expenses such as gas, utility bills, helper salaries or cleaning materials.
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
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Expense Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  {categories.filter(c => c !== 'Bazaar').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Total Paid ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Description / Invoice Notes</label>
                <textarea
                  placeholder="e.g. Paid maid salary for this month, or Cylinder Gas double burner bought"
                  required
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/15 transition"
                >
                  Save Expense
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
