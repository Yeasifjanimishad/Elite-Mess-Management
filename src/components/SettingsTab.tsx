import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Lock, 
  Unlock, 
  Database, 
  RefreshCcw, 
  Save, 
  Globe, 
  ShieldAlert, 
  Sun, 
  Moon, 
  Download, 
  Upload, 
  Palette, 
  Check,
  Shield,
  Coins,
  Megaphone,
  Users,
  CreditCard,
  Sliders,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { SystemSettings, UserRole } from '../types';
import {
  formatMonthLabel,
  getNextMonth,
  getRealCurrentMonth,
  parseTime24To12,
  formatTime12To24
} from '../utils/dateUtils';

interface SettingsTabProps {
  role: UserRole;
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  onStartNewMonth?: (targetMonth?: string, options?: { autoCloseAndCarryForward?: boolean }) => void;
  activeTheme?: SystemSettings['theme'];
  onChangeUserTheme?: (theme: NonNullable<SystemSettings['theme']>) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onRestoreBackup?: (backupData: any) => void;
  allDataToBackup?: {
    users: any[];
    meals: any[];
    deposits: any[];
    bazaarEntries: any[];
    expenses: any[];
    notices: any[];
    activityLogs: any[];
    vacations: any[];
    assignedBazaarPersons: string[];
    settings?: SystemSettings;
  };
}

const themeOptions = [
  { 
    id: 'Light', 
    name: 'Light Slate', 
    desc: 'Sleek off-white theme with gray borders',
    cardStyles: 'bg-slate-50 border-slate-200 text-slate-800',
    titleStyles: 'text-slate-900',
    descStyles: 'text-slate-500',
    dots: ['bg-slate-100', 'bg-slate-300', 'bg-emerald-500']
  },
  { 
    id: 'Dark', 
    name: 'Charcoal Dark', 
    desc: 'Classic, highly legible eye-safe dark theme',
    cardStyles: 'bg-slate-900 border-slate-800 text-slate-100',
    titleStyles: 'text-white',
    descStyles: 'text-slate-400',
    dots: ['bg-slate-950', 'bg-slate-700', 'bg-emerald-500']
  },
  { 
    id: 'Cosmic Slate', 
    name: 'Cosmic Slate', 
    desc: 'Futuristic slate mixed with deep indigo hues',
    cardStyles: 'bg-[#030014] border-indigo-950/45 text-indigo-100',
    titleStyles: 'text-indigo-300 font-extrabold',
    descStyles: 'text-indigo-400/80',
    dots: ['bg-[#030014]', 'bg-indigo-950', 'bg-indigo-500']
  },
  { 
    id: 'Emerald Forest', 
    name: 'Emerald Forest', 
    desc: 'Rich pine forest backgrounds with fresh moss highlights',
    cardStyles: 'bg-[#022c16] border-emerald-950/45 text-emerald-100',
    titleStyles: 'text-emerald-300 font-extrabold',
    descStyles: 'text-emerald-400/80',
    dots: ['bg-[#022c16]', 'bg-emerald-900', 'bg-emerald-500']
  },
  { 
    id: 'Rose Quartz', 
    name: 'Rose Quartz (Pink)', 
    desc: 'Delicate pink accents with dark cherry-blossom tones',
    cardStyles: 'bg-[#1c0612] border-pink-950/45 text-pink-100',
    titleStyles: 'text-pink-300 font-extrabold',
    descStyles: 'text-pink-400/80',
    dots: ['bg-[#1c0612]', 'bg-pink-950', 'bg-pink-500']
  }
];

export default function SettingsTab({
  role,
  settings,
  onUpdateSettings,
  onStartNewMonth,
  activeTheme,
  onChangeUserTheme,
  darkMode,
  setDarkMode,
  onRestoreBackup,
  allDataToBackup
}: SettingsTabProps) {

  const isAdmin = role === 'Admin';
  const isBangla = settings.language === 'Bangla';
  const activeMonth = settings.activeMonth || getRealCurrentMonth();
  const nextMonth = getNextMonth(activeMonth);
  const activeMonthLabel = formatMonthLabel(activeMonth, settings.language);
  const nextMonthLabel = formatMonthLabel(nextMonth, settings.language);

  // Form states
  const [formData, setFormData] = useState<SystemSettings>({
    ...settings,
    activeMonth,
    theme: settings.theme || 'Light',
    mgrCanApproveBazaar: settings.mgrCanApproveBazaar ?? true,
    mgrCanAddDeposit: settings.mgrCanAddDeposit ?? true,
    mgrCanAddExpense: settings.mgrCanAddExpense ?? true,
    mgrCanManageUsers: settings.mgrCanManageUsers ?? false,
    mgrCanPublishNotice: settings.mgrCanPublishNotice ?? true,
  });

  const [selectedTargetMonth, setSelectedTargetMonth] = useState<string>(activeMonth);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const resolvedMonth = settings.activeMonth || getRealCurrentMonth();
    setSelectedTargetMonth(resolvedMonth);
    setFormData(prev => ({
      ...prev,
      ...settings,
      activeMonth: resolvedMonth,
      theme: settings.theme || 'Light',
      mgrCanApproveBazaar: settings.mgrCanApproveBazaar ?? true,
      mgrCanAddDeposit: settings.mgrCanAddDeposit ?? true,
      mgrCanAddExpense: settings.mgrCanAddExpense ?? true,
      mgrCanManageUsers: settings.mgrCanManageUsers ?? false,
      mgrCanPublishNotice: settings.mgrCanPublishNotice ?? true,
    }));
  }, [settings]);

  const handleChange = (key: keyof SystemSettings, val: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setMessage({ text: isBangla ? 'অননুমোদিত! শুধুমাত্র অ্যাডমিন কনফিগারেশন সংরক্ষণ করতে পারেন।' : 'Unauthorized! Only system Admins can save global configurations.', type: 'error' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    onUpdateSettings(formData);
    
    // Automatically trigger dark mode state sync based on the theme
    if (formData.theme === 'Light') {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }

    setMessage({ 
      text: isBangla 
        ? 'সিস্টেম কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে!' 
        : 'System configuration saved successfully. Styles and variables updated.', 
      type: 'success' 
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Close Month / Reopen month triggers
  const handleToggleMonthClose = () => {
    if (!isAdmin) {
      setMessage({ text: isBangla ? 'অননুমোদিত! শুধুমাত্র অ্যাডমিন এই মাসের স্থিতি পরিবর্তন করতে পারেন।' : 'Unauthorized! Only system Admins can toggle closed months.', type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    const nextState = !settings.isMonthClosed;
    const updated = {
      ...formData,
      isMonthClosed: nextState
    };

    setFormData(updated);
    onUpdateSettings(updated);

    setMessage({ 
      text: nextState 
        ? (isBangla ? 'মাস সফলভাবে বন্ধ করা হয়েছে। সমস্ত ডেটা এখন লক করা আছে।' : 'Month closed successfully. All ledgers and meal sheets are now locked read-only.')
        : (isBangla ? 'মাস সফলভাবে পুনরায় খোলা হয়েছে।' : 'Month unlocked successfully by administrator.'), 
      type: 'success' 
    });
    setTimeout(() => setMessage(null), 4000);
  };

  // Database Backup 100% REAL snapshot downloader
  const [backingUp, setBackingUp] = useState(false);
  const handleBackup = () => {
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      
      // Package entire application state
      const backupPayload = {
        meta: {
          exporter: role,
          timestamp: new Date().toISOString(),
          version: '2.0.0-MMS-FULL',
          systemName: settings.systemName
        },
        payload: allDataToBackup || {
          settings,
          users: [],
          meals: [],
          deposits: [],
          bazaarEntries: [],
          expenses: [],
          notices: [],
          activityLogs: [],
          vacations: [],
          assignedBazaarPersons: []
        }
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${settings.systemName.replace(/\s+/g, '_')}_DB_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage({ 
        text: isBangla 
          ? 'সম্পূর্ণ সিস্টেম ডাটাবেস ব্যাকআপ সফলভাবে ডাউনলোড করা হয়েছে!' 
          : 'Full system database backup file downloaded successfully.', 
        type: 'success' 
      });
      setTimeout(() => setMessage(null), 3500);
    }, 1000);
  };

  // Database Restore 100% REAL file uploader & parser
  const [restoring, setRestoring] = useState(false);

  const handleRestoreClick = () => {
    if (!isAdmin) {
      setMessage({ text: isBangla ? 'অননুমোদিত! ব্যাকআপ পুনরুদ্ধার করতে অ্যাডমিন হতে হবে।' : 'Unauthorized! Only Admins are allowed to restore system states.', type: 'error' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Validation check
        if (!parsed.payload || !parsed.payload.users || !parsed.payload.settings) {
          throw new Error('Invalid backup file structure. Missing users or settings configuration.');
        }

        if (onRestoreBackup) {
          onRestoreBackup(parsed.payload);
          setFormData({ ...parsed.payload.settings });
          setMessage({ 
            text: isBangla 
              ? 'সিস্টেম ডাটাবেস সফলভাবে পূর্বাবস্থায় ফিরিয়ে আনা হয়েছে!' 
              : 'Database snapshots restored successfully! All tables updated.', 
            type: 'success' 
          });
        } else {
          setMessage({ text: 'Backup restore callback is not wired up. Re-instantiating state.', type: 'error' });
        }
      } catch (err: any) {
        setMessage({ text: `Restore failed: ${err.message || 'Malformed JSON file'}`, type: 'error' });
      } finally {
        setRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6" id="settings-tab">
      
      {message && (
        <div className={`p-4 border text-sm rounded-xl flex items-center justify-between animate-fade-in ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-400'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold select-none cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* ADMIN STATUS ALERTS */}
      {!isAdmin && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs rounded-xl flex items-center gap-2">
          <ShieldAlert size={16} className="shrink-0" />
          <span>
            {isBangla 
              ? 'পার্সোনাল থিম আনলকড: আপনি নিচে থেকে নিজের জন্য পছন্দের থিম বেছে নিতে পারবেন। তবে মেসের গ্লোবাল সিস্টেম সেটিংস ও পারমিশন শুধুমাত্র অ্যাডমিন পরিবর্তন করতে পারেন।'
              : 'Personal Theme Unlocked: You can freely change your own visual theme below anytime. Global mess configuration and permissions remain Admin-only.'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT & CENTER COLUMN: GENERAL SETTINGS FORM */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings size={20} className="text-emerald-600 dark:text-emerald-400" />
                {isBangla ? 'সাধারণ সেটিংস কনফিগারেশন' : 'General Configuration Parameters'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBangla 
                  ? 'আপনার মেস ম্যানেজমেন্টের মূল প্যারামিটারগুলো আপডেট করুন। অ্যাডমিন সংরক্ষণের পর এটি লাইভ হয়ে যাবে।'
                  : 'Customize the operational parameters of your digital mess. Administrative updates are pushed live to all boards.'}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              
              {/* SYSTEM NAME & LOCK TIME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'মেসের নাম' : 'System Mess Name'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={formData.systemName}
                    onChange={(e) => handleChange('systemName', e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'মিল লক করার সময় (১২ ঘণ্টা)' : 'Daily Meal Lock Time (12h format)'}
                  </label>
                  {(() => {
                    const { hour12, minute, period } = parseTime24To12(formData.mealLockTime);
                    return (
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          aria-label="Lock hour"
                          disabled={!isAdmin}
                          value={hour12}
                          onChange={(e) =>
                            handleChange(
                              'mealLockTime',
                              formatTime12To24(Number(e.target.value), minute, period)
                            )
                          }
                          className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h}>
                              {String(h).padStart(2, '0')}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label="Lock minute"
                          disabled={!isAdmin}
                          value={minute}
                          onChange={(e) =>
                            handleChange(
                              'mealLockTime',
                              formatTime12To24(hour12, Number(e.target.value), period)
                            )
                          }
                          className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          {Array.from({ length: 60 }, (_, m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, '0')}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label="Lock AM or PM"
                          disabled={!isAdmin}
                          value={period}
                          onChange={(e) =>
                            handleChange(
                              'mealLockTime',
                              formatTime12To24(hour12, minute, e.target.value as 'AM' | 'PM')
                            )
                          }
                          className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* CURRENCY, GUEST MEAL LIMIT & LANGUAGE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'মুদ্রার প্রতীক' : 'Currency Symbol'}
                  </label>
                  <select
                    disabled={!isAdmin}
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="৳">৳ (BDT Taka)</option>
                    <option value="$">$ (USD Dollar)</option>
                    <option value="₹">₹ (INR Rupee)</option>
                    <option value="€">€ (EUR Euro)</option>
                    <option value="£">£ (GBP Pound)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'সর্বোচ্চ অতিথি মিল' : 'Max Guest Meals / Day'}
                  </label>
                  <input
                    type="number"
                    required
                    disabled={!isAdmin}
                    value={formData.guestMealLimit}
                    onChange={(e) => handleChange('guestMealLimit', Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'ডিফল্ট ভাষা' : 'Default Language'}
                  </label>
                  <select
                    disabled={!isAdmin}
                    value={formData.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="English">English (US)</option>
                    <option value="Bangla">Bangla (বাঙালি)</option>
                  </select>
                </div>
              </div>

              {/* DEFAULT MEAL RESERVATION STATUS */}
              <div className="p-3.5 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={formData.defaultMealOn}
                    onChange={(e) => handleChange('defaultMealOn', e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                      {isBangla ? 'ডিফল্ট মিল রিজার্ভেশন চালু রাখুন (সব সময় সক্রিয়)' : 'Default Meal Reservation Status (AUTO-ON)'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                      {isBangla 
                        ? 'সক্রিয় মেম্বারদের জন্য প্রতিদিন সকালে প্রাতরাশ, দুপুরের খাবার এবং রাতের খাবার স্বয়ংক্রিয়ভাবে সক্রিয় হিসেবে শুরু হবে।'
                        : 'All active members start with Breakfast, Lunch, and Dinner reservations marked ON each morning.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* VISUAL THEME SELECTION PANEL (UNLOCKED FOR ALL USERS) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {isBangla ? 'আপনার ব্যক্তিগত থিম প্রিসেট' : 'Your Personal Theme Preset'}
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {isBangla 
                        ? 'সব সদস্য এবং ম্যানেজার নিজের পছন্দমতো থিম বেছে নিতে পারবেন—ক্লিক করলেই সাথে সাথে আপনার প্রোফাইলে সেভ হবে।'
                        : 'Every member, manager, and admin can customize their own visual theme here—clicking any theme applies immediately.'}
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
                    {isBangla ? 'সবার জন্য উন্মুক্ত' : 'Everyone Can Customize'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {themeOptions.map((opt) => {
                    const currentSelectedTheme = activeTheme || formData.theme || 'Light';
                    const isSelected = currentSelectedTheme === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          const chosen = opt.id as NonNullable<SystemSettings['theme']>;
                          if (onChangeUserTheme) {
                            onChangeUserTheme(chosen);
                          }
                          if (isAdmin) {
                            handleChange('theme', chosen);
                          }
                          setMessage({
                            text: isBangla
                              ? `আপনার থিম "${opt.name}"-এ পরিবর্তন করা হয়েছে!`
                              : `Your personal theme switched to "${opt.name}"!`,
                            type: 'success'
                          });
                          setTimeout(() => setMessage(null), 2500);
                        }}
                        className={`border rounded-xl p-3.5 flex flex-col justify-between transition h-28 relative cursor-pointer ${opt.cardStyles} ${
                          isSelected 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${opt.titleStyles}`}>{opt.name}</span>
                          {isSelected && (
                            <span className="bg-emerald-500 text-white rounded-full p-0.5 flex items-center justify-center">
                              <Check size={10} />
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] leading-tight pr-4 ${opt.descStyles}`}>{opt.desc}</p>
                        
                        {/* Mini Color Dots preview */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {opt.dots.map((d, i) => (
                            <span key={i} className={`w-2.5 h-2.5 rounded-full ${d} border border-white/10`}></span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              {isAdmin && (
                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/10 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Save size={14} /> {isBangla ? 'কনফিগারেশন সংরক্ষণ করুন' : 'Save System Settings'}
                  </button>
                </div>
              )}

            </form>
          </div>

          {/* MANAGER PERMISSIONS CONTROL BOARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders size={20} className="text-indigo-600 dark:text-indigo-400" />
                {isBangla ? 'ম্যানেজার অ্যাক্সেস পারমিশন' : 'Manager Permissions Panel'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBangla 
                  ? 'মৌলিক পরিচালনা কার্যাবলীর জন্য মিল ম্যানেজার (Meal Manager) কী কী করতে পারবেন তা নির্ধারণ করুন।'
                  : 'Toggle operational capabilities for users assigned to the "Meal Manager" administration role.'}
              </p>
            </div>

            <div className="space-y-4">
              
              {/* Permission Item: Approve Bazaar */}
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/60 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-slate-500 dark:text-slate-400">
                    <Coins size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {isBangla ? 'বাজার খরচ অনুমোদন' : 'Approve Bazaar Ledger Entries'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {isBangla ? 'ম্যানেজার মেম্বারদের বাজার খরচ অনুমোদন ও রিজেক্ট করতে পারবেন।' : 'Allows managers to transition bazaar sheets from Pending to Approved.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleChange('mgrCanApproveBazaar', !formData.mgrCanApproveBazaar)}
                  className={`w-11 h-6 rounded-full transition relative p-0.5 cursor-pointer disabled:cursor-not-allowed ${
                    formData.mgrCanApproveBazaar ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition duration-200 ${
                    formData.mgrCanApproveBazaar ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Permission Item: Add Deposit */}
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/60 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-slate-500 dark:text-slate-400">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {isBangla ? 'আমানত যোগ ও অনুমোদন' : 'Add & Approve Member Deposits'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {isBangla ? 'ম্যানেজার সদস্যদের ডিপোজিট রিকোয়েস্ট সরাসরি যোগ এবং এপ্রুভ করতে পারবেন।' : 'Allows managers to confirm member balances and verify deposit slips.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleChange('mgrCanAddDeposit', !formData.mgrCanAddDeposit)}
                  className={`w-11 h-6 rounded-full transition relative p-0.5 cursor-pointer disabled:cursor-not-allowed ${
                    formData.mgrCanAddDeposit ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition duration-200 ${
                    formData.mgrCanAddDeposit ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Permission Item: Add Expense */}
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/60 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-slate-500 dark:text-slate-400">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {isBangla ? 'ইউটিলিটি ও গ্যাস বিল খরচ যুক্তকরণ' : 'Record Overhead Expenses'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {isBangla ? 'ম্যানেজার গ্যাস, ইন্টারনেট, বিদ্যুৎ ইত্যাদি অতিরিক্ত বিলের খরচ লিখতে পারবেন।' : 'Allows managers to add double burner cylinder gas or internet bills.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleChange('mgrCanAddExpense', !formData.mgrCanAddExpense)}
                  className={`w-11 h-6 rounded-full transition relative p-0.5 cursor-pointer disabled:cursor-not-allowed ${
                    formData.mgrCanAddExpense ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition duration-200 ${
                    formData.mgrCanAddExpense ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Permission Item: Manage Users */}
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/60 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-slate-500 dark:text-slate-400">
                    <Users size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {isBangla ? 'সদস্য তালিকা ও ইউজার পরিচালনা' : 'User Profiles & Member Registration'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {isBangla ? 'ম্যানেজার নতুন মেম্বার নিবন্ধন করতে পারবেন এবং প্রোফাইল পরিবর্তন করতে পারবেন।' : 'Grants managers access to the Member Registry to register new roommates.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleChange('mgrCanManageUsers', !formData.mgrCanManageUsers)}
                  className={`w-11 h-6 rounded-full transition relative p-0.5 cursor-pointer disabled:cursor-not-allowed ${
                    formData.mgrCanManageUsers ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition duration-200 ${
                    formData.mgrCanManageUsers ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Permission Item: Publish Notice */}
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/60 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-slate-500 dark:text-slate-400">
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {isBangla ? 'নোটিশ বোর্ডে ঘোষণা প্রকাশ' : 'Publish Notice Board Announcements'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {isBangla ? 'ম্যানেজার বোর্ডে নতুন ঘোষণা নোটিশ দিতে পারবেন এবং পিন করতে পারবেন।' : 'Allows managers to dispatch community bulletins or pin Friday Feast announcements.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleChange('mgrCanPublishNotice', !formData.mgrCanPublishNotice)}
                  className={`w-11 h-6 rounded-full transition relative p-0.5 cursor-pointer disabled:cursor-not-allowed ${
                    formData.mgrCanPublishNotice ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition duration-200 ${
                    formData.mgrCanPublishNotice ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>

            {isAdmin && (
              <div className="flex justify-end pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={handleSave}
                  type="button"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/10 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Shield size={14} /> {isBangla ? 'অনুমতি সংরক্ষণ করুন' : 'Apply Manager Permissions'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE MONTH ROLLOVER, CLOSING & BACKUPS */}
        <div className="space-y-6">

          {/* CARD 0: ACTIVE BILLING MONTH & ROLLOVER */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                <Calendar size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                {isBangla ? 'চলতি বিলিং মাস ও রোলওভার' : 'Active Billing Month'}
              </h4>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                settings.isMonthClosed
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                {settings.isMonthClosed ? (isBangla ? 'ক্লোজড' : 'Closed') : (isBangla ? 'চালু (Open)' : 'Open')}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {isBangla ? 'বর্তমান সক্রিয় মাস:' : 'Current Cycle:'}
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {activeMonthLabel}
              </span>
            </div>

            {isAdmin && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'নির্দিষ্ট মাস সেট করুন (যেমন: আগস্ট)' : 'Switch to Specific Month'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="month"
                      value={selectedTargetMonth}
                      onChange={(e) => setSelectedTargetMonth(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={!selectedTargetMonth || selectedTargetMonth === activeMonth}
                      onClick={() => {
                        if (!selectedTargetMonth || selectedTargetMonth === activeMonth) return;
                        if (onStartNewMonth) {
                          onStartNewMonth(selectedTargetMonth, { autoCloseAndCarryForward: !settings.isMonthClosed });
                        } else {
                          const updated = { ...formData, activeMonth: selectedTargetMonth, isMonthClosed: false };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isBangla ? 'সেট করুন' : 'Apply'}
                    </button>
                  </div>
                </div>

                {onStartNewMonth && (
                  <button
                    type="button"
                    onClick={() => onStartNewMonth(nextMonth, { autoCloseAndCarryForward: !settings.isMonthClosed })}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/15 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ArrowRight size={14} />
                    <span>
                      {settings.isMonthClosed
                        ? (isBangla ? `পরবর্তী মাস শুরু করুন (${nextMonthLabel})` : `Start Next Month (${nextMonthLabel})`)
                        : (isBangla ? `চলতি মাস ক্লোজ ও ${nextMonthLabel} শুরু` : `Close & Start ${nextMonthLabel}`)}
                    </span>
                  </button>
                )}

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {isBangla
                    ? 'রোলওভার করলে চলতি মাসের বকেয়া/উদ্বৃত্ত ব্যালেন্স স্বয়ংক্রিয়ভাবে ক্যারী ফরওয়ার্ড হয়ে নতুন মাসের মিল শিট তৈরি হবে।'
                    : 'Rolling over calculates ending member balances into Carry Forward, archives the closing snapshot, and initializes a fresh month calendar.'}
                </p>

                {settings.closedMonths && settings.closedMonths.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{isBangla ? 'আর্কাইভকৃত ক্লোজড মাস:' : 'Archived Closed Months:'}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{settings.closedMonths.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CARD 1: MONTH CLOSING PROCEDURES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
              <ShieldAlert size={18} className="text-rose-500 shrink-0" />
              {isBangla ? 'মাসিক হিসাব সমাপ্তি লক' : 'Month Closing Lockdown'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isBangla 
                ? 'মাস ক্লোজ করলে বাজার খরচ, মিল শিট এবং ডিপোজিট পুরোপুরি লক হয়ে যাবে। অ্যাডমিন ছাড়া অন্য কেউ আর কোনো হিসাব এডিট করতে পারবেন না।'
                : 'Closing the active month locks all database tables. All ledger lists, meal counts, and deposit records will become immutable read-only snapshots.'}
            </p>

            <div className="pt-1.5">
              {isAdmin ? (
                <button
                  onClick={handleToggleMonthClose}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
                    settings.isMonthClosed
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/15'
                      : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800'
                  }`}
                >
                  {settings.isMonthClosed ? (
                    <>
                      <Unlock size={14} /> {isBangla ? `${activeMonthLabel} পুনরায় চালু করুন` : `Unlock & Reopen ${activeMonthLabel}`}
                    </>
                  ) : (
                    <>
                      <Lock size={14} /> {isBangla ? `${activeMonthLabel} বন্ধ ও লক করুন` : `Lock & Close ${activeMonthLabel}`}
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                    {isBangla ? 'মেস মাসের স্ট্যাটাস' : 'Ecosystem Locker Status'}
                  </span>
                  <span className={`text-xs font-black uppercase mt-1 block ${settings.isMonthClosed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {settings.isMonthClosed 
                      ? (isBangla ? '🔒 মাস বন্ধ (Locked)' : '🔒 LOCKED ARCHIVE')
                      : (isBangla ? '🔓 মাস চালু (Open)' : '🔓 OPEN ACTIVE')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: REAL SNAPSHOT DATA BACKUPS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
              <Database size={18} className="text-slate-400 dark:text-slate-500 shrink-0" />
              {isBangla ? 'ডাটাবেস ব্যাকআপ ও পুনরুদ্ধার' : 'Database Backups & Snapshot'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isBangla 
                ? 'আপনার মেস সিস্টেমের সমস্ত মেম্বার, মিল শিট, বাজার খরচ এবং জমা হিসাবের একটি নিরাপদ অফলাইন ব্যাকআপ ফাইল (.json) ডাউনলোড বা আপলোড করুন।'
                : 'Instantly download or restore a complete JSON state machine. Backups bundle all tables, users, vacation trackers, and setting configurations.'}
            </p>

            <div className="flex flex-col gap-2 pt-1.5">
              {/* Backup Trigger */}
              <button
                onClick={handleBackup}
                disabled={backingUp}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download size={14} className={backingUp ? 'animate-bounce' : ''} />
                <span>{isBangla ? 'ব্যাকআপ ডাউনলোড করুন' : 'Download JSON Backup'}</span>
              </button>
              
              {/* Restore Trigger */}
              <button
                onClick={handleRestoreClick}
                disabled={restoring || !isAdmin}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title={isAdmin ? "Upload a prior backup to restore system state" : "Restore requires Admin permissions"}
              >
                <Upload size={14} className={restoring ? 'animate-spin' : ''} />
                <span>{isBangla ? 'ব্যাকআপ থেকে রিস্টোর করুন' : 'Restore Database File'}</span>
              </button>

              {/* Hidden file input for file uploading */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="restore-file-input"
              />
            </div>
            {restoring && (
              <p className="text-[10px] text-emerald-600 text-center animate-pulse">
                {isBangla ? 'ডাটাবেস টেবিল লোড করা হচ্ছে...' : 'Restoring file snapshots...'}
              </p>
            )}
          </div>

          {/* CARD 3: AUDITING INFORMATION ACCENTS */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Diagnostics</span>
            <div className="space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Active Core:</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">Node-v18-LTS</span>
              </div>
              <div className="flex justify-between">
                <span>Memory Store:</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">LocalStorage Cache</span>
              </div>
              <div className="flex justify-between">
                <span>Ecosystem ID:</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold text-right truncate max-w-[120px]" title="d0950ec3-39cf-4ad6-bb40-24576efde5d7">
                  d0950ec3
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
