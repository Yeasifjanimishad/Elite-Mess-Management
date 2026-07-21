import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Mail, FlameKindling, AlertCircle, ArrowRight, Sparkles, CheckCircle2, Languages } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginScreenProps {
  allUsers: UserType[];
  onLoginSuccess: (user: UserType) => void;
  language: 'English' | 'Bangla';
  onLanguageChange: (lang: 'English' | 'Bangla') => void;
}

const translations = {
  Bangla: {
    title: "এলিট মেস ম্যানেজমেন্ট সিস্টেম",
    subtitle: "মেস ম্যানেজমেন্ট সিস্টেম গেটওয়ে",
    easyLoginTitle: "লগইন করার সহজ উপায় (One-Click Auto Login)",
    easyLoginDesc: "নিচের তালিকা থেকে যেকোনো একটি প্রোফাইলের ওপর ক্লিক করুন এবং সাথে সাথে সিস্টেমে প্রবেশ করুন! কোনো পাসওয়ার্ড লিখতে হবে না।",
    defaultPin: "সব অ্যাকাউন্টের সিকিউরিটি পিন (PIN):",
    instantLoginHeader: "পছন্দের প্রোফাইল সিলেক্ট করে সরাসরি প্রবেশ করুন:",
    roleAdmin: "অ্যাডমিন",
    roleManager: "মেস ম্যানেজার",
    roleMember: "মেম্বার / সদস্য",
    loginBtn: "লগইন করুন",
    tabPin: "প্রোফাইল সিলেক্ট করে PIN দিন",
    tabEmail: "ইমেইল লিখে লগইন",
    selectProfile: "ইউজার প্রোফাইল নির্বাচন করুন",
    emailLabel: "ইমেইল ঠিকানা",
    pinLabel: "নিরাপত্তা পিন কোড",
    enterBtn: "প্রবেশ করুন",
    or: "অথবা",
    profileNotFound: "প্রোফাইল খুঁজে পাওয়া যায়নি। এই ইমেইল দিয়ে কোনো ইউজার নিবন্ধিত নেই।",
    deactivated: "এই অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে। মেস ম্যানেজারের সাথে যোগাযোগ করুন।",
    incorrectPin: "ভুল পিন কোড, আবার চেষ্টা করুন।"
  },
  English: {
    title: "Elite Mess Management System",
    subtitle: "Mess Management Gateway",
    easyLoginTitle: "Easy Login System (One-Click Auto Login)",
    easyLoginDesc: "Click any profile card below for instant auto-login! No password required for testing.",
    defaultPin: "All accounts security PIN:",
    instantLoginHeader: "Choose an active profile to enter instantly:",
    roleAdmin: "Admin",
    roleManager: "Meal Manager",
    roleMember: "Member",
    loginBtn: "Login",
    tabPin: "Select Profile & Enter PIN",
    tabEmail: "Manual Email Login",
    selectProfile: "Select User Profile",
    emailLabel: "Email Address",
    pinLabel: "Security PIN Code",
    enterBtn: "Authenticate & Enter",
    or: "OR",
    profileNotFound: "Profile not found. No registered user found with this email.",
    deactivated: "This account has been deactivated. Please contact the manager.",
    incorrectPin: "Incorrect security PIN. Please try again."
  }
};

export default function LoginScreen({ allUsers, onLoginSuccess, language, onLanguageChange }: LoginScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('u-1');
  const [emailInput, setEmailInput] = useState<string>('asif@mms.com');
  const [pinInput, setPinInput] = useState<string>('1234');
  const [error, setError] = useState<string>('');
  const [isManualEmail, setIsManualEmail] = useState<boolean>(false);

  const t = translations[language];

  // Filter only active users for login
  const activeUsers = allUsers.filter(u => u.isActive);

  const handleQuickSelect = (user: UserType) => {
    setSelectedUserId(user.id);
    setEmailInput(user.email);
    setPinInput(user.pin || '1234');
    setError('');
  };

  const handleInstantLogin = (user: UserType) => {
    onLoginSuccess(user);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let targetUser: UserType | undefined;
    if (isManualEmail || !selectedUserId) {
      targetUser = allUsers.find(u => u.email.toLowerCase().trim() === emailInput.toLowerCase().trim());
    } else {
      targetUser = allUsers.find(u => u.id === selectedUserId);
    }

    if (!targetUser) {
      setError(t.profileNotFound);
      return;
    }

    if (!targetUser.isActive) {
      setError(t.deactivated);
      return;
    }

    const expectedPin = targetUser.pin || '1234';

    if (pinInput !== expectedPin) {
      setError(t.incorrectPin);
      return;
    }

    onLoginSuccess(targetUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 transition-colors duration-300 font-sans">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-10 space-y-8 relative">
        
        {/* Language Selection Bar at top-right */}
        <div className="flex justify-end items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">
            <Languages size={15} className="text-emerald-600" />
            <span>Language:</span>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onLanguageChange('Bangla')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                language === 'Bangla'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('English')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                language === 'English'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-500/20">
            <FlameKindling size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.title}
          </h1>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-widest">
            {t.subtitle}
          </p>
        </div>

        {/* Security Credentials & Instructions Notice */}
        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl p-5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-3 animate-fade-in">
          <div className="flex gap-3 items-start">
            <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-base text-emerald-800 dark:text-emerald-300 block mb-1">
                {t.easyLoginTitle}
              </span>
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                {t.easyLoginDesc}
              </p>
            </div>
          </div>
          
          <div className="pt-2.5 border-t border-emerald-500/15 flex flex-wrap gap-2 text-xs font-bold justify-between items-center text-emerald-800 dark:text-emerald-300">
            <span>{t.defaultPin} <span className="underline font-black text-sm text-emerald-600 dark:text-emerald-400">1234</span></span>
            <span className="bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Default PIN: 1234</span>
          </div>
        </div>

        {/* PROFILE SELECTOR SECTION WITH INSTANT ONE-CLICK LOGIN */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="text-amber-500" size={16} />
            {t.instantLoginHeader}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeUsers.map((user) => {
              const roleColors = {
                'Admin': 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/50',
                'Meal Manager': 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50',
                'Member': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50'
              };
              
              const roleLabel = language === 'Bangla'
                ? (user.role === 'Admin' ? t.roleAdmin : user.role === 'Meal Manager' ? t.roleManager : t.roleMember)
                : user.role;
              
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleInstantLogin(user)}
                  className="flex flex-col text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all duration-200 shadow-xs hover:shadow-md group relative cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full">
                    <img 
                      src={user.avatarUrl} 
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/10" 
                      alt={user.name} 
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {user.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block truncate font-medium">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between w-full">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${roleColors[user.role as keyof typeof roleColors] || ''}`}>
                      {roleLabel}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      {language === 'Bangla' ? 'প্রবেশ করুন' : 'Auto Login'} <ArrowRight size={12} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SEPARATOR OR MANUAL PIN MODE */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{t.or}</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        {/* Tab switcher: Quick Profile Tap vs Manual Email */}
        <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsManualEmail(false);
              setError('');
            }}
            className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition-all duration-150 ${
              !isManualEmail 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.tabPin}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsManualEmail(true);
              setError('');
            }}
            className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition-all duration-150 ${
              isManualEmail 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.tabEmail}
          </button>
        </div>

        {/* MANUAL FORM FOR PIN LOGIN */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Quick Select dropdown if manual email is false */}
          {!isManualEmail ? (
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.selectProfile}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  const u = activeUsers.find(x => x.id === e.target.value);
                  if (u) handleQuickSelect(u);
                }}
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role}) - {user.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Manual Email Input */
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="name@mms.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* PIN Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              {t.pinLabel}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                maxLength={8}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 tracking-widest font-black"
              />
            </div>
          </div>

          {/* Display Error if any */}
          {error && (
            <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15 p-4 rounded-2xl text-xs font-extrabold flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isManualEmail && !selectedUserId}
            className={`w-full py-3.5 text-sm font-black uppercase tracking-wider rounded-xl text-white shadow-lg transition-all cursor-pointer ${
              (!isManualEmail && !selectedUserId)
                ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
            }`}
          >
            {t.enterBtn}
          </button>

        </form>
      </div>
    </div>
  );
}
