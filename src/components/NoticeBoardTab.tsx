import React, { useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  AlertTriangle, 
  X, 
  Paperclip,
  Check,
  Tag,
  Clock,
  Pin,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Notice, User as UserType, SystemSettings } from '../types';
import { useFeedback } from './FeedbackContext';

interface NoticeBoardTabProps {
  currentUser: UserType;
  role: 'Admin' | 'Meal Manager' | 'Member';
  notices: Notice[];
  onAddNotice: (notice: Omit<Notice, 'id' | 'date' | 'authorId' | 'authorName'>) => void;
  onDeleteNotice?: (id: string) => void;
  onTogglePinNotice?: (id: string) => void;
  settings: SystemSettings;
}

export default function NoticeBoardTab({
  currentUser,
  role,
  notices,
  onAddNotice,
  onDeleteNotice,
  onTogglePinNotice,
  settings
}: NoticeBoardTabProps) {

  const { showToast, showConfirm } = useFeedback();

  const isManagerOrAdmin = role === 'Admin' || (role === 'Meal Manager' && settings.mgrCanPublishNotice !== false);
  const isBangla = settings.language === 'Bangla';
  const today = '2026-07-18'; // current system date

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [showExpired, setShowExpired] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    attachment: '',
    expiryDate: '',
    isPinned: false
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      title: '',
      description: '',
      priority: 'Medium',
      attachment: '',
      expiryDate: '',
      isPinned: false
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    onAddNotice({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      attachment: formData.attachment || undefined,
      expiryDate: formData.expiryDate || undefined,
      isPinned: formData.isPinned
    });

    handleCloseModal();
  };

  // Filter & Sort
  const filteredNotices = notices.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || n.priority === priorityFilter;
    
    const isExpired = n.expiryDate ? n.expiryDate < today : false;
    const matchesExpiry = showExpired ? true : !isExpired;

    return matchesSearch && matchesPriority && matchesExpiry;
  });

  const sortedNotices = [...filteredNotices].sort((a, b) => {
    // 1. Pinned notices first
    const pinA = a.isPinned ? 1 : 0;
    const pinB = b.isPinned ? 1 : 0;
    if (pinA !== pinB) {
      return pinB - pinA; // Pinned (1) comes before unpinned (0)
    }
    // 2. Then sort by date descending
    return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
  });

  return (
    <div className="space-y-6" id="notices-tab">
      
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={isBangla ? "নোটিশ খুঁজুন..." : "Search notices..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Priority filter */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max border border-slate-100 dark:border-slate-700">
            {(['All', 'High', 'Medium', 'Low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  priorityFilter === p 
                    ? 'bg-white dark:bg-slate-700 text-slate-850 dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                {isBangla 
                  ? (p === 'All' ? 'সব' : p === 'High' ? 'উচ্চ' : p === 'Medium' ? 'মাঝারি' : 'নিম্ন')
                  : p}
              </button>
            ))}
          </div>

          {/* Show Expired Toggle */}
          <button
            onClick={() => setShowExpired(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              showExpired 
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-transparent'
            }`}
          >
            {showExpired ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>
              {isBangla ? 'মেয়াদোত্তীর্ণ দেখান' : 'Show Expired'}
            </span>
          </button>
        </div>

        {/* Publish Button */}
        {isManagerOrAdmin && (
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition animate-fade-in shrink-0"
          >
            <Plus size={16} /> 
            {isBangla ? 'ঘোষণা প্রকাশ করুন' : 'Publish Announcement'}
          </button>
        )}
      </div>

      {/* FEED LIST GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="notices-feed">
        {sortedNotices.map((notice) => {
          const isHigh = notice.priority === 'High';
          const isMedium = notice.priority === 'Medium';

          return (
            <div 
              key={notice.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4 relative overflow-hidden ${
                notice.isPinned
                  ? 'border-indigo-200 dark:border-indigo-950/60 ring-2 ring-indigo-500/10'
                  : isHigh 
                  ? 'border-rose-200 dark:border-rose-950/60 ring-2 ring-rose-500/10' 
                  : 'border-slate-100 dark:border-slate-800'
              }`}
            >
              
              {/* Highlight ribbon */}
              {notice.isPinned ? (
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
              ) : isHigh ? (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500"></div>
              ) : null}

              <div className="space-y-3">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    {notice.isPinned && (
                      <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-indigo-500/20 animate-pulse">
                        <Pin size={10} className="fill-indigo-500" /> {isBangla ? 'পিন্ড' : 'Pinned'}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isHigh 
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                        : isMedium
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {isBangla 
                        ? (notice.priority === 'High' ? 'উচ্চ' : notice.priority === 'Medium' ? 'মাঝারি' : 'নিম্ন')
                        : notice.priority}{' '}
                      {isBangla ? 'অগ্রাধিকার' : 'Priority'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Date */}
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar size={12} /> {notice.date}
                    </span>

                    {/* Admin / Manager actions */}
                    {isManagerOrAdmin && (
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-850 p-1 rounded-lg border border-slate-100 dark:border-slate-800">
                        {onTogglePinNotice && (
                          <button
                            onClick={() => onTogglePinNotice(notice.id)}
                            className={`p-1 rounded hover:bg-slate-250 dark:hover:bg-slate-800 transition ${
                              notice.isPinned ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-450 hover:text-slate-600'
                            }`}
                            title={notice.isPinned ? (isBangla ? 'পিন সরান' : 'Unpin announcement') : (isBangla ? 'পিন করুন' : 'Pin announcement')}
                          >
                            <Pin size={12} className={notice.isPinned ? 'fill-indigo-500' : ''} />
                          </button>
                        )}
                        {onDeleteNotice && (
                          <button
                            onClick={() => {
                              showConfirm({
                                title: isBangla ? 'ঘোষণা মুছুন' : 'Delete Announcement',
                                message: isBangla ? 'আপনি কি নিশ্চিতভাবে এই ঘোষণাটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this announcement?',
                                confirmLabel: isBangla ? 'মুছুন' : 'Delete',
                                cancelLabel: isBangla ? 'বাতিল' : 'Cancel',
                                onConfirm: () => onDeleteNotice(notice.id)
                              });
                            }}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition"
                            title={isBangla ? 'মুছে ফেলুন' : 'Delete announcement'}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-slate-850 dark:text-white text-base">
                  {notice.title}
                </h3>

                {/* Body Description */}
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line">
                  {notice.description}
                </p>

                {/* Expiry Date indication */}
                {notice.expiryDate && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-1">
                    <Clock size={12} />
                    <span>
                      {isBangla ? 'মেয়াদ শেষ:' : 'Expires:'} {notice.expiryDate}
                    </span>
                    {notice.expiryDate < today && (
                      <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ml-1 border border-rose-500/20">
                        {isBangla ? 'মেয়াদোত্তীর্ণ' : 'Expired'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom detail row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-50 dark:border-slate-800/60 pt-4 text-xs">
                
                {/* Author Card */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                    {notice.authorName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                      {isBangla ? 'প্রকাশক' : 'Posted By'}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{notice.authorName}</span>
                  </div>
                </div>

                {/* Attachment Link mock */}
                {notice.attachment && (
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); showToast(isBangla ? "ডাউনলোড সফল হয়েছে!" : "Mock download: Attachment downloaded successfully.", "success"); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] transition border border-slate-100 dark:border-slate-700"
                  >
                    <Paperclip size={12} /> {notice.attachment}
                  </a>
                )}

              </div>

            </div>
          );
        })}

        {sortedNotices.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
            <Megaphone className="mx-auto text-slate-350 dark:text-slate-700 mb-3" size={36} />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {isBangla ? 'কোনো নোটিশ পাওয়া যায়নি' : 'Notice board is clear'}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {isBangla 
                ? 'আপনার ফিল্টারের সাথে মিলে এমন কোনো নোটিশ বা সতর্কতা নেই।' 
                : 'No system alerts or announcements match your current filters.'}
            </p>
          </div>
        )}
      </div>

      {/* CREATE NOTICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-white">
                  {isBangla ? 'ঘোষণা প্রকাশ করুন' : 'Publish System Announcement'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBangla 
                    ? 'মেস সদস্যদের জন্য নোটিশ, বাজার শিডিউল, ফিভ বা পেমেন্ট আপডেট প্রকাশ করুন।' 
                    : 'Broadcast notices, bazaar rotations, feast menus or payments updates.'}
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'নোটিশের শিরোনাম' : 'Notice Title'}
                </label>
                <input
                  type="text"
                  placeholder={isBangla ? "যেমন: বাধ্যতামূলক জমার বিজ্ঞপ্তি" : "e.g. Mandatory Deposit Advances"}
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'অগ্রাধিকার লেভেল' : 'Urgency / Priority'}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="High">{isBangla ? 'উচ্চ (High)' : 'High (High priority alert)'}</option>
                    <option value="Medium">{isBangla ? 'মাঝারি (Medium)' : 'Medium (General notice)'}</option>
                    <option value="Low">{isBangla ? 'নিম্ন (Low)' : 'Low (Informational detail)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'সংযুক্তি (ঐচ্ছিক)' : 'Attachment (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isBangla ? "যেমন: bazar_receipt.pdf" : "e.g. bazar_receipt_july5.pdf"}
                    value={formData.attachment}
                    onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isBangla ? 'মেয়াদ শেষের তারিখ' : 'Expiry Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>

                <div className="flex items-center pt-5 pl-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {isBangla ? 'ঘোষণা পিন করুন' : 'Pin Announcement'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'বিস্তারিত বিবরণ' : 'Notice Body'}
                </label>
                <textarea
                  placeholder={isBangla ? "ঘোষণার বিস্তারিত তথ্য এখানে লিখুন..." : "Draft the announcement details clearly. Supports multiple lines."}
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/15 transition"
                >
                  {isBangla ? 'ঘোষণা প্রকাশ করুন' : 'Publish Notice'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
