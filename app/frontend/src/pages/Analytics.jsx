import React, { useState } from 'react';
import { Activity, ShieldAlert, CheckCircle2, BarChart2, AlertTriangle, Play, RefreshCw, Globe, Smartphone } from 'lucide-react';
import DimensionChart from '../components/DimensionChart';
import TrendChart from '../components/TrendChart';
import CombinedInstallsChart from '../components/CombinedInstallsChart';
import SkeletonDashboard from '../components/SkeletonDashboard';

export default function Analytics({
  stats,
  dimensionStats,
  releases,
  activeDimension,
  setActiveDimension,
  loading,
  error,
  platform,
  selectedProjectIndex,
  refreshData,
  switchToDemoMode
}) {
  const [isLogarithmic, setIsLogarithmic] = useState(true);

  if (loading && !stats) return <SkeletonDashboard />;

  if (error && !stats) return (
    <div className="glass-card p-8 md:p-12 text-center max-w-2xl mx-auto my-8 border border-rose-500/20 space-y-6 shadow-2xl">
      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
        <AlertTriangle size={32} />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">Analytics Unavailable</h3>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          {error || 'Could not load analytics metrics from the backend.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {switchToDemoMode && (
          <button
            onClick={switchToDemoMode}
            className="px-5 py-2.5 bg-accent-blue text-slate-950 font-bold rounded-xl hover:bg-accent-blue/90 transition-all flex items-center gap-2 text-sm shadow-lg shadow-accent-blue/10"
          >
            <Play size={16} className="fill-slate-950" />
            <span>Explore in Demo Mode</span>
          </button>
        )}

        {refreshData && (
          <button
            onClick={refreshData}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2 text-sm"
          >
            <RefreshCw size={16} />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    </div>
  );

  const osRec = activeDimension === 'os_version' && dimensionStats && dimensionStats.length > 0 ? (() => {
    const totalActive = dimensionStats.reduce((acc, curr) => acc + (curr.activeDevices || 0), 0);
    if (totalActive === 0) return null;
    const belowThreshold = dimensionStats
      .filter(d => (d.activeDevices / totalActive) < 0.05)
      .sort((a, b) => (a.activeDevices / totalActive) - (b.activeDevices / totalActive));

    return belowThreshold.length > 0 ? {
      os: belowThreshold[0].label,
      percentage: ((belowThreshold[0].activeDevices / totalActive) * 100).toFixed(1)
    } : null;
  })() : null;

  // Market Concentration Index for Country view
  const countryConcentration = activeDimension === 'country' && Array.isArray(dimensionStats) && dimensionStats.length > 0 ? (() => {
    const sorted = [...dimensionStats].sort((a, b) => (b.totalInstalls || b.installs || 0) - (a.totalInstalls || a.installs || 0));
    const total = sorted.reduce((sum, r) => sum + (r.totalInstalls || r.installs || 0), 0);
    if (total === 0) return null;
    const top3 = sorted.slice(0, 3).reduce((sum, r) => sum + (r.totalInstalls || r.installs || 0), 0);
    const topShare = ((top3 / total) * 100).toFixed(0);
    const hhi = sorted.reduce((sum, r) => {
      const share = (r.totalInstalls || r.installs || 0) / total;
      return sum + (share * share);
    }, 0).toFixed(2);
    return { topShare, hhi };
  })() : null;

  // Device Mix Shift Chip for Device view (A6)
  const deviceShiftInfo = activeDimension === 'device' && Array.isArray(dimensionStats) && dimensionStats.length > 0 ? (() => {
    const topDevice = dimensionStats[0];
    if (!topDevice) return null;
    return `Dominant device: ${topDevice.label || topDevice.key} (${topDevice.percentage || 0}% of active users)`;
  })() : null;

  if (!stats && !loading) return <SkeletonDashboard />;

  const isAllProjects = selectedProjectIndex === 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Deep Dive Analytics</h2>
          <p className="text-white/40">Advanced metrics and distribution analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 min-h-[400px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Install Distribution</h3>
              {osRec && (
                <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-bold uppercase">Safe to drop {osRec.os} ({osRec.percentage}%)</span>
                </div>
              )}
            </div>

            <div className="h-[280px]">
              <DimensionChart data={dimensionStats} dimension={activeDimension} />
            </div>

            {/* Contextual Market / Device Chips */}
            {countryConcentration && (
              <div className="mt-3 flex items-center space-x-2 bg-indigo-500/10 text-indigo-300 px-3 py-2 rounded-xl border border-indigo-500/20 text-xs">
                <Globe size={14} className="text-indigo-400 shrink-0" />
                <span>Market Concentration: Top 3 countries = <strong className="text-white">{countryConcentration.topShare}%</strong> of installs (HHI {countryConcentration.hhi})</span>
              </div>
            )}

            {deviceShiftInfo && (
              <div className="mt-3 flex items-center space-x-2 bg-purple-500/10 text-purple-300 px-3 py-2 rounded-xl border border-purple-500/20 text-xs">
                <Smartphone size={14} className="text-purple-400 shrink-0" />
                <span>{deviceShiftInfo}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap bg-white/5 p-1 rounded-xl mt-4 gap-1">
            {['country', 'os_version', 'app_version', 'device'].map((dim) => (
              <button
                key={dim}
                onClick={() => setActiveDimension(dim)}
                className={`flex-1 min-w-[70px] py-1.5 px-2 text-[10px] font-bold rounded-lg transition-all ${
                  activeDimension === dim ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {dim.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">
              {isAllProjects ? 'Combined Installs Trend' : 'Retention Trends'}
            </h3>
            <button
              onClick={() => setIsLogarithmic(!isLogarithmic)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                isLogarithmic
                  ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
                  : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
              }`}
              title="Toggle Logarithmic Scale"
            >
              <BarChart2 size={12} />
              <span>Log Scale</span>
            </button>
          </div>
          <div className="h-[300px]">
             {isAllProjects ? (
               <CombinedInstallsChart
                 dailyTrends={stats.dailyTrends}
                 appTrends={stats.appTrends}
                 isLogarithmic={isLogarithmic}
               />
             ) : (
               <TrendChart
                 data={stats.dailyTrends}
                 releases={releases}
                 platform={platform}
                 isLogarithmic={isLogarithmic}
               />
             )}
          </div>
          <p className="text-xs text-white/40 mt-6 text-center italic">
            {isAllProjects ? 'Visualizing per-app installs alongside total aggregate installs.' : 'Visualizing daily active devices vs acquisition velocity.'}
          </p>
        </div>
      </div>
    </div>
  );
}
