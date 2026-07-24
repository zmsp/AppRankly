import React from 'react';
import Sparkline from './Sparkline';
import { Layers } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { formatNumber } from '../lib/format';
import AppIcon from './AppIcon';

export default function PortfolioSmallMultiples({ projects = [], appTrends = {}, onSelectProject }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="glass-card p-4 sm:p-6 border border-white/10 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <Layers size={16} className="text-accent-blue" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Portfolio Performance Grid</h3>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">{projects.length} Apps Tracked</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {projects.map((proj) => {
          // Exact lookup by packageName (unique ID) — no fuzzy matching needed
          const appTrendEntry = appTrends[proj.packageName];
          const trendData = appTrendEntry?.trends || appTrendEntry || [];
          const totalInstalls = trendData.reduce((sum, d) => sum + (d.dailyUserInstalls || d.dailyInstalls || 0), 0);
          const points = trendData.map(d => d.dailyUserInstalls || d.dailyInstalls || 0);

          return (
            <div
              key={proj.index}
              onClick={() => onSelectProject && onSelectProject(proj.index)}
              className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-3.5 rounded-xl transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-6 h-6 rounded-md" />
                  <div className="flex items-center space-x-1.5 truncate">
                    {proj.platform === 'apple' ? (
                      <AppleStoreIcon size={12} className="text-white/60 shrink-0" />
                    ) : (
                      <PlayStoreIcon size={12} className="text-white/60 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-white truncate group-hover:text-accent-blue transition-colors">
                      {proj.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Period Installs</span>
                  <p className="text-lg font-extrabold text-white">{formatNumber(totalInstalls)}</p>
                </div>
              </div>

              {points.length > 1 && (
                <div className="h-10 w-full pt-1">
                  <Sparkline data={points} color="#00d2ff" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
