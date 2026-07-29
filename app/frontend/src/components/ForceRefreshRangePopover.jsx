import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, X, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { clsx } from 'clsx';

export default function ForceRefreshRangePopover({
  dateRange,
  forceRefreshRange,
  loading
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(dateRange?.start || '');
  const [endDate, setEndDate] = useState(dateRange?.end || '');

  useEffect(() => {
    if (dateRange?.start) setStartDate(dateRange.start);
    if (dateRange?.end) setEndDate(dateRange.end);
  }, [dateRange]);

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setIsOpen(false);
    if (forceRefreshRange) {
      await forceRefreshRange(startDate, endDate);
    }
  };

  return (
    <div className="relative shrink-0 flex items-center">
      {/* Single button — opens popup, does NOT run sync directly */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={loading}
        className={clsx(
          "flex items-center justify-center h-8 sm:h-auto sm:px-3.5 sm:py-1.5 rounded-[10px] sm:rounded-xl text-[11px] font-extrabold transition-all shrink-0 border active:scale-95",
          "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border-rose-500/40",
          loading && "opacity-50 cursor-not-allowed"
        )}
        title="Force Sync — bypass cache & binary search"
      >
        <Zap size={14} className={clsx("sm:mr-1.5", loading && "animate-spin")} />
        <span className="hidden sm:inline uppercase tracking-wider">Force Sync</span>
      </button>

      {/* Portal Modal */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 text-white animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Zap size={16} className="text-rose-400" />
                <span className="text-sm font-bold text-white">Force Sync</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Explanation */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 mb-4 space-y-2">
              <div className="flex items-center space-x-1.5 text-rose-300 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle size={13} />
                <span>What does Force Sync do?</span>
              </div>
              <ul className="text-xs text-slate-300 leading-relaxed space-y-1.5 pl-1">
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                  <span>Bypasses the binary search cache logic that skips already-checked date ranges</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                  <span>Ignores any cached "missing" or "empty" month markers from Apple</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                  <span>Re-fetches daily sales reports directly from Apple for every day in the range</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                  <span>Use this when data appears missing but should have become available since last sync</span>
                </li>
              </ul>
            </div>

            {/* Info note */}
            <div className="flex items-start space-x-2 text-[11px] text-slate-400 mb-4">
              <Info size={12} className="shrink-0 mt-0.5 text-slate-500" />
              <span>The date range below defaults to your currently selected dashboard range. Adjust as needed before syncing.</span>
            </div>

            {/* Date Range Form */}
            <form onSubmit={handleExecute} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || !startDate || !endDate}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 active:scale-95"
                >
                  <Zap size={13} />
                  <span>Run Force Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs py-2 px-3 rounded-xl border border-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
