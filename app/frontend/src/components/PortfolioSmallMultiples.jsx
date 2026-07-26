import React from 'react';
import Sparkline from './Sparkline';
import { Layers } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { formatNumber } from '../lib/format';
import AppIcon from './AppIcon';
import { clsx } from 'clsx';

export default function PortfolioSmallMultiples({ projects = [], appTrends = {}, onSelectProject }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="glass-card p-4 sm:p-6 border border-white/10 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <Layers size={16} className="text-accent-blue" />
          <h3 className="text-xs font-bold text-slate-200">Portfolio Performance Grid</h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">{projects.length} Apps Tracked</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {projects.map((proj) => {
          // Exact lookup by packageName (unique ID) — no fuzzy matching needed
          const appTrendEntry = appTrends[proj.packageName];
          const trendData = appTrendEntry?.trends || appTrendEntry || [];
          const totalInstalls = trendData.reduce((sum, d) => sum + (d.dailyUserInstalls || d.dailyInstalls || 0), 0);
          const points = trendData.map(d => d.dailyUserInstalls || d.dailyInstalls || 0);

          // Compute Period-over-Period contextual delta percentage
          let deltaStr = '0%';
          let deltaType = 'neutral'; // 'positive', 'negative', 'neutral'

          if (points.length >= 2) {
            const half = Math.floor(points.length / 2);
            const firstHalf = points.slice(0, half);
            const secondHalf = points.slice(half);

            const firstSum = firstHalf.reduce((a, b) => a + b, 0);
            const secondSum = secondHalf.reduce((a, b) => a + b, 0);

            if (firstSum === 0 && secondSum === 0) {
              deltaStr = '0%';
              deltaType = 'neutral';
            } else if (firstSum === 0 && secondSum > 0) {
              deltaStr = '+100%';
              deltaType = 'positive';
            } else if (firstSum > 0 && secondSum === 0) {
              deltaStr = '-100%';
              deltaType = 'negative';
            } else {
              const change = ((secondSum - firstSum) / firstSum) * 100;
              if (change > 0) {
                deltaStr = `+${change.toFixed(0)}%`;
                deltaType = 'positive';
              } else if (change < 0) {
                deltaStr = `${change.toFixed(0)}%`;
                deltaType = 'negative';
              } else {
                deltaStr = '0%';
                deltaType = 'neutral';
              }
            }
          } else {
            deltaStr = '0%';
            deltaType = 'neutral';
          }

          // Only show ASO score badge if explicitly present on proj
          const asoScore = proj.asoScore || proj.aso || proj.score;
          const hasTrends = points.length > 1 && points.some(v => v > 0);

          return (
            <div
              key={proj.index}
              onClick={() => onSelectProject && onSelectProject(proj.index)}
              className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-3 sm:p-3.5 rounded-xl transition-all cursor-pointer flex flex-col justify-between space-y-2.5 group min-h-[135px]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                    <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-5 h-5 rounded shrink-0" />
                    {proj.platform === 'apple' ? (
                      <AppleStoreIcon size={11} className="text-white/50 shrink-0" />
                    ) : (
                      <PlayStoreIcon size={11} className="text-white/50 shrink-0" />
                    )}
                    <span
                      className="text-[11px] font-bold text-white truncate group-hover:text-accent-blue transition-colors leading-tight"
                      title={proj.name}
                    >
                      {proj.name}
                    </span>
                  </div>

                  {/* De-emphasized ASO Score tag: Only rendered if score actually exists */}
                  {asoScore != null && asoScore > 0 && (
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono shrink-0"
                      title={`ASO Score: ${asoScore}`}
                    >
                      ASO {asoScore}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400">Period Installs</span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <p className="text-base sm:text-lg font-extrabold text-white">{formatNumber(totalInstalls)}</p>
                      <span
                        className={clsx(
                          "text-[9px] font-bold px-1 py-0.2 rounded font-mono border",
                          deltaType === 'positive'
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : deltaType === 'negative'
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-white/5 text-slate-400 border-white/10"
                        )}
                        title={totalInstalls === 0 ? (deltaType === 'negative' ? 'Dropped to 0 installs' : 'Always 0 installs') : `Period trend: ${deltaStr}`}
                      >
                        {deltaStr}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sparkline Container: Always rendered to guarantee height uniformity across the grid */}
              <div className="h-9 w-full pt-1 flex items-center">
                {hasTrends ? (
                  <Sparkline data={points} color="#00d2ff" height={28} />
                ) : (
                  <Sparkline data={points.length >= 2 ? points : [0, 0]} color="rgba(255, 255, 255, 0.2)" height={28} isDashed={true} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
