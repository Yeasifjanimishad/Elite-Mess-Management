import { User, MemberMealSheet, Deposit, BazaarEntry, Expense, Notice, ActivityLog, SystemSettings } from './types';
import { getRealCurrentMonth, getMonthDates } from './utils/dateUtils';

export const initialUsers: User[] = [
  {
    id: 'u-1',
    name: 'Asif Rahman',
    email: 'asif@mms.com',
    phone: '+8801712345678',
    role: 'Admin',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    defaultMealOn: true,
    pin: '1234',
    carryForward: 0,
  },
  {
    id: 'u-2',
    name: 'Tanvir Hossain',
    email: 'tanvir@mms.com',
    phone: '+8801812345679',
    role: 'Meal Manager',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    defaultMealOn: true,
    pin: '1234',
    carryForward: 0,
  },
  {
    id: 'u-3',
    name: 'Sajid Islam',
    email: 'sajid@mms.com',
    phone: '+8801912345680',
    role: 'Member',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    defaultMealOn: true,
    pin: '1234',
    carryForward: 0,
  },
  {
    id: 'u-4',
    name: 'Mahnaz Chowdhury',
    email: 'mahnaz@mms.com',
    phone: '+8801512345681',
    role: 'Member',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    defaultMealOn: true,
    pin: '1234',
    carryForward: 0,
  },
  {
    id: 'u-5',
    name: 'Nayeem Hasan',
    email: 'nayeem@mms.com',
    phone: '+8801612345682',
    role: 'Member',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
    defaultMealOn: true,
    pin: '1234',
    carryForward: 0,
  },
  {
    id: 'u-6',
    name: 'Fariha Ahmed',
    email: 'fariha@mms.com',
    phone: '+8801312345683',
    role: 'Member',
    isActive: false, // Inactive user
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
    defaultMealOn: false,
    pin: '1234',
    carryForward: 0,
  }
];

export const initialSettings: SystemSettings = {
  systemName: 'Elite Mess Management',
  activeMonth: getRealCurrentMonth(),
  closedMonths: [],
  mealLockTime: '22:00',
  defaultMealOn: true,
  currency: '৳',
  guestMealLimit: 5,
  isMonthClosed: false,
  language: 'English',
  theme: 'Light',
  mgrCanApproveBazaar: true,
  mgrCanAddDeposit: true,
  mgrCanAddExpense: true,
  mgrCanManageUsers: false,
  mgrCanPublishNotice: true,
};

// Clean initial meals (all meals set to off/0 for fresh mess state)
export const generateInitialMeals = (users: User[], monthStr: string = getRealCurrentMonth()): MemberMealSheet[] => {
  const monthDates = getMonthDates(monthStr);
  return users.map((user) => {
    const meals: { [date: string]: any } = {};
    monthDates.forEach((dateStr) => {
      meals[dateStr] = {
        breakfast: false,
        lunch: false,
        dinner: false,
        guestBreakfast: 0,
        guestLunch: 0,
        guestDinner: 0
      };
    });
    return {
      userId: user.id,
      meals
    };
  });
};

export const initialDeposits: Deposit[] = [];

export const initialBazaarEntries: BazaarEntry[] = [];

export const initialExpenses: Expense[] = [];

export const initialNotices: Notice[] = [];

export const initialActivities: ActivityLog[] = [];
