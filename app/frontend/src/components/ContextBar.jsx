import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import { formatDataFreshness } from '../lib/format';
import AppDropdownSelector from './AppDropdownSelector';

export default function ContextBar({
  activeProject,
  projects = [],
  selectedProjectIndex,
  setSelectedProjectIndex,
  platform,
  setPlatform,
  dateRange,
  comparisonMode,
  lastDataDate
}) {
  const freshness = formatDataFreshness(lastDataDate);

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
        />

        {/* Single Source of Truth Status Chip (no repeated raw date string) */}
        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-slate-300 shadow-sm">
          <Calendar size={13} className="text-accent-blue shrink-0" />
          <span className="font-semibold text-[11px] text-white tracking-wide">
            {statusChipText}
          </span>
        </div>
      </div>

      {/* Freshness Badge */}
      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-medium ml-auto">
        <Clock size={13} className="text-accent-blue" />
        <span>{freshness}</span>
      </div>
    </div>
  );
}

