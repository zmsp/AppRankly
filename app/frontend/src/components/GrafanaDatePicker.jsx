import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomOut,
  Clock,
  Check,
  AlertCircle,
  X,
  GitCompare,
  BarChart2
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  parseDateExpression,
  getPresetDateRange,
  shiftDateRange,
  zoomOutDateRange,
  formatDateISO
} from '../lib/dateUtils';

const QUICK_PRESETS = [
  { id: '1D', label: '1 Day', shortLabel: '1D' },
  { id: '7D', label: '7 Days', shortLabel: '7D' },
  { id: '30D', label: '30 Days', shortLabel: '30D' },
  { id: '60D', label: '60 Days', shortLabel: '60D' },
  { id: '6M', label: '6 Months', shortLabel: '6M' },
  { id: '1Y', label: '1 Year', shortLabel: '1Y' },
  { id: 'ALL', label: 'All (10 Years)', shortLabel: 'ALL' },
];

export default function GrafanaDatePicker({
  dateRange,
  setDateRange,
  comparisonMode,
  setComparisonMode,
  granularity,
  setGranularity
}) {
  const [isOpen, setIsOpen] = useState(false);
  const modalContentRef = useRef(null);

  // Draft state for range selection
  const [draftStart, setDraftStart] = useState(dateRange?.start || '');
  const [draftEnd, setDraftEnd] = useState(dateRange?.end || '');
  const [hoveredDate, setHoveredDate] = useState(null);

  // Inputs for manual editing
  const [fromInput, setFromInput] = useState(dateRange?.start || '');
  const [toInput, setToInput] = useState(dateRange?.end || '');
  const [errorMessage, setErrorMessage] = useState('');

  // Calendar month view state
  const [viewDate, setViewDate] = useState(() => {
    const d = dateRange?.end ? new Date(dateRange.end + 'T00:00:00') : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  // Sync state whenever dateRange prop changes externally
  useEffect(() => {
    if (dateRange) {
      setDraftStart(dateRange.start || '');
      setDraftEnd(dateRange.end || '');
      setFromInput(dateRange.start || '');
      setToInput(dateRange.end || '');
      if (dateRange.end) {
        const d = new Date(dateRange.end + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          setViewDate(d);
        }
      }
    }
  }, [dateRange]);

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

  const handleApplyManual = () => {
    setErrorMessage('');
    const parsedStart = parseDateExpression(fromInput);
    const parsedEnd = parseDateExpression(toInput);

    if (!parsedStart) {
      setErrorMessage('Invalid From date (use YYYY-MM-DD or now-7d)');
      return;
    }
    if (!parsedEnd) {
      setErrorMessage('Invalid To date (use YYYY-MM-DD or now)');
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

  // Calendar Day Click Handler
  const handleDayClick = (dateStr) => {
    setErrorMessage('');

    if (!draftStart || (draftStart && draftEnd)) {
      // First click: set start date, clear end date
      setDraftStart(dateStr);
      setDraftEnd('');
      setFromInput(dateStr);
      setToInput('');
    } else if (draftStart && !draftEnd) {
      // Second click: set end date
      if (dateStr < draftStart) {
        setDraftStart(dateStr);
        setDraftEnd(draftStart);
        setFromInput(dateStr);
        setToInput(draftStart);
        setDateRange({
          start: dateStr,
          end: draftStart,
          label: `${dateStr} → ${draftStart}`,
          preset: null
        });
      } else {
        setDraftEnd(dateStr);
        setToInput(dateStr);
        setDateRange({
          start: draftStart,
          end: dateStr,
          label: `${draftStart} → ${dateStr}`,
          preset: null
        });
      }
      setIsOpen(false);
    }
  };

  // Calendar grid calculation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const todayStr = formatDateISO(new Date());

  // Determine date ranges for highlighting in calendar
  let effectiveStart = draftStart;
  let effectiveEnd = draftEnd;
  if (draftStart && !draftEnd && hoveredDate) {
    if (hoveredDate >= draftStart) {
      effectiveEnd = hoveredDate;
    } else {
      effectiveStart = hoveredDate;
      effectiveEnd = draftStart;
    }
  }

  const activePreset = dateRange?.preset?.toUpperCase();

  const triggerLabel = dateRange?.start && dateRange?.end
    ? `${dateRange.start} → ${dateRange.end}`
    : (dateRange?.preset ? `${dateRange.preset} Range` : 'Date Range');

  return (
    <div className="relative inline-flex items-center space-x-1 shrink-0">
      {/* Shift Backward */}
      <button
        onClick={() => handleShift('back')}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
        title="Shift date window backward"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Trigger Button */}
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
        <span className="truncate max-w-[140px] sm:max-w-[210px] font-mono">{triggerLabel}</span>
        <ChevronDown size={13} className={clsx("transition-transform duration-200 text-white/50", isOpen && "rotate-180")} />
      </button>

      {/* Shift Forward */}
      <button
        onClick={() => handleShift('forward')}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
        title="Shift date window forward"
      >
        <ChevronRight size={14} />
      </button>

      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
        title="Zoom out (double range interval)"
      >
        <ZoomOut size={14} />
      </button>

      {/* Popup Modal Backdrop & Panel (Rendered via Portal to document.body to prevent clipping) */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={modalContentRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[620px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 text-white animate-in zoom-in-95 duration-150 my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center space-x-2 text-xs font-bold text-white/90">
                <Clock size={16} className="text-accent-blue" />
                <span>Select Date Range</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Preset Buttons Bar */}
            <div className="mb-4 space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                  Quick Ranges
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {QUICK_PRESETS.map((p) => {
                    const isActive = activePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p.id)}
                        className={clsx(
                          "px-2 py-1.5 rounded-lg text-center text-xs font-bold transition-all border",
                          isActive
                            ? "bg-accent-blue text-slate-950 border-accent-blue shadow-md scale-[1.02]"
                            : "bg-white/5 border-white/10 text-white/80 hover:bg-white/15 hover:text-white hover:border-white/20"
                        )}
                        title={p.label}
                      >
                        {p.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comparison & Granularity Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                {/* Comparison Benchmark */}
                {setComparisonMode && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                      <GitCompare size={12} className="text-accent-emerald" />
                      <span>Comparison Benchmark</span>
                    </div>
                    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 gap-1">
                      {[
                        { id: 'prev_period', label: 'Prev Period' },
                        { id: 'prev_year', label: 'Last Year' },
                        { id: 'none', label: 'None' },
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setComparisonMode(mode.id)}
                          className={clsx(
                            "flex-1 py-1 px-2 text-[11px] font-bold rounded-lg transition-colors text-center",
                            comparisonMode === mode.id
                              ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30 shadow-sm"
                              : "text-white/60 hover:text-white hover:bg-white/10"
                          )}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Granularity Switch */}
                {setGranularity && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                      <BarChart2 size={12} className="text-accent-blue" />
                      <span>Granularity</span>
                    </div>
                    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 gap-1">
                      {[
                        { id: 'day', label: 'Daily' },
                        { id: 'week', label: 'Weekly' },
                        { id: 'month', label: 'Monthly' },
                      ].map(g => (
                        <button
                          key={g.id}
                          onClick={() => setGranularity(g.id)}
                          className={clsx(
                            "flex-1 py-1 px-2 text-[11px] font-bold rounded-lg transition-colors text-center",
                            granularity === g.id
                              ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30 shadow-sm"
                              : "text-white/60 hover:text-white hover:bg-white/10"
                          )}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-2 border-t border-white/10">
              
              {/* Left Column: Calendar View */}
              <div className="sm:col-span-7 space-y-3">
                {/* Month Navigation Header */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="text-xs font-bold text-white flex items-center space-x-1">
                    <span>{monthNames[month]}</span>
                    <span className="text-white/60">{year}</span>
                  </div>

                  <button
                    onClick={nextMonth}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Day Names Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-white/40 uppercase">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Day Cells Matrix */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty Padding Days for Month Start Offset */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}

                  {/* Month Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                    const isToday = dateStr === todayStr;
                    const isStart = dateStr === draftStart;
                    const isEnd = dateStr === draftEnd;
                    const isInRange =
                      effectiveStart &&
                      effectiveEnd &&
                      dateStr >= effectiveStart &&
                      dateStr <= effectiveEnd;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => handleDayClick(dateStr)}
                        onMouseEnter={() => setHoveredDate(dateStr)}
                        onMouseLeave={() => setHoveredDate(null)}
                        className={clsx(
                          "h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center relative",
                          isStart || isEnd
                            ? "bg-accent-blue text-slate-950 font-bold shadow-md z-10"
                            : isInRange
                            ? "bg-accent-blue/20 text-accent-blue font-semibold"
                            : "hover:bg-white/10 text-white/90",
                          isToday && !isStart && !isEnd && "ring-1 ring-accent-blue/50 text-accent-blue font-bold"
                        )}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Custom Input & Action Controls */}
              <div className="sm:col-span-5 flex flex-col justify-between space-y-4 sm:border-l sm:border-white/10 sm:pl-5">
                <div>
                  <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3">
                    Manual Range Entry
                  </h4>

                  {/* From Input */}
                  <div className="space-y-1 mb-3">
                    <label className="text-[11px] font-semibold text-white/70">From Date</label>
                    <input
                      type="text"
                      value={fromInput}
                      onChange={(e) => {
                        setFromInput(e.target.value);
                        const parsed = parseDateExpression(e.target.value);
                        if (parsed) setDraftStart(parsed);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue font-mono"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  {/* To Input */}
                  <div className="space-y-1 mb-3">
                    <label className="text-[11px] font-semibold text-white/70">To Date</label>
                    <input
                      type="text"
                      value={toInput}
                      onChange={(e) => {
                        setToInput(e.target.value);
                        const parsed = parseDateExpression(e.target.value);
                        if (parsed) setDraftEnd(parsed);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue font-mono"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  {/* Range Info */}
                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-[11px] text-white/60 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Start:</span>
                      <span className="text-white font-semibold">{draftStart || 'Select...'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>End:</span>
                      <span className="text-white font-semibold">{draftEnd || 'Select...'}</span>
                    </div>
                  </div>

                  {/* Error Banner */}
                  {errorMessage && (
                    <div className="mt-2 flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] p-2 rounded-lg">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <button
                  onClick={handleApplyManual}
                  className="w-full bg-accent-blue hover:bg-accent-blue/90 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-accent-blue/20"
                >
                  <Check size={14} />
                  <span>Apply Range</span>
                </button>
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
