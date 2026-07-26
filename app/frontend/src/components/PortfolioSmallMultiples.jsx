import React, { useState } from 'react';
import Sparkline from './Sparkline';
import { Layers, ArrowUpDown, Flame } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { formatNumber } from '../lib/format';
import AppIcon from './AppIcon';
import { clsx } from 'clsx';

export default function PortfolioSmallMultiples({ projects = [], appTrends = {}, onSelectProject }) {
  const [sortMode, setSortMode] = useState('decliners'); // 'decliners', 'installs', 'default'

  if (!projects || projects.length === 0) return null;

  // Enhance each project with momentum & quiet stats
  const enhancedProjects = projects.map((proj) => {
    const appTrendEntry = appTrends[proj.packageName];
    const trendData = appTrendEntry?.trends || appTrendEntry || [];
    const totalInstalls = trendData.reduce((sum, d) => sum + (d.dailyUserInstalls || d.dailyInstalls || 0), 0);
    const points = trendData.map(d => d.dailyUserInstalls || d.dailyInstalls || 0);

    // 1. Fixed Last 7 Days vs Prior 7 Days Momentum (independent of selected date range filter)
    let momentumPct = 0;
    let momentumStr = '0%';
    let momentumType = 'neutral'; // 'positive', 'negative', 'neutral', 'quiet'

    const len = points.length;
    const last7Points = points.slice(Math.max(0, len - 7));
    const prior7Points = points.slice(Math.max(0, len - 14), Math.max(0, len - 7));

    const last7Sum = last7Points.reduce((a, b) => a + b, 0);
    const prior7Sum = prior7Points.reduce((a, b) => a + b, 0);

    // Check for "quiet app" state (no installs in 5+ consecutive days)
    let zeroCountAtEnd = 0;
    for (let i = points.length - 1; i >= 0; i--) {
      if (points[i] === 0) zeroCountAtEnd++;
      else break;
    }
    const isQuiet = zeroCountAtEnd >= 5;

    if (isQuiet && totalInstalls < 3) {
      momentumStr = '😶 No activity';
      momentumType = 'quiet';
      momentumPct = -999;
    } else if (prior7Sum === 0 && last7Sum === 0) {
      momentumStr = '0%';
      momentumType = 'neutral';
      momentumPct = 0;
    } else if (prior7Sum === 0 && last7Sum > 0) {
      momentumStr = '+100%';
      momentumType = 'positive';
      momentumPct = 100;
    } else if (prior7Sum > 0 && last7Sum === 0) {
      momentumStr = '-100%';
      momentumType = 'negative';
      momentumPct = -100;
    } else {
      const change = ((last7Sum - prior7Sum) / prior7Sum) * 100;
      momentumPct = change;
      if (change > 0) {
        momentumStr = `+${change.toFixed(0)}%`;
        momentumType = 'positive';
      } else if (change < 0) {
        momentumStr = `${change.toFixed(0)}%`;
        momentumType = 'negative';
      } else {
        momentumStr = '0%';
        momentumType = 'neutral';
      }
    }

    return {
      proj,
      totalInstalls,
      points,
      momentumPct,
      momentumStr,
      momentumType,
      isQuiet,
      asoScore: proj.asoScore || proj.aso
    };
  });

  // Sort grid according to user preference
  const sorted = [...enhancedProjects].sort((a, b) => {
    if (sortMode === 'decliners') {
      return a.momentumPct - b.momentumPct; // Decliners first (most negative first)
    }
    if (sortMode === 'installs') {
      return b.totalInstalls - a.totalInstalls;
    }
    return 0; // Default order
  });

  return (
    <div className="glass-card p-4 sm:p-6 border border-white/10 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <Layers size={16} className="text-accent-blue" />
          <h3 className="text-xs font-bold text-slate-200">Portfolio Performance Grid</h3>
        </div>
        <div className="flex items-center space-x-3">
          {/* Sorting Toggle */}
          <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-lg border border-white/10 text-[10px]">
            <ArrowUpDown size={12} className="text-slate-400 ml-1" />
            <button
              onClick={() => setSortMode('decliners')}
              className={clsx("px-2 py-0.5 rounded font-medium transition-colors", sortMode === 'decliners' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white')}
            >
              Decliners First
            </button>
            <button
              onClick={() => setSortMode('installs')}
              className={clsx("px-2 py-0.5 rounded font-medium transition-colors", sortMode === 'installs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white')}
            >
              Top Installs
            </button>
          </div>
          <span className="text-xs text-slate-400 font-medium">{projects.length} Apps</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sorted.map(({ proj, totalInstalls, points, momentumStr, momentumType, asoScore }) => {
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
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Period Installs</span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <p className="text-base sm:text-lg font-extrabold text-white">{formatNumber(totalInstalls)}</p>
                      <span
                        className={clsx(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded font-mono border whitespace-nowrap",
                          momentumType === 'positive'
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : momentumType === 'negative'
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : momentumType === 'quiet'
                            ? "bg-slate-800 text-slate-400 border-slate-700"
                            : "bg-white/5 text-slate-400 border-white/10"
                        )}
                        title="7d vs prior 7d momentum"
                      >
                        {momentumStr}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sparkline Container */}
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
