export type UserRole = 'Admin' | 'Meal Manager' | 'Member';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  defaultMealOn: boolean;
  pin?: string;
  carryForward?: number; // Carried forward balance from previous month
}

export interface MealStatus {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  guestBreakfast: number;
  guestLunch: number;
  guestDinner: number;
}

// Maps date string "YYYY-MM-DD" to user meal status
export interface MemberMealSheet {
  userId: string;
  meals: { [date: string]: MealStatus };
}

export interface BazaarEntry {
  id: string;
  date: string;
  items: string;
  quantity: string;
  unit?: string;
  price: number;
  subtotal: number;
  total?: number;
  notes?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  assignedTo: string[]; // User IDs
  approvedBy?: string; // User ID
  receiptUrl?: string;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  date: string;
  method: 'Cash' | 'bKash' | 'Nagad' | 'Bank';
  transactionId?: string;
  note?: string;
  status?: 'Approved' | 'Pending' | 'Rejected';
}

export interface Expense {
  id: string;
  category: 'Bazaar' | 'Gas' | 'Electricity' | 'Internet' | 'Water' | 'Cleaning' | 'Maid' | 'Others';
  amount: number;
  date: string;
  note?: string;
}

export interface Notice {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  date: string;
  authorId: string;
  authorName: string;
  attachment?: string;
  expiryDate?: string;
  isPinned?: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string
  userId: string;
  userName: string;
  action: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  device?: string;
  date?: string;
  time?: string;
}

export interface SystemSettings {
  systemName: string;
  mealLockTime: string; // e.g. "22:00"
  defaultMealOn: boolean;
  currency: string; // e.g. "৳" or "$"
  guestMealLimit: number;
  isMonthClosed: boolean;
  language: 'English' | 'Bangla';
  lockOverride?: boolean;
  theme?: 'Light' | 'Dark' | 'Cosmic Slate' | 'Emerald Forest';
  
  // Manager Permissions Toggles
  mgrCanApproveBazaar?: boolean;
  mgrCanAddDeposit?: boolean;
  mgrCanAddExpense?: boolean;
  mgrCanManageUsers?: boolean;
  mgrCanPublishNotice?: boolean;
}

export interface VacationPeriod {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
}

export interface AppNotification {
  id: string;
  type: 'MealReminder' | 'BazaarReminder' | 'DepositReminder' | 'NoticePublished' | 'MonthClosed' | 'ManagerChanged' | 'System';
  title: string;
  description: string;
  date: string;
  isRead: boolean;
  targetUserId?: string; // Specific recipient user ID, or undefined if broadcast to all
  linkToTab?: string; // Optional tab to open when clicked
  timestamp: string; // Timestamp for sorting
}
