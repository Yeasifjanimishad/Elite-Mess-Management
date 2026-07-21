import { relations } from 'drizzle-orm';
import { pgTable, text, boolean, integer, doublePrecision, timestamp, serial, unique, index } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase Auth UID or manual ID (e.g. 'u1')
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  role: text('role').notNull(), // 'Admin' | 'Meal Manager' | 'Member'
  isActive: boolean('is_active').default(true).notNull(),
  avatarUrl: text('avatar_url'),
  defaultMealOn: boolean('default_meal_on').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('users_email_idx').on(t.email),
  index('users_role_idx').on(t.role),
]);

// 2. Meals Table
export const meals = pgTable('meals', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: text('date').notNull(), // format YYYY-MM-DD
  breakfast: boolean('breakfast').default(false).notNull(),
  lunch: boolean('lunch').default(false).notNull(),
  dinner: boolean('dinner').default(false).notNull(),
  guestBreakfast: integer('guest_breakfast').default(0).notNull(),
  guestLunch: integer('guest_lunch').default(0).notNull(),
  guestDinner: integer('guest_dinner').default(0).notNull(),
  managerAdjustment: doublePrecision('manager_adjustment').default(0).notNull(),
  adjustmentReason: text('adjustment_reason'),
}, (t) => [
  unique('unique_user_date').on(t.userId, t.date),
  index('meals_user_id_idx').on(t.userId),
  index('meals_date_idx').on(t.date),
]);

// 3. Bazaar Entries Table
export const bazaarEntries = pgTable('bazaar_entries', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(), // format YYYY-MM-DD
  items: text('items').notNull(),
  quantity: text('quantity').notNull(),
  price: doublePrecision('price').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  notes: text('notes'),
  status: text('status').default('Pending').notNull(), // 'Pending' | 'Approved' | 'Rejected'
  approvedBy: text('approved_by').references(() => users.id, { onDelete: 'set null' }),
  receiptUrl: text('receipt_url'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('bazaar_entries_date_idx').on(t.date),
  index('bazaar_entries_status_idx').on(t.status),
]);

// 4. Bazaar Assignments Table (Many-to-Many join table)
export const bazaarAssignments = pgTable('bazaar_assignments', {
  id: serial('id').primaryKey(),
  bazaarEntryId: integer('bazaar_entry_id').references(() => bazaarEntries.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
}, (t) => [
  index('bazaar_assignments_entry_idx').on(t.bazaarEntryId),
  index('bazaar_assignments_user_idx').on(t.userId),
]);

// 5. Deposits Table
export const deposits = pgTable('deposits', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: doublePrecision('amount').notNull(),
  date: text('date').notNull(), // format YYYY-MM-DD
  method: text('method').notNull(), // 'Cash' | 'bKash' | 'Nagad' | 'Bank'
  transactionId: text('transaction_id'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('deposits_user_idx').on(t.userId),
  index('deposits_date_idx').on(t.date),
]);

// 6. Expenses Table
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(), // 'Bazaar' | 'Gas' | 'Electricity' | 'Internet' | 'Water' | 'Cleaning' | 'Maid' | 'Others'
  amount: doublePrecision('amount').notNull(),
  date: text('date').notNull(), // format YYYY-MM-DD
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('expenses_date_idx').on(t.date),
  index('expenses_category_idx').on(t.category),
]);

// 7. Notices Table
export const notices = pgTable('notices', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull(), // 'Low' | 'Medium' | 'High'
  date: text('date').notNull(), // format YYYY-MM-DD
  authorId: text('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  attachment: text('attachment'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('notices_author_idx').on(t.authorId),
  index('notices_date_idx').on(t.date),
]);

// 8. Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
}, (t) => [
  index('activity_logs_user_idx').on(t.userId),
  index('activity_logs_time_idx').on(t.timestamp),
]);

// 9. System Settings Table
export const systemSettings = pgTable('system_settings', {
  id: integer('id').primaryKey(), // Always 1
  systemName: text('system_name').notNull(),
  mealLockTime: text('meal_lock_time').notNull(),
  defaultMealOn: boolean('default_meal_on').notNull(),
  currency: text('currency').notNull(),
  guestMealLimit: integer('guest_meal_limit').notNull(),
  isMonthClosed: boolean('is_month_closed').notNull(),
  language: text('language').notNull(),
});

// 10. Vacation Periods Table
export const vacationPeriods = pgTable('vacation_periods', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('vacation_periods_user_idx').on(t.userId),
  index('vacation_periods_range_idx').on(t.startDate, t.endDate),
]);

// 11. Monthly Closings Table
export const monthlyClosings = pgTable('monthly_closings', {
  id: serial('id').primaryKey(),
  month: text('month').notNull(), // YYYY-MM
  mealRate: doublePrecision('meal_rate').notNull(),
  totalMeals: doublePrecision('total_meals').notNull(),
  totalExpense: doublePrecision('total_expense').notNull(),
  closedBy: text('closed_by').references(() => users.id, { onDelete: 'set null' }),
  closedAt: timestamp('closed_at').defaultNow().notNull(),
  notes: text('notes'),
}, (t) => [
  unique('unique_month').on(t.month),
  index('monthly_closings_month_idx').on(t.month),
]);

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  meals: many(meals),
  deposits: many(deposits),
  bazaarAssignments: many(bazaarAssignments),
  notices: many(notices),
  activityLogs: many(activityLogs),
  vacationPeriods: many(vacationPeriods),
  closedMonths: many(monthlyClosings),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
  user: one(users, {
    fields: [meals.userId],
    references: [users.id],
  }),
}));

export const bazaarEntriesRelations = relations(bazaarEntries, ({ one, many }) => ({
  approver: one(users, {
    fields: [bazaarEntries.approvedBy],
    references: [users.id],
  }),
  assignments: many(bazaarAssignments),
}));

export const bazaarAssignmentsRelations = relations(bazaarAssignments, ({ one }) => ({
  bazaarEntry: one(bazaarEntries, {
    fields: [bazaarAssignments.bazaarEntryId],
    references: [bazaarEntries.id],
  }),
  user: one(users, {
    fields: [bazaarAssignments.userId],
    references: [users.id],
  }),
}));

export const depositsRelations = relations(deposits, ({ one }) => ({
  user: one(users, {
    fields: [deposits.userId],
    references: [users.id],
  }),
}));

export const noticesRelations = relations(notices, ({ one }) => ({
  author: one(users, {
    fields: [notices.authorId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const vacationPeriodsRelations = relations(vacationPeriods, ({ one }) => ({
  user: one(users, {
    fields: [vacationPeriods.userId],
    references: [users.id],
  }),
}));

export const monthlyClosingsRelations = relations(monthlyClosings, ({ one }) => ({
  closedByUser: one(users, {
    fields: [monthlyClosings.closedBy],
    references: [users.id],
  }),
}));
