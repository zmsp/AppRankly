import React from 'react';
import { Clock, Calendar, AlertCircle, Download, Edit3, Notebook } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDataFreshness } from '../lib/format';
import { exportToCSV } from '../lib/exportUtils';
import AppDropdownSelector from './AppDropdownSelector';
import clsx from 'clsx';

export default function ContextBar({
  activeProject,
  projects = [],
  selectedProjectIndex,
  setSelectedProjectIndex,
  platform,
  setPlatform,
  setPlatformAndProject,
  dateRange,
  comparisonMode,
  lastDataDate,
  stats,
  notes = [],
  onOpenQuickNotes
}) {

  const freshness = formatDataFreshness(lastDataDate);

  // Check if data is more than 3 days lag
  let isStale = false;
  if (lastDataDate) {
    const lastDate = new Date(lastDataDate);
    if (!isNaN(lastDate.getTime())) {
      const diffDays = Math.floor(Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 3) isStale = true;
    }
  }

  const comparisonLabels = {
    prev_period: 'vs. prev period',
    prev_year: 'vs. last year',
    none: '',
  };

  const getRangeText = () => {
    if (!dateRange) return 'Last 7 days';
    if (dateRange.label && !dateRange.label.includes('→')) {
      return dateRange.label;
    }
    return 'Custom Range';
  };

  const rangeText = getRangeText();
  const compSuffix = (comparisonMode && comparisonMode !== 'none')
    ? (comparisonLabels[comparisonMode] || comparisonMode)
    : 'vs. prev period';

  const statusChipText = `${rangeText} ${compSuffix}`.trim();

  const handleExport = () => {
    if (!stats || (!stats.dailyTrends?.length && !stats.overview)) {
      toast.error('No trend data available to export');
      return;
    }
    const dataToExport = stats.dailyTrends && stats.dailyTrends.length > 0 ? stats.dailyTrends : [stats];
    const projName = activeProject?.name ? activeProject.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'dashboard';
    const filename = `${projName}_trends_${new Date().toISOString().slice(0, 10)}.csv`;
    const ok = exportToCSV(dataToExport, filename);
    if (ok) {
      toast.success(`Exported ${dataToExport.length} rows to ${filename}`);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3 sticky top-16 z-20">
      <div className="flex flex-wrap items-center gap-3">
        {/* App Store Style App Selector Dropdown */}
        <AppDropdownSelector
          projects={projects}
          selectedProjectIndex={selectedProjectIndex}
          onSelectProject={setSelectedProjectIndex}
          platform={platform}
          setPlatform={setPlatform}
          setPlatformAndProject={setPlatformAndProject}
        />

        {/* Notebook Popup Trigger Button */}
        <button
          onClick={onOpenQuickNotes}
          title="Open Quick App Notebook"
          className="flex items-center space-x-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl transition-all shadow-sm text-[11px] font-semibold"
        >
          <Edit3 size={13} className="text-indigo-400 shrink-0" />
          <span>Notes</span>
          {Array.isArray(notes) && notes.filter(n => n && (!activeProject || activeProject.packageName === 'all' ? true : n.packageName === activeProject.packageName)).length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-500 text-white">
              {notes.filter(n => n && (!activeProject || activeProject.packageName === 'all' ? true : n.packageName === activeProject.packageName)).length}
            </span>
          )}
        </button>


        {/* Single Source of Truth Status Chip */}
        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-slate-300 shadow-sm">
          <Calendar size={13} className="text-accent-blue shrink-0" />
          <span className="font-semibold text-[11px] text-white tracking-wide">
            {statusChipText}
          </span>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExport}
          title="Export trends to CSV"
          className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-xl text-slate-300 hover:text-white transition-colors shadow-sm text-[11px] font-medium"
        >
          <Download size={13} className="text-accent-emerald shrink-0" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Freshness Badge */}
      <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-medium ml-auto">
        <span className={clsx(
          "px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-colors shadow-sm",
          isStale
            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        )}
        title={isStale ? "Data is older than 3 days. Click sync icon above to update." : "Data is up to date"}
        >
          <span className={clsx("w-2 h-2 rounded-full animate-pulse", isStale ? "bg-amber-400" : "bg-emerald-400")} />
          {isStale && <AlertCircle size={12} className="text-amber-400 shrink-0" />}
          <span>{freshness}</span>
        </span>
      </div>
    </div>
  );
}
