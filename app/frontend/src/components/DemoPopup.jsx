import React, { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, X, ArrowRight, ShieldCheck, Zap, Database, BarChart3, Bot } from 'lucide-react';

export default function DemoPopup({ isDemoMode }) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setIsOpen(true);
    }
  }, [isDemoMode]);

  if (!isDemoMode || !isOpen) return null;

  const docUrl = "https://github.com/zmsp/AppRankly";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900/90 border border-white/15 p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-accent-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          aria-label="Close demo popup"
        >
          <X size={18} />
        </button>

        {/* Header Badge & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-blue/30 via-indigo-500/20 to-cyan-400/10 border border-accent-blue/40 flex items-center justify-center text-accent-blue shadow-lg shadow-accent-blue/20 shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-blue/10 border border-accent-blue/25 text-[11px] font-semibold text-accent-blue tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
              Live Interactive Demo
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              Welcome to AppRankly v2.2
            </h2>
          </div>
        </div>

        {/* Brief Description */}
        <p className="text-slate-300 text-sm leading-relaxed mb-5">
          Explore the self-hosted, private mobile store analytics and ASO toolkit loaded with sample multi-platform data. Everything in this preview is fully interactive.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
            <BarChart3 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">Store Analytics</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">iOS & Play stats, active devices & retention</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
            <Zap size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">ASO Radar & PPP</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">Live store autocomplete & parity pricing</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
            <Bot size={16} className="text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">AskRankly AI</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">Natural language Text-to-SQL analyst</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">100% Self-Hosted</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">Zero telemetry, private SQLite storage</div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Explore Demo & Star on GitHub */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-cyan-500 via-accent-blue to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/25 text-sm cursor-pointer active:scale-95"
          >
            <span>Explore Live Dashboard</span>
            <ArrowRight size={16} />
          </button>
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all text-sm hover:border-white/20 active:scale-95"
          >
            <span>GitHub</span>
            <ExternalLink size={15} className="text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
}

