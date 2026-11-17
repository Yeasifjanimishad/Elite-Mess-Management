import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Clock, 
  User, 
  Filter, 
  Activity, 
  Smartphone, 
  Network, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { ActivityLog } from '../types';
import { getRealTodayStr } from '../utils/dateUtils';

interface AuditLogTabProps {
  activities: ActivityLog[];
}

export default function AuditLogTab({ activities }: AuditLogTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [userFilter, setUserFilter] = useState<string>('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Standard required action list
  const auditActions = [
    'Login',
    'Logout',
    'Meal Updates',
    'Guest Meals',
    'Meal Adjustments',
    'Deposits',
    'Bazaar Entries',
    'Bazaar Approval',
    'Notices',
    'Manager Changes',
    'Month Closing',
    'Settings Changes'
  ];

  // Extract unique users from activities
  const uniqueUsers = Array.from(new Set(activities.map(a => a.userName))).filter(Boolean);

  // Filter logs based on search query, action type and user filter
  const filteredActivities = activities.filter(act => {
    const textToSearch = `${act.userName} ${act.action} ${act.details} ${act.oldValue || ''} ${act.newValue || ''} ${act.ipAddress || ''} ${act.device || ''}`.toLowerCase();
    const matchesSearch = textToSearch.includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'All' || act.action === actionFilter;
    const matchesUser = userFilter === 'All' || act.userName === userFilter;

    return matchesSearch && matchesAction && matchesUser;
  });

  const getActionBadgeStyles = (action: string) => {
    switch (action) {
      case 'Login':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'Logout':
        return 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/60';
      case 'Meal Updates':
        return 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
      case 'Guest Meals':
        return 'bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30';
      case 'Meal Adjustments':
        return 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'Deposits':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30';
      case 'Bazaar Entries':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30';
      case 'Bazaar Approval':
        return 'bg-teal-50 text-teal-700 border-teal-200/60 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30';
      case 'Notices':
        return 'bg-pink-50 text-pink-700 border-pink-200/60 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30';
      case 'Manager Changes':
        return 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      case 'Month Closing':
        return 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
      case 'Settings Changes':
        return 'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/25 dark:text-amber-400 dark:border-amber-900/30';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
    }
  };

  const toggleRow = (id: string) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  // Stats calculation
  const totalAuditCount = activities.length;
  const lastActiveTimestamp = activities[0]?.timestamp ? new Date(activities[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';

  return (
    <div className="space-y-6" id="audit-log-tab">
      
      {/* AUDIT SUMMARY METRICS CARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Operations</p>
            <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">{totalAuditCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/35 text-blue-600 dark:text-blue-400">
            <User size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Monitored Profiles</p>
            <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">{uniqueUsers.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/35 text-indigo-600 dark:text-indigo-400">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Last Tracked Activity</p>
            <p className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">{lastActiveTimestamp}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/35 text-rose-600 dark:text-rose-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Audit Integrity</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-100 dark:border-slate-700 w-max">
              100% Immutable
            </p>
          </div>
        </div>
      </div>

      {/* FILTER BAR PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <SlidersHorizontal size={14} /> Audit Trail Search Controls
          </h3>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/35 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <Network size={10} /> Live Tracking Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Free Text Search */}
          <div className="relative md:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by name, action details, IP, old/new states..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Action Filter */}
          <div className="relative md:col-span-4 flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold transition"
            >
              <option value="All">All Operations</option>
              {auditActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div className="relative md:col-span-3 flex items-center gap-1.5">
            <User size={14} className="text-slate-400 shrink-0" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold transition"
            >
              <option value="All">All Users</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SYSTEM LOG TABLE / TIMELINE ROW LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert size={18} className="text-slate-500" /> Immutable Mess Logs
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
              Secure ledger changes, auth updates, meal adjust metrics and notice publications.
            </p>
          </div>
          <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 px-2 py-1 rounded-lg font-mono">
            Showing {filteredActivities.length} logs
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          
          {filteredActivities.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const fallbackDateStr = log.timestamp ? log.timestamp.split('T')[0] : getRealTodayStr();
            const fallbackTimeStr = log.timestamp ? log.timestamp.split('T')[1]?.slice(0, 8) || '00:00:00' : '00:00:00';
            
            const displayDate = log.date || fallbackDateStr;
            const displayTime = log.time || fallbackTimeStr;

            return (
              <div key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition duration-200">
                
                {/* Main Row layout */}
                <div 
                  onClick={() => toggleRow(log.id)}
                  className="p-5 flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer select-none"
                >
                  
                  {/* Action Badge */}
                  <div className="w-full md:w-36 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${getActionBadgeStyles(log.action)}`}>
                      {log.action}
                    </span>
                  </div>

                  {/* Log description & User */}
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-extrabold text-slate-900 dark:text-white mr-1.5">{log.userName}</span>
                      {log.details}
                    </p>
                    
                    {/* Footnote details: Device, IP, DateTime */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-slate-300 dark:text-slate-600" />
                        {displayDate} at {displayTime}
                      </span>
                      {log.ipAddress && (
                        <span className="flex items-center gap-1 font-mono">
                          <Network size={11} className="text-slate-300 dark:text-slate-600" />
                          {log.ipAddress}
                        </span>
                      )}
                      {log.device && (
                        <span className="flex items-center gap-1">
                          <Smartphone size={11} className="text-slate-300 dark:text-slate-600" />
                          {log.device}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle indicator / compare badge */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {(log.oldValue && log.oldValue !== 'N/A') || (log.newValue && log.newValue !== 'N/A') ? (
                      <span className="text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 px-2 py-0.5 rounded-full font-bold">
                        Compare States
                      </span>
                    ) : null}
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </div>

                </div>

                {/* Expanded value changes block */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100/60 dark:border-slate-800/40 animate-slide-down space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      
                      {/* Old State Column */}
                      <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1.5">
                        <p className="text-[10px] text-rose-500 dark:text-rose-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          ● Old / Previous State
                        </p>
                        <div className="bg-rose-50/30 dark:bg-rose-950/10 p-2.5 rounded-lg border border-rose-100/50 dark:border-rose-900/20 font-mono text-xs text-rose-700 dark:text-rose-400 whitespace-pre-wrap break-all min-h-11 flex items-center">
                          {log.oldValue || 'No previous value recorded'}
                        </div>
                      </div>

                      {/* New State Column */}
                      <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1.5">
                        <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          ● Updated / New State
                        </p>
                        <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-2.5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/20 font-mono text-xs text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap break-all min-h-11 flex items-center">
                          {log.newValue || 'No updated value recorded'}
                        </div>
                      </div>

                    </div>

                    {/* Metadata Context Infotip */}
                    <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-start gap-2.5 text-[10px] text-slate-400 dark:text-slate-400">
                      <Info size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Security Footprint:</span> Action recorded securely by the ledger core. Access credentials: 
                        <span className="font-mono bg-slate-50 dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-100 dark:border-slate-800 mx-1">IP: {log.ipAddress || 'Unknown'}</span> 
                        using <span className="font-mono bg-slate-50 dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-100 dark:border-slate-800">{log.device || 'Unknown Client'}</span>.
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}

          {filteredActivities.length === 0 && (
            <div className="text-center py-16">
              <ShieldAlert className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={36} />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No matching activities found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Adjust search parameters or select different user profiles.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
