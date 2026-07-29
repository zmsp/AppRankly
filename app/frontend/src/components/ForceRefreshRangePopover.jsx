import React, { useState, useEffect, useRef } from 'react';
import { Zap, ChevronDown, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

export default function ForceRefreshRangePopover({
  dateRange,
  forceRefreshRange,
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDirectForceSync = async (e) => {
    e.stopPropagation();
    console.log('[UI] Direct Force Sync clicked for range:', startDate || dateRange?.start, endDate || dateRange?.end);
    if (forceRefreshRange) {
      await forceRefreshRange(startDate || dateRange?.start, endDate || dateRange?.end);
    }
  };

  const handleCustomExecute = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setIsOpen(false);
    console.log('[UI] Custom Force Sync submitted for range:', startDate, endDate);
    if (forceRefreshRange) {
      await forceRefreshRange(startDate, endDate);
    }
  };

  return (
    <div className="relative shrink-0 flex items-center" ref={popoverRef}>
      {/* Consolidated Split Red Button: Direct Click + Range Options */}
      <div className="inline-flex rounded-[10px] sm:rounded-xl shadow-md shadow-rose-600/20 border border-rose-500/40 overflow-hidden bg-rose-600 hover:bg-rose-500 transition-all text-white">
        <button
          onClick={handleDirectForceSync}
          disabled={loading}
          className={clsx(
            "flex items-center justify-center h-8 sm:h-auto sm:px-3 sm:py-1.5 text-[11px] font-extrabold transition-colors border-r border-rose-400/30 active:scale-95",
            loading && "opacity-50 cursor-not-allowed"
          )}
          title="Force Refresh Active Date Range (Bypass Binary Search & Empty Cache)"
        >
          <Zap size={14} className={clsx("sm:mr-1.5", loading && "animate-spin")} />
          <span className="hidden sm:inline uppercase tracking-wider">Force Sync</span>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="px-1.5 py-1.5 hover:bg-rose-700/50 transition-colors flex items-center justify-center text-white"
          title="Set Custom Force Sync Date Range"
        >
          <ChevronDown size={14} className={clsx(isOpen && "rotate-180 transition-transform")} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-72 bg-slate-900/98 backdrop-blur-xl border border-rose-500/25 rounded-xl shadow-2xl shadow-rose-900/30 z-50">
          {/* Arrow caret */}
          <div className="absolute -top-[6px] right-3 w-3 h-3 rotate-45 bg-slate-900 border-l border-t border-rose-500/25" />

          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-rose-400">
                <AlertTriangle size={13} />
                <span className="font-bold text-[11px] uppercase tracking-wider text-rose-300">Custom Date Range</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Bypasses binary search & cache. Re-fetches Apple reports directly for the selected range.
            </p>

            <form onSubmit={handleCustomExecute} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-rose-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-rose-500/60 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="submit"
                  disabled={loading || !startDate || !endDate}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <RefreshCw size={11} className={clsx(loading && "animate-spin")} />
                  <span>Force Refetch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-400 font-semibold text-[10px] py-1.5 px-2.5 rounded-lg border border-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
