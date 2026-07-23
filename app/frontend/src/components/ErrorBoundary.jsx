import React from 'react';
import { AlertTriangle, RefreshCw, Play, ShieldAlert } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppRankly Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleSwitchToDemo = () => {
    window.location.hash = '#/demo';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b1326] text-white flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-surface border border-rose-500/30 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl space-y-6 text-center">
            <div className="inline-flex p-4 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400">
              <ShieldAlert size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
              <p className="text-sm text-slate-300">
                An unexpected error occurred while rendering the page component.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-left font-mono text-xs text-rose-300 overflow-x-auto max-h-40 custom-scrollbar">
                <p className="font-bold mb-1">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-accent-blue text-slate-950 font-bold rounded-xl hover:bg-accent-blue/90 transition-all flex items-center gap-2 text-sm"
              >
                <RefreshCw size={16} />
                <span>Try Again</span>
              </button>

              <button
                onClick={this.handleSwitchToDemo}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2 text-sm"
              >
                <Play size={16} className="text-accent-emerald" />
                <span>Load Demo Mode</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl border border-white/10 transition-all text-sm"
              >
                Reload Window
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
