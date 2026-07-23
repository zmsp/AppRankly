import React, { useState } from 'react';
import { Activity, ShieldAlert, CheckCircle2, BarChart2 } from 'lucide-react';
import DimensionChart from '../components/DimensionChart';
import TrendChart from '../components/TrendChart';
import CombinedInstallsChart from '../components/CombinedInstallsChart';

export default function Analytics({ stats, dimensionStats, releases, activeDimension, setActiveDimension, loading, error, platform, selectedProjectIndex }) {
  const [isLogarithmic, setIsLogarithmic] = useState(true);

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-full">
      <Activity className="animate-spin text-accent-blue mr-2" />
      <span>Loading analytics...</span>
    </div>
  );

  if (error && !stats) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="bg-rose-500/20 p-4 rounded-full mb-4">
        <Activity className="text-rose-500 w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold mb-2">Failed to load analytics</h3>
      <p className="text-white/60 mb-6 max-w-md">{error}</p>
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

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="bg-white/5 p-4 rounded-full mb-4">
        <Activity className="text-white/20 w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold mb-2">No data available</h3>
      <p className="text-white/40 mb-6 max-w-md">Please ensure your project is correctly configured and synchronized.</p>
    </div>
  );

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
        <div className="glass-card p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Install Distribution</h3>
            {osRec && (
              <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                <CheckCircle2 size={12} />
                <span className="text-[10px] font-bold uppercase">Safe to drop {osRec.os} ({osRec.percentage}%)</span>
              </div>
            )}
          </div>
          <div className="h-[300px]">
             <DimensionChart data={dimensionStats} dimension={activeDimension} />
          </div>
          <div className="flex flex-wrap bg-white/5 p-1 rounded-xl mt-6 gap-1">
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

      <div className="glass-card p-8 text-center border-dashed border-white/10">
        <p className="text-white/40 text-sm italic">Additional analytics modules (Heatmaps, Source Tracking) coming soon.</p>
      </div>
    </div>
  );
}
