import React from 'react';
import { Smartphone, Layers, Clock, Calendar, GitCompare } from 'lucide-react';
import { formatDataFreshness } from '../lib/format';

export default function ContextBar({ activeProject, platform, dateRange, comparisonMode, lastDataDate }) {
  const platformLabel = platform === 'google' ? 'Google Play' : 'App Store';
  const freshness = formatDataFreshness(lastDataDate);

  const comparisonLabels = {
    prev_period: 'vs. prev period',
    prev_year: 'vs. last year',
    none: 'no benchmark',
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3 sticky top-16 z-20">
      <div className="flex flex-wrap items-center gap-3">
        {/* Active Project Badge */}
        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
          {activeProject?.iconUrl ? (
            <img src={activeProject.iconUrl} alt={activeProject.name} className="w-4 h-4 rounded object-cover" />
          ) : activeProject?.index === 'all' ? (
            <Layers size={14} className="text-accent-blue" />
          ) : (
            <Smartphone size={14} className="text-slate-400" />
          )}
          <span className="font-bold text-white truncate max-w-[160px]">
            {activeProject ? (activeProject.name || (activeProject.index === 'all' ? 'All Apps' : 'Selected App')) : 'All Apps'}
          </span>
          <span className="text-[10px] text-accent-blue font-semibold uppercase bg-accent-blue/10 px-1.5 py-0.5 rounded">
            {platformLabel}
          </span>
        </div>

        {/* Date Range Badge */}
        {dateRange && (
          <div className="flex items-center space-x-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-slate-300">
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
          <div className="flex items-center space-x-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-slate-300">
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
