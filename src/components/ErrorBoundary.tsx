import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCw, RefreshCw, Clipboard } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleCopyError = () => {
    if (this.state.error) {
      const textToCopy = `${this.state.error.toString()}\n\nStack:\n${this.state.error.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
      navigator.clipboard.writeText(textToCopy);
      alert('Error diagnostics copied to clipboard!');
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-800 dark:text-slate-200">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 text-center animate-slide-up">
            
            {/* Visual Header */}
            <div className="mx-auto w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shadow-inner">
              <AlertOctagon size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Something went wrong
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The Mess Management System encountered an unexpected rendering error. No data was lost. You can refresh or copy diagnostic info below.
              </p>
            </div>

            {/* Error Message Box */}
            {this.state.error && (
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left space-y-2 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">
                  Exception Details
                </span>
                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-[9px] font-mono text-slate-400 dark:text-slate-500 whitespace-pre-wrap leading-relaxed break-all">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Control buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleCopyError}
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition duration-150 flex items-center justify-center gap-2"
              >
                <Clipboard size={14} /> Copy Specs
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white transition duration-150 flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/10"
              >
                <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '4s' }} /> Reload
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
