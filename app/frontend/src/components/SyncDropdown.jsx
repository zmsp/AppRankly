import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Zap, ChevronDown, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function SyncDropdown({
  refreshData,
  forceRefreshRange,
  dateRange,
  loading
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isForceModalOpen, setIsForceModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(dateRange?.start || '');
  const [endDate, setEndDate] = useState(dateRange?.end || '');

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (dateRange?.start) setStartDate(dateRange.start);
    if (dateRange?.end) setEndDate(dateRange.end);
  }, [dateRange]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute position for popover
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + 8,
        left: Math.max(16, Math.min(rect.right - 320, window.innerWidth - 336))
      });
    }
  }, [isMenuOpen]);

  const handleQuickSync = (e) => {
    if (e) e.stopPropagation();
    setIsMenuOpen(false);
    if (refreshData && !loading) {
      refreshData();
    }
  };

  const handleOpenForceSync = (e) => {
    if (e) e.stopPropagation();
    setIsMenuOpen(false);
    setIsForceModalOpen(true);
  };

  const handleRunForceSync = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setIsForceModalOpen(false);
    if (forceRefreshRange) {
      await forceRefreshRange(startDate, endDate);
    }
  };

  return (
    <div className="relative shrink-0 inline-flex items-center" ref={dropdownRef}>
      {/* Combined Split / Dropdown Sync Button */}
      <div className="inline-flex rounded-xl bg-[#212943] border border-[#00d1ff]/40 shadow-sm overflow-hidden text-xs">
        
        {/* Main Sync Button (triggers Quick Sync) */}
        <button
          ref={buttonRef}
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

        {/* Caret Button (opens sync options & documentation dropdown) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          disabled={loading}
          className={clsx(
            "px-2 py-1.5 bg-[#00d1ff]/15 hover:bg-[#00d1ff]/30 text-[#00d1ff] transition-all cursor-pointer flex items-center justify-center",
            isMenuOpen && "bg-[#00d1ff]/30 text-white"
          )}
          title="Sync options & documentation"
          aria-expanded={isMenuOpen}
        >
          <ChevronDown
            size={13}
            className={clsx("transition-transform duration-200", isMenuOpen && "rotate-180")}
          />
        </button>
      </div>

      {/* Dropdown Options & Documentation Card */}
      {isMenuOpen && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-auto">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
            className="fixed w-[calc(100vw-32px)] sm:w-80 rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-white/10 shadow-2xl z-[100000] p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {/* Dropdown Header */}
            <div className="px-2 py-1 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Sync Modes</h4>
                <p className="text-[10px] text-slate-400">Choose how analytics stats are updated</p>
              </div>
              <span className="text-[9px] font-mono font-bold text-[#00d1ff] bg-[#00d1ff]/15 px-1.5 py-0.5 rounded border border-[#00d1ff]/30">
                2 Modes
              </span>
            </div>

            {/* Option 1: Quick Sync (Standard) */}
            <button
              onClick={handleQuickSync}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-[#00d1ff]/15 border border-white/5 hover:border-[#00d1ff]/40 text-left transition-all group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#00d1ff]/20 text-[#00d1ff] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-bold text-xs text-white group-hover:text-[#00d1ff] transition-colors">
                    Quick Sync
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    Standard
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 leading-snug">
                  Fast incremental sync of recent stats using cached dates. Recommended for normal updates.
                </p>
              </div>
            </button>

            {/* Option 2: Force Sync (Date Range) */}
            <button
              onClick={handleOpenForceSync}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/5 hover:border-rose-500/40 text-left transition-all group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Zap size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-bold text-xs text-white group-hover:text-rose-300 transition-colors">
                    Force Sync Range...
                  </span>
                  <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                    Deep Refetch
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 leading-snug">
                  Bypasses date cache & forces direct re-fetch of store sales reports for a custom date range.
                </p>
              </div>
            </button>

            {/* Quick documentation footnote */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-white/5 px-1">
              <Info size={11} className="shrink-0 text-slate-500" />
              <span>Clicking "Sync" directly performs Quick Sync.</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Force Sync Range Modal */}
      {isForceModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsForceModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 text-white animate-in zoom-in-95 duration-150 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Zap size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Force Sync Range</h3>
                  <p className="text-[11px] text-slate-400">Deep re-fetch reports directly from Apple & Google</p>
                </div>
              </div>
              <button
                onClick={() => setIsForceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Documentation Box */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-1.5 text-rose-300 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle size={13} />
                <span>What does Force Sync do?</span>
              </div>
              <ul className="text-xs text-slate-300 leading-relaxed space-y-1.5 pl-1">
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                  <span>Bypasses binary search date cache that skips already-processed dates</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                  <span>Ignores cached "missing" or "empty" month markers</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                  <span>Re-fetches daily sales & install reports directly for every day in range</span>
                </li>
              </ul>
            </div>

            {/* Date Range Form */}
            <form onSubmit={handleRunForceSync} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || !startDate || !endDate}
                  className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
                >
                  <Zap size={14} className={clsx(loading && "animate-spin")} />
                  <span>Run Force Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsForceModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs py-2.5 px-4 rounded-xl border border-white/10 transition-colors cursor-pointer"
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
