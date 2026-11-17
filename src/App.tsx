import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { 
  Users as UsersIcon,
  ShieldCheck,
  Calendar,
  Lock,
  ChevronRight,
  Menu,
  X,
  Bell,
  Palette,
  Check
} from 'lucide-react';

// Domain types
import { 
  User, 
  UserRole, 
  MemberMealSheet, 
  Deposit, 
  BazaarEntry, 
  Expense, 
  Notice, 
  ActivityLog, 
  SystemSettings,
  VacationPeriod,
  AppNotification,
  ClosedMonthRecord
} from './types';
import {
  getRealCurrentMonth,
  getRealTodayStr,
  getMonthDates,
  getNextMonth,
  formatMonthLabel,
  getEffectiveDatesForMonth
} from './utils/dateUtils';

// Dummy initial data
import { 
  initialUsers, 
  generateInitialMeals, 
  initialDeposits, 
  initialBazaarEntries, 
  initialExpenses, 
  initialNotices, 
  initialActivities, 
  initialSettings 
} from './dummyData';

// Layout & Tabs Components
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import NotificationCenter from './components/NotificationCenter';

// Code Splitting: Dynamically lazy loading large tab panels for lightning fast loading
const DashboardTab = React.lazy(() => import('./components/DashboardTab'));
const MealSheetTab = React.lazy(() => import('./components/MealSheetTab'));
const BazaarTab = React.lazy(() => import('./components/BazaarTab'));
const DepositTab = React.lazy(() => import('./components/DepositTab'));
const ExpenseTab = React.lazy(() => import('./components/ExpenseTab'));
const NoticeBoardTab = React.lazy(() => import('./components/NoticeBoardTab'));
const ReportsTab = React.lazy(() => import('./components/ReportsTab'));
const UsersTab = React.lazy(() => import('./components/UsersTab'));
const SettingsTab = React.lazy(() => import('./components/SettingsTab'));
const AuditLogTab = React.lazy(() => import('./components/AuditLogTab'));

import { useFeedback } from './components/FeedbackContext';

const isUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

async function getSupabaseUserAndMessId(
  userId: string,
  usersList: User[],
  currentUser?: User
): Promise<{ userId: string; messId: string | null }> {
  let finalUserId = userId;
  let finalMessId: string | null = currentUser?.messId || null;

  if (!isSupabaseConfigured) {
    return { userId: finalUserId, messId: finalMessId };
  }

  try {
    // 1. Resolve user_id if not a UUID
    if (!isUUID(finalUserId)) {
      const match = usersList.find(u => u.id === userId) || usersList.find(u => isUUID(u.id));
      if (match && isUUID(match.id)) {
        finalUserId = match.id;
        if (match.messId) finalMessId = match.messId;
      } else if (currentUser && isUUID(currentUser.id)) {
        finalUserId = currentUser.id;
        if (currentUser.messId) finalMessId = currentUser.messId;
      } else {
        const { data: dbU } = await supabase.from('users').select('id, mess_id').limit(1);
        if (dbU && dbU[0]) {
          finalUserId = dbU[0].id;
          if (dbU[0].mess_id) finalMessId = dbU[0].mess_id;
        }
      }
    }

    // 2. Resolve mess_id if null
    if (!finalMessId) {
      if (finalUserId && isUUID(finalUserId)) {
        const { data: uData } = await supabase.from('users').select('mess_id').eq('id', finalUserId).single();
        if (uData?.mess_id) finalMessId = uData.mess_id;
      }
      if (!finalMessId) {
        const uWithMess = usersList.find(u => u.messId && isUUID(u.messId));
        if (uWithMess?.messId) finalMessId = uWithMess.messId;
      }
      if (!finalMessId) {
        const { data: dbU } = await supabase.from('users').select('mess_id').not('mess_id', 'is', null).limit(1);
        if (dbU && dbU[0]?.mess_id) finalMessId = dbU[0].mess_id;
      }
      if (!finalMessId) {
        const { data: messData } = await supabase.from('messes').select('id').limit(1);
        if (messData && messData[0]?.id) finalMessId = messData[0].id;
      }
    }
  } catch (err) {
    console.error("Error in getSupabaseUserAndMessId:", err);
  }

  return { userId: finalUserId, messId: finalMessId };
}

async function getMessId(userId?: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    if (userId && isUUID(userId)) {
      const { data } = await supabase.from('users').select('mess_id').eq('id', userId).single();
      if (data?.mess_id) return data.mess_id;
    }
    const { data: dbU } = await supabase.from('users').select('mess_id').not('mess_id', 'is', null).limit(1);
    if (dbU && dbU[0]?.mess_id) return dbU[0].mess_id;

    const { data: messData } = await supabase.from('messes').select('id').limit(1);
    if (messData && messData[0]?.id) return messData[0].id;
  } catch (err) {
    console.error("Error retrieving mess_id:", err);
  }
  return null;
}

export default function App() {
  const { showToast, showAlert, showConfirm } = useFeedback();

  // One-time cleanup of local storage cached demo transactional data
  if (typeof window !== 'undefined' && !localStorage.getItem('mms_clean_reset_v3')) {
    localStorage.removeItem('mms_bazaar_entries');
    localStorage.removeItem('mms_deposits');
    localStorage.removeItem('mms_expenses');
    localStorage.removeItem('mms_notices');
    localStorage.removeItem('mms_activity_logs');
    localStorage.removeItem('mms_vacations');
    localStorage.removeItem('mms_meals');
    localStorage.removeItem('mms_notifications');
    const savedUsers = localStorage.getItem('mms_users');
    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers)) {
          const resetUsers = parsedUsers.map((u: User) => ({ ...u, carryForward: 0 }));
          localStorage.setItem('mms_users', JSON.stringify(resetUsers));
        }
      } catch (e) {}
    }
    localStorage.setItem('mms_clean_reset_v3', 'true');
  }

  // Global States loaded with localStorage persistence
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('mms_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return initialUsers;
  });

  const [meals, setMeals] = useState<MemberMealSheet[]>(() => {
    const saved = localStorage.getItem('mms_meals');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return generateInitialMeals(users);
  });

  const [bazaarEntries, setBazaarEntries] = useState<BazaarEntry[]>(() => {
    const saved = localStorage.getItem('mms_bazaar_entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return initialBazaarEntries;
  });

  const [deposits, setDeposits] = useState<Deposit[]>(() => {
    const saved = localStorage.getItem('mms_deposits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return initialDeposits;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('mms_expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return initialExpenses;
  });

  const [notices, setNotices] = useState<Notice[]>(() => {
    const saved = localStorage.getItem('mms_notices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return initialNotices;
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('mms_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.systemName) {
          return {
            ...initialSettings,
            ...parsed,
            activeMonth: parsed.activeMonth || getRealCurrentMonth(),
            closedMonths: Array.isArray(parsed.closedMonths) ? parsed.closedMonths : []
          };
        }
      } catch (e) {}
    }
    return initialSettings;
  });

  const activeMonth = settings.activeMonth || getRealCurrentMonth();

  type ThemePreset = NonNullable<SystemSettings['theme']>;
  const [userThemes, setUserThemes] = useState<Record<string, ThemePreset>>(() => {
    const saved = localStorage.getItem('mms_user_themes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    return {};
  });
  const [themeMenuOpen, setThemeMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('mms_user_themes', JSON.stringify(userThemes));
  }, [userThemes]);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('mms_activity_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return initialActivities;
  });

  const [vacations, setVacations] = useState<VacationPeriod[]>(() => {
    const saved = localStorage.getItem('mms_vacations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [assignedBazaarPersons, setAssignedBazaarPersons] = useState<string[]>(() => {
    const saved = localStorage.getItem('mms_assigned_bazaar_persons');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ['u-3', 'u-5']; // Default Sajid and Nayeem
  });

  useEffect(() => {
    localStorage.setItem('mms_assigned_bazaar_persons', JSON.stringify(assignedBazaarPersons));
  }, [assignedBazaarPersons]);

  // Notifications State & Center
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('mms_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [notificationCenterOpen, setNotificationCenterOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('mms_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Authentication & Session States using Supabase
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User>(() => ({
    id: '',
    name: 'Resident',
    email: '',
    phone: '',
    role: 'Member' as UserRole,
    isActive: false,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    defaultMealOn: true,
    carryForward: 0,
  }));
  const [currentPersona, setCurrentPersona] = useState<UserRole>('Member');
  const [loadingSession, setLoadingSession] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);
  const [authRedirectError, setAuthRedirectError] = useState<string>('');
  const isRecoveryRef = React.useRef<boolean>(false);

  // Synchronize database records from Supabase and subscribe to Realtime postgres_changes
  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !currentUser?.id || !isUUID(currentUser.id)) return;

    let isMounted = true;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;

    async function syncAllDataFromSupabase() {
      try {
        // 1. Fetch Users
        const { data: dbUsers, error: usersErr } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: true });

        let mappedUsers: User[] = [];
        if (dbUsers && dbUsers.length > 0 && !usersErr && isMounted) {
          mappedUsers = dbUsers.map(u => ({
            id: u.id,
            messId: u.mess_id,
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            role: u.role as UserRole,
            isActive: u.is_active,
            avatarUrl: u.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            defaultMealOn: u.default_meal_on,
            carryForward: u.carry_forward ? parseFloat(u.carry_forward) : 0,
          }));
          setUsers(mappedUsers);

          const latestSelf = mappedUsers.find(u => u.id === currentUser.id);
          if (latestSelf) {
            setCurrentUser(prev => ({
              ...prev,
              ...latestSelf,
            }));
          }
        }

        const userNameMap = new Map<string, string>();
        mappedUsers.forEach(u => userNameMap.set(u.id, u.name));

        // 2. Fetch System Settings
        const { data: dbSettings, error: settingsErr } = await supabase
          .from('system_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (dbSettings && !settingsErr && isMounted) {
          setSettings(prev => ({
            ...prev,
            systemName: dbSettings.system_name || prev.systemName,
            activeMonth: dbSettings.active_month || prev.activeMonth || getRealCurrentMonth(),
            closedMonths: Array.isArray(dbSettings.closed_months) ? dbSettings.closed_months : (prev.closedMonths || []),
            mealLockTime: dbSettings.meal_lock_time || prev.mealLockTime,
            defaultMealOn: dbSettings.default_meal_on ?? prev.defaultMealOn,
            currency: dbSettings.currency || prev.currency,
            guestMealLimit: dbSettings.guest_meal_limit ?? prev.guestMealLimit,
            isMonthClosed: dbSettings.is_month_closed ?? prev.isMonthClosed,
            language: (dbSettings.language as 'English' | 'Bangla') || prev.language,
            lockOverride: dbSettings.lock_override ?? prev.lockOverride ?? false,
            theme: (dbSettings.theme as SystemSettings['theme']) || prev.theme,
            mgrCanApproveBazaar: dbSettings.mgr_can_approve_bazaar ?? prev.mgrCanApproveBazaar,
            mgrCanAddDeposit: dbSettings.mgr_can_add_deposit ?? prev.mgrCanAddDeposit,
            mgrCanAddExpense: dbSettings.mgr_can_add_expense ?? prev.mgrCanAddExpense,
            mgrCanManageUsers: dbSettings.mgr_can_manage_users ?? prev.mgrCanManageUsers,
            mgrCanPublishNotice: dbSettings.mgr_can_publish_notice ?? prev.mgrCanPublishNotice,
          }));
        }

        // 3. Fetch Deposits
        const { data: dbDeposits, error: depErr } = await supabase
          .from('deposits')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbDeposits && !depErr && isMounted) {
          const mappedDeposits: Deposit[] = dbDeposits.map(d => ({
            id: String(d.id),
            userId: d.user_id,
            amount: parseFloat(d.amount),
            date: d.date,
            method: d.method as any,
            transactionId: d.transaction_id || undefined,
            note: d.note || undefined,
            status: (d.status || 'Pending') as any
          }));
          setDeposits(prev => {
            const unsavedLocal = prev.filter(d => String(d.id).startsWith('dep-'));
            const combined = [...mappedDeposits];
            unsavedLocal.forEach(localDep => {
              if (!combined.some(d => d.id === localDep.id)) {
                combined.unshift(localDep);
              }
            });
            return combined;
          });
        }

        // 4. Fetch Bazaar Entries
        const { data: dbBazaar, error: bazErr } = await supabase
          .from('bazaar_entries')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbBazaar && !bazErr && isMounted) {
          const mappedBazaar: BazaarEntry[] = dbBazaar.map(b => ({
            id: String(b.id),
            date: b.date,
            items: b.items || b.notes || 'Bazaar Expense',
            quantity: b.quantity ? String(b.quantity) : '1',
            price: parseFloat(b.price ?? b.subtotal ?? '0'),
            subtotal: b.subtotal != null ? parseFloat(b.subtotal) : parseFloat(b.price ?? '0'),
            assignedTo: [b.user_id || b.assigned_to || b.approved_by || currentUser?.id],
            approvedBy: b.approved_by || undefined,
            status: (b.status || 'Pending') as any,
            receiptUrl: b.receipt_url || undefined,
            notes: b.notes || undefined
          }));
          setBazaarEntries(prev => {
            const unsavedLocal = prev.filter(b => String(b.id).startsWith('baz-'));
            const combined = [...mappedBazaar];
            unsavedLocal.forEach(localBaz => {
              if (!combined.some(b => b.id === localBaz.id)) {
                combined.unshift(localBaz);
              }
            });
            return combined;
          });
        }

        // 5. Fetch Expenses
        const { data: dbExpenses, error: expErr } = await supabase
          .from('expenses')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbExpenses && !expErr && isMounted) {
          const mappedExpenses: Expense[] = dbExpenses.map(e => ({
            id: String(e.id),
            category: e.category,
            amount: parseFloat(e.amount),
            date: e.date,
            note: e.note || undefined
          }));
          setExpenses(mappedExpenses);
        }

        // 6. Fetch Notices
        const { data: dbNotices, error: noticeErr } = await supabase
          .from('notices')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbNotices && !noticeErr && isMounted) {
          const mappedNotices: Notice[] = dbNotices.map(n => ({
            id: String(n.id),
            title: n.title,
            description: n.description,
            priority: n.priority as Notice['priority'],
            date: n.date,
            authorId: n.author_id,
            authorName: userNameMap.get(n.author_id) || 'Mess Admin',
            attachment: n.attachment || undefined,
            expiryDate: n.expiry_date || undefined,
            isPinned: Boolean(n.is_pinned),
          }));
          setNotices(prev => {
            const unsavedLocal = prev.filter(n => String(n.id).startsWith('not-'));
            const combined = [...mappedNotices];
            unsavedLocal.forEach(localNotice => {
              if (!combined.some(n => n.id === localNotice.id)) {
                combined.unshift(localNotice);
              }
            });
            return combined;
          });
        }

        // 7. Fetch Vacations
        const { data: dbVacations, error: vacErr } = await supabase
          .from('vacation_periods')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbVacations && !vacErr && isMounted) {
          const mappedVacations: VacationPeriod[] = dbVacations.map(v => ({
            id: String(v.id),
            userId: v.user_id,
            startDate: v.start_date,
            endDate: v.end_date
          }));
          setVacations(mappedVacations);
        }

        // 8. Fetch Meals
        const { data: dbMeals, error: mealsErr } = await supabase.from('meals').select('*');
        if (dbMeals && !mealsErr && isMounted) {
          const userMealsMap: Record<string, MemberMealSheet['meals']> = {};
          dbMeals.forEach(m => {
            if (!userMealsMap[m.user_id]) {
              userMealsMap[m.user_id] = {};
            }
            userMealsMap[m.user_id][m.date] = {
              breakfast: m.breakfast,
              lunch: m.lunch,
              dinner: m.dinner,
              guestBreakfast: m.guest_breakfast || 0,
              guestLunch: m.guest_lunch || 0,
              guestDinner: m.guest_dinner || 0,
              managerAdjustment: m.manager_adjustment ? parseFloat(m.manager_adjustment) : 0,
              adjustmentReason: m.adjustment_reason || undefined
            };
          });

          setMeals(prevMeals => {
            const validUsers = mappedUsers.length > 0 ? mappedUsers : prevMeals.filter(s => isUUID(s.userId)).map(s => ({ id: s.userId }));
            const nextSheets: MemberMealSheet[] = validUsers.map(u => {
              const existing = prevMeals.find(s => s.userId === u.id);
              return {
                userId: u.id,
                meals: {
                  ...(existing?.meals || {}),
                  ...(userMealsMap[u.id] || {})
                }
              };
            });
            return nextSheets;
          });
        }

        // 9. Fetch Activity Logs
        const { data: dbLogs, error: logsErr } = await supabase
          .from('activity_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(200);
        if (dbLogs && !logsErr && isMounted) {
          const mappedLogs: ActivityLog[] = dbLogs.map(l => ({
            id: String(l.id),
            timestamp: l.timestamp,
            userId: l.user_id,
            userName: userNameMap.get(l.user_id) || 'User',
            action: l.action,
            details: l.details,
          }));
          setActivityLogs(mappedLogs);
        }

        // 10. Fetch Notifications
        const { data: dbNotifs, error: notifsErr } = await supabase
          .from('notifications')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);
        if (dbNotifs && !notifsErr && isMounted) {
          const mappedNotifs: AppNotification[] = dbNotifs.map(n => ({
            id: String(n.id),
            type: n.type as AppNotification['type'],
            title: n.title,
            description: n.description,
            date: n.date,
            isRead: Boolean(n.is_read),
            targetUserId: n.target_user_id || undefined,
            linkToTab: n.link_to_tab || undefined,
            timestamp: n.timestamp,
          }));
          setNotifications(mappedNotifs);
        }
      } catch (err) {
        console.error("Error in syncAllDataFromSupabase:", err);
      }
    }

    const scheduleSync = () => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        syncAllDataFromSupabase();
      }, 250);
    };

    syncAllDataFromSupabase();

    // Supabase Realtime Channel Subscription
    const channel = supabase
      .channel('public-db-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        scheduleSync();
      })
      .subscribe();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncAllDataFromSupabase();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      if (syncTimer) clearTimeout(syncTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, currentUser?.id]);

  // Listen to real-time session changes and load/restore role-based user profiles
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadingSession(false);
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    const urlError =
      hashParams.get('error_description') ||
      searchParams.get('error_description') ||
      hashParams.get('error') ||
      searchParams.get('error');
    const urlErrorCode = hashParams.get('error_code') || searchParams.get('error_code');
    const typeParam = hashParams.get('type') || searchParams.get('type');
    const tokenHash = searchParams.get('token_hash');

    if (urlError) {
      const isExpired = urlErrorCode === 'otp_expired' || urlError.toLowerCase().includes('expired');
      const friendlyMsg = isExpired
        ? 'Password reset link is invalid or has expired. Please request a new reset link.'
        : decodeURIComponent(urlError.replace(/\+/g, ' '));
      setAuthRedirectError(friendlyMsg);
      isRecoveryRef.current = false;
      setIsPasswordRecovery(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (typeParam === 'recovery') {
      isRecoveryRef.current = true;
      setIsPasswordRecovery(true);
    }

    if (tokenHash && typeParam === 'recovery') {
      (async () => {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (otpError) {
          setAuthRedirectError(otpError.message || 'Password reset link verification failed.');
          isRecoveryRef.current = false;
          setIsPasswordRecovery(false);
        } else {
          isRecoveryRef.current = true;
          setIsPasswordRecovery(true);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        setLoadingSession(false);
      })();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        isRecoveryRef.current = true;
        setIsPasswordRecovery(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        setLoadingSession(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        isRecoveryRef.current = false;
        setIsPasswordRecovery(false);
        setIsAuthenticated(false);
        setLoadingSession(false);
        return;
      }

      if (isRecoveryRef.current && session?.user) {
        setIsPasswordRecovery(true);
        setLoadingSession(false);
        return;
      }

      if (session?.user) {
        setLoadingSession(true);
        try {
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (dbUser && !error) {
            const mappedUser: User = {
              id: dbUser.id,
              messId: dbUser.mess_id,
              name: dbUser.name,
              email: dbUser.email,
              phone: dbUser.phone || '',
              role: dbUser.role as UserRole,
              isActive: dbUser.is_active,
              avatarUrl: dbUser.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
              defaultMealOn: dbUser.default_meal_on,
              carryForward: dbUser.carry_forward ? parseFloat(dbUser.carry_forward) : 0,
            };
            setCurrentUser(mappedUser);
            setCurrentPersona(mappedUser.role);
            setIsAuthenticated(true);
            setLoadingSession(false);
          } else {
            // Fallback delay to allow database trigger to complete execution on register
            setTimeout(async () => {
              try {
                const { data: retryUser, error: retryError } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();

                if (retryUser && !retryError) {
                  const mappedUser: User = {
                    id: retryUser.id,
                    messId: retryUser.mess_id,
                    name: retryUser.name,
                    email: retryUser.email,
                    phone: retryUser.phone || '',
                    role: retryUser.role as UserRole,
                    isActive: retryUser.is_active,
                    avatarUrl: retryUser.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
                    defaultMealOn: retryUser.default_meal_on,
                    carryForward: retryUser.carry_forward ? parseFloat(retryUser.carry_forward) : 0,
                  };
                  setCurrentUser(mappedUser);
                  setCurrentPersona(mappedUser.role);
                  setIsAuthenticated(true);
                } else {
                  setIsAuthenticated(false);
                }
              } catch (err) {
                console.error("Error retrying fetch of user profile:", err);
                setIsAuthenticated(false);
              } finally {
                setLoadingSession(false);
              }
            }, 1500);
          }
        } catch (err) {
          console.error("Error loading user profile on auth state change:", err);
          setIsAuthenticated(false);
          setLoadingSession(false);
        }
      } else {
        setIsAuthenticated(false);
        setLoadingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [currentTab, setCurrentTab] = useState<string>('Dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('mms_dark_mode') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Synchronize state back to localStorage
  useEffect(() => {
    localStorage.setItem('mms_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('mms_meals', JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem('mms_bazaar_entries', JSON.stringify(bazaarEntries));
  }, [bazaarEntries]);

  useEffect(() => {
    localStorage.setItem('mms_deposits', JSON.stringify(deposits));
  }, [deposits]);

  useEffect(() => {
    localStorage.setItem('mms_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('mms_notices', JSON.stringify(notices));
  }, [notices]);

  useEffect(() => {
    localStorage.setItem('mms_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('mms_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('mms_vacations', JSON.stringify(vacations));
  }, [vacations]);

  useEffect(() => {
    localStorage.setItem('mms_dark_mode', String(darkMode));
  }, [darkMode]);

  // Removed mock/localStorage session synchronization

  // Synchronize persona and enforce route permissions
  useEffect(() => {
    if (!currentUser) return;
    
    // Sync currentPersona
    if (currentPersona !== currentUser.role) {
      setCurrentPersona(currentUser.role);
    }

    // Access control logic
    const adminTabs = ['Dashboard', 'MealSheet', 'Bazaar', 'Deposits', 'Expenses', 'Notices', 'Reports', 'Users', 'AuditLogs', 'Settings'];
    const managerTabs = ['Dashboard', 'MealSheet', 'Bazaar', 'Deposits', 'Expenses', 'Notices', 'Reports', 'AuditLogs', 'Settings'];
    if (settings?.mgrCanManageUsers) {
      managerTabs.push('Users');
    }
    const memberTabs = ['Dashboard', 'MealSheet', 'Bazaar', 'Deposits', 'Expenses', 'Notices', 'Reports', 'Settings'];

    let allowedTabs = adminTabs;
    if (currentUser.role === 'Meal Manager') {
      allowedTabs = managerTabs;
    } else if (currentUser.role === 'Member') {
      allowedTabs = memberTabs;
    }

    if (!allowedTabs.includes(currentTab)) {
      setCurrentTab('Dashboard');
    }
  }, [currentUser, currentTab, settings]);

  // Resolve personal theme per user (falls back to global default settings.theme)
  const themeUserKey = currentUser?.id || 'default';
  const activeUserTheme: ThemePreset =
    userThemes[themeUserKey] || settings.theme || 'Light';

  const handleUpdateUserTheme = (theme: ThemePreset) => {
    setUserThemes(prev => ({
      ...prev,
      [themeUserKey]: theme
    }));
  };

  // Dark Mode tailwind class toggling
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Synchronize Theme Preset Classes for active user
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all previous theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-cosmic', 'theme-emerald', 'theme-pink');
    
    const theme = activeUserTheme || 'Light';
    if (theme === 'Light') {
      root.classList.add('theme-light');
      setDarkMode(false);
    } else if (theme === 'Dark') {
      root.classList.add('theme-dark');
      setDarkMode(true);
    } else if (theme === 'Cosmic Slate') {
      root.classList.add('theme-cosmic');
      setDarkMode(true);
    } else if (theme === 'Emerald Forest') {
      root.classList.add('theme-emerald');
      setDarkMode(true);
    } else if (theme === 'Rose Quartz') {
      root.classList.add('theme-pink');
      setDarkMode(true);
    }
  }, [activeUserTheme]);

  // Handle Authentication Success
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentPersona(user.role);
    setIsAuthenticated(true);
    
    const userIPs: Record<string, string> = {
      'u-1': '180.234.3.56',
      'u-2': '103.230.105.18',
      'u-3': '103.88.22.10',
      'u-4': '103.111.45.92',
      'u-5': '203.190.10.45',
    };
    const userDevices: Record<string, string> = {
      'u-1': 'Chrome 126 (Windows 11)',
      'u-2': 'Safari 17 (macOS Sonoma)',
      'u-3': 'Chrome Mobile 126 (Android 14)',
      'u-4': 'Firefox 125 (Linux Ubuntu)',
      'u-5': 'Safari Mobile 17 (iOS 17)',
    };

    const currentUserId = user.id;
    const ipAddress = userIPs[currentUserId] || '103.242.23.150';
    const device = userDevices[currentUserId] || 'Chrome 126 (Windows 11)';
    const now = new Date();
    
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().split(' ')[0];

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      userName: user.name,
      action: 'Login',
      details: `User authenticated securely: ${user.name} with role: ${user.role}`,
      timestamp: now.toISOString(),
      oldValue: 'Session: Idle',
      newValue: 'Session: Active',
      ipAddress,
      device,
      date: dateStr,
      time: timeStr
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // Handle Log Out securely with Supabase Auth
  const handleLogout = async () => {
    try {
      const userIPs: Record<string, string> = {
        'u-1': '180.234.3.56',
        'u-2': '103.230.105.18',
      };
      const userDevices: Record<string, string> = {
        'u-1': 'Chrome 126 (Windows 11)',
        'u-2': 'Safari 17 (macOS Sonoma)',
      };

      const currentUserId = currentUser?.id || 'guest';
      const ipAddress = userIPs[currentUserId] || '103.242.23.150';
      const device = userDevices[currentUserId] || 'Chrome 126 (Windows 11)';
      const now = new Date();
      
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().split(' ')[0];

      const newLog: ActivityLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: currentUserId,
        userName: currentUser?.name || 'User',
        action: 'Logout',
        details: `User logged out from active session: ${currentUser?.name || 'User'}`,
        timestamp: now.toISOString(),
        oldValue: 'Session: Active',
        newValue: 'Session: Idle',
        ipAddress,
        device,
        date: dateStr,
        time: timeStr
      };
      setActivityLogs(prev => [newLog, ...prev]);
    } catch (e) {
      console.error("Error logging action during signout:", e);
    }

    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
  };

  // UTILITY: Log actions to audit trail
  const logAction = (actionName: string, details: string, oldValue?: string, newValue?: string) => {
    const userIPs: Record<string, string> = {
      'u-1': '180.234.3.56',
      'u-2': '103.230.105.18',
      'u-3': '103.88.22.10',
      'u-4': '103.111.45.92',
      'u-5': '203.190.10.45',
    };
    const userDevices: Record<string, string> = {
      'u-1': 'Chrome 126 (Windows 11)',
      'u-2': 'Safari 17 (macOS Sonoma)',
      'u-3': 'Chrome Mobile 126 (Android 14)',
      'u-4': 'Firefox 125 (Linux Ubuntu)',
      'u-5': 'Safari Mobile 17 (iOS 17)',
    };

    const currentUserId = currentUser?.id || 'guest';
    const ipAddress = userIPs[currentUserId] || '103.242.23.150';
    const device = userDevices[currentUserId] || 'Chrome 126 (Windows 11)';
    const now = new Date();
    
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().split(' ')[0];

    // Normalize actions to required audit log list
    let mappedAction = actionName;
    const lowerAction = actionName.toLowerCase();
    
    if (lowerAction.includes('meal sheet') || lowerAction.includes('meal reservation') || lowerAction.includes('grid meal') || lowerAction.includes('meal overwrite')) {
      mappedAction = 'Meal Updates';
    } else if (lowerAction.includes('guest meal') || lowerAction.includes('guest count')) {
      mappedAction = 'Guest Meals';
    } else if (lowerAction.includes('meal adjust')) {
      mappedAction = 'Meal Adjustments';
    } else if (lowerAction.includes('deposit')) {
      mappedAction = 'Deposits';
    } else if (lowerAction.includes('bazaar entry') || lowerAction.includes('bazaar cost') || (lowerAction.includes('bazaar') && !lowerAction.includes('approv'))) {
      mappedAction = 'Bazaar Entries';
    } else if (lowerAction.includes('bazaar approv')) {
      mappedAction = 'Bazaar Approval';
    } else if (lowerAction.includes('notice') || lowerAction.includes('announc')) {
      mappedAction = 'Notices';
    } else if (lowerAction.includes('role') || lowerAction.includes('manager') || lowerAction.includes('permission') || lowerAction.includes('assign')) {
      mappedAction = 'Manager Changes';
    } else if (lowerAction.includes('close') || lowerAction.includes('lock') || lowerAction.includes('unlock')) {
      mappedAction = 'Month Closing';
    } else if (lowerAction.includes('setting') || lowerAction.includes('variables') || lowerAction.includes('theme') || lowerAction.includes('config')) {
      mappedAction = 'Settings Changes';
    } else if (lowerAction.includes('login') || lowerAction.includes('session open')) {
      mappedAction = 'Login';
    } else if (lowerAction.includes('logout') || lowerAction.includes('session close')) {
      mappedAction = 'Logout';
    }

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: currentUserId,
      userName: currentUser?.name || 'Guest User',
      action: mappedAction,
      details: details,
      timestamp: now.toISOString(),
      oldValue: oldValue || 'N/A',
      newValue: newValue || 'N/A',
      ipAddress,
      device,
      date: dateStr,
      time: timeStr
    };
    setActivityLogs(prev => [newLog, ...prev]);

    if (isSupabaseConfigured && isUUID(currentUserId)) {
      getSupabaseUserAndMessId(currentUserId, users, currentUser).then(({ userId: dbUserId, messId }) => {
        if (!messId || !isUUID(dbUserId)) return;
        supabase.from('activity_logs').insert({
          mess_id: messId,
          user_id: dbUserId,
          action: mappedAction,
          details,
        }).then(({ error }) => {
          if (error) console.error("Error inserting activity log to Supabase:", error);
        });
      });
    }
  };

  // -------------------------------------------------------------------
  // IN-APP NOTIFICATIONS ENGINE
  // -------------------------------------------------------------------
  
  // 1. Mark a notification as read
  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (isSupabaseConfigured && isUUID(id)) {
      supabase.from('notifications').update({ is_read: true }).eq('id', id).then(({ error }) => {
        if (error) console.error("Error marking notification read:", error);
      });
    }
  };

  // 2. Mark all relevant notifications as read
  const handleMarkAllNotificationsAsRead = () => {
    const idsToMark = notifications
      .filter(n => (!n.targetUserId || n.targetUserId === currentUser.id) && !n.isRead && isUUID(n.id))
      .map(n => n.id);
    setNotifications(prev => prev.map(n => {
      if (!n.targetUserId || n.targetUserId === currentUser.id) {
        return { ...n, isRead: true };
      }
      return n;
    }));
    if (isSupabaseConfigured && idsToMark.length > 0) {
      supabase.from('notifications').update({ is_read: true }).in('id', idsToMark).then(({ error }) => {
        if (error) console.error("Error marking all notifications read:", error);
      });
    }
  };

  // 3. Clear all relevant notifications
  const handleClearAllNotifications = () => {
    setNotifications(prev => prev.filter(n => n.targetUserId && n.targetUserId !== currentUser.id));
  };

  // 4. Push general or targeted notification
  const handleAddNotification = (
    type: AppNotification['type'],
    title: string,
    description: string,
    targetUserId?: string,
    linkToTab?: string
  ) => {
    const tempId = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const todayStr = getRealTodayStr();
    const newNotif: AppNotification = {
      id: tempId,
      type,
      title,
      description,
      date: todayStr,
      isRead: false,
      targetUserId,
      linkToTab,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      getSupabaseUserAndMessId(currentUser.id, users, currentUser).then(({ messId }) => {
        if (!messId) return;
        supabase.from('notifications').insert({
          mess_id: messId,
          type,
          title,
          description,
          date: todayStr,
          is_read: false,
          target_user_id: targetUserId && isUUID(targetUserId) ? targetUserId : null,
          link_to_tab: linkToTab || null,
        }).select().then(({ data, error }) => {
          if (data && data[0] && !error) {
            const realId = String(data[0].id);
            setNotifications(prev => prev.map(n => n.id === tempId ? { ...n, id: realId } : n));
          } else if (error) {
            console.error("Error inserting notification to Supabase:", error);
          }
        });
      });
    }
  };

  // 5. Trigger Meal Reminder callback
  const handleTriggerMealReminder = (targetUserId?: string) => {
    if (targetUserId) {
      const u = users.find(x => x.id === targetUserId);
      const name = u ? u.name : 'Resident';
      handleAddNotification(
        'MealReminder',
        `Action Required: Complete Meal Reservations`,
        `Hi ${name}, please update your meal sheet preferences for tomorrow as soon as possible before lock times.`,
        targetUserId,
        'MealSheet'
      );
      logAction('Meal Reminder Transmitted', `Sent targeted meal sheet update request to ${name}`);
    } else {
      // Broadcast to all active users
      users.filter(u => u.isActive).forEach(u => {
        handleAddNotification(
          'MealReminder',
          `Daily Mess Meal Sheet Alert`,
          `Hi ${u.name}, tomorrow's meal reservations will lock at 10:00 PM. Please verify your breakfast, lunch, and dinner preferences.`,
          u.id,
          'MealSheet'
        );
      });
      logAction('Meal Reminder Broadcasted', 'Broadcasted daily meal reservation reminders to all active mess members');
    }
  };

  // 6. Trigger Bazaar Reminder callback
  const handleTriggerBazaarReminder = (userIds: string[], date: string) => {
    userIds.forEach(uid => {
      const u = users.find(x => x.id === uid);
      const name = u ? u.name : 'Resident';
      handleAddNotification(
        'BazaarReminder',
        `Pantry Schedule Notice: Bazaar Duty tomorrow`,
        `Hi ${name}, you are scheduled for tomorrow's bazaar on ${date}. Please coordinate shopping lists and submit item costs.`,
        uid,
        'Bazaar'
      );
    });
    logAction('Bazaar Duty Reminder Transmitted', `Notified assigned bazaar persons about their duty schedule for ${date}`);
  };

  // 7. Trigger Deposit Reminder callback
  const handleTriggerDepositReminder = (targetUserId?: string, customNote?: string) => {
    const defaultNote = `Please review your balance ledger and deposit cash/bKash/Nagad transactions to keep meals active.`;
    const finalNote = customNote || defaultNote;
    if (targetUserId) {
      const u = users.find(x => x.id === targetUserId);
      const name = u ? u.name : 'Resident';
      handleAddNotification(
        'DepositReminder',
        `Payment Needed: Deposit Account Update`,
        `Hi ${name}, ${finalNote}`,
        targetUserId,
        'Deposits'
      );
      logAction('Deposit Reminder Transmitted', `Sent deposit reminder request to ${name}`);
    } else {
      users.filter(u => u.isActive).forEach(u => {
        handleAddNotification(
          'DepositReminder',
          `Mess Outflow Alert: Monthly Balance Replenish`,
          `Hi ${u.name}, ${finalNote}`,
          u.id,
          'Deposits'
        );
      });
      logAction('Deposit Reminder Broadcasted', 'Broadcasted monthly balance deposit request alerts to all residents');
    }
  };

  // Session Restore / Loader Screen
  if (loadingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">
          {settings.language === 'Bangla' ? 'মেস ডাটা লোড হচ্ছে...' : 'Restoring Session...'}
        </p>
      </div>
    );
  }

  // Local login handler for smooth authentication when backend is not connected or fails
  const handleLocalLogin = (email: string, pass: string, fullName?: string, phone?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Search for existing local user matching email
    let matchedUser = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!matchedUser) {
      // Automatically create a local user profile if not found
      const derivedName = fullName || cleanEmail.split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      matchedUser = {
        id: `user-${Date.now()}`,
        name: derivedName || 'Mess Member',
        email: cleanEmail,
        phone: phone || '01700000000',
        role: users.some(u => u.role === 'Admin') ? 'Member' : 'Admin',
        isActive: true,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        defaultMealOn: true,
        carryForward: 0,
      };

      setUsers(prev => {
        const updated = [...prev, matchedUser!];
        localStorage.setItem('mms_users', JSON.stringify(updated));
        return updated;
      });
    }

    if (!matchedUser.isActive) {
      throw new Error(
        settings.language === 'Bangla'
          ? 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে। মেস অ্যাডমিনের সাথে যোগাযোগ করুন।'
          : 'Your account is deactivated. Please contact your Admin.'
      );
    }

    setCurrentUser(matchedUser);
    setCurrentPersona(matchedUser.role);
    setIsAuthenticated(true);
    showToast(
      settings.language === 'Bangla'
        ? `স্বাগতম, ${matchedUser.name}! (সফলভাবে লগইন করা হয়েছে)`
        : `Welcome, ${matchedUser.name}! (Signed in successfully)`,
      'success'
    );
  };

  // Demo mode login handler when database/auth connection is not configured or fails
  const handleDemoLogin = (role: UserRole = 'Admin') => {
    const demoUser = users.find(u => u.role === role) || users[0] || {
      id: 'demo-admin-id',
      name: 'Demo Admin',
      email: 'admin@mess.com',
      phone: '01700000000',
      role: 'Admin',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      defaultMealOn: true,
      carryForward: 0,
    };
    setCurrentUser(demoUser);
    setCurrentPersona(demoUser.role);
    setIsAuthenticated(true);
  };

  // Guard Screen: Render LoginScreen if not authenticated OR during password recovery
  if (!isAuthenticated || isPasswordRecovery) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <LoginScreen 
          language={settings.language || 'English'}
          onLanguageChange={(lang) => setSettings(prev => ({ ...prev, language: lang }))}
          onDemoLogin={handleDemoLogin}
          onLocalLogin={handleLocalLogin}
          isPasswordRecovery={isPasswordRecovery}
          initialError={authRedirectError}
          onClearInitialError={() => setAuthRedirectError('')}
          onPasswordResetSuccess={async () => {
            window.history.replaceState({}, document.title, window.location.pathname);
            isRecoveryRef.current = false;
            setIsPasswordRecovery(false);
            setIsAuthenticated(false);
            if (isSupabaseConfigured) {
              await supabase.auth.signOut();
            }
          }}
          onCancelPasswordRecovery={async () => {
            window.history.replaceState({}, document.title, window.location.pathname);
            isRecoveryRef.current = false;
            setIsPasswordRecovery(false);
            setIsAuthenticated(false);
            if (isSupabaseConfigured) {
              await supabase.auth.signOut();
            }
          }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------
  // CALLBACK ACTIONS
  // -------------------------------------------------------------------

  // Update tomorrow's meal reservations (Dashboard)
  const handleUpdateTomorrowMeals = (updatedStatus: { breakfast: boolean; lunch: boolean; dinner: boolean }) => {
    if (settings.isMonthClosed) return;
    const tomorrowDate = getEffectiveDatesForMonth(activeMonth).tomorrow;

    // Find current user's meal sheet
    setMeals(prevSheets => {
      return prevSheets.map(sheet => {
        if (sheet.userId === currentUser.id) {
          const updatedMeals = { ...sheet.meals };
          updatedMeals[tomorrowDate] = {
            ...updatedMeals[tomorrowDate],
            ...updatedStatus
          };

          return {
            ...sheet,
            meals: updatedMeals
          };
        }
        return sheet;
      });
    });

    logAction(
      'Meal Reservation Update',
      `Updated tomorrow's (${tomorrowDate}) meals: Breakfast=${updatedStatus.breakfast ? 'ON' : 'OFF'}, Lunch=${updatedStatus.lunch ? 'ON' : 'OFF'}, Dinner=${updatedStatus.dinner ? 'ON' : 'OFF'}`
    );
  };

  // Toggle meal status cell directly in grid (Excel Grid Sheet)
  const handleToggleMealStatus = (userId: string, date: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (settings.isMonthClosed) return;

    // Check permissions: Members can only toggle their own
    if (currentPersona === 'Member' && userId !== currentUser.id) {
      showToast('Unauthorized! Members cannot modify other residents meal reservations.', 'error');
      return;
    }

    setMeals(prevSheets => {
      return prevSheets.map(sheet => {
        if (sheet.userId === userId) {
          const updatedMeals = { ...sheet.meals };
          const targetDay = updatedMeals[date] || {
            breakfast: false,
            lunch: false,
            dinner: false,
            guestBreakfast: 0,
            guestLunch: 0,
            guestDinner: 0
          };

          updatedMeals[date] = {
            ...targetDay,
            [mealType]: !targetDay[mealType]
          };

          return {
            ...sheet,
            meals: updatedMeals
          };
        }
        return sheet;
      });
    });

    const uName = users.find(u => u.id === userId)?.name || 'Unknown';
    logAction(
      'Grid Meal Overwrite',
      `Overrode reservation for ${uName} on ${date} (${mealType}: ${!meals.find(s => s.userId === userId)?.meals[date]?.[mealType] ? 'ON' : 'OFF'})`
    );
  };

  // Adjust guest count in grid cell
  const handleGuestMealChange = (userId: string, date: string, mealType: 'breakfast' | 'lunch' | 'dinner', count: number) => {
    if (settings.isMonthClosed) return;
    if (count < 0 || count > settings.guestMealLimit) return;

    if (currentPersona === 'Member' && userId !== currentUser.id) return;

    setMeals(prevSheets => {
      return prevSheets.map(sheet => {
        if (sheet.userId === userId) {
          const updatedMeals = { ...sheet.meals };
          const targetDay = updatedMeals[date] || {
            breakfast: false,
            lunch: false,
            dinner: false,
            guestBreakfast: 0,
            guestLunch: 0,
            guestDinner: 0
          };

          const fieldKey = mealType === 'breakfast' ? 'guestBreakfast' : mealType === 'lunch' ? 'guestLunch' : 'guestDinner';

          updatedMeals[date] = {
            ...targetDay,
            [fieldKey]: count
          };

          return {
            ...sheet,
            meals: updatedMeals
          };
        }
        return sheet;
      });
    });

    const uName = users.find(u => u.id === userId)?.name || 'Unknown';
    logAction(
      'Guest Count Modified',
      `Adjusted guests for ${uName} on ${date} (${mealType} guest count: ${count})`
    );
  };

  // Update Meals (Syncs changed cells to Supabase with mess_id)
  const handleUpdateMeals = (updatedMeals: MemberMealSheet[]) => {
    const prevMealsMap = new Map<string, MemberMealSheet['meals']>();
    meals.forEach(s => prevMealsMap.set(s.userId, s.meals));
    setMeals(updatedMeals);

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      getSupabaseUserAndMessId(currentUser.id, users, currentUser).then(({ messId }) => {
        if (!messId) return;
        updatedMeals.forEach(sheet => {
          if (!isUUID(sheet.userId)) return;
          const prevUserMeals = prevMealsMap.get(sheet.userId) || {};
          Object.keys(sheet.meals).forEach(dateStr => {
            const dayMeal = sheet.meals[dateStr];
            const prevDay = prevUserMeals[dateStr];
            const changed =
              !prevDay ||
              Boolean(prevDay.breakfast) !== Boolean(dayMeal.breakfast) ||
              Boolean(prevDay.lunch) !== Boolean(dayMeal.lunch) ||
              Boolean(prevDay.dinner) !== Boolean(dayMeal.dinner) ||
              (prevDay.guestBreakfast || 0) !== (dayMeal.guestBreakfast || 0) ||
              (prevDay.guestLunch || 0) !== (dayMeal.guestLunch || 0) ||
              (prevDay.guestDinner || 0) !== (dayMeal.guestDinner || 0) ||
              (prevDay.managerAdjustment || 0) !== (dayMeal.managerAdjustment || 0) ||
              (prevDay.adjustmentReason || '') !== (dayMeal.adjustmentReason || '');

            if (!changed) return;

            supabase.from('meals').upsert({
              mess_id: messId,
              user_id: sheet.userId,
              date: dateStr,
              breakfast: Boolean(dayMeal.breakfast),
              lunch: Boolean(dayMeal.lunch),
              dinner: Boolean(dayMeal.dinner),
              guest_breakfast: dayMeal.guestBreakfast || 0,
              guest_lunch: dayMeal.guestLunch || 0,
              guest_dinner: dayMeal.guestDinner || 0,
              manager_adjustment: dayMeal.managerAdjustment || 0,
              adjustment_reason: dayMeal.adjustmentReason || null
            }, { onConflict: 'user_id,date' }).then(({ error }) => {
              if (error) console.error("Error upserting meal to Supabase:", error);
            });
          });
        });
      });
    }
  };

  // Add Bazaar expense record
  const handleAddBazaarEntry = (entry: Omit<BazaarEntry, 'id'>) => {
    if (settings.isMonthClosed) return;

    const tempId = `baz-${Date.now()}`;
    const newEntry: BazaarEntry = {
      ...entry,
      status: entry.status || 'Pending',
      id: tempId
    };

    setBazaarEntries(prev => [newEntry, ...prev]);

    const submitter = users.find(u => u.id === entry.assignedTo[0])?.name || 'Unknown';
    logAction(
      'Bazaar Entries',
      `Bazaar claims created for ${submitter}: ${entry.items} worth ${settings.currency}${entry.price}`,
      'No entry recorded',
      `Items: ${entry.items}, Quantity: ${entry.quantity}, Price: ${settings.currency}${entry.price}, Status: ${entry.status}`
    );

    if (newEntry.status === 'Pending') {
      handleAddNotification(
        'BazaarReminder',
        `New Bazaar Claim: ${entry.items}`,
        `${submitter} logged a bazaar expense of ${settings.currency}${entry.total || entry.subtotal || entry.price} for ${entry.items}. Awaiting manager verification.`,
        undefined,
        'Bazaar'
      );
    }

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      const targetUser = entry.assignedTo[0] || currentUser.id;
      getSupabaseUserAndMessId(targetUser, users, currentUser).then(async ({ userId: dbUserId, messId }) => {
        const payload: any = {
          date: entry.date,
          items: entry.items,
          quantity: entry.quantity,
          price: entry.price,
          subtotal: entry.subtotal || entry.price,
          status: entry.status || 'Pending',
          user_id: dbUserId,
          approved_by: entry.approvedBy && isUUID(entry.approvedBy) ? entry.approvedBy : null,
          notes: entry.notes || null,
          receipt_url: entry.receiptUrl || null
        };
        if (messId) payload.mess_id = messId;

        supabase.from('bazaar_entries').insert(payload).select().then(({ data, error }) => {
          if (data && data[0] && !error) {
            const realId = String(data[0].id);
            setBazaarEntries(prev => prev.map(b => b.id === tempId ? { ...b, id: realId } : b));
          } else if (error) {
            console.error("Error inserting bazaar entry to Supabase:", error);
          }
        });
      });
    }
  };

  // Delete Bazaar record
  const handleDeleteBazaarEntry = (id: string) => {
    if (settings.isMonthClosed) return;

    const target = bazaarEntries.find(b => b.id === id);
    if (!target) return;

    setBazaarEntries(prev => prev.filter(b => b.id !== id));
    logAction(
      'Bazaar Entries', 
      `Deleted bazaar claims record: ${target.items} (${settings.currency}${target.price})`,
      `Items: ${target.items}, Quantity: ${target.quantity}, Price: ${settings.currency}${target.price}, Status: ${target.status}`,
      'Record completely deleted'
    );

    if (isSupabaseConfigured) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('bazaar_entries').delete().eq('id', qId).then(({ error }) => {
        if (error) console.error("Error deleting bazaar entry from Supabase:", error);
      });
    }
  };

  // Approve / Reject bazaar claim
  const handleUpdateBazaarStatus = (id: string, status: 'Approved' | 'Rejected') => {
    if (settings.isMonthClosed) return;

    setBazaarEntries(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, status, approvedBy: currentUser.id };
      }
      return b;
    }));

    const target = bazaarEntries.find(b => b.id === id);
    if (target) {
      logAction(
        'Bazaar Approval', 
        `Audited Bazaar entry: marked ${target.items} claims as ${status}`,
        `Status: ${target.status}`,
        `Status: ${status}`
      );
    }

    if (isSupabaseConfigured) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('bazaar_entries').update({
        status,
        approved_by: currentUser.id
      }).eq('id', qId).then(({ error }) => {
        if (error) console.error("Error updating bazaar status in Supabase:", error);
      });
    }
  };

  // Edit Bazaar Entry
  const handleEditBazaarEntry = (updatedEntry: BazaarEntry) => {
    if (settings.isMonthClosed) return;

    const target = bazaarEntries.find(b => b.id === updatedEntry.id);
    const oldText = target 
      ? `Items: ${target.items}, Quantity: ${target.quantity}, Price: ${settings.currency}${target.price}, Status: ${target.status}`
      : 'N/A';

    setBazaarEntries(prev => prev.map(b => b.id === updatedEntry.id ? updatedEntry : b));
    logAction(
      'Bazaar Entries', 
      `Modified bazaar claims record: ${updatedEntry.items} (${settings.currency}${updatedEntry.price})`,
      oldText,
      `Items: ${updatedEntry.items}, Quantity: ${updatedEntry.quantity}, Price: ${settings.currency}${updatedEntry.price}, Status: ${updatedEntry.status}`
    );

    if (isSupabaseConfigured) {
      const qId = isNaN(Number(updatedEntry.id)) ? updatedEntry.id : Number(updatedEntry.id);
      supabase.from('bazaar_entries').update({
        items: updatedEntry.items,
        quantity: updatedEntry.quantity,
        price: updatedEntry.price,
        subtotal: updatedEntry.subtotal || updatedEntry.price,
        status: updatedEntry.status,
        notes: updatedEntry.notes || null,
        date: updatedEntry.date
      }).eq('id', qId).then(({ error }) => {
        if (error) console.error("Error updating bazaar entry in Supabase:", error);
      });
    }
  };

  // Add Deposit
  const handleAddDeposit = (deposit: Omit<Deposit, 'id'>) => {
    if (settings.isMonthClosed) return;

    const tempId = `dep-${Date.now()}`;
    const newDeposit: Deposit = {
      ...deposit,
      id: tempId
    };

    setDeposits(prev => [newDeposit, ...prev]);

    const memberName = users.find(u => u.id === deposit.userId)?.name || 'Unknown';
    logAction(
      'Deposits',
      `Recorded payment of ${settings.currency}${deposit.amount} for ${memberName} via ${deposit.method}`,
      'No transactions recorded',
      `Deposit: ${settings.currency}${deposit.amount}, Method: ${deposit.method}, Status: ${deposit.status}`
    );

    if (deposit.status === 'Pending') {
      handleAddNotification(
        'DepositReminder',
        `New Deposit Request: ${settings.currency}${deposit.amount}`,
        `${memberName} submitted a deposit request of ${settings.currency}${deposit.amount} via ${deposit.method}. Awaiting manager review.`,
        undefined,
        'Deposits'
      );
    }

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      getSupabaseUserAndMessId(deposit.userId, users, currentUser).then(async ({ userId: dbUserId, messId }) => {
        const payload: any = {
          user_id: dbUserId,
          amount: deposit.amount,
          date: deposit.date,
          method: deposit.method,
          transaction_id: deposit.transactionId || null,
          note: deposit.note || null,
          status: deposit.status || 'Pending'
        };
        if (messId) payload.mess_id = messId;

        supabase.from('deposits').insert(payload).select().then(({ data, error }) => {
          if (data && data[0] && !error) {
            const realId = String(data[0].id);
            setDeposits(prev => prev.map(d => d.id === tempId ? { ...d, id: realId } : d));
          } else if (error) {
            console.error("Error inserting deposit to Supabase:", error);
          }
        });
      });
    }
  };

  // Delete Deposit
  const handleDeleteDeposit = (id: string) => {
    if (settings.isMonthClosed) return;

    const target = deposits.find(d => d.id === id);
    if (!target) return;

    setDeposits(prev => prev.filter(d => d.id !== id));
    const memberName = users.find(u => u.id === target.userId)?.name || 'Unknown';
    logAction(
      'Deposits',
      `Deleted deposit transaction for ${memberName} worth ${settings.currency}${target.amount}`,
      `Deposit: ${settings.currency}${target.amount}, Method: ${target.method}, Status: ${target.status}`,
      'Transaction completely deleted'
    );

    if (isSupabaseConfigured) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('deposits').delete().eq('id', qId).then(({ error }) => {
        if (error) console.error("Error deleting deposit from Supabase:", error);
      });
    }
  };

  // Approve / Reject deposit claim
  const handleUpdateDepositStatus = (id: string, status: 'Approved' | 'Rejected') => {
    if (settings.isMonthClosed) return;

    setDeposits(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status };
      }
      return d;
    }));

    const target = deposits.find(d => d.id === id);
    if (target) {
      const memberName = users.find(u => u.id === target.userId)?.name || 'Unknown';
      logAction(
        'Deposits',
        `Audited Deposit transaction for ${memberName}: marked ${settings.currency}${target.amount} as ${status}`,
        `Status: ${target.status}`,
        `Status: ${status}`
      );
    }

    if (isSupabaseConfigured) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('deposits').update({ status }).eq('id', qId).then(({ error }) => {
        if (error) console.error("Error updating deposit status in Supabase:", error);
      });
    }
  };

  // Add Overhead utility expense
  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    if (settings.isMonthClosed) return;

    const tempId = `exp-${Date.now()}`;
    const newExpense: Expense = {
      ...expense,
      id: tempId
    };

    setExpenses(prev => [newExpense, ...prev]);
    logAction(
      'Overhead Cost Created',
      `Registered monthly overhead: ${expense.category} cost worth ${settings.currency}${expense.amount}`
    );

    if (isSupabaseConfigured) {
      getSupabaseUserAndMessId(currentUser.id, users, currentUser).then(async ({ messId }) => {
        const payload: any = {
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
          note: expense.note || null
        };
        if (messId) payload.mess_id = messId;

        supabase.from('expenses').insert(payload).select().then(({ data, error }) => {
          if (data && data[0] && !error) {
            const realId = String(data[0].id);
            setExpenses(prev => prev.map(e => e.id === tempId ? { ...e, id: realId } : e));
          } else if (error) {
            console.error("Error inserting expense to Supabase:", error);
          }
        });
      });
    }
  };

  // Delete Overhead utility expense
  const handleDeleteExpense = (id: string) => {
    if (settings.isMonthClosed) return;

    const target = expenses.find(e => e.id === id);
    if (!target) return;

    setExpenses(prev => prev.filter(e => e.id !== id));
    logAction('Overhead Cost Revoked', `Deleted overhead entry: ${target.category} bill worth ${settings.currency}${target.amount}`);

    if (isSupabaseConfigured) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('expenses').delete().eq('id', qId).then(({ error }) => {
        if (error) console.error("Error deleting expense from Supabase:", error);
      });
    }
  };

  // Publish Notice
  const handleAddNotice = (notice: Omit<Notice, 'id' | 'date' | 'authorId' | 'authorName'>) => {
    const { today } = getEffectiveDatesForMonth(activeMonth);
    const newNotice: Notice = {
      ...notice,
      id: `not-${Date.now()}`,
      date: today,
      authorId: currentUser.id,
      authorName: currentUser.name
    };

    setNotices(prev => [newNotice, ...prev]);
    logAction(
      'Notices', 
      `Broadcasted board announcement: "${notice.title}"`,
      'No Notice published',
      `Title: ${notice.title}, Priority: ${notice.priority}, Expiry: ${notice.expiryDate || 'None'}`
    );

    // Trigger Notice Published notification for all active members
    users.filter(u => u.isActive).forEach(u => {
      handleAddNotification(
        'NoticePublished',
        `New Notice: ${notice.title}`,
        `Hi ${u.name}, ${currentUser.name} published an announcement: "${notice.title}". Tap to view details on the Notice Board.`,
        u.id,
        'Notices'
      );
    });

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      getSupabaseUserAndMessId(currentUser.id, users, currentUser).then(async ({ userId: authorId, messId }) => {
        if (!messId) return;
        const basePayload: any = {
          title: notice.title,
          description: notice.description,
          priority: notice.priority,
          date: newNotice.date,
          author_id: authorId,
          attachment: notice.attachment || null,
          mess_id: messId,
        };
        const fullPayload: any = {
          ...basePayload,
          expiry_date: notice.expiryDate || null,
          is_pinned: Boolean(notice.isPinned),
        };

        const { data, error } = await supabase.from('notices').insert(fullPayload).select();
        if (data && data[0] && !error) {
          const realId = String(data[0].id);
          setNotices(prev => prev.map(n => n.id === newNotice.id ? { ...n, id: realId } : n));
        } else if (error && (error.message?.includes('column') || error.code === '42703')) {
          const { data: fallbackData, error: fallbackErr } = await supabase.from('notices').insert(basePayload).select();
          if (fallbackData && fallbackData[0] && !fallbackErr) {
            const realId = String(fallbackData[0].id);
            setNotices(prev => prev.map(n => n.id === newNotice.id ? { ...n, id: realId } : n));
          } else if (fallbackErr) {
            console.error("Error inserting notice to Supabase:", fallbackErr);
          }
        } else if (error) {
          console.error("Error inserting notice to Supabase:", error);
        }
      });
    }
  };

  // Delete Notice
  const handleDeleteNotice = (id: string) => {
    if (currentPersona === 'Member') return;
    const target = notices.find(n => n.id === id);
    if (!target) return;
    setNotices(prev => prev.filter(n => n.id !== id));
    logAction(
      'Notices', 
      `Removed notice: "${target.title}"`,
      `Title: ${target.title}, Priority: ${target.priority}, Author: ${target.authorName}`,
      'Notice completely deleted'
    );

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('notices').delete().eq('id', qId).then(({ error }) => {
        if (error) console.error("Error deleting notice from Supabase:", error);
      });
    }
  };

  // Toggle Pin Notice
  const handleTogglePinNotice = (id: string) => {
    if (currentPersona === 'Member') return;
    const target = notices.find(n => n.id === id);
    if (!target) return;
    const nextPinned = !target.isPinned;
    setNotices(prev => prev.map(n => n.id === id ? { ...n, isPinned: nextPinned } : n));
    logAction(
      'Notices', 
      `${nextPinned ? 'Pinned' : 'Unpinned'} notice: "${target.title}"`,
      `isPinned: ${target.isPinned ? 'true' : 'false'}`,
      `isPinned: ${nextPinned ? 'true' : 'false'}`
    );

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('notices').update({ is_pinned: nextPinned }).eq('id', qId).then(({ error }) => {
        if (error) console.error("Error updating notice pin in Supabase:", error);
      });
    }
  };

  // Create User (Admin Only)
  const handleAddUser = (user: Omit<User, 'id'>) => {
    const newUserId = `u${users.length + 1}`;
    const newUser: User = {
      ...user,
      id: newUserId
    };

    setUsers(prev => [...prev, newUser]);

    // Create a corresponding blank meal sheet for the active month
    const blankMeals: MemberMealSheet['meals'] = {};
    getMonthDates(activeMonth).forEach((dateStr) => {
      blankMeals[dateStr] = {
        breakfast: false,
        lunch: false,
        dinner: false,
        guestBreakfast: 0,
        guestLunch: 0,
        guestDinner: 0
      };
    });

    const newSheet: MemberMealSheet = {
      userId: newUserId,
      meals: blankMeals
    };

    setMeals(prev => [...prev, newSheet]);
    logAction(
      'Manager Changes', 
      `Registered new member profile: ${user.name} with privilege ${user.role}`,
      'N/A',
      `Name: ${user.name}, Role: ${user.role}, Email: ${user.email}, Phone: ${user.phone}, Active: ${user.isActive ? 'Yes' : 'No'}`
    );
  };

  // Update User Profile details
  const handleUpdateUser = (updatedUser: User) => {
    const previousUser = users.find(u => u.id === updatedUser.id);
    const oldText = previousUser 
      ? `Name: ${previousUser.name}, Role: ${previousUser.role}, Email: ${previousUser.email || 'N/A'}, Phone: ${previousUser.phone || 'N/A'}, Active: ${previousUser.isActive ? 'Yes' : 'No'}`
      : 'N/A';
    const newText = `Name: ${updatedUser.name}, Role: ${updatedUser.role}, Email: ${updatedUser.email || 'N/A'}, Phone: ${updatedUser.phone || 'N/A'}, Active: ${updatedUser.isActive ? 'Yes' : 'No'}`;

    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    logAction('Manager Changes', `Adjusted profile data for ${updatedUser.name}`, oldText, newText);

    // Sync to Supabase users table
    if (isSupabaseConfigured) {
      supabase.from('users').update({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        is_active: updatedUser.isActive,
        default_meal_on: updatedUser.defaultMealOn,
      }).eq('id', updatedUser.id).then(({ error }) => {
        if (error && updatedUser.email) {
          supabase.from('users').update({
            name: updatedUser.name,
            phone: updatedUser.phone,
            role: updatedUser.role,
            is_active: updatedUser.isActive,
            default_meal_on: updatedUser.defaultMealOn,
          }).eq('email', updatedUser.email).then(({ error: err2 }) => {
            if (err2) console.error("Error syncing user update to Supabase:", err2);
          });
        } else if (error) {
          console.error("Error syncing user update to Supabase:", error);
        }
      });
    }

    // Trigger Manager Changed notification if role changes to or from 'Meal Manager'
    if (previousUser && previousUser.role !== updatedUser.role) {
      const isManagerChange = previousUser.role === 'Meal Manager' || updatedUser.role === 'Meal Manager';
      if (isManagerChange) {
        users.filter(u => u.isActive).forEach(u => {
          handleAddNotification(
            'ManagerChanged',
            `Mess Authority Transition: Manager Changed`,
            `The administration has updated the roles. ${updatedUser.name} role changed from ${previousUser.role} to ${updatedUser.role}.`,
            u.id,
            'Dashboard'
          );
        });
      }
    }
  };

  // Delete User Profile
  const handleDeleteUser = async (id: string): Promise<boolean> => {
    const target = users.find(u => u.id === id);
    if (!target) return false;

    if (isSupabaseConfigured && isUUID(currentUser?.id) && isUUID(id)) {
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .select('id');

      if (error || !data || data.length === 0) {
        console.error("Error syncing user deletion to Supabase:", error || "No rows deleted (missing DELETE RLS policy on users table)");
        showToast(
          settings.language === 'Bangla'
            ? 'ডেটাবেস থেকে সদস্য মুছে ফেলা যায়নি। Supabase-এ users টেবিলের DELETE পলিসি যোগ করুন।'
            : 'Could not delete member from database. Please add the DELETE RLS policy on the users table.',
          'error'
        );
        return false;
      }
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    setMeals(prev => prev.filter(s => s.userId !== id));
    logAction(
      'Manager Changes', 
      `Removed member credentials completely for: ${target.name}`,
      `Name: ${target.name}, Role: ${target.role}, Email: ${target.email || 'N/A'}, Phone: ${target.phone || 'N/A'}`,
      'Profile deleted permanently'
    );
    return true;
  };

  // Ensure all active/existing users have meal sheet date slots initialized for a target month
  const ensureMealsForMonth = (monthStr: string) => {
    const targetDates = getMonthDates(monthStr);
    setMeals(prevMeals => {
      const existingUserIds = new Set(prevMeals.map(m => m.userId));
      const updated = prevMeals.map(sheet => {
        let changed = false;
        const nextMeals = { ...sheet.meals };
        targetDates.forEach(dateStr => {
          if (!nextMeals[dateStr]) {
            changed = true;
            nextMeals[dateStr] = {
              breakfast: false,
              lunch: false,
              dinner: false,
              guestBreakfast: 0,
              guestLunch: 0,
              guestDinner: 0
            };
          }
        });
        return changed ? { ...sheet, meals: nextMeals } : sheet;
      });

      users.forEach(u => {
        if (!existingUserIds.has(u.id)) {
          const freshMeals: MemberMealSheet['meals'] = {};
          targetDates.forEach(dateStr => {
            freshMeals[dateStr] = {
              breakfast: false,
              lunch: false,
              dinner: false,
              guestBreakfast: 0,
              guestLunch: 0,
              guestDinner: 0
            };
          });
          updated.push({ userId: u.id, meals: freshMeals });
        }
      });

      return updated;
    });
  };

  // Start / Rollover to a new billing month (e.g., July 2026 -> August 2026)
  const handleStartNewMonth = (
    targetMonth?: string,
    options: { autoCloseAndCarryForward?: boolean } = {}
  ) => {
    const nextMonth = targetMonth && /^\d{4}-\d{2}$/.test(targetMonth)
      ? targetMonth
      : getNextMonth(activeMonth);

    let nextClosedMonths = [...(settings.closedMonths || [])];

    // If rolling over from an unclosed month with autoCarryForward requested,
    // calculate activeMonth balances, archive snapshot, and carry forward first.
    if (options.autoCloseAndCarryForward && !settings.isMonthClosed) {
      const monthDates = getMonthDates(activeMonth);
      const isVac = (userId: string, date: string) =>
        vacations.some(vp => vp.userId === userId && date >= vp.startDate && date <= vp.endDate);

      const monthBazaar = bazaarEntries
        .filter(b => b.status === 'Approved' && b.date.startsWith(activeMonth))
        .reduce((s, b) => s + b.price, 0);
      const monthOtherExp = expenses
        .filter(e => e.date.startsWith(activeMonth))
        .reduce((s, e) => s + e.amount, 0);
      const monthTotalExp = monthBazaar + monthOtherExp;

      const activeUsersList = users.filter(u => u.isActive);
      const totalMonthMeals = activeUsersList.reduce((sum, u) => {
        const sheet = meals.find(s => s.userId === u.id);
        let uMeals = 0;
        monthDates.forEach(d => {
          if (isVac(u.id, d)) return;
          const m = sheet?.meals[d];
          if (!m) return;
          uMeals += (m.breakfast ? 0.5 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0)
            + ((m.guestBreakfast || 0) * 0.5) + (m.guestLunch || 0) + (m.guestDinner || 0);
        });
        return sum + uMeals;
      }, 0);

      const mealRate = totalMonthMeals > 0 ? monthTotalExp / totalMonthMeals : 0;
      const monthApprovedDeposits = deposits
        .filter(d => d.status === 'Approved' && d.date.startsWith(activeMonth))
        .reduce((s, d) => s + d.amount, 0);

      const memberSummaries: ClosedMonthRecord['memberSummaries'] = [];
      const updatedUsers = users.map(u => {
        const sheet = meals.find(s => s.userId === u.id);
        let uMeals = 0;
        monthDates.forEach(d => {
          if (isVac(u.id, d)) return;
          const m = sheet?.meals[d];
          if (!m) return;
          uMeals += (m.breakfast ? 0.5 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0)
            + ((m.guestBreakfast || 0) * 0.5) + (m.guestLunch || 0) + (m.guestDinner || 0);
        });
        const billAmount = uMeals * mealRate;
        const uDeposits = deposits
          .filter(d => d.userId === u.id && d.status === 'Approved' && d.date.startsWith(activeMonth))
          .reduce((s, d) => s + d.amount, 0);
        const cf = u.carryForward || 0;
        const closingBalance = Number((cf + uDeposits - billAmount).toFixed(2));

        if (u.isActive) {
          memberSummaries.push({
            userId: u.id,
            name: u.name,
            totalMeals: uMeals,
            billAmount,
            deposits: uDeposits,
            carryForward: cf,
            closingBalance
          });
        }

        return {
          ...u,
          carryForward: closingBalance
        };
      });

      setUsers(updatedUsers);
      if (isSupabaseConfigured && isUUID(currentUser?.id)) {
        updatedUsers.forEach(u => {
          if (isUUID(u.id)) {
            supabase.from('users').update({ carry_forward: u.carryForward || 0 }).eq('id', u.id).then(({ error }) => {
              if (error) console.error("Error updating user carry_forward in Supabase:", error);
            });
          }
        });
      }

      const snapshot: ClosedMonthRecord = {
        month: activeMonth,
        closedAt: new Date().toISOString(),
        closedBy: currentUser.name,
        mealRate,
        totalMeals: totalMonthMeals,
        totalExpenses: monthTotalExp,
        totalDeposits: monthApprovedDeposits,
        memberSummaries
      };
      nextClosedMonths = [
        snapshot,
        ...nextClosedMonths.filter(c => c.month !== activeMonth)
      ];
    }

    ensureMealsForMonth(nextMonth);

    const nextSettings: SystemSettings = {
      ...settings,
      activeMonth: nextMonth,
      isMonthClosed: false,
      lockOverride: false,
      closedMonths: nextClosedMonths
    };
    setSettings(nextSettings);
    syncSettingsToSupabase(nextSettings);

    const prevLabel = formatMonthLabel(activeMonth, settings.language);
    const nextLabel = formatMonthLabel(nextMonth, settings.language);

    logAction(
      'Month Closing',
      `Rolled over active billing month from ${prevLabel} to ${nextLabel}${options.autoCloseAndCarryForward ? ' (balances carried forward)' : ''}`,
      `${activeMonth} (${settings.isMonthClosed ? 'Closed' : 'Open'})`,
      `${nextMonth} (Open)`
    );

    users.filter(u => u.isActive).forEach(u => {
      handleAddNotification(
        'System',
        settings.language === 'Bangla'
          ? `নতুন মাস শুরু হয়েছে: ${nextLabel}`
          : `New Billing Month Active: ${nextLabel}`,
        settings.language === 'Bangla'
          ? `হ্যালো ${u.name}, মেস সিস্টেম এখন ${nextLabel} মাসে আপডেট করা হয়েছে। আগের মাসের ব্যালেন্স ক্যারী ফরওয়ার্ড করা হয়েছে।`
          : `Hi ${u.name}, the mess billing cycle has transitioned to ${nextLabel}. Previous balances have been carried forward.`,
        u.id,
        'Dashboard'
      );
    });

    showToast(
      settings.language === 'Bangla'
        ? `নতুন মাস (${nextLabel}) সফলভাবে চালু হয়েছে!`
        : `Successfully switched to ${nextLabel}!`,
      'success'
    );
  };

  // Sync SystemSettings to Supabase (with graceful fallback if extended columns aren't migrated yet)
  const syncSettingsToSupabase = (nextSettings: SystemSettings) => {
    if (!isSupabaseConfigured || !isUUID(currentUser?.id)) return;
    getSupabaseUserAndMessId(currentUser.id, users, currentUser).then(async ({ messId }) => {
      if (!messId) return;
      const basePayload = {
        mess_id: messId,
        system_name: nextSettings.systemName,
        meal_lock_time: nextSettings.mealLockTime,
        default_meal_on: nextSettings.defaultMealOn,
        currency: nextSettings.currency,
        guest_meal_limit: nextSettings.guestMealLimit,
        is_month_closed: nextSettings.isMonthClosed,
        language: nextSettings.language,
        mgr_can_approve_bazaar: nextSettings.mgrCanApproveBazaar ?? true,
        mgr_can_add_deposit: nextSettings.mgrCanAddDeposit ?? true,
        mgr_can_add_expense: nextSettings.mgrCanAddExpense ?? true,
        mgr_can_manage_users: nextSettings.mgrCanManageUsers ?? false,
        mgr_can_publish_notice: nextSettings.mgrCanPublishNotice ?? true,
      };
      const fullPayload = {
        ...basePayload,
        active_month: nextSettings.activeMonth || getRealCurrentMonth(),
        closed_months: nextSettings.closedMonths || [],
        lock_override: nextSettings.lockOverride ?? false,
        theme: nextSettings.theme || 'Light',
      };

      const { error } = await supabase.from('system_settings').upsert(fullPayload, { onConflict: 'mess_id' });
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        const { error: fallbackErr } = await supabase.from('system_settings').upsert(basePayload, { onConflict: 'mess_id' });
        if (fallbackErr) console.error("Error syncing settings to Supabase:", fallbackErr);
      } else if (error) {
        console.error("Error syncing settings to Supabase:", error);
      }
    });
  };

  // Update Settings
  const handleUpdateSettings = (updatedSettings: SystemSettings) => {
    const wasClosed = settings.isMonthClosed;
    const prevMonth = settings.activeMonth || getRealCurrentMonth();
    const nextMonth = updatedSettings.activeMonth || prevMonth;
    if (nextMonth !== prevMonth) {
      ensureMealsForMonth(nextMonth);
    }
    setSettings(updatedSettings);
    syncSettingsToSupabase(updatedSettings);

    const oldText = `Month: ${prevMonth}, Closed: ${settings.isMonthClosed ? 'Yes' : 'No'}, Theme: ${settings.theme || 'Default'}, Lang: ${settings.language || 'English'}, LockTime: ${settings.mealLockTime}`;
    const newText = `Month: ${nextMonth}, Closed: ${updatedSettings.isMonthClosed ? 'Yes' : 'No'}, Theme: ${updatedSettings.theme || 'Default'}, Lang: ${updatedSettings.language || 'English'}, LockTime: ${updatedSettings.mealLockTime}`;

    if (wasClosed !== updatedSettings.isMonthClosed) {
      logAction(
        'Month Closing', 
        `Month state toggled to ${updatedSettings.isMonthClosed ? 'Closed & Locked' : 'Open & Editable'} (${formatMonthLabel(nextMonth)})`,
        oldText,
        newText
      );
    } else {
      logAction(
        'Settings Changes',
        `Adjusted general mess settings values`,
        oldText,
        newText
      );
    }

    // Trigger Month Closed notification if toggled to true
    if (!wasClosed && updatedSettings.isMonthClosed) {
      const activeLabel = formatMonthLabel(nextMonth, updatedSettings.language);
      users.filter(u => u.isActive).forEach(u => {
        handleAddNotification(
          'MonthClosed',
          `Mess Month Closed & Locked (${activeLabel})`,
          `Hi ${u.name}, the billing month (${activeLabel}) has been officially closed and audited. Ledger edits are now locked.`,
          u.id,
          'Reports'
        );
      });
    }
  };

  // Restore Backup snapshots
  const handleRestoreBackup = (backupData: any) => {
    if (backupData.users) setUsers(backupData.users);
    if (backupData.meals) setMeals(backupData.meals);
    if (backupData.deposits) setDeposits(backupData.deposits);
    if (backupData.bazaarEntries) setBazaarEntries(backupData.bazaarEntries);
    if (backupData.expenses) setExpenses(backupData.expenses);
    if (backupData.notices) setNotices(backupData.notices);
    if (backupData.activityLogs) setActivityLogs(backupData.activityLogs);
    if (backupData.vacations) setVacations(backupData.vacations);
    if (backupData.assignedBazaarPersons) setAssignedBazaarPersons(backupData.assignedBazaarPersons);
    if (backupData.settings) {
      setSettings(backupData.settings);
      if (backupData.settings.theme === 'Light') {
        setDarkMode(false);
      } else {
        setDarkMode(true);
      }
    }
    
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'System Variables Adjust',
      details: 'Full database snapshot restored successfully from offline backup file.',
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // Add Vacation Period Sabbatical
  const handleAddVacation = (userId: string, startDate: string, endDate: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const tempId = `vac_${Date.now()}`;
    const newVacation: VacationPeriod = {
      id: tempId,
      userId,
      startDate,
      endDate
    };

    setVacations(prev => [...prev, newVacation]);
    logAction('Vacation Scheduled', `Vacation registered for ${targetUser.name} from ${startDate} to ${endDate}. Meals are automatically marked OFF for these dates.`);

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      getSupabaseUserAndMessId(userId, users, currentUser).then(({ userId: dbUserId, messId }) => {
        if (!messId || !isUUID(dbUserId)) return;
        supabase.from('vacation_periods').insert({
          mess_id: messId,
          user_id: dbUserId,
          start_date: startDate,
          end_date: endDate
        }).select().then(({ data, error }) => {
          if (data && data[0] && !error) {
            const realId = String(data[0].id);
            setVacations(prev => prev.map(v => v.id === tempId ? { ...v, id: realId } : v));
          } else if (error) {
            console.error("Error inserting vacation to Supabase:", error);
          }
        });
      });
    }
  };

  // Update Vacation Period
  const handleUpdateVacation = (id: string, userId: string, startDate: string, endDate: string) => {
    const targetUser = users.find(u => u.id === userId);
    const updatedVacation: VacationPeriod = {
      id: String(id),
      userId,
      startDate,
      endDate
    };

    setVacations(prev => {
      const exists = prev.some(v => String(v.id) === String(id) || v.userId === userId);
      if (exists) {
        return prev.map(v => (String(v.id) === String(id) || v.userId === userId) ? updatedVacation : v);
      } else {
        return [...prev, updatedVacation];
      }
    });
    logAction('Vacation Updated', `Updated vacation scheduled for ${targetUser?.name || 'User'} to ${startDate} to ${endDate}.`);

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('vacation_periods').update({
        user_id: userId,
        start_date: startDate,
        end_date: endDate
      }).eq('id', qId).then(({ error }) => {
        if (error) {
          supabase.from('vacation_periods').update({
            start_date: startDate,
            end_date: endDate
          }).eq('user_id', userId).then(({ error: err2 }) => {
            if (err2) console.error("Error updating vacation in Supabase:", err2);
          });
        }
      });
    }
  };

  // Cancel Vacation Period
  const handleCancelVacation = (id: string) => {
    const target = vacations.find(v => String(v.id) === String(id));
    if (!target) return;

    const targetUser = users.find(u => u.id === target.userId);
    setVacations(prev => prev.filter(v => String(v.id) !== String(id)));
    logAction('Vacation Cancelled', `Cancelled vacation scheduled for ${targetUser?.name || 'User'} (${target.startDate} to ${target.endDate}). Regular schedule resumes.`);

    if (isSupabaseConfigured && isUUID(currentUser?.id)) {
      const qId = isNaN(Number(id)) ? id : Number(id);
      supabase.from('vacation_periods').delete().eq('id', qId).then(({ error }) => {
        if (error) {
          supabase.from('vacation_periods').delete().eq('user_id', target.userId).then(({ error: err2 }) => {
            if (err2) console.error("Error deleting vacation from Supabase:", err2);
          });
        }
      });
    }
  };

  // -------------------------------------------------------------------
  // RENDERING TAB DISPATCHER
  // -------------------------------------------------------------------
  const renderTabContent = () => {
    switch (currentTab) {
      case 'Dashboard':
        return (
          <DashboardTab
            currentUser={currentUser}
            role={currentPersona}
            allUsers={users}
            meals={meals}
            deposits={deposits}
            bazaarEntries={bazaarEntries}
            expenses={expenses}
            notices={notices}
            activities={activityLogs}
            settings={settings}
            vacationPeriods={vacations}
            onQuickAction={(action) => {
              if (action === 'deposit') setCurrentTab('Deposits');
              else if (action === 'bazaar') setCurrentTab('Bazaar');
              else if (action === 'notice') setCurrentTab('Notices');
              else if (action === 'adjustment') setCurrentTab('MealSheet');
              else if (action === 'vacation') {
                setCurrentTab('MealSheet');
                setTimeout(() => {
                  const element = document.getElementById('vacation-panel');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 100);
              }
            }}
            onUpdateMeals={handleUpdateMeals}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
      case 'MealSheet':
        return (
          <MealSheetTab
            currentUser={currentUser}
            role={currentPersona}
            allUsers={users}
            meals={meals}
            onUpdateMeals={handleUpdateMeals}
            settings={settings}
            vacationPeriods={vacations}
            onAddVacation={handleAddVacation}
            onUpdateVacation={handleUpdateVacation}
            onCancelVacation={handleCancelVacation}
            onLogAction={logAction}
            onUpdateSettings={handleUpdateSettings}
          />
        );
      case 'Bazaar':
        return (
          <BazaarTab
            currentUser={currentUser}
            role={currentPersona}
            allUsers={users}
            bazaarEntries={bazaarEntries}
            onAddBazaarEntry={handleAddBazaarEntry}
            onEditBazaarEntry={handleEditBazaarEntry}
            onApproveEntry={(id, status) => handleUpdateBazaarStatus(id, status)}
            onDeleteEntry={handleDeleteBazaarEntry}
            settings={settings}
            assignedBazaarPersons={assignedBazaarPersons}
            onUpdateAssignedPersons={setAssignedBazaarPersons}
            onTriggerBazaarReminder={handleTriggerBazaarReminder}
          />
        );
      case 'Deposits':
        return (
          <DepositTab
            currentUser={currentUser}
            role={currentPersona}
            allUsers={users}
            deposits={deposits}
            onAddDeposit={handleAddDeposit}
            onDeleteDeposit={handleDeleteDeposit}
            onApproveDeposit={handleUpdateDepositStatus}
            onUpdateUser={handleUpdateUser}
            meals={meals}
            bazaarEntries={bazaarEntries}
            expenses={expenses}
            settings={settings}
          />
        );
      case 'Expenses':
        return (
          <ExpenseTab
            currentUser={currentUser}
            role={currentPersona}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            settings={settings}
          />
        );
      case 'Notices':
        return (
          <NoticeBoardTab
            currentUser={currentUser}
            role={currentPersona}
            notices={notices}
            onAddNotice={handleAddNotice}
            onDeleteNotice={handleDeleteNotice}
            onTogglePinNotice={handleTogglePinNotice}
            settings={settings}
          />
        );
      case 'Reports':
        return (
          <ReportsTab
            allUsers={users}
            meals={meals}
            deposits={deposits}
            bazaarEntries={bazaarEntries}
            expenses={expenses}
            settings={settings}
            currentUser={currentUser}
            role={currentPersona}
            onUpdateUsers={(updatedUsers) => {
              setUsers(updatedUsers);
              if (isSupabaseConfigured && isUUID(currentUser?.id)) {
                updatedUsers.forEach(u => {
                  if (isUUID(u.id)) {
                    supabase.from('users').update({ carry_forward: u.carryForward || 0 }).eq('id', u.id).then(({ error }) => {
                      if (error) console.error("Error updating user carry_forward from ReportsTab:", error);
                    });
                  }
                });
              }
            }}
            onUpdateSettings={handleUpdateSettings}
            onStartNewMonth={handleStartNewMonth}
            onLogAction={logAction}
            vacationPeriods={vacations}
          />
        );
      case 'Users':
        return (
          <UsersTab
            currentUser={currentUser}
            allUsers={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            settings={settings}
          />
        );
      case 'AuditLogs':
        return (
          <AuditLogTab
            activities={activityLogs}
          />
        );
      case 'Settings':
        return (
          <SettingsTab
            role={currentPersona}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onStartNewMonth={handleStartNewMonth}
            activeTheme={activeUserTheme}
            onChangeUserTheme={handleUpdateUserTheme}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onRestoreBackup={handleRestoreBackup}
            allDataToBackup={{
              users,
              meals,
              deposits,
              bazaarEntries,
              expenses,
              notices,
              activityLogs,
              vacations,
              assignedBazaarPersons,
              settings,
            }}
          />
        );
      default:
        return (
          <div className="py-20 text-center">
            <h2 className="text-xl font-bold">Work In Progress</h2>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50/70 dark:bg-slate-950 font-sans transition-colors duration-300">
      
      {/* DESKTOP SIDEBAR - STICKY LEFT */}
      <div className={`hidden lg:block shrink-0 border-r border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 h-screen sticky top-0 transition-all duration-350 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          role={currentPersona}
          setRole={setCurrentPersona}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          allUsers={users}
          systemName={settings.systemName}
          onLogout={handleLogout}
          settings={settings}
        />
      </div>

      {/* MOBILE DRAWER SIDEBAR */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-fade-in bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-64 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 transition hover:text-slate-800"
            >
              <X size={18} />
            </button>
            
            <div className="h-full pt-4">
              <Sidebar
                currentTab={currentTab}
                setCurrentTab={(tab) => {
                  setCurrentTab(tab);
                  setMobileMenuOpen(false);
                }}
                collapsed={false}
                setCollapsed={() => {}}
                role={currentPersona}
                setRole={setCurrentPersona}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                allUsers={users}
                systemName={settings.systemName}
                onLogout={handleLogout}
                settings={settings}
              />
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER FRAME */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP COMPONENT HEADER BAR */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 dark:border-slate-900 h-16 flex items-center justify-between px-6">
          
          <div className="flex items-center gap-3">
            {/* Mobile burger button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>{settings.systemName}</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-slate-800 dark:text-white font-black">{currentTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Month indicator */}
            <button
              type="button"
              onClick={() => setCurrentTab(currentPersona === 'Admin' ? 'Settings' : 'Reports')}
              title={currentPersona === 'Admin' ? 'Manage active month in Settings' : 'Active billing month'}
              className="bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
            >
              <Calendar size={13} className="text-emerald-500" />
              <span>{formatMonthLabel(activeMonth, settings.language)}</span>
            </button>

            {/* Month Closed lockdown alert banner */}
            {settings.isMonthClosed && (
              <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 uppercase tracking-wider">
                <Lock size={12} /> Closed
              </div>
            )}

            {/* Personal Theme Switcher (Available for ALL roles) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                title={settings.language === 'Bangla' ? 'আপনার ব্যক্তিগত থিম পরিবর্তন করুন' : 'Change Your Personal Theme'}
              >
                <Palette size={18} />
                <span className="hidden xl:inline text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {activeUserTheme}
                </span>
              </button>

              {themeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setThemeMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 space-y-1">
                    <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        {settings.language === 'Bangla' ? 'আপনার পার্সোনাল থিম' : 'Personal Theme'}
                      </span>
                    </div>
                    {([
                      { id: 'Light', label: 'Light Slate', dot: 'bg-slate-200 border-slate-400' },
                      { id: 'Dark', label: 'Charcoal Dark', dot: 'bg-slate-800 border-slate-600' },
                      { id: 'Cosmic Slate', label: 'Cosmic Slate', dot: 'bg-indigo-600 border-indigo-400' },
                      { id: 'Emerald Forest', label: 'Emerald Forest', dot: 'bg-emerald-600 border-emerald-400' },
                      { id: 'Rose Quartz', label: 'Rose Quartz (Pink)', dot: 'bg-pink-600 border-pink-400' },
                    ] as const).map(opt => {
                      const selected = activeUserTheme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            handleUpdateUserTheme(opt.id);
                            setThemeMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            selected
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full border ${opt.dot}`} />
                            <span>{opt.label}</span>
                          </span>
                          {selected && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => setNotificationCenterOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition relative"
              title="Open Notification Center"
              id="notification-bell-btn"
            >
              <Bell size={18} />
              {notifications.filter(n => (!n.targetUserId || n.targetUserId === currentUser.id) && !n.isRead).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* Persona Display avatar */}
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <span className="font-bold text-slate-900 dark:text-white text-xs block">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">{currentPersona} Mode</span>
              </div>
              <img 
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} 
                className="w-8.5 h-8.5 rounded-full object-cover ring-2 ring-emerald-500/20"
                alt={currentUser.name} 
                referrerPolicy="no-referrer"
              />
            </div>

          </div>

        </header>

        {/* PAGE SCREEN STAGE */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1440px] mx-auto overflow-y-auto space-y-6">
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-9 h-9 border-3 border-slate-200 dark:border-slate-800 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading view...</p>
            </div>
          }>
            {renderTabContent()}
          </React.Suspense>
        </main>

      </div>

      {/* GLOBAL IN-APP NOTIFICATION CENTER DRAWER */}
      <NotificationCenter
        notifications={notifications}
        currentUser={currentUser}
        allUsers={users}
        meals={meals}
        assignedBazaarPersons={assignedBazaarPersons}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onClearAll={handleClearAllNotifications}
        onTriggerMealReminder={handleTriggerMealReminder}
        onTriggerBazaarReminder={handleTriggerBazaarReminder}
        onTriggerDepositReminder={handleTriggerDepositReminder}
        onNavigateTab={(tab) => setCurrentTab(tab)}
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        currency={settings.currency}
        activeMonth={activeMonth}
      />

    </div>
  );
}
