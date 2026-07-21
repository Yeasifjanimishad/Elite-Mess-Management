import { User, MemberMealSheet, Deposit, BazaarEntry, Expense, Notice, ActivityLog, SystemSettings } from './types';

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
    carryForward: 500,
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
    carryForward: -150,
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
    carryForward: 300,
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
    carryForward: -450,
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

// Generate realistic meals for July 2026
// We will generate meals for 6 users for 31 days.
export const generateInitialMeals = (users: User[]): MemberMealSheet[] => {
  const mealSheets: MemberMealSheet[] = [];
  const activeUsers = users;

  activeUsers.forEach((user) => {
    const meals: { [date: string]: any } = {};
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-07-${day < 10 ? '0' + day : day}`;
      
      // Some variance
      const isWeekend = day % 7 === 3 || day % 7 === 4; // Simulated weekends
      const isOff = day === 15 || (user.id === 'u-5' && day >= 10 && day <= 14); // Sajid went home on 10-14th
      
      let breakfast = !isOff;
      let lunch = !isOff;
      let dinner = !isOff;

      // Partial meals on weekends
      if (isWeekend && !isOff) {
        breakfast = day % 3 !== 0;
        lunch = true;
        dinner = day % 4 !== 0;
      }

      // Guest meals
      let guestBreakfast = 0;
      let guestLunch = 0;
      let guestDinner = 0;

      if (user.id === 'u-3' && day === 12) {
        guestLunch = 2;
      }
      if (user.id === 'u-1' && day === 18) {
        guestDinner = 1;
      }
      if (user.id === 'u-4' && day === 5) {
        guestLunch = 1;
        guestDinner = 1;
      }

      meals[dateStr] = {
        breakfast,
        lunch,
        dinner,
        guestBreakfast,
        guestLunch,
        guestDinner
      };
    }
    mealSheets.push({
      userId: user.id,
      meals
    });
  });

  return mealSheets;
};

export const initialDeposits: Deposit[] = [
  { id: 'dep-1', userId: 'u-1', amount: 5000, date: '2026-07-01', method: 'bKash', transactionId: 'BKX9320L41', note: 'Monthly advance' },
  { id: 'dep-2', userId: 'u-2', amount: 5000, date: '2026-07-01', method: 'Nagad', transactionId: 'NGD84920K2', note: 'Monthly advance' },
  { id: 'dep-3', userId: 'u-3', amount: 3500, date: '2026-07-02', method: 'Cash', note: 'Paid in hand' },
  { id: 'dep-4', userId: 'u-4', amount: 5000, date: '2026-07-02', method: 'Bank', transactionId: 'TXN2849021', note: 'EFT Transfer' },
  { id: 'dep-5', userId: 'u-5', amount: 4000, date: '2026-07-03', method: 'bKash', transactionId: 'BKX3810292', note: 'Partial deposit' },
  { id: 'dep-6', userId: 'u-3', amount: 1500, date: '2026-07-15', method: 'Nagad', transactionId: 'NGD1029302', note: 'Mid-month adjustment' },
];

export const initialBazaarEntries: BazaarEntry[] = [
  {
    id: 'baz-1',
    date: '2026-07-02',
    items: 'Rice 25kg, Lentils 5kg, Cooking Oil 5L',
    quantity: '1 batch',
    price: 3450,
    subtotal: 3450,
    status: 'Approved',
    assignedTo: ['u-3', 'u-5'],
    approvedBy: 'u-2',
    notes: 'Bought from Kawran Bazar. Got a slight discount on rice.',
    receiptUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'baz-2',
    date: '2026-07-05',
    items: 'Chicken 8kg, Potatoes 5kg, Spices',
    quantity: '8 kg + 5 kg',
    price: 2150,
    subtotal: 2150,
    status: 'Approved',
    assignedTo: ['u-4', 'u-1'],
    approvedBy: 'u-2',
    notes: 'Fresh chicken'
  },
  {
    id: 'baz-3',
    date: '2026-07-10',
    items: 'Fish (Rui) 6kg, Vegetables, Eggs 30pcs',
    quantity: '1 lot',
    price: 2800,
    subtotal: 2800,
    status: 'Approved',
    assignedTo: ['u-3', 'u-2'],
    approvedBy: 'u-2',
    notes: 'Fish was very fresh.'
  },
  {
    id: 'baz-4',
    date: '2026-07-15',
    items: 'Beef 5kg, Onions, Garlic, Green Chilies',
    quantity: '5 kg + spices',
    price: 4500,
    subtotal: 4500,
    status: 'Approved',
    assignedTo: ['u-5', 'u-1'],
    approvedBy: 'u-2',
    notes: 'Beef price was slightly higher than budget.'
  },
  {
    id: 'baz-5',
    date: '2026-07-17',
    items: 'Eggs 60pcs, Vegetables, Salt, Sugar',
    quantity: 'Multiple items',
    price: 1350,
    subtotal: 1350,
    status: 'Pending',
    assignedTo: ['u-3', 'u-4'],
    notes: 'Awaiting manager approval'
  }
];

export const initialExpenses: Expense[] = [
  { id: 'exp-1', category: 'Gas', amount: 1500, date: '2026-07-05', note: 'Double burner cylinder cylinder gas' },
  { id: 'exp-2', category: 'Internet', amount: 800, date: '2026-07-06', note: 'Fiber broadband monthly bill' },
  { id: 'exp-3', category: 'Maid', amount: 3500, date: '2026-07-10', note: 'Helper salary for cooking and cleaning' },
  { id: 'exp-4', category: 'Water', amount: 600, date: '2026-07-12', note: 'WASA bill adjustment' },
  { id: 'exp-5', category: 'Cleaning', amount: 450, date: '2026-07-14', note: 'Floor cleaner, toilet cleaner & trash bags' },
];

export const initialNotices: Notice[] = [
  {
    id: 'not-1',
    title: 'New Meal Rate Calculations for July',
    description: 'Dear members, due to rising market prices of beef and oils, we expect the meal rate to fluctuate slightly. Please try to deposit your advances by the 5th of this month to ensure smooth bazaar routines.',
    priority: 'High',
    date: '2026-07-01',
    authorId: 'u-2',
    authorName: 'Tanvir Hossain',
    expiryDate: '2026-07-25',
    isPinned: true
  },
  {
    id: 'not-2',
    title: 'Friday Feast Schedule',
    description: 'On Friday, 24th July, we will have a special dinner. Beef Biryani and Borhani will be served. Guests are welcome, please update your Guest Meals on the Meal Sheet at least 24 hours in advance.',
    priority: 'Medium',
    date: '2026-07-16',
    authorId: 'u-2',
    authorName: 'Tanvir Hossain',
    expiryDate: '2026-07-24',
    isPinned: false
  },
  {
    id: 'not-3',
    title: 'Helper Maid Vacation Alert',
    description: 'Our regular cooking assistant (Maid) will be on leave from 28th July to 30th July. Members are requested to cooperate. We might have simple meals or opt for outside catering if needed.',
    priority: 'Low',
    date: '2026-07-18',
    authorId: 'u-1',
    authorName: 'Asif Rahman',
    expiryDate: '2026-07-31',
    isPinned: false
  }
];

export const initialActivities: ActivityLog[] = [
  { 
    id: 'act-1', 
    timestamp: '2026-07-18T09:30:00Z', 
    userId: 'u-2', 
    userName: 'Tanvir Hossain', 
    action: 'Bazaar Approval', 
    details: 'Approved bazaar entry for Beef & spices worth ৳4,500',
    oldValue: 'Status: Pending',
    newValue: 'Status: Approved',
    ipAddress: '103.230.105.18',
    device: 'Chrome 126 (Windows 11)',
    date: '2026-07-18',
    time: '09:30:00'
  },
  { 
    id: 'act-2', 
    timestamp: '2026-07-18T08:15:00Z', 
    userId: 'u-1', 
    userName: 'Asif Rahman', 
    action: 'Notices', 
    details: 'Published notice: Helper Maid Vacation Alert',
    oldValue: 'Count: 2 notices',
    newValue: 'Count: 3 notices (Added "Helper Maid Vacation Alert")',
    ipAddress: '180.234.3.56',
    device: 'Edge 126 (Windows 11)',
    date: '2026-07-18',
    time: '08:15:00'
  },
  { 
    id: 'act-3', 
    timestamp: '2026-07-17T21:45:00Z', 
    userId: 'u-3', 
    userName: 'Sajid Islam', 
    action: 'Meal Updates', 
    details: 'Updated tomorrow\'s meal (Breakfast: OFF, Lunch: ON, Dinner: ON)',
    oldValue: 'Breakfast: ON, Lunch: ON, Dinner: ON',
    newValue: 'Breakfast: OFF, Lunch: ON, Dinner: ON',
    ipAddress: '103.88.22.10',
    device: 'Chrome Mobile 126 (Android 14)',
    date: '2026-07-17',
    time: '21:45:00'
  },
  { 
    id: 'act-4', 
    timestamp: '2026-07-17T18:30:00Z', 
    userId: 'u-2', 
    userName: 'Tanvir Hossain', 
    action: 'Deposits', 
    details: 'Recorded cash deposit of ৳1,500 for Sajid Islam',
    oldValue: 'Balance: ৳3,400',
    newValue: 'Balance: ৳4,900',
    ipAddress: '103.230.105.18',
    device: 'Safari 17 (macOS Sonoma)',
    date: '2026-07-17',
    time: '18:30:00'
  },
  { 
    id: 'act-5', 
    timestamp: '2026-07-16T15:20:00Z', 
    userId: 'u-2', 
    userName: 'Tanvir Hossain', 
    action: 'Meal Adjustments', 
    details: 'Added 2 meals for Mahnaz Chowdhury. Reason: Guest arrived without notice.',
    oldValue: 'Total meals: 15',
    newValue: 'Total meals: 17',
    ipAddress: '103.230.105.18',
    device: 'Safari Mobile 17 (iOS 17)',
    date: '2026-07-16',
    time: '15:20:00'
  },
  {
    id: 'act-6',
    timestamp: '2026-07-16T10:00:00Z',
    userId: 'u-1',
    userName: 'Asif Rahman',
    action: 'Login',
    details: 'User authenticated successfully',
    oldValue: 'Session: Idle',
    newValue: 'Session: Active',
    ipAddress: '180.234.3.56',
    device: 'Chrome 126 (Windows 11)',
    date: '2026-07-16',
    time: '10:00:00'
  }
];
