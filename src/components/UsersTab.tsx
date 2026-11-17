import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  UserCheck, 
  UserX, 
  Edit3, 
  Trash2, 
  Users, 
  X, 
  Mail, 
  Phone, 
  Shield, 
  Check,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { User, UserRole, SystemSettings } from '../types';
import { useFeedback } from './FeedbackContext';

interface UsersTabProps {
  currentUser: User;
  allUsers: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (id: string) => boolean | void | Promise<boolean | void>;
  settings: SystemSettings;
}

export default function UsersTab({
  currentUser,
  allUsers,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  settings
}: UsersTabProps) {

  const { showToast, showConfirm } = useFeedback();
  const isBangla = settings.language === 'Bangla';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  
  // Add modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Member' as UserRole,
    avatarUrl: '',
    defaultMealOn: true
  });

  // Edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleOpenAdd = () => {
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    setAddUserForm({
      name: '',
      email: '',
      phone: '',
      role: 'Member',
      avatarUrl: '',
      defaultMealOn: true
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.name || !addUserForm.email) return;

    // Provide default placeholder avatar if empty
    const avatar = addUserForm.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`;

    onAddUser({
      name: addUserForm.name,
      email: addUserForm.email,
      phone: addUserForm.phone,
      role: addUserForm.role,
      isActive: true,
      avatarUrl: avatar,
      defaultMealOn: addUserForm.defaultMealOn
    });

    handleCloseAdd();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name || !editingUser.email) return;

    onUpdateUser(editingUser);
    setEditingUser(null);
  };

  // Toggle user active status directly in grid
  const handleToggleActive = (user: User) => {
    if (user.id === currentUser.id) return; // cannot deactivate yourself
    onUpdateUser({
      ...user,
      isActive: !user.isActive
    });
  };

  // Filter
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6" id="users-tab">
      
      {/* SEARCH / FILTERS BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Role selection Filter dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Meal Manager">Meal Manager</option>
            <option value="Member">Member</option>
          </select>
        </div>

        {/* Add user button */}
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition"
        >
          <Plus size={16} /> Register New User
        </button>
      </div>

      {/* USER LIST GRID / TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3">Profile Info</th>
                <th className="px-5 py-3">Contact Details</th>
                <th className="px-5 py-3 text-center">System Role</th>
                <th className="px-5 py-3 text-center">Default Meal</th>
                <th className="px-5 py-3 text-center">Active Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className={`border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition ${
                    !user.isActive ? 'opacity-60 bg-slate-50/20 dark:bg-slate-900/20' : ''
                  }`}
                >
                  
                  {/* Photo & Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-100 dark:ring-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">{user.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">UID: {user.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="px-5 py-3.5 space-y-1 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      {user.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      {user.phone || 'N/A'}
                    </span>
                  </td>

                  {/* System Role Badge */}
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      user.role === 'Admin' 
                        ? 'bg-rose-500/10 text-rose-600' 
                        : user.role === 'Meal Manager'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>

                  {/* Default Meal reservation */}
                  <td className="px-5 py-3.5 text-center">
                    <span className={`font-semibold text-[11px] ${user.defaultMealOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {user.defaultMealOn ? 'Meal ON' : 'Meal OFF'}
                    </span>
                  </td>

                  {/* Active/Inactive switch toggler */}
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={user.id === currentUser.id}
                      className={`p-1 rounded-xl transition ${
                        user.id === currentUser.id 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      title={user.isActive ? 'Deactivate User' : 'Activate User'}
                    >
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-500/5 px-2.5 py-0.5 rounded-full">
                          <UserCheck size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full dark:bg-slate-800">
                          <UserX size={12} /> Inactive
                        </span>
                      )}
                    </button>
                  </td>

                  {/* Actions (Edit / Delete) */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingUser({ ...user })}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition"
                        title="Edit Profile details"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (user.id === currentUser.id) return;
                          showConfirm({
                            title: isBangla ? 'সদস্য মুছে ফেলুন' : 'Delete Member Permanently',
                            message: isBangla 
                              ? `আপনি কি নিশ্চিতভাবে "${user.name}"-কে মেস সদস্য তালিকা থেকে মুছে ফেলতে চান?` 
                              : `Are you sure you want to permanently delete "${user.name}" from the mess roster?`,
                            confirmLabel: isBangla ? 'মুছুন' : 'Delete',
                            cancelLabel: isBangla ? 'বাতিল' : 'Cancel',
                            onConfirm: async () => {
                              const ok = await onDeleteUser(user.id);
                              if (ok !== false) {
                                showToast(
                                  isBangla 
                                    ? 'সদস্যকে সফলভাবে মুছে ফেলা হয়েছে।' 
                                    : 'Member has been successfully deleted.', 
                                  'success'
                                );
                              }
                            }
                          });
                        }}
                        disabled={user.id === currentUser.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition disabled:opacity-50"
                        title="Delete User permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER NEW USER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Register New Mess Member
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provision new login credentials and assign default billing structures.
                </p>
              </div>
              <button 
                onClick={handleCloseAdd}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Shakib Al Hasan"
                  required
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="shakib@mms.com"
                    required
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+88017000000"
                    value={addUserForm.phone}
                    onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">System Privilege Role</label>
                  <select
                    value={addUserForm.role}
                    onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as UserRole })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="Member">Member (View & tomorrow meals)</option>
                    <option value="Meal Manager">Meal Manager (Controller)</option>
                    <option value="Admin">Admin (Full Owner privileges)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Avatar Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={addUserForm.avatarUrl}
                    onChange={(e) => setAddUserForm({ ...addUserForm, avatarUrl: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addUserForm.defaultMealOn}
                    onChange={(e) => setAddUserForm({ ...addUserForm, defaultMealOn: e.target.checked })}
                    className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Enable Auto Meal Reservation</span>
                    <span className="text-[10px] text-slate-400 block">System automatically marks meals ON each day of the month</span>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseAdd}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/15 transition"
                >
                  Create User
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* EDIT USER DETAIL MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Adjust Member Profile
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update personal, role privilege, or billing configuration profiles.
                </p>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">System Privilege Role</label>
                  <select
                    value={editingUser.role}
                    disabled={editingUser.id === currentUser.id} // cannot change your own role
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="Member">Member</option>
                    <option value="Meal Manager">Meal Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Avatar Image URL</label>
                  <input
                    type="url"
                    value={editingUser.avatarUrl}
                    onChange={(e) => setEditingUser({ ...editingUser, avatarUrl: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.defaultMealOn}
                    onChange={(e) => setEditingUser({ ...editingUser, defaultMealOn: e.target.checked })}
                    className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Auto Meal Reservation</span>
                    <span className="text-[10px] text-slate-400 block">Marks meals ON by default at month boundary</span>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/15 transition"
                >
                  Save Profile
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
