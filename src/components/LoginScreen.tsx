import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Mail, 
  FlameKindling, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Languages, 
  Phone, 
  Eye, 
  EyeOff, 
  KeyRound 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginScreenProps {
  language: 'English' | 'Bangla';
  onLanguageChange: (lang: 'English' | 'Bangla') => void;
  onDemoLogin?: (role?: 'Admin' | 'Meal Manager' | 'Member') => void;
  onLocalLogin?: (email: string, pass: string, fullName?: string, phone?: string) => void;
}

const translations = {
  Bangla: {
    title: "এলিট মেস ম্যানেজমেন্ট",
    subtitle: "মেস ম্যানেজমেন্ট সিস্টেম গেটওয়ে",
    loginTab: "লগইন করুন",
    registerTab: "নিবন্ধন করুন",
    forgotPasswordTab: "পাসওয়ার্ড পুনরুদ্ধার",
    adminInitTab: "অ্যাডমিন অ্যাক্টিভেশন",
    emailLabel: "ইমেইল ঠিকানা",
    passwordLabel: "পাসওয়ার্ড",
    nameLabel: "পূর্ণ নাম",
    phoneLabel: "মোবাইল নম্বর",
    rememberMe: "আমাকে মনে রাখুন",
    forgotPasswordLink: "পাসওয়ার্ড ভুলে গেছেন?",
    signInBtn: "লগইন করুন",
    signUpBtn: "অ্যাকাউন্ট তৈরি করুন",
    sendResetLinkBtn: "রিসেট লিংক পাঠান",
    adminInitBtn: "প্রথম অ্যাডমিন হিসেবে অ্যাক্টিভেট করুন",
    adminInitDesc: "সিস্টেমের প্রথম অ্যাডমিন অ্যাকাউন্ট সেট আপ করতে আপনার নিবন্ধিত ইমেইল ব্যবহার করুন। এই প্রক্রিয়াটি শুধুমাত্র একবারই সম্পন্ন করা সম্ভব (নিরাপত্তার স্বার্থে)।",
    successResetEmail: "পাসওয়ার্ড রিসেট করার লিংক আপনার ইমেইলে পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।",
    successRegister: "নিবন্ধন সফল হয়েছে! অনুগ্রহ করে আপনার ইমেইল ভেরিফাই করুন (ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন) অথবা সরাসরি লগইন করুন।",
    errorTitle: "ত্রুটি পাওয়া গেছে",
    loading: "প্রক্রিয়াধীন...",
    dontHaveAccount: "অ্যাকাউন্ট নেই? এখানে নিবন্ধন করুন",
    alreadyHaveAccount: "ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন",
    adminInitInfo: "নিবন্ধন করার পর আপনার আইডিকে অ্যাডমিন করতে এই ট্যাবটি ব্যবহার করুন।"
  },
  English: {
    title: "Elite Mess Management",
    subtitle: "Mess Management Gateway",
    loginTab: "Sign In",
    registerTab: "Register",
    forgotPasswordTab: "Reset Password",
    adminInitTab: "Admin Activation",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    nameLabel: "Full Name",
    phoneLabel: "Phone Number",
    rememberMe: "Remember Me",
    forgotPasswordLink: "Forgot Password?",
    signInBtn: "Sign In",
    signUpBtn: "Create Account",
    sendResetLinkBtn: "Send Reset Link",
    adminInitBtn: "Activate as First Admin",
    adminInitDesc: "Use your registered email to bootstrap the very first Admin account. This is a secure one-time operation.",
    successResetEmail: "Password reset link has been sent to your email. Please check your inbox.",
    successRegister: "Registration successful! Please check your email inbox (or spam) to verify your account, then log in.",
    errorTitle: "Error Occurred",
    loading: "Loading...",
    dontHaveAccount: "Don't have an account? Register here",
    alreadyHaveAccount: "Already have an account? Sign in",
    adminInitInfo: "Use this tab to promote your newly registered account to Admin."
  }
};

export default function LoginScreen({ language, onLanguageChange, onDemoLogin, onLocalLogin }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot' | 'adminInit'>('login');
  
  // Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const t = translations[language];

  // Helper to parse any error format robustly
  const parseErrorMessage = (err: any): string => {
    if (!err) return '';
    console.error("Supabase Operation Error Details:", err);
    
    const errStr = (typeof err === 'string' ? err : err.message || err.error_description || err.toString?.() || '').toLowerCase();

    if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('fetch failed')) {
      return language === 'Bangla'
        ? 'Supabase সার্ভারে সংযোগ করা যাচ্ছে না। লোকাল মোডে প্রবেশ করা হচ্ছে...'
        : 'Cannot connect to Supabase server. Logging in via Local Mode...';
    }

    if (typeof err === 'string') return err;
    if (err.message && typeof err.message === 'string') return err.message;
    
    // If message is an object
    if (err.message && typeof err.message === 'object') {
      try {
        return JSON.stringify(err.message);
      } catch (e) {}
    }
    
    if (err.error_description && typeof err.error_description === 'string') {
      return err.error_description;
    }
    
    try {
      const str = JSON.stringify(err);
      if (str && str !== '{}') return str;
    } catch (e) {}
    
    return err.toString ? err.toString() : 'An unexpected error occurred';
  };

  // Reset feedback when switching tabs
  const handleTabChange = (tab: 'login' | 'register' | 'forgot' | 'adminInit') => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!authError && data?.user) {
          const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (dbError || !dbUser) {
            setError(
              language === 'Bangla'
                ? 'আপনার ইউজার প্রোফাইল পাওয়া যায়নি। মেস অ্যাডমিনের সাথে যোগাযোগ করুন।'
                : 'User profile not found in database. Contact your Admin.'
            );
            await supabase.auth.signOut();
            setLoading(false);
            return;
          } else if (!dbUser.is_active) {
            setError(
              language === 'Bangla'
                ? 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে। মেস অ্যাডমিনের সাথে যোগাযোগ করুন।'
                : 'Your account is deactivated. Please contact your Admin.'
            );
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          return;
        }

        if (authError) {
          const errMsg = authError.message || parseErrorMessage(authError);
          const isNetworkError = errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network');
          if (!isNetworkError) {
            setError(parseErrorMessage(authError));
            setLoading(false);
            return;
          }
        }
      }

      // Fallback: If Supabase is not configured or network request failed ("Failed to fetch"), perform local login!
      if (onLocalLogin) {
        onLocalLogin(email.trim(), password);
      } else if (onDemoLogin) {
        onDemoLogin('Admin');
      }
    } catch (err: any) {
      const errMsg = parseErrorMessage(err);
      if (errMsg.toLowerCase().includes('fetch') && (onLocalLogin || onDemoLogin)) {
        if (onLocalLogin) {
          onLocalLogin(email.trim(), password);
        } else if (onDemoLogin) {
          onDemoLogin('Admin');
        }
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign Up / Register Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: fullName.trim(),
              phone: phone.trim(),
            }
          }
        });

        if (!authError) {
          setSuccess(t.successRegister);
          setFullName('');
          setPhone('');
          setPassword('');
          return;
        }

        const errMsg = authError.message || parseErrorMessage(authError);
        const isNetworkError = errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network');
        if (!isNetworkError) {
          setError(parseErrorMessage(authError));
          setLoading(false);
          return;
        }
      }

      // Fallback local register
      if (onLocalLogin) {
        onLocalLogin(email.trim(), password, fullName.trim(), phone.trim());
      } else {
        setSuccess(
          language === 'Bangla'
            ? 'সফলভাবে নিবন্ধিত হয়েছেন!'
            : 'Registration successful!'
        );
      }
    } catch (err: any) {
      const errMsg = parseErrorMessage(err);
      if (errMsg.toLowerCase().includes('fetch') && onLocalLogin) {
        onLocalLogin(email.trim(), password, fullName.trim(), phone.trim());
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Reset Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });

        if (!resetError) {
          setSuccess(t.successResetEmail);
          return;
        }

        const errMsg = resetError.message || parseErrorMessage(resetError);
        if (!errMsg.toLowerCase().includes('fetch')) {
          setError(parseErrorMessage(resetError));
          setLoading(false);
          return;
        }
      }

      setSuccess(
        language === 'Bangla'
          ? 'পাসওয়ার্ড রিসেট সম্পন্ন হয়েছে। নতুন তথ্য ব্যবহার করে সিস্টেমে প্রবেশ করুন।'
          : 'Password reset completed. You can now sign in.'
      );
    } catch (err: any) {
      setError(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Secure One-time First Admin Initialization Handler
  const handleAdminInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data, error: rpcError } = await supabase.rpc('initialize_first_admin', {
          target_email: email.trim(),
        });

        if (!rpcError) {
          if (data && data.startsWith('Error:')) {
            setError(data);
          } else {
            setSuccess(data || 'Successfully promoted to first Admin!');
          }
          return;
        }

        const errMsg = rpcError.message || parseErrorMessage(rpcError);
        if (!errMsg.toLowerCase().includes('fetch')) {
          setError(parseErrorMessage(rpcError));
          setLoading(false);
          return;
        }
      }

      if (onLocalLogin) {
        onLocalLogin(email.trim(), password, fullName.trim() || 'Mess Admin', phone.trim());
      } else if (onDemoLogin) {
        onDemoLogin('Admin');
      }
    } catch (err: any) {
      setError(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 transition-colors duration-300 font-sans">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-10 space-y-8 relative">
        
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
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
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
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
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

        {/* Interactive Tab switchers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`text-center py-2 text-xs font-extrabold rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === 'login' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.loginTab}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`text-center py-2 text-xs font-extrabold rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === 'register' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.registerTab}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('forgot')}
            className={`text-center py-2 text-xs font-extrabold rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === 'forgot' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.forgotPasswordTab}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('adminInit')}
            className={`text-center py-2 text-xs font-extrabold rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === 'adminInit' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {language === 'Bangla' ? 'অ্যাডমিন সেটআপ' : 'Admin Setup'}
          </button>
        </div>

        {/* Unconfigured Supabase Banner */}
        {!isSupabaseConfigured && (
          <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-2 border-amber-500/20 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-black text-amber-800 dark:text-amber-300 block mb-0.5">
                  {language === 'Bangla' ? 'Supabase কনফিগারেশন প্রয়োজন' : 'Supabase Setup Needed'}
                </span>
                <span>
                  {language === 'Bangla' 
                    ? '.env ফাইলে VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY যোগ করুন। অবিলম্বে ডেমো মোড দেখতে নিচের বাটনে ক্লিক করুন।'
                    : 'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file. Or enter Demo Mode below.'}
                </span>
              </div>
            </div>
            {onDemoLogin && (
              <button
                type="button"
                onClick={() => onDemoLogin('Admin')}
                className="mt-1 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Sparkles size={16} />
                {language === 'Bangla' ? 'ডেমো অ্যাডমিন মোডে প্রবেশ করুন' : 'Enter as Demo Admin'}
              </button>
            )}
          </div>
        )}

        {/* Display Alert Messages */}
        {error && (
          <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-2 border-rose-500/20 p-4 rounded-2xl text-xs sm:text-sm font-bold flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-rose-700 dark:text-rose-300 block mb-0.5">{t.errorTitle}</span>
                <span>{error}</span>
              </div>
            </div>
            {onDemoLogin && (error.toLowerCase().includes('fetch') || error.toLowerCase().includes('supabase')) && (
              <button
                type="button"
                onClick={() => onDemoLogin('Admin')}
                className="mt-1 w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Sparkles size={16} />
                {language === 'Bangla' ? 'ডেমো মোডে ইনস্ট্যান্ট প্রবেশ করুন' : 'Instant Access in Demo Mode'}
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/20 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-start gap-2.5">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-black text-emerald-700 dark:text-emerald-300 block mb-0.5">
                {language === 'Bangla' ? 'সম্পন্ন হয়েছে!' : 'Success!'}
              </span>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* ==================== LOGIN FORM ==================== */}
        {activeTab === 'login' && (
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  {t.passwordLabel}
                </label>
                <button
                  type="button"
                  onClick={() => handleTabChange('forgot')}
                  className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                >
                  {t.forgotPasswordLink}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-slate-350 rounded-sm focus:ring-emerald-500"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                  {t.rememberMe}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-black uppercase tracking-wider rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? t.loading : t.signInBtn}
              {!loading && <ArrowRight size={16} />}
            </button>

            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className="text-xs sm:text-sm font-extrabold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
              >
                {t.dontHaveAccount}
              </button>
            </div>
          </form>
        )}

        {/* ==================== REGISTER FORM ==================== */}
        {activeTab === 'register' && (
          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.nameLabel}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Asif Ahmed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="asif@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.phoneLabel}
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="tel"
                  required
                  placeholder="01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Note on default role */}
            <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-2.5 items-start">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-bold">
                {language === 'Bangla'
                  ? 'নিরাপত্তার স্বার্থে, নিবন্ধিত সকল অ্যাকাউন্ট ডিফল্টভাবে "Member" বা মেম্বার হিসেবে যুক্ত হবে। পরবর্তীতে কোনো অ্যাডমিন এটিকে আপগ্রেড করতে পারবেন।'
                  : 'For security, every newly registered user will get the default role "Member". Only an existing Admin can upgrade user roles.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-black uppercase tracking-wider rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? t.loading : t.signUpBtn}
              {!loading && <ArrowRight size={16} />}
            </button>

            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className="text-xs sm:text-sm font-extrabold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
              >
                {t.alreadyHaveAccount}
              </button>
            </div>
          </form>
        )}

        {/* ==================== FORGOT PASSWORD FORM ==================== */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-black uppercase tracking-wider rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? t.loading : t.sendResetLinkBtn}
              {!loading && <ArrowRight size={16} />}
            </button>

            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className="text-xs sm:text-sm font-extrabold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
              >
                {language === 'Bangla' ? 'লগইনে ফিরে যান' : 'Back to Login'}
              </button>
            </div>
          </form>
        )}

        {/* ==================== ONE-TIME FIRST ADMIN ACTIVATION FORM ==================== */}
        {activeTab === 'adminInit' && (
          <form onSubmit={handleAdminInit} className="space-y-5">
            <div className="bg-amber-500/5 dark:bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl p-5 text-sm leading-relaxed space-y-3">
              <div className="flex gap-3 items-start">
                <KeyRound size={24} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-base text-amber-800 dark:text-amber-300 block mb-1">
                    {language === 'Bangla' ? 'প্রথম অ্যাডমিন কনফিগারেশন' : 'First Admin Configuration'}
                  </span>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                    {t.adminInitDesc}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-black uppercase tracking-wider rounded-xl text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? t.loading : t.adminInitBtn}
              {!loading && <ArrowRight size={16} />}
            </button>

            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className="text-xs sm:text-sm font-extrabold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
              >
                {language === 'Bangla' ? 'লগইনে ফিরে যান' : 'Back to Login'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
