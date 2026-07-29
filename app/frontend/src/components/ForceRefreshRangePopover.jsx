import React, { useState, useEffect, useRef } from 'react';
import { Zap, Calendar, X, AlertTriangle, RefreshCw } from 'lucide-react';
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

  const handleExecute = async () => {
    if (!startDate || !endDate) return;
    setIsOpen(false);
    if (forceRefreshRange) {
      await forceRefreshRange(startDate, endDate);
    }
  };

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={clsx(
          "flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3.5 sm:py-1.5 rounded-[10px] sm:rounded-xl text-[11px] font-extrabold transition-all shrink-0 bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border border-rose-500/40 active:scale-95",
          loading && "opacity-50 cursor-not-allowed"
        )}
        title="Force Refresh Date Range (Bypass Apple Binary Search & Empty Cache)"
      >
        <Zap size={14} className={clsx(loading && "animate-spin")} />
        <span className="hidden sm:inline ml-1.5 uppercase tracking-wider">Force Sync</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-4 shadow-2xl z-50 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle size={18} />
              <h4 className="font-bold text-sm text-white">Force Sync Date Range</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Forces a direct re-fetch of daily reports from Apple for the date range below, <span className="text-rose-400 font-semibold">bypassing binary search boundary probes</span> and ignoring cached missing/empty month markers.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={handleExecute}
              disabled={loading || !startDate || !endDate}
              className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
              <span>Bypass Search & Refetch</span>
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs py-2.5 px-3 rounded-xl border border-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
