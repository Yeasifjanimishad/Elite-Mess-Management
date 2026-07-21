import React from 'react';
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
  LogOut
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
  settings
}: SidebarProps) {
  
  const menuItems = [
    { id: 'Dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Meal Manager', 'Member'] },
    { id: 'MealSheet', name: 'Digital Meal Sheet', icon: Table, roles: ['Admin', 'Meal Manager', 'Member'] },
    { id: 'Bazaar', name: 'Bazaar Log', icon: ShoppingBag, roles: ['Admin', 'Meal Manager', 'Member'] },
    { id: 'Deposits', name: 'Deposits', icon: HandCoins, roles: ['Admin', 'Meal Manager', 'Member'] },
    { id: 'Expenses', name: 'Utility Expenses', icon: CreditCard, roles: ['Admin', 'Meal Manager', 'Member'] },
    { id: 'Notices', name: 'Notice Board', icon: Megaphone, roles: ['Admin', 'Meal Manager', 'Member'] },
    { id: 'Reports', name: 'Reports & Analytics', icon: FilePieChart, roles: ['Admin', 'Meal Manager', 'Member'] },
    { id: 'Users', name: 'User Management', icon: Users, roles: settings?.mgrCanManageUsers ? ['Admin', 'Meal Manager'] : ['Admin'] },
    { id: 'AuditLogs', name: 'Audit Logs', icon: ShieldAlert, roles: ['Admin', 'Meal Manager'] },
    { id: 'Settings', name: 'System Settings', icon: Settings, roles: ['Admin', 'Meal Manager', 'Member'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  const handleUserChange = (userId: string) => {
    const selected = allUsers.find(u => u.id === userId);
    if (selected) {
      setCurrentUser(selected);
      setRole(selected.role);
    }
  };

  return (
    <aside 
      id="app-sidebar"
      className={`fixed top-0 left-0 z-40 h-screen border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 flex flex-col justify-between ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 h-16">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <FlameKindling size={20} />
            </div>
            {!collapsed && (
              <span className="font-semibold text-slate-800 dark:text-white truncate">
                {systemName}
              </span>
            )}
          </div>
          <button 
            id="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-600 pl-2.5' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer & Demo Role Selector */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {!collapsed && role === 'Admin' && (
          <div className="mb-4 p-2 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-lg border border-emerald-500/10">
            <div className="flex items-center gap-1.5 mb-2">
              <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                Simulated Persona (Admin)
              </span>
            </div>
            
            {/* Persona Selector dropdown */}
            <select
              id="persona-selector"
              value={currentUser.id}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Card & Logout option */}
        <div className="flex items-center justify-between p-1.5 gap-2 overflow-hidden">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
              alt={currentUser.name}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/10 shrink-0"
              referrerPolicy="no-referrer"
            />
            {!collapsed && (
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                  {currentUser.name}
                </p>
                <span className="inline-block text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              id="sidebar-logout-btn"
              onClick={onLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition shrink-0 cursor-pointer"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        
        {collapsed && (
          <button
            id="sidebar-logout-btn-collapsed"
            onClick={onLogout}
            className="w-full mt-2 py-2 flex justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition rounded-lg cursor-pointer"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
