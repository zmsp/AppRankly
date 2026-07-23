import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomOut,
  Clock,
  Check,
  AlertCircle,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  parseDateExpression,
  getPresetDateRange,
  shiftDateRange,
  zoomOutDateRange,
  formatDateISO
} from '../lib/dateUtils';

const RELATIVE_PRESETS = [
  { id: '1D', label: 'Last 24 hours' },
  { id: '7D', label: 'Last 7 days' },
  { id: '14D', label: 'Last 14 days' },
  { id: '1M', label: 'Last 30 days' },
  { id: '3M', label: 'Last 90 days' },
  { id: '6M', label: 'Last 6 months' },
  { id: '1Y', label: 'Last 1 year' },
  { id: 'ALL', label: 'All time' },
];

const FIXED_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'this_year', label: 'This year' },
];

export default function GrafanaDatePicker({ dateRange, setDateRange }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Form states for manual typing / calendar selection
  const [fromInput, setFromInput] = useState(dateRange?.start || '');
  const [toInput, setToInput] = useState(dateRange?.end || '');
  const [fromDateVal, setFromDateVal] = useState(dateRange?.start || '');
  const [toDateVal, setToDateVal] = useState(dateRange?.end || '');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync inputs whenever dateRange prop changes externally
  useEffect(() => {
    if (dateRange) {
      setFromInput(dateRange.start || '');
      setToInput(dateRange.end || '');
      setFromDateVal(dateRange.start || '');
      setToDateVal(dateRange.end || '');
    }
  }, [dateRange]);

  // Click outside listener to close popover
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

  const handleApplyManual = () => {
    setErrorMessage('');
    const parsedStart = parseDateExpression(fromInput);
    const parsedEnd = parseDateExpression(toInput);

    if (!parsedStart) {
      setErrorMessage('Invalid From date string (use YYYY-MM-DD or now-7d)');
      return;
    }
    if (!parsedEnd) {
      setErrorMessage('Invalid To date string (use YYYY-MM-DD or now)');
      return;
    }
    if (parsedStart > parsedEnd) {
      setErrorMessage('Start date cannot be after end date');
      return;
    }

    setDateRange({
      start: parsedStart,
      end: parsedEnd,
      label: `${parsedStart} → ${parsedEnd}`,
      preset: null
    });
    setIsOpen(false);
  };

  const handleSelectPreset = (presetId) => {
    setErrorMessage('');
    const newRange = getPresetDateRange(presetId);
    setDateRange(newRange, newRange.preset || presetId);
    setIsOpen(false);
  };

  const handleShift = (direction) => {
    if (!dateRange?.start || !dateRange?.end) return;
    const shifted = shiftDateRange(dateRange.start, dateRange.end, direction);
    if (shifted) {
      setDateRange(shifted);
    }
  };

  const handleZoomOut = () => {
    if (!dateRange?.start || !dateRange?.end) return;
    const zoomed = zoomOutDateRange(dateRange.start, dateRange.end);
    if (zoomed) {
      setDateRange(zoomed);
    }
  };

  const activePreset = dateRange?.preset?.toUpperCase() || (
    dateRange?.label?.startsWith('Last') ? dateRange.label : null
  );

  const displayLabel = dateRange?.label && dateRange.label !== 'Custom'
    ? dateRange.label
    : `${dateRange?.start || ''} → ${dateRange?.end || ''}`;

  return (
    <div className="relative inline-flex items-center space-x-1 shrink-0" ref={popoverRef}>
      {/* Time Window Shift Step Back Button */}
      <button
        onClick={() => handleShift('back')}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
        title="Shift date window backward"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Main Grafana Time Picker Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 shadow-sm",
          isOpen
            ? "bg-accent-blue/20 border-accent-blue text-accent-blue ring-2 ring-accent-blue/20"
            : "bg-white/5 hover:bg-white/10 border-white/10 text-white/90"
        )}
      >
        <Calendar size={14} className="text-accent-blue shrink-0" />
        <span className="truncate max-w-[140px] sm:max-w-[200px]">{displayLabel}</span>
        <ChevronDown size={13} className={clsx("transition-transform duration-200 text-white/50", isOpen && "rotate-180")} />
      </button>

      {/* Time Window Shift Step Forward Button */}
      <button
        onClick={() => handleShift('forward')}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
        title="Shift date window forward"
      >
        <ChevronRight size={14} />
      </button>

      {/* Zoom Out Button */}
      <button
        onClick={handleZoomOut}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
        title="Zoom out (double range interval)"
      >
        <ZoomOut size={14} />
      </button>

      {/* Grafana-style Popover Panel */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto z-50 w-[330px] sm:w-[580px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 text-white animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center space-x-2 text-xs font-bold text-white/90">
              <Clock size={16} className="text-accent-blue" />
              <span>Grafana Time Range Control</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
            {/* Left Column: Manual Absolute Range Entry & Calendar */}
            <div className="sm:col-span-6 space-y-4 flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-white/10 pb-4 sm:pb-0 sm:pr-4">
              <div>
                <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">
                  Absolute Time Range
                </h4>

                {/* From Field */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-[11px] font-semibold text-white/70 flex items-center justify-between">
                    <span>From:</span>
                    <span className="text-[10px] text-white/40 font-mono">e.g. 2026-07-01 or now-7d</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={fromInput}
                      onChange={(e) => {
                        setFromInput(e.target.value);
                        const parsed = parseDateExpression(e.target.value);
                        if (parsed) setFromDateVal(parsed);
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue font-mono"
                      placeholder="YYYY-MM-DD"
                    />
                    {/* Visual Calendar Date Picker */}
                    <div className="relative shrink-0">
                      <input
                        type="date"
                        value={fromDateVal}
                        onChange={(e) => {
                          setFromDateVal(e.target.value);
                          setFromInput(e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Open Calendar Picker"
                      />
                      <div className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-accent-blue pointer-events-none">
                        <Calendar size={14} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* To Field */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-[11px] font-semibold text-white/70 flex items-center justify-between">
                    <span>To:</span>
                    <span className="text-[10px] text-white/40 font-mono">e.g. 2026-07-23 or now</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={toInput}
                      onChange={(e) => {
                        setToInput(e.target.value);
                        const parsed = parseDateExpression(e.target.value);
                        if (parsed) setToDateVal(parsed);
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue font-mono"
                      placeholder="YYYY-MM-DD"
                    />
                    {/* Visual Calendar Date Picker */}
                    <div className="relative shrink-0">
                      <input
                        type="date"
                        value={toDateVal}
                        onChange={(e) => {
                          setToDateVal(e.target.value);
                          setToInput(e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Open Calendar Picker"
                      />
                      <div className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-accent-blue pointer-events-none">
                        <Calendar size={14} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] p-2 rounded-lg mb-3">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApplyManual}
                className="w-full bg-accent-blue hover:bg-accent-blue/90 text-background font-bold text-xs py-2 px-4 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-accent-blue/20"
              >
                <Check size={14} />
                <span>Apply time range</span>
              </button>
            </div>

            {/* Right Column: Quick Ranges & Presets */}
            <div className="sm:col-span-6 space-y-4">
              {/* Relative Ranges */}
              <div>
                <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                  Relative Presets
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {RELATIVE_PRESETS.map((p) => {
                    const isActive = activePreset === p.id || (dateRange?.preset && dateRange.preset.toUpperCase() === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p.id)}
                        className={clsx(
                          "px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between border",
                          isActive
                            ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue font-bold shadow-sm"
                            : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span>{p.label}</span>
                        {isActive && <Check size={12} className="text-accent-blue" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fixed Period Presets */}
              <div>
                <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                  Fixed Periods
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {FIXED_PRESETS.map((p) => {
                    const isActive = dateRange?.preset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p.id)}
                        className={clsx(
                          "px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between border",
                          isActive
                            ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue font-bold shadow-sm"
                            : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span>{p.label}</span>
                        {isActive && <Check size={12} className="text-accent-blue" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
