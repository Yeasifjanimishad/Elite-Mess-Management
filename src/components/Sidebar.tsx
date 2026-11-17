import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Table,
  ShoppingBag,
  HandCoins,
  CreditCard,
  Megaphone,
  FilePieChart,
  Users,
  Settings,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  FlameKindling,
  LogOut,
} from 'lucide-react';
import { User, UserRole, SystemSettings } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  role: UserRole;
  setRole: (r: UserRole) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  systemName: string;
  onLogout: () => void;
  settings?: SystemSettings;
}

interface MenuItem {
  id: string;
  name: string;
  bnName: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
}

interface MenuGroup {
  id: string;
  label: string;
  bnLabel: string;
  items: MenuItem[];
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  role,
  setRole,
  currentUser,
  setCurrentUser,
  allUsers,
  systemName,
  onLogout,
  settings,
}: SidebarProps) {
  const isBangla = settings?.language === 'Bangla';
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser.avatarUrl, currentUser.id]);

  const menuGroups: MenuGroup[] = [
    {
      id: 'daily',
      label: 'Daily Mess',
      bnLabel: 'দৈনন্দিন',
      items: [
        {
          id: 'Dashboard',
          name: 'Overview',
          bnName: 'ওভারভিউ',
          icon: LayoutDashboard,
          roles: ['Admin', 'Meal Manager', 'Member'],
        },
        {
          id: 'MealSheet',
          name: 'Meal Sheet',
          bnName: 'মিল শিট',
          icon: Table,
          roles: ['Admin', 'Meal Manager', 'Member'],
        },
        {
          id: 'Bazaar',
          name: 'Bazaar Log',
          bnName: 'বাজার হিসাব',
          icon: ShoppingBag,
          roles: ['Admin', 'Meal Manager', 'Member'],
        },
      ],
    },
    {
      id: 'finance',
      label: 'Money & Updates',
      bnLabel: 'হিসাব ও তথ্য',
      items: [
        {
          id: 'Deposits',
          name: 'Deposits',
          bnName: 'ডিপোজিট',
          icon: HandCoins,
          roles: ['Admin', 'Meal Manager', 'Member'],
        },
        {
          id: 'Expenses',
          name: 'Utilities & Bills',
          bnName: 'বিল ও খরচ',
          icon: CreditCard,
          roles: ['Admin', 'Meal Manager', 'Member'],
        },
        {
          id: 'Notices',
          name: 'Notice Board',
          bnName: 'নোটিশ বোর্ড',
          icon: Megaphone,
          roles: ['Admin', 'Meal Manager', 'Member'],
        },
        {
          id: 'Reports',
          name: 'Reports',
          bnName: 'মাসিক রিপোর্ট',
          icon: FilePieChart,
          roles: ['Admin', 'Meal Manager', 'Member'],
        },
      ],
    },
    {
      id: 'manage',
      label: 'Manage',
      bnLabel: 'পরিচালনা',
      items: [
        {
          id: 'Users',
          name: 'Members',
          bnName: 'মেম্বার তালিকা',
          icon: Users,
          roles: settings?.mgrCanManageUsers ? ['Admin', 'Meal Manager'] : ['Admin'],
        },
        {
          id: 'AuditLogs',
          name: 'Activity Log',
          bnName: 'অ্যাক্টিভিটি লগ',
          icon: ShieldAlert,
          roles: ['Admin', 'Meal Manager'],
        },
        {
          id: 'Settings',
          name: 'Settings',
          bnName: 'সেটিংস',
          icon: Settings,
          roles: ['Admin', 'Meal Manager', 'Member'],
        },
      ],
    },
  ];

  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  const handleUserChange = (userId: string) => {
    const selected = allUsers.find((u) => u.id === userId);
    if (selected) {
      setCurrentUser(selected);
      setRole(selected.role);
    }
  };

  const userInitials = (currentUser.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <aside
      id="app-sidebar"
      aria-label="Primary Sidebar Navigation"
      className={`h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 flex flex-col justify-between select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`shrink-0 flex items-center h-14 border-b border-slate-100 dark:border-slate-800/80 ${
          collapsed ? 'justify-center px-2 gap-1.5' : 'justify-between px-3.5 gap-2'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 shrink-0">
            <FlameKindling size={17} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white truncate leading-tight">
                {systemName}
              </p>
              {settings?.activeMonth && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                  {settings.activeMonth}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          id="sidebar-toggle"
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? (isBangla ? 'মেনু বড় করুন' : 'Expand sidebar') : (isBangla ? 'মেনু ছোট করুন' : 'Collapse sidebar')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Compact Grouped Navigation */}
      <nav
        aria-label="Main Menu"
        className={`flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-2 ${collapsed ? 'px-2' : 'px-2.5'} space-y-2.5`}
      >
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.id}>
            {!collapsed ? (
              <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isBangla ? group.bnLabel : group.label}
              </p>
            ) : (
              groupIndex > 0 && (
                <div className="my-1.5 mx-2 border-t border-slate-100 dark:border-slate-800" />
              )
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const label = isBangla ? item.bnName : item.name;

                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    type="button"
                    onClick={() => setCurrentTab(item.id)}
                    title={label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full min-h-[34px] py-1.5 flex items-center rounded-lg text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                      collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                    } ${
                      isActive
                        ? 'bg-emerald-500/12 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon
                      size={16}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Admin Member Preview & User Account */}
      <div className="shrink-0 p-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/80 space-y-2">
        {!collapsed && role === 'Admin' && (
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
            <label
              htmlFor="persona-selector"
              className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
            >
              <UserCheck size={12} className="shrink-0" />
              <span>{isBangla ? 'মেম্বার প্রিভিউ' : 'Switch Member View'}</span>
            </label>

            <select
              id="persona-selector"
              value={currentUser.id}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-medium cursor-pointer"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Profile Card & Logout */}
        <div
          className={`flex items-center rounded-xl transition-colors ${
            collapsed ? 'justify-center py-0.5' : 'justify-between gap-2 px-1 py-0.5'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentUser.avatarUrl && !avatarError ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-semibold shrink-0">
                {userInitials}
              </div>
            )}

            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                  {currentUser.role}
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              id="sidebar-logout-btn"
              type="button"
              onClick={onLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
              title={isBangla ? 'লগ আউট' : 'Log Out'}
              aria-label="Log Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            id="sidebar-logout-btn-collapsed"
            type="button"
            onClick={onLogout}
            className="w-full py-2 flex justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors rounded-xl cursor-pointer"
            title={isBangla ? 'লগ আউট' : 'Log Out'}
            aria-label="Log Out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
