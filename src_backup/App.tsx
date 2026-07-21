import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon,
  ShieldCheck,
  Calendar,
  Lock,
  ChevronRight,
  Menu,
  Moon,
  Sun,
  X,
  Bell
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
  AppNotification
} from './types';

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

export default function App() {
  const { showToast, showAlert, showConfirm } = useFeedback();

  // Global States loaded with localStorage persistence
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('mms_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
        if (parsed && parsed.systemName) return parsed;
      } catch (e) {}
    }
    return initialSettings;
  });

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
    
    // Default initial mock notifications for July 2026
    return [
      {
        id: 'notif-1',
        type: 'NoticePublished',
        title: 'New Announcement: Annual Mess Feast',
        description: 'The Annual Mess Feast has been officially scheduled for July 25th. All members are requested to complete advance deposits.',
        date: '2026-07-18',
        isRead: false,
        linkToTab: 'Notices',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30m ago
      },
      {
        id: 'notif-2',
        type: 'MealReminder',
        title: 'Action Required: Daily Meal Reservation Reminder',
        description: 'Please review and submit your breakfast, lunch, and dinner preferences for tomorrow (July 19) before 10:00 PM lock time.',
        date: '2026-07-18',
        isRead: false,
        linkToTab: 'MealSheet',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2h ago
      },
      {
        id: 'notif-3',
        type: 'BazaarReminder',
        title: 'Bazaar Schedule Alert: Next Duty Slot',
        description: 'Sajid and Nayeem are assigned to tomorrow morning\'s bazaar duty. Please purchase fresh groceries and upload raw receipts.',
        date: '2026-07-18',
        isRead: true,
        linkToTab: 'Bazaar',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5h ago
      },
      {
        id: 'notif-4',
        type: 'DepositReminder',
        title: 'Deposit Requested: Pending Mess Outflow Balance',
        description: 'A deposit transaction of 2,000 BDT is recommended to avoid getting into a negative balance as utility overheads are coming up.',
        date: '2026-07-18',
        isRead: false,
        linkToTab: 'Deposits',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() // 8h ago
      },
      {
        id: 'notif-5',
        type: 'ManagerChanged',
        title: 'Manager Transition Notice',
        description: 'Admin has set Mashad to Meal Manager status. Please contact Mashad for any immediate pantry or menu adjustments.',
        date: '2026-07-18',
        isRead: true,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1d ago
      },
      {
        id: 'notif-6',
        type: 'MonthClosed',
        title: 'System Archive: June 2026 Closed Successfully',
        description: 'The ledger and meal count summaries for June 2026 have been permanently closed. Balances have been successfully carried forward.',
        date: '2026-07-17',
        isRead: true,
        timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() // 1.5d ago
      }
    ];
  });

  const [notificationCenterOpen, setNotificationCenterOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('mms_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('mms_authenticated') === 'true';
  });

  // Current User (Session-driven)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('mms_current_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        const fresh = users.find(x => x.id === u.id);
        if (fresh) return fresh;
        return u;
      } catch (e) {}
    }
    return users[0] || initialUsers[0];
  });

  // Persona & Navigation State
  const [currentPersona, setCurrentPersona] = useState<'Admin' | 'Meal Manager' | 'Member'>(() => {
    const saved = localStorage.getItem('mms_current_user');
    if (saved) {
      try {
        return JSON.parse(saved).role;
      } catch (e) {}
    }
    return 'Admin';
  });

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

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('mms_authenticated', 'true');
      localStorage.setItem('mms_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('mms_authenticated');
      localStorage.removeItem('mms_current_user');
    }
  }, [isAuthenticated, currentUser]);

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

  // Dark Mode tailwind class toggling
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Synchronize Theme Preset Classes
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all previous theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-cosmic', 'theme-emerald', 'theme-pink');
    
    const theme = settings.theme || 'Light';
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
  }, [settings.theme]);

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

  // Handle Log Out
  const handleLogout = () => {
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

    const currentUserId = currentUser.id;
    const ipAddress = userIPs[currentUserId] || '103.242.23.150';
    const device = userDevices[currentUserId] || 'Chrome 126 (Windows 11)';
    const now = new Date();
    
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().split(' ')[0];

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'Logout',
      details: `User logged out from active session: ${currentUser.name}`,
      timestamp: now.toISOString(),
      oldValue: 'Session: Active',
      newValue: 'Session: Idle',
      ipAddress,
      device,
      date: dateStr,
      time: timeStr
    };
    setActivityLogs(prev => [newLog, ...prev]);
    
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
  };

  // -------------------------------------------------------------------
  // IN-APP NOTIFICATIONS ENGINE
  // -------------------------------------------------------------------
  
  // 1. Mark a notification as read
  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  // 2. Mark all relevant notifications as read
  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => {
      if (!n.targetUserId || n.targetUserId === currentUser.id) {
        return { ...n, isRead: true };
      }
      return n;
    }));
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
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      title,
      description,
      date: '2026-07-18', // July 2026 current month hardcoded context
      isRead: false,
      targetUserId,
      linkToTab,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
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

  // Guard Screen: Render LoginScreen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <LoginScreen 
          allUsers={users} 
          onLoginSuccess={handleLoginSuccess} 
          language={settings.language || 'English'}
          onLanguageChange={(lang) => setSettings(prev => ({ ...prev, language: lang }))}
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

    // Find current user's meal sheet
    setMeals(prevSheets => {
      return prevSheets.map(sheet => {
        if (sheet.userId === currentUser.id) {
          const updatedMeals = { ...sheet.meals };
          const tomorrowDate = '2026-07-19'; // hardcoded target month tomorrow date
          
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
      `Updated tomorrow's (${'2026-07-19'}) meals: Breakfast=${updatedStatus.breakfast ? 'ON' : 'OFF'}, Lunch=${updatedStatus.lunch ? 'ON' : 'OFF'}, Dinner=${updatedStatus.dinner ? 'ON' : 'OFF'}`
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

  // Add Bazaar expense record
  const handleAddBazaarEntry = (entry: Omit<BazaarEntry, 'id'>) => {
    if (settings.isMonthClosed) return;

    const newEntry: BazaarEntry = {
      ...entry,
      status: entry.status || 'Pending',
      id: `baz-${Date.now()}`
    };

    setBazaarEntries(prev => [newEntry, ...prev]);

    const submitter = users.find(u => u.id === entry.assignedTo[0])?.name || 'Unknown';
    logAction(
      'Bazaar Entries',
      `Bazaar claims created for ${submitter}: ${entry.items} worth ${settings.currency}${entry.price}`,
      'No entry recorded',
      `Items: ${entry.items}, Quantity: ${entry.quantity}, Price: ${settings.currency}${entry.price}, Status: ${entry.status}`
    );
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
  };

  // Add Deposit
  const handleAddDeposit = (deposit: Omit<Deposit, 'id'>) => {
    if (settings.isMonthClosed) return;

    const newDeposit: Deposit = {
      ...deposit,
      id: `dep-${Date.now()}`
    };

    setDeposits(prev => [newDeposit, ...prev]);

    const memberName = users.find(u => u.id === deposit.userId)?.name || 'Unknown';
    logAction(
      'Deposits',
      `Recorded payment of ${settings.currency}${deposit.amount} for ${memberName} via ${deposit.method}`,
      'No transactions recorded',
      `Deposit: ${settings.currency}${deposit.amount}, Method: ${deposit.method}, Status: ${deposit.status}`
    );
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
  };

  // Add Overhead utility expense
  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    if (settings.isMonthClosed) return;

    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}`
    };

    setExpenses(prev => [newExpense, ...prev]);
    logAction(
      'Overhead Cost Created',
      `Registered monthly overhead: ${expense.category} cost worth ${settings.currency}${expense.amount}`
    );
  };

  // Delete Overhead utility expense
  const handleDeleteExpense = (id: string) => {
    if (settings.isMonthClosed) return;

    const target = expenses.find(e => e.id === id);
    if (!target) return;

    setExpenses(prev => prev.filter(e => e.id !== id));
    logAction('Overhead Cost Revoked', `Deleted overhead entry: ${target.category} bill worth ${settings.currency}${target.amount}`);
  };

  // Publish Notice
  const handleAddNotice = (notice: Omit<Notice, 'id' | 'date' | 'authorId' | 'authorName'>) => {
    const newNotice: Notice = {
      ...notice,
      id: `not-${Date.now()}`,
      date: '2026-07-18', // today's date
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
  };

  // Create User (Admin Only)
  const handleAddUser = (user: Omit<User, 'id'>) => {
    const newUserId = `u${users.length + 1}`;
    const newUser: User = {
      ...user,
      id: newUserId
    };

    setUsers(prev => [...prev, newUser]);

    // Create a corresponding blank meal sheet for this month
    const blankMeals: MemberMealSheet['meals'] = {};
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-07-${day < 10 ? '0' + day : day}`;
      blankMeals[dateStr] = {
        breakfast: user.defaultMealOn,
        lunch: user.defaultMealOn,
        dinner: user.defaultMealOn,
        guestBreakfast: 0,
        guestLunch: 0,
        guestDinner: 0
      };
    }

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
  const handleDeleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;

    setUsers(prev => prev.filter(u => u.id !== id));
    setMeals(prev => prev.filter(s => s.userId !== id));
    logAction(
      'Manager Changes', 
      `Removed member credentials completely for: ${target.name}`,
      `Name: ${target.name}, Role: ${target.role}, Email: ${target.email || 'N/A'}, Phone: ${target.phone || 'N/A'}`,
      'Profile deleted permanently'
    );
  };

  // Update Settings
  const handleUpdateSettings = (updatedSettings: SystemSettings) => {
    const wasClosed = settings.isMonthClosed;
    setSettings(updatedSettings);

    const oldText = `Closed: ${settings.isMonthClosed ? 'Yes' : 'No'}, Theme: ${settings.theme || 'Default'}, Lang: ${settings.language || 'English'}, LockTime: ${settings.mealLockTime}`;
    const newText = `Closed: ${updatedSettings.isMonthClosed ? 'Yes' : 'No'}, Theme: ${updatedSettings.theme || 'Default'}, Lang: ${updatedSettings.language || 'English'}, LockTime: ${updatedSettings.mealLockTime}`;

    if (wasClosed !== updatedSettings.isMonthClosed) {
      logAction(
        'Month Closing', 
        `Month state toggled to ${updatedSettings.isMonthClosed ? 'Closed & Locked' : 'Open & Editable'}`,
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
      users.filter(u => u.isActive).forEach(u => {
        handleAddNotification(
          'MonthClosed',
          `Mess Month Closed & Locked`,
          `Hi ${u.name}, the current month (July 2026) has been officially closed and audited. Ledger edits are now locked.`,
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

    const newVacation: VacationPeriod = {
      id: `vac_${Date.now()}`,
      userId,
      startDate,
      endDate
    };

    setVacations(prev => [...prev, newVacation]);
    logAction('Vacation Scheduled', `Vacation registered for ${targetUser.name} from ${startDate} to ${endDate}. Meals are automatically marked OFF for these dates.`);
  };

  // Cancel Vacation Period
  const handleCancelVacation = (id: string) => {
    const target = vacations.find(v => v.id === id);
    if (!target) return;

    const targetUser = users.find(u => u.id === target.userId);
    setVacations(prev => prev.filter(v => v.id !== id));
    logAction('Vacation Cancelled', `Cancelled vacation scheduled for ${targetUser?.name || 'User'} (${target.startDate} to ${target.endDate}). Regular schedule resumes.`);
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
            onUpdateMeals={setMeals}
          />
        );
      case 'MealSheet':
        return (
          <MealSheetTab
            currentUser={currentUser}
            role={currentPersona}
            allUsers={users}
            meals={meals}
            onUpdateMeals={setMeals}
            settings={settings}
            vacationPeriods={vacations}
            onAddVacation={handleAddVacation}
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
            onUpdateUsers={setUsers}
            onUpdateSettings={handleUpdateSettings}
            onLogAction={logAction}
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
          <div className="relative w-64 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-100 dark:border-slate-850">
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
            <div className="bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-750">
              <Calendar size={13} className="text-emerald-500" />
              <span>July 2026</span>
            </div>

            {/* Month Closed lockdown alert banner */}
            {settings.isMonthClosed && (
              <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 uppercase tracking-wider">
                <Lock size={12} /> Closed
              </div>
            )}

            {/* Quick Dark Mode icon toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title={darkMode ? 'Switch to Light' : 'Switch to Dark'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

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
                <span className="font-bold text-slate-850 dark:text-white text-xs block">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">{currentPersona} Mode</span>
              </div>
              <img 
                src={currentUser.avatarUrl} 
                className="w-8.5 h-8.5 rounded-full object-cover ring-2 ring-emerald-500/20"
                alt={currentUser.name} 
                referrerPolicy="no-referrer"
              />
            </div>

          </div>

        </header>

        {/* PAGE SCREEN STAGE */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-full mx-auto overflow-y-auto space-y-6">
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading component...</p>
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
      />

    </div>
  );
}
