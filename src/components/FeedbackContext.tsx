import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  X, 
  AlertTriangle, 
  HelpCircle 
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface AlertDialogConfig {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  confirmLabel?: string;
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface FeedbackContextType {
  showToast: (message: string, type: ToastType) => void;
  showAlert: (title: string, message: string, type?: AlertDialogConfig['type'], confirmLabel?: string) => void;
  showConfirm: (config: ConfirmDialogConfig) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

interface FeedbackProviderProps {
  children: ReactNode;
}

export default function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertDialogConfig | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmDialogConfig | null>(null);

  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const alertBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-dismiss toasts after 4 seconds
  const showToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const showAlert = (title: string, message: string, type: AlertDialogConfig['type'] = 'info', confirmLabel = 'OK') => {
    setAlertConfig({ title, message, type, confirmLabel });
  };

  const showConfirm = (config: ConfirmDialogConfig) => {
    setConfirmConfig(config);
  };

  // Keyboard accessibility: Escape key to dismiss and Enter key to confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmConfig) {
          if (confirmConfig.onCancel) confirmConfig.onCancel();
          setConfirmConfig(null);
        } else if (alertConfig) {
          setAlertConfig(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertConfig, confirmConfig]);

  // Focus trap management when modals are opened
  useEffect(() => {
    if (confirmConfig && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    } else if (alertConfig && alertBtnRef.current) {
      alertBtnRef.current.focus();
    }
  }, [confirmConfig, alertConfig]);

  return (
    <FeedbackContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}

      {/* TOAST LIST */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={`p-3.5 rounded-2xl shadow-xl flex items-start gap-3 border pointer-events-auto backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                  : toast.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-400'
                  : toast.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-400'
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-800 dark:text-indigo-400'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 size={18} />}
                {toast.type === 'error' && <AlertCircle size={18} />}
                {toast.type === 'warning' && <AlertTriangle size={18} />}
                {toast.type === 'info' && <Info size={18} />}
              </div>
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CUSTOM ALERT MODAL */}
      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlertConfig(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              role="alertdialog"
              aria-modal="true"
              className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center"
            >
              {/* Icon Accent */}
              <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center">
                {alertConfig.type === 'success' && (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                )}
                {alertConfig.type === 'error' && (
                  <div className="w-12 h-12 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertCircle size={24} />
                  </div>
                )}
                {alertConfig.type === 'warning' && (
                  <div className="w-12 h-12 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle size={24} />
                  </div>
                )}
                {alertConfig.type === 'info' && (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Info size={24} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {alertConfig.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                  {alertConfig.message}
                </p>
              </div>

              <div>
                <button
                  ref={alertBtnRef}
                  onClick={() => setAlertConfig(null)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-emerald-500/10 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {alertConfig.confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (confirmConfig.onCancel) confirmConfig.onCancel();
                setConfirmConfig(null);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              role="dialog"
              aria-modal="true"
              className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <HelpCircle size={20} />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {confirmConfig.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {confirmConfig.message}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => {
                    if (confirmConfig.onCancel) confirmConfig.onCancel();
                    setConfirmConfig(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-150 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer"
                >
                  {confirmConfig.cancelLabel || 'Cancel'}
                </button>
                <button
                  ref={confirmBtnRef}
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-emerald-500/10 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {confirmConfig.confirmLabel || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FeedbackContext.Provider>
  );
}
