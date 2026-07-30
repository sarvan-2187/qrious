import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error Boundary caught:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl">
              <FaExclamationTriangle />
            </div>

            <div>
              <h2 className="text-2xl font-sans tracking-tight mb-2">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                {this.state.error?.message || 'An unexpected client application error occurred.'}
              </p>
            </div>

            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow font-semibold text-xs transition-colors flex items-center gap-2 mx-auto"
            >
              <FaRedo /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
