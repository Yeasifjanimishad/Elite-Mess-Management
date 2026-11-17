-- ==========================================
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- MULTI-TENANT READY MESS MANAGEMENT SYSTEM
-- ==========================================

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables to ensure a clean slate if recreated
-- (Order of dropping is important due to foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS monthly_closings CASCADE;
DROP TABLE IF EXISTS vacation_periods CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS bazaar_assignments CASCADE;
DROP TABLE IF EXISTS bazaar_items CASCADE;
DROP TABLE IF EXISTS bazaar_entries CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS messes CASCADE;

-- 1. MESSES TABLE (For Multi-Tenancy Support)
CREATE TABLE messes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for Mess table
CREATE INDEX idx_messes_id ON messes(id);

-- 2. USERS TABLE (Linked to auth.users in Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Meal Manager', 'Member')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    avatar_url TEXT,
    default_meal_on BOOLEAN DEFAULT TRUE NOT NULL,
    carry_forward NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Users Table
CREATE INDEX idx_users_mess_id ON users(mess_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 3. MEALS TABLE
CREATE TABLE meals (
    id BIGSERIAL PRIMARY KEY,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    breakfast BOOLEAN DEFAULT FALSE NOT NULL,
    lunch BOOLEAN DEFAULT FALSE NOT NULL,
    dinner BOOLEAN DEFAULT FALSE NOT NULL,
    guest_breakfast INTEGER DEFAULT 0 NOT NULL,
    guest_lunch INTEGER DEFAULT 0 NOT NULL,
    guest_dinner INTEGER DEFAULT 0 NOT NULL,
    manager_adjustment NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    adjustment_reason TEXT,
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Indexes for Meals Table
CREATE INDEX idx_meals_mess_id ON meals(mess_id);
CREATE INDEX idx_meals_user_id ON meals(user_id);
CREATE INDEX idx_meals_date ON meals(date);
CREATE INDEX idx_meals_user_date ON meals(user_id, date);

-- 4. BAZAAR ENTRIES TABLE
CREATE TABLE bazaar_entries (
    id BIGSERIAL PRIMARY KEY,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    items TEXT DEFAULT 'Bazaar Expense' NOT NULL,
    quantity TEXT DEFAULT '1' NOT NULL,
    price NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    subtotal NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Pending' NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Bazaar Entries Table
CREATE INDEX idx_bazaar_entries_mess_id ON bazaar_entries(mess_id);
CREATE INDEX idx_bazaar_entries_date ON bazaar_entries(date);
CREATE INDEX idx_bazaar_entries_status ON bazaar_entries(status);

-- 5. BAZAAR ITEMS TABLE (Normalized Item Breakdown)
CREATE TABLE bazaar_items (
    id BIGSERIAL PRIMARY KEY,
    bazaar_entry_id BIGINT REFERENCES bazaar_entries(id) ON DELETE CASCADE NOT NULL,
    item_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit TEXT DEFAULT 'kg' NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- Indexes for Bazaar Items Table
CREATE INDEX idx_bazaar_items_entry ON bazaar_items(bazaar_entry_id);

-- 6. BAZAAR ASSIGNMENTS TABLE (Who went to bazaar or is assigned)
CREATE TABLE bazaar_assignments (
    id BIGSERIAL PRIMARY KEY,
    bazaar_entry_id BIGINT REFERENCES bazaar_entries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL
);

-- Indexes for Bazaar Assignments Table
CREATE INDEX idx_bazaar_assign_entry ON bazaar_assignments(bazaar_entry_id);
CREATE INDEX idx_bazaar_assign_user ON bazaar_assignments(user_id);

-- 7. DEPOSITS TABLE
CREATE TABLE deposits (
    id BIGSERIAL PRIMARY KEY,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('Cash', 'bKash', 'Nagad', 'Bank')),
    transaction_id TEXT,
    note TEXT,
    status TEXT DEFAULT 'Approved' NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Deposits Table
CREATE INDEX idx_deposits_mess_id ON deposits(mess_id);
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_date ON deposits(date);
CREATE INDEX idx_deposits_status ON deposits(status);

-- 8. EXPENSES TABLE
CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Bazaar', 'Gas', 'Electricity', 'Internet', 'Water', 'Cleaning', 'Maid', 'Others')),
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Expenses Table
CREATE INDEX idx_expenses_mess_id ON expenses(mess_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(date);

-- 9. NOTICES TABLE
CREATE TABLE notices (
    id BIGSERIAL PRIMARY KEY,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
    date DATE NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    attachment TEXT,
    expiry_date DATE,
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Notices Table
CREATE INDEX idx_notices_mess_id ON notices(mess_id);
CREATE INDEX idx_notices_author ON notices(author_id);
CREATE INDEX idx_notices_date ON notices(date);

-- 10. ACTIVITY LOGS TABLE (Audit logs)
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL
);

-- Indexes for Activity Logs Table
CREATE INDEX idx_activity_logs_mess ON activity_logs(mess_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_time ON activity_logs(timestamp);

-- 11. SYSTEM SETTINGS TABLE (One row per Mess)
CREATE TABLE system_settings (
    mess_id UUID UNIQUE REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    system_name TEXT DEFAULT 'Mess Management System' NOT NULL,
    meal_lock_time TEXT DEFAULT '22:00' NOT NULL,
    default_meal_on BOOLEAN DEFAULT TRUE NOT NULL,
    currency TEXT DEFAULT '৳' NOT NULL,
    guest_meal_limit INTEGER DEFAULT 5 NOT NULL,
    is_month_closed BOOLEAN DEFAULT FALSE NOT NULL,
    language TEXT DEFAULT 'Bangla' NOT NULL CHECK (language IN ('English', 'Bangla')),
    mgr_can_approve_bazaar BOOLEAN DEFAULT TRUE NOT NULL,
    mgr_can_add_deposit BOOLEAN DEFAULT TRUE NOT NULL,
    mgr_can_add_expense BOOLEAN DEFAULT TRUE NOT NULL,
    mgr_can_manage_users BOOLEAN DEFAULT TRUE NOT NULL,
    mgr_can_publish_notice BOOLEAN DEFAULT TRUE NOT NULL,
    PRIMARY KEY (mess_id)
);

-- 12. VACATION PERIODS TABLE
CREATE TABLE vacation_periods (
    id BIGSERIAL PRIMARY KEY,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Vacation Periods
CREATE INDEX idx_vacation_mess ON vacation_periods(mess_id);
CREATE INDEX idx_vacation_user ON vacation_periods(user_id);
CREATE INDEX idx_vacation_range ON vacation_periods(start_date, end_date);

-- 13. MONTHLY CLOSINGS TABLE
CREATE TABLE monthly_closings (
    id BIGSERIAL PRIMARY KEY,
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    month TEXT NOT NULL, -- Format: YYYY-MM
    meal_rate NUMERIC(12,2) NOT NULL,
    total_meals NUMERIC(12,2) NOT NULL,
    total_expense NUMERIC(12,2) NOT NULL,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT,
    CONSTRAINT unique_mess_month UNIQUE (mess_id, month)
);

-- Indexes for Monthly Closings
CREATE INDEX idx_closings_mess ON monthly_closings(mess_id);
CREATE INDEX idx_closings_month ON monthly_closings(month);

-- 14. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mess_id UUID REFERENCES messes(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means broadcast to everyone in the mess
    link_to_tab TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Notifications Table
CREATE INDEX idx_notifications_mess ON notifications(mess_id);
CREATE INDEX idx_notifications_user ON notifications(target_user_id);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE messes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Security Definer Functions to bypass RLS recursion on the users table
CREATE OR REPLACE FUNCTION public.get_my_mess_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT mess_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create Policies to ensure users can only access data belonging to their Mess

-- 1. Messes RLS Policies
CREATE POLICY "Users can view their own mess" ON messes
    FOR SELECT USING (
        id = public.get_my_mess_id()
    );

-- 2. Users RLS Policies
CREATE POLICY "Allow read access to users in the same mess" ON users
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow users to read their own profile" ON users
    FOR SELECT USING (
        id = auth.uid()
    );

CREATE POLICY "Allow users to update their own profile" ON users
    FOR UPDATE USING (
        id = auth.uid()
    );

CREATE POLICY "Allow Admins and Managers to update profiles in same mess" ON users
    FOR UPDATE USING (
        mess_id = public.get_my_mess_id()
        AND public.get_my_role() IN ('Admin', 'Meal Manager')
    );

-- 3. Meals RLS Policies
CREATE POLICY "Allow read access to meals in the same mess" ON meals
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow users to modify their own meals if not locked/closed" ON meals
    FOR ALL USING (
        user_id = auth.uid()
    );

CREATE POLICY "Allow Managers and Admins to manage all meals in same mess" ON meals
    FOR ALL USING (
        mess_id = public.get_my_mess_id()
        AND public.get_my_role() IN ('Admin', 'Meal Manager')
    );

-- 4. Bazaar Entries RLS Policies
CREATE POLICY "Allow read access to bazaar entries in the same mess" ON bazaar_entries
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow users in the same mess to create bazaar entries" ON bazaar_entries
    FOR INSERT WITH CHECK (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow admins and managers to update all bazaar entries" ON bazaar_entries
    FOR UPDATE USING (
        mess_id = public.get_my_mess_id()
    );

-- 5. Bazaar Items RLS Policies
CREATE POLICY "Allow read access to bazaar items in the same mess" ON bazaar_items
    FOR SELECT USING (
        bazaar_entry_id IN (
            SELECT id FROM bazaar_entries 
            WHERE mess_id = public.get_my_mess_id()
        )
    );

CREATE POLICY "Allow modifying bazaar items in the same mess" ON bazaar_items
    FOR ALL USING (
        bazaar_entry_id IN (
            SELECT id FROM bazaar_entries 
            WHERE mess_id = public.get_my_mess_id()
        )
    );

-- 6. Bazaar Assignments RLS Policies
CREATE POLICY "Allow read access to assignments in same mess" ON bazaar_assignments
    FOR SELECT USING (
        bazaar_entry_id IN (
            SELECT id FROM bazaar_entries 
            WHERE mess_id = public.get_my_mess_id()
        )
    );

CREATE POLICY "Allow modifying assignments in same mess" ON bazaar_assignments
    FOR ALL USING (
        bazaar_entry_id IN (
            SELECT id FROM bazaar_entries 
            WHERE mess_id = public.get_my_mess_id()
        )
    );

-- 7. Deposits RLS Policies
CREATE POLICY "Allow read access to deposits in the same mess" ON deposits
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow members to submit deposits for themselves" ON deposits
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow Admins/Managers to manage deposits" ON deposits
    FOR ALL USING (
        mess_id = public.get_my_mess_id()
    );

-- 8. Expenses RLS Policies
CREATE POLICY "Allow read access to expenses in same mess" ON expenses
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow managers and admins to manage expenses" ON expenses
    FOR ALL USING (
        mess_id = public.get_my_mess_id()
    );

-- 9. Notices RLS Policies
CREATE POLICY "Allow read access to notices in same mess" ON notices
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow managers and admins to manage notices" ON notices
    FOR ALL USING (
        mess_id = public.get_my_mess_id()
    );

-- 10. Activity Logs RLS Policies
CREATE POLICY "Allow read access to activity logs in same mess" ON activity_logs
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow inserting activity logs" ON activity_logs
    FOR INSERT WITH CHECK (
        mess_id = public.get_my_mess_id()
    );

-- 11. System Settings RLS Policies
CREATE POLICY "Allow read access to settings in same mess" ON system_settings
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow admins/managers to manage settings" ON system_settings
    FOR ALL USING (
        mess_id = public.get_my_mess_id()
    )
    WITH CHECK (
        mess_id = public.get_my_mess_id()
    );

-- 12. Vacation Periods RLS Policies
CREATE POLICY "Allow read access to vacations in same mess" ON vacation_periods
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow users to manage their own vacation" ON vacation_periods
    FOR ALL USING (
        user_id = auth.uid()
    );

CREATE POLICY "Allow admin/managers to manage all vacations" ON vacation_periods
    FOR ALL USING (
        mess_id = public.get_my_mess_id()
    );

-- 13. Monthly Closings RLS Policies
CREATE POLICY "Allow read access to closings in same mess" ON monthly_closings
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow admins to manage closings" ON monthly_closings
    FOR ALL USING (
        mess_id = public.get_my_mess_id()
        AND public.get_my_role() = 'Admin'
    );

-- 14. Notifications RLS Policies
CREATE POLICY "Allow read access to notifications in same mess" ON notifications
    FOR SELECT USING (
        mess_id = public.get_my_mess_id()
        AND (target_user_id IS NULL OR target_user_id = auth.uid())
    );

CREATE POLICY "Allow inserting notifications in same mess" ON notifications
    FOR INSERT WITH CHECK (
        mess_id = public.get_my_mess_id()
    );

CREATE POLICY "Allow updating notification read status" ON notifications
    FOR UPDATE USING (
        mess_id = public.get_my_mess_id()
        AND (target_user_id IS NULL OR target_user_id = auth.uid())
    );

CREATE POLICY "Allow deleting own notifications in same mess" ON notifications
    FOR DELETE USING (
        mess_id = public.get_my_mess_id()
        AND (target_user_id = auth.uid() OR public.get_my_role() IN ('Admin', 'Meal Manager'))
    );

-- Enable Supabase Realtime for live cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE users, meals, bazaar_entries, deposits, expenses, notices, notifications, system_settings, vacation_periods, activity_logs;


-- ==========================================================
-- TRIGGER: Auto-create user profile in 'users' on sign-up
-- (This handles auth.users and public.users link instantly)
-- ==========================================================

-- Create a helper function to seed first mess if none exists
CREATE OR REPLACE FUNCTION get_or_create_default_mess() 
RETURNS UUID AS $$
DECLARE
    default_mess_id UUID;
BEGIN
    SELECT id INTO default_mess_id FROM messes LIMIT 1;
    IF default_mess_id IS NULL THEN
        INSERT INTO messes (name) VALUES ('আমার মেস') RETURNING id INTO default_mess_id;
        
        -- Also initialize default settings for this new mess
        INSERT INTO system_settings (
            mess_id, system_name, meal_lock_time, default_meal_on, 
            currency, guest_meal_limit, is_month_closed, language
        ) VALUES (
            default_mess_id, 'Mess Management System', '22:00', TRUE, 
            '৳', 5, FALSE, 'Bangla'
        ) ON CONFLICT DO NOTHING;
    END IF;
    RETURN default_mess_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- The actual trigger function on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    target_mess_id UUID;
    user_role TEXT := 'Member'; -- Default role (Always 'Member' for new users as requested)
BEGIN
    -- Determine mess_id
    target_mess_id := get_or_create_default_mess();

    -- Insert profile
    INSERT INTO public.users (
        id, 
        mess_id, 
        name, 
        email, 
        phone, 
        role, 
        is_active, 
        default_meal_on, 
        carry_forward
    )
    VALUES (
        new.id,
        target_mess_id,
        COALESCE(new.raw_user_meta_data->>'name', 'New Member'),
        new.email,
        COALESCE(new.raw_user_meta_data->>'phone', ''),
        user_role,
        TRUE,
        TRUE,
        0.00
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure one-time initialization function for creating the first Admin account
CREATE OR REPLACE FUNCTION public.initialize_first_admin(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
    admin_count INTEGER;
    updated_rows INTEGER;
BEGIN
    -- Check how many admins currently exist
    SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'Admin';
    
    IF admin_count > 0 THEN
        RETURN 'Error: An Admin already exists in the system. Unauthorized.';
    END IF;

    -- Update the user with target_email to Admin
    UPDATE public.users 
    SET role = 'Admin' 
    WHERE email = target_email;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    IF updated_rows = 1 THEN
        RETURN 'Success: User with email ' || target_email || ' has been promoted to the first Admin.';
    ELSE
        RETURN 'Error: User with email ' || target_email || ' not found in users table. Please register first.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
