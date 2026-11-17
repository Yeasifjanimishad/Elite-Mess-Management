import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  X, 
  Calendar, 
  Sparkles, 
  Utensils, 
  ShoppingBag, 
  DollarSign, 
  Megaphone, 
  Lock, 
  Users, 
  ArrowRight,
  Info,
  CheckCheck,
  Send
} from 'lucide-react';
import { AppNotification, User, SystemSettings, MemberMealSheet } from '../types';
import { useFeedback } from './FeedbackContext';
import { getRealCurrentMonth, getEffectiveDatesForMonth } from '../utils/dateUtils';

interface NotificationCenterProps {
  notifications: AppNotification[];
  currentUser: User;
  allUsers: User[];
  meals: MemberMealSheet[];
  assignedBazaarPersons: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onTriggerMealReminder: (targetUserId?: string) => void;
  onTriggerBazaarReminder: (userIds: string[], date: string) => void;
  onTriggerDepositReminder: (targetUserId?: string, customNote?: string) => void;
  onNavigateTab: (tabName: string) => void;
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  activeMonth?: string;
}

export default function NotificationCenter({
  notifications,
  currentUser,
  allUsers,
  meals,
  assignedBazaarPersons,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onTriggerMealReminder,
  onTriggerBazaarReminder,
  onTriggerDepositReminder,
  onNavigateTab,
  isOpen,
  onClose,
  currency,
  activeMonth
}: NotificationCenterProps) {
  const { showToast } = useFeedback();
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');
  const [activeTab, setActiveTab] = useState<'list' | 'trigger'>('list');

  const resolvedMonth = activeMonth || getRealCurrentMonth();
  const { tomorrow } = getEffectiveDatesForMonth(resolvedMonth);

  // Triggering form states
  const [mealTarget, setMealTarget] = useState<string>('all');
  const [bazaarDate, setBazaarDate] = useState<string>(tomorrow);
  const [depositTarget, setDepositTarget] = useState<string>('all');
  const [customDepositNote, setCustomDepositNote] = useState<string>('');

  useEffect(() => {
    setBazaarDate(tomorrow);
  }, [tomorrow]);

  // Filter notifications relevant to current user
  // (Broadcasts, or specifically targeted to this user)
  const userNotifications = notifications.filter(n => {
    return !n.targetUserId || n.targetUserId === currentUser.id;
  });

  const filteredNotifications = userNotifications.filter(n => {
    if (filter === 'Unread') return !n.isRead;
    return true;
  });

  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'MealReminder':
        return (
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20">
            <Utensils size={16} />
          </div>
        );
      case 'BazaarReminder':
        return (
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20">
            <ShoppingBag size={16} />
          </div>
        );
      case 'DepositReminder':
        return (
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
            <DollarSign size={16} />
          </div>
        );
      case 'NoticePublished':
        return (
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20">
            <Megaphone size={16} />
          </div>
        );
      case 'MonthClosed':
        return (
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 dark:bg-purple-500/20">
            <Lock size={16} />
          </div>
        );
      case 'ManagerChanged':
        return (
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 dark:bg-sky-500/20">
            <Users size={16} />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-slate-500/10 text-slate-500 dark:bg-slate-500/20">
            <Info size={16} />
          </div>
        );
    }
  };

  const formatTimeAgo = (timestampStr: string) => {
    try {
      const diffMs = Date.now() - new Date(timestampStr).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${diffDay}d ago`;
    } catch (e) {
      return 'Some time ago';
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    onMarkAsRead(n.id);
    if (n.linkToTab) {
      onNavigateTab(n.linkToTab);
      onClose();
    }
  };

  const handleSendMealReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = mealTarget === 'all' ? undefined : mealTarget;
    onTriggerMealReminder(target);
    showToast(`Successfully dispatched Meal Reminder to ${mealTarget === 'all' ? 'all active mess members' : 'selected member'}.`, 'success');
  };

  const handleSendBazaarReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerBazaarReminder(assignedBazaarPersons, bazaarDate);
    showToast(`Sent Bazaar Schedule Duty Reminder to assigned members for ${bazaarDate}.`, 'success');
  };

  const handleSendDepositReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = depositTarget === 'all' ? undefined : depositTarget;
    onTriggerDepositReminder(target, customDepositNote || undefined);
    showToast(`Deposit reminder requested and successfully transmitted to ${depositTarget === 'all' ? 'all mess members' : 'selected recipient'}.`, 'success');
    setCustomDepositNote('');
  };

  if (!isOpen) return null;

  const isPowerUser = currentUser.role === 'Admin' || currentUser.role === 'Meal Manager';

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" id="notification-center-drawer">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content body */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800 animate-slide-left z-10">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Bell size={20} />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white tracking-tight">Notification Center</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">In-App Mess Alerts</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Selector (If manager/admin) */}
        {isPowerUser && (
          <div className="px-6 pt-3 flex border-b border-slate-100 dark:border-slate-800/50">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-3 text-xs font-black tracking-wider uppercase border-b-2 transition mr-6 ${
                activeTab === 'list' 
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Inboxes ({userNotifications.length})
            </button>
            <button
              onClick={() => setActiveTab('trigger')}
              className={`pb-3 text-xs font-black tracking-wider uppercase border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'trigger' 
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Send size={12} /> Dispatch Center
            </button>
          </div>
        )}

        {/* LIST TAB VIEW */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col min-h-0">
            
            {/* Filters Bar */}
            <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/30 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('All')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                    filter === 'All' 
                      ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-white' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('Unread')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                    filter === 'Unread' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Unread
                  {unreadCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  )}
                </button>
              </div>

              {/* Action Operations */}
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={12} /> Read All
                  </button>
                )}
                {userNotifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-[11px] font-black uppercase text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1"
                    title="Purge all notifications"
                  >
                    <Trash2 size={11} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Notifications Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
              {filteredNotifications.length === 0 ? (
                <div className="py-20 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <Bell size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No alerts found</h4>
                  <p className="text-xs text-slate-400 mt-1">You are all caught up on your in-app notifications.</p>
                </div>
              ) : (
                filteredNotifications.map(n => (
                  <div 
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-5 flex gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition relative group ${
                      !n.isRead ? 'bg-emerald-500/2 shadow-xs border-l-2 border-emerald-500 dark:bg-emerald-500/[0.01]' : ''
                    }`}
                  >
                    {getNotificationIcon(n.type)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-xs text-slate-900 dark:text-white leading-snug ${!n.isRead ? 'font-black' : 'font-semibold'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap shrink-0">
                          {formatTimeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {n.description}
                      </p>

                      {/* Deep Link indicator if actionable */}
                      {n.linkToTab && (
                        <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide group-hover:translate-x-1 transition-transform">
                          <span>Review details</span>
                          <ArrowRight size={10} />
                        </div>
                      )}
                    </div>

                    {/* Single notification read toggle button */}
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 absolute right-3 top-3 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TRIGGER ALERTS TAB VIEW (MANAGER/ADMIN DISPATCH CENTER) */}
        {activeTab === 'trigger' && isPowerUser && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={13} /> Mess Dispatcher Panel
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                As a manager or administrator, you can manually broadcast custom notifications and reminders to mess residents instantly.
              </p>
            </div>

            {/* 1. DISPATCH MEAL REMINDER */}
            <form onSubmit={handleSendMealReminderSubmit} className="space-y-3 p-4.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils size={14} className="text-amber-500" /> Dispatch Meal Reminder
              </h4>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Target Member</label>
                <select
                  value={mealTarget}
                  onChange={(e) => setMealTarget(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Broadcast to All Active Members</option>
                  {allUsers.filter(u => u.isActive).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] uppercase tracking-wider py-2 rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send size={12} /> Send Meal Alert
              </button>
            </form>

            {/* 2. DISPATCH BAZAAR DUTY REMINDER */}
            <form onSubmit={handleSendBazaarReminderSubmit} className="space-y-3 p-4.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-indigo-500" /> Dispatch Bazaar Duty Alert
              </h4>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Bazaar Scheduled Date</label>
                  <input
                    type="date"
                    value={bazaarDate}
                    onChange={(e) => setBazaarDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-lg text-[10px] leading-relaxed font-semibold">
                Will automatically target scheduled bazaar persons for the specified date: <span className="font-bold">{allUsers.filter(u => assignedBazaarPersons.includes(u.id)).map(u => u.name).join(', ') || 'No one assigned'}</span>.
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-[11px] uppercase tracking-wider py-2 rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send size={12} /> Send Duty Alert
              </button>
            </form>

            {/* 3. DISPATCH DEPOSIT / LOW BALANCE REMINDER */}
            <form onSubmit={handleSendDepositReminderSubmit} className="space-y-3 p-4.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-500" /> Dispatch Deposit Request
              </h4>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Target Recipient</label>
                <select
                  value={depositTarget}
                  onChange={(e) => setDepositTarget(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Broadcast to All Mess Members</option>
                  {allUsers.filter(u => u.isActive).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Custom Addendum / Amount Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Please deposit 1500 BDT to balance account"
                  value={customDepositNote}
                  onChange={(e) => setCustomDepositNote(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] uppercase tracking-wider py-2 rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send size={12} /> Send Deposit Alert
              </button>
            </form>

          </div>
        )}

        {/* Drawer Footer Status bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          <span>Logged in as: {currentUser.name} ({currentUser.role})</span>
        </div>

      </div>
    </div>
  );
}
