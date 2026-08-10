import React, { useState } from 'react';
import Sparkline from './Sparkline';
import { Layers, ArrowUpDown, Flame } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { formatNumber } from '../lib/format';
import AppIcon from './AppIcon';
import { getProjectUrlSegment } from '../lib/projectUtils';
import { clsx } from 'clsx';

export default function PortfolioSmallMultiples({ projects = [], appTrends = {}, onSelectProject }) {
  const [sortMode, setSortMode] = useState('installs'); // 'installs', 'decliners', 'default'

  if (!projects || projects.length === 0) {
    return (
      <div className="glass-card p-6 border border-white/10 text-center space-y-2">
        <p className="text-xs font-bold text-slate-300">No Apps Available for Selected Scope</p>
        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
          No apps match the selected platform filter. Ensure credentials for Apple App Store Connect or Google Play Console are configured in the Config page.
        </p>
      </div>
    );
  }

  // Enhance each project with momentum & quiet stats
  const enhancedProjects = projects.map((proj) => {
    let points = [];
    let googlePoints = [];
    let applePoints = [];
    let googleInstalls = 0;
    let appleInstalls = 0;

    const getTrendArray = (...keys) => {
      for (const k of keys) {
        if (k && appTrends[k]) {
          const entry = appTrends[k];
          return entry.trends || (Array.isArray(entry) ? entry : []);
        }
      }
      return [];
    };

    let gEntry = [];
    let aEntry = [];

    if (proj.isMerged && (proj.googleApp || proj.appleApp)) {
      gEntry = getTrendArray(proj.googlePackageName, proj.googleApp?.packageName, proj.googleApp?.name);
      aEntry = getTrendArray(proj.appleBundleId, proj.appleApp?.bundleId, proj.appleApp?.packageName, proj.appleApp?.name);
    } else {
      const trendData = getTrendArray(proj.packageName, proj.bundleId, proj.name);
      if (proj.platform === 'apple') {
        aEntry = trendData;
      } else {
        gEntry = trendData;
      }
    }

    googleInstalls = gEntry.reduce((sum, d) => sum + (d.dailyUserInstalls || d.dailyInstalls || 0), 0);
    appleInstalls = aEntry.reduce((sum, d) => sum + (d.dailyUserInstalls || d.dailyInstalls || 0), 0);

    const allDates = Array.from(new Set([
      ...gEntry.map(d => d.date),
      ...aEntry.map(d => d.date)
    ])).filter(Boolean).sort();

    if (allDates.length > 0) {
      const gMap = new Map(gEntry.map(d => [d.date, d.dailyUserInstalls || d.dailyInstalls || 0]));
      const aMap = new Map(aEntry.map(d => [d.date, d.dailyUserInstalls || d.dailyInstalls || 0]));

      allDates.forEach(date => {
        const gVal = gMap.get(date) || 0;
        const aVal = aMap.get(date) || 0;
        googlePoints.push(gVal);
        applePoints.push(aVal);
        points.push(gVal + aVal);
      });
    } else {
      const maxLen = Math.max(gEntry.length, aEntry.length);
      points = new Array(maxLen).fill(0);
      googlePoints = new Array(maxLen).fill(0);
      applePoints = new Array(maxLen).fill(0);
      for (let i = 0; i < maxLen; i++) {
        const gVal = gEntry[i]?.dailyUserInstalls || gEntry[i]?.dailyInstalls || 0;
        const aVal = aEntry[i]?.dailyUserInstalls || aEntry[i]?.dailyInstalls || 0;
        googlePoints[i] = gVal;
        applePoints[i] = aVal;
        points[i] = gVal + aVal;
      }
    }

    const totalInstalls = points.reduce((sum, v) => sum + v, 0);

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
      googleInstalls,
      appleInstalls,
      points,
      googlePoints,
      applePoints,
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
    <div className="glass-card p-5 sm:p-6 border border-white/10 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Layers size={18} className="text-accent-blue" />
            <h3 className="text-sm font-bold text-slate-200">Portfolio Performance Grid</h3>
            <span className="text-xs text-slate-400 font-semibold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              {projects.length} {projects.length === 1 ? 'App' : 'Apps'}
            </span>
          </div>
          
          {/* 3-Line Legend */}
          <div className="flex items-center space-x-3 text-xs font-semibold text-slate-300 bg-slate-950/40 px-3 py-1 rounded-xl border border-white/10">
            <span className="flex items-center gap-1.5" title="Combined Multi-Platform Installs">
              <span className="w-3 h-1 bg-[#00d2ff] rounded-full inline-block shadow-sm shadow-[#00d2ff]/50" />
              Combined
            </span>
            <span className="flex items-center gap-1.5" title="Google Play Store Installs">
              <span className="w-3 h-1 bg-[#34d399] rounded-full inline-block shadow-sm shadow-[#34d399]/50" />
              Android
            </span>
            <span className="flex items-center gap-1.5" title="Apple App Store Installs">
              <span className="w-3 h-1 bg-[#38bdf8] rounded-full inline-block shadow-sm shadow-[#38bdf8]/50" />
              Apple
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sorting Toggle */}
          <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <ArrowUpDown size={13} className="text-slate-400 ml-1.5 mr-0.5" />
            <button
              onClick={() => setSortMode('installs')}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                sortMode === 'installs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              Top Installs
            </button>
            <button
              onClick={() => setSortMode('decliners')}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                sortMode === 'decliners' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              Decliners First
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {sorted.map(({ proj, totalInstalls, googleInstalls, appleInstalls, points, googlePoints, applePoints, momentumStr, momentumType, asoScore }) => {
          const hasTrends = points.length > 1 && points.some(v => v > 0);
          const isPairedMerged = proj.isMerged && proj.googleApp && proj.appleApp;

          const sparklineLines = hasTrends ? [
            { data: points, color: '#00d2ff', strokeWidth: 2.4, showFill: true, fillGradientId: 'combine-gradient' },
            { data: applePoints, color: '#38bdf8', strokeWidth: 1.8 },
            { data: googlePoints, color: '#34d399', strokeWidth: 1.8 }
          ] : [
            { data: points.length >= 2 ? points : [0, 0], color: 'rgba(255, 255, 255, 0.35)', strokeWidth: 1.6, isDashed: true },
            { data: applePoints.length >= 2 ? applePoints : [0, 0], color: 'rgba(56, 189, 248, 0.3)', strokeWidth: 1.2, isDashed: true },
            { data: googlePoints.length >= 2 ? googlePoints : [0, 0], color: 'rgba(52, 211, 153, 0.3)', strokeWidth: 1.2, isDashed: true }
          ];

          return (
            <div
              key={proj.index || proj.packageName}
              onClick={() => onSelectProject && onSelectProject(getProjectUrlSegment(proj))}
              className={clsx(
                "bg-slate-900/60 hover:bg-slate-900/90 border border-white/10 hover:border-white/25 p-4 sm:p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-4 group min-h-[175px] shadow-lg hover:shadow-xl hover:-translate-y-0.5",
                momentumType === 'quiet' && "opacity-75 hover:opacity-100"
              )}
            >
              <div className="space-y-3">
                {/* Header: Icon, Platform Store Icons, App Title, ASO Score */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-7 h-7 rounded-xl shadow-md shrink-0 border border-white/10" />
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                      {isPairedMerged ? (
                        <div className="flex items-center space-x-0.5 shrink-0 bg-white/5 px-1 py-0.5 rounded border border-white/10" title="Available on Apple App Store & Google Play Store">
                          <AppleStoreIcon size={12} className="text-sky-300 shrink-0" />
                          <PlayStoreIcon size={12} className="text-emerald-400 shrink-0" />
                        </div>
                      ) : proj.platform === 'apple' ? (
                        <AppleStoreIcon size={12} className="text-sky-300/80 shrink-0" />
                      ) : (
                        <PlayStoreIcon size={12} className="text-emerald-400/80 shrink-0" />
                      )}
                      <span
                        className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-accent-blue transition-colors leading-tight"
                        title={proj.name}
                      >
                        {proj.name}
                      </span>
                    </div>
                  </div>

                  {asoScore != null && asoScore > 0 && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono shrink-0"
                      title={`ASO Score: ${asoScore}`}
                    >
                      ASO {asoScore}
                    </span>
                  )}
                </div>

                {/* Period Installs & Platform Breakdown Pill */}
                <div className="flex items-end justify-between gap-2 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period Installs</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{formatNumber(totalInstalls)}</p>
                      <span
                        className={clsx(
                          "text-[10px] font-extrabold px-2 py-0.5 rounded-md font-mono border whitespace-nowrap shadow-sm",
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

                  {/* Store Platform Breakdown Pill */}
                  <div className="flex items-center space-x-1.5 text-[10px] font-semibold bg-slate-950/60 px-2.5 py-1 rounded-xl border border-white/10 shrink-0 font-mono shadow-inner">
                    {appleInstalls > 0 || proj.platform === 'apple' ? (
                      <span className="text-sky-300 flex items-center gap-1">
                        <AppleStoreIcon size={10} /> {formatNumber(appleInstalls)}
                      </span>
                    ) : null}

                    {((appleInstalls > 0 || proj.platform === 'apple') && (googleInstalls > 0 || proj.platform === 'google')) && (
                      <span className="text-slate-600 font-bold">•</span>
                    )}

                    {googleInstalls > 0 || proj.platform === 'google' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <PlayStoreIcon size={10} /> {formatNumber(googleInstalls)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Sparkline Multi-Line Container */}
              <div
                className="h-14 w-full pt-1.5 pb-0.5 flex items-center bg-slate-950/40 rounded-xl px-2 border border-white/5 group-hover:border-white/15 transition-all"
                title={`Mini Graph for ${proj.name}: Combined (Cyan #00d2ff), Android (Emerald #34d399), Apple (Sky Blue #38bdf8)`}
              >
                <Sparkline lines={sparklineLines} height={52} showGridLines={true} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
