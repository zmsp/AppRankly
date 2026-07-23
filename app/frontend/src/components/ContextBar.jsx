import React from 'react';
import { Clock, Calendar, GitCompare } from 'lucide-react';
import { formatDataFreshness } from '../lib/format';
import AppDropdownSelector from './AppDropdownSelector';

export default function ContextBar({
  activeProject,
  projects = [],
  selectedProjectIndex,
  setSelectedProjectIndex,
  platform,
  dateRange,
  comparisonMode,
  lastDataDate
}) {
  const freshness = formatDataFreshness(lastDataDate);

  const comparisonLabels = {
    prev_period: 'vs. prev period',
    prev_year: 'vs. last year',
    none: 'no benchmark',
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
        />

        {/* Date Range Badge */}
        {dateRange && (
          <div className="flex items-center space-x-1.5 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-xl text-slate-300">
            <Calendar size={13} className="text-slate-400" />
            <span className="font-medium text-[11px]">
              {dateRange.label && dateRange.label !== 'Custom' && !dateRange.label.includes('→') ? (
                <span><strong className="text-white">{dateRange.label}</strong> ({dateRange.start} → {dateRange.end})</span>
              ) : (
                <span>{dateRange.start} → {dateRange.end}</span>
              )}
            </span>
          </div>
        )}

        {/* Comparison Mode Badge */}
        {comparisonMode && (
          <div className="flex items-center space-x-1.5 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-xl text-slate-300">
            <GitCompare size={13} className="text-accent-emerald" />
            <span className="font-medium text-[11px]">{comparisonLabels[comparisonMode] || comparisonMode}</span>
          </div>
        )}
      </div>

      {/* Freshness Badge */}
      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-medium ml-auto">
        <Clock size={13} className="text-accent-blue" />
        <span>{freshness}</span>
      </div>
    </div>
  );
}

