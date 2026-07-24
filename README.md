# 🏢 Elite Mess Management System

A modern, full-featured, and highly responsive **Mess Management System (MMS)** web application designed to simplify daily mess operations, meal tracking, bazaar expenses, member deposits, manager approvals, and financial reporting.

---

## ✨ Features

- **📊 Dashboard & Overview**: Real-time stats on total meals, bazaar costs, average meal rate, member balances, and recent activities.
- **🍽️ Daily Meal Tracker**: Track breakfast, lunch, and dinner count for each member with easy increment/decrement controls and automated meal rate calculation.
- **🛒 Bazaar Expense Management**: Log bazaar purchases, assign costs to specific members, upload receipts, and manage pending claim approvals by Manager/Admin.
- **💳 Member Deposit Tracking**: Submit deposit requests with payment method and transaction ID. Admin/Manager can verify and approve deposits.
- **📢 Notice Board**: Broadcast important announcements, rules, and updates to all mess members.
- **👑 Role-Based Access Control**:
  - **Admin / Manager**: Full administrative access to approve deposits, bazaar claims, edit meal entries, manage members, and configure mess settings.
  - **Member**: Access to view personal meal logs, submit bazaar entries, request deposit approvals, and view notices & reports.
- **⚡ Real-time Data Sync (Supabase)**: Multi-device synchronization powered by Supabase PostgreSQL database.
- **📱 Fully Responsive**: Designed for flawless performance across mobile, tablet, and desktop devices.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React (Icons), Motion (Framer Motion)
- **Backend / Database**: Supabase (PostgreSQL), Express (optional proxy server)
- **Deployment**: Vercel / Netlify / Cloud Run

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm / yarn / pnpm / bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and set your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🗄️ Database Setup (Supabase)

Run the SQL script found in `supabase_schema.sql` inside your Supabase SQL Editor. It creates the required tables:
- `messes`
- `users`
- `meals`
- `bazaar_entries`
- `deposits`
- `expenses`
- `notices`

---

## 🌐 Deployment on Vercel

1. Push your project to GitHub.
2. Import the repository into **Vercel**.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Environment Variables** in project settings.
4. Set Build Command: `npm run build` & Output Directory: `dist`.
5. Deploy!

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
