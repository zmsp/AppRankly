import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Zap, ChevronDown, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function SyncDropdown({
  refreshData,
  forceRefreshRange,
  dateRange,
  loading
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(dateRange?.start || '');
  const [endDate, setEndDate] = useState(dateRange?.end || '');
  const popoverRef = useRef(null);

  useEffect(() => {
    if (dateRange?.start) setStartDate(dateRange.start);
    if (dateRange?.end) setEndDate(dateRange.end);
  }, [dateRange]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleQuickSync = (e) => {
    if (e) e.stopPropagation();
    setIsOpen(false);
    if (refreshData && !loading) {
      refreshData();
    }
  };

  const handleRunForceSync = async (e) => {
    if (e) e.preventDefault();
    if (!startDate || !endDate) return;
    setIsOpen(false);
    if (forceRefreshRange) {
      await forceRefreshRange(startDate, endDate);
    }
  };

  return (
    <div className="relative shrink-0 inline-flex items-center">
      {/* Combined Split / Dropdown Sync Button */}
      <div className="inline-flex rounded-xl bg-[#212943] border border-[#00d1ff]/40 shadow-sm overflow-hidden text-xs">
        
        {/* Main Sync Button (triggers Quick Sync) */}
        <button
          onClick={handleQuickSync}
          disabled={loading}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 bg-[#00d1ff]/15 hover:bg-[#00d1ff]/25 text-[#00d1ff] font-bold transition-all active:scale-95 cursor-pointer border-r border-[#00d1ff]/30",
            loading && "opacity-60 cursor-not-allowed"
          )}
          title="Quick Sync — Refresh recent analytics data using cache"
        >
          <RefreshCw size={13} className={clsx(loading && "animate-spin")} />
          <span>{loading ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Caret Button (opens sync options & force sync modal) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          disabled={loading}
          className={clsx(
            "px-2 py-1.5 bg-[#00d1ff]/15 hover:bg-[#00d1ff]/30 text-[#00d1ff] transition-all cursor-pointer flex items-center justify-center",
            isOpen && "bg-[#00d1ff]/30 text-white"
          )}
          title="Sync options & force sync"
          aria-expanded={isOpen}
        >
          <ChevronDown
            size={13}
            className={clsx("transition-transform duration-200", isOpen && "rotate-180")}
          />
        </button>
      </div>

      {/* Centered Sync Options & Force Sync Modal (matches NotificationPopover) */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-auto flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <div
            ref={popoverRef}
            style={{ maxHeight: 'calc(100vh - 64px)' }}
            className="relative w-full max-w-md sm:w-96 bg-slate-900/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[100000] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden text-white"
          >
            {/* Header */}
            <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00d1ff]/20 text-[#00d1ff] flex items-center justify-center">
                  <RefreshCw size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Sync & Force Refresh</h4>
                  <p className="text-[10px] text-slate-400">Choose how analytics stats are updated</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close sync options"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto custom-scrollbar p-3 space-y-3 flex-1">
              
              {/* Option 1: Quick Sync */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-[#00d1ff]" />
                    <span className="font-bold text-xs text-white">Quick Sync</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                    Standard
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fast incremental sync of recent stats using cached dates. Recommended for normal updates.
                </p>
                <button
                  onClick={handleQuickSync}
                  disabled={loading}
                  className="w-full bg-[#00d1ff]/15 hover:bg-[#00d1ff]/25 text-[#00d1ff] border border-[#00d1ff]/30 font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={clsx(loading && "animate-spin")} />
                  <span>{loading ? 'Syncing...' : 'Run Quick Sync'}</span>
                </button>
              </div>

              {/* Option 2: Force Sync Range */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-rose-400" />
                    <span className="font-bold text-xs text-white">Force Sync Range</span>
                  </div>
                  <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold">
                    Deep Refetch
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Bypasses date cache & forces direct re-fetch of store sales reports for a custom date range.
                </p>

                {/* Explanation Box */}
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px] uppercase tracking-wider">
                    <AlertTriangle size={12} />
                    <span>What does Force Sync do?</span>
                  </div>
                  <ul className="text-[11px] text-slate-300 leading-relaxed space-y-1 pl-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 shrink-0">•</span>
                      <span>Bypasses date cache that skips checked dates</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 shrink-0">•</span>
                      <span>Ignores cached "missing" or "empty" month markers</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 shrink-0">•</span>
                      <span>Re-fetches daily sales reports directly from Apple & Google</span>
                    </li>
                  </ul>
                </div>

                {/* Date Inputs */}
                <form onSubmit={handleRunForceSync} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !startDate || !endDate}
                    className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={13} className={clsx(loading && "animate-spin")} />
                    <span>Run Force Sync</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-1.5 text-[10px] text-slate-400 py-2 border-t border-white/5 px-3 bg-white/[0.01]">
              <div className="flex items-center gap-1.5">
                <Info size={11} className="shrink-0 text-slate-500" />
                <span>Click "Sync" on top bar for Quick Sync.</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
