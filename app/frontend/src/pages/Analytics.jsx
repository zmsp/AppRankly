import React, { useState, useMemo } from 'react';
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  BarChart2,
  AlertTriangle,
  Play,
  RefreshCw,
  Globe,
  Smartphone,
  Users,
  TrendingUp,
  Zap,
  Layers,
  Search,
  ArrowUpDown,
  Flame,
  Info
} from 'lucide-react';
import DimensionChart from '../components/DimensionChart';
import TrendChart from '../components/TrendChart';
import CombinedInstallsChart from '../components/CombinedInstallsChart';
import RetentionCohortHeatmap from '../components/RetentionCohortHeatmap';
import RetentionSurvivalChart from '../components/RetentionSurvivalChart';
import ChurnAnomalyTable from '../components/ChurnAnomalyTable';
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
  const [chartViewMode, setChartViewMode] = useState('survival'); // 'survival' | 'trends'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('activeDevices');
  const [sortAsc, setSortAsc] = useState(false);

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

  if (!stats && !loading) return <SkeletonDashboard />;

  const isAllProjects = selectedProjectIndex === 'all';
  const dailyTrends = stats?.dailyTrends || [];
  const churnAnomalies = stats?.retentionBenchmarks?.churnAnomalies || [];

  // Executive KPI Computations
  const totalInstalls = stats?.totalInstallCountByUser || dailyTrends.reduce((sum, t) => sum + (t.dailyInstalls || t.dailyUserInstalls || 0), 0);
  const activeDevices = stats?.currentlyActiveDevices || (dailyTrends.length > 0 ? dailyTrends[dailyTrends.length - 1].activeDevices : 0) || 0;
  
  const rawRetentionRate = totalInstalls > 0 ? ((activeDevices / totalInstalls) * 100) : 0;
  const activeRetentionRate = parseFloat(Math.min(100, rawRetentionRate).toFixed(1));

  // Retention Status Badge
  const retentionStatus = activeRetentionRate >= 45 ? { label: 'OPTIMAL', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    : activeRetentionRate >= 25 ? { label: 'STABLE', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
    : { label: 'AT RISK', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };

  // DAU / MAU Stickiness Index computation
  const stickinessIndex = useMemo(() => {
    if (dailyTrends.length === 0) return 0;
    const recent30 = dailyTrends.slice(-30);
    const avgDailyActive = recent30.reduce((sum, t) => sum + (t.activeDevices || 0), 0) / (recent30.length || 1);
    const maxActive30 = Math.max(...recent30.map(t => t.activeDevices || 0), 1);
    return parseFloat(((avgDailyActive / maxActive30) * 100).toFixed(1));
  }, [dailyTrends]);

  // Net Velocity over selected range
  const netVelocity = useMemo(() => {
    if (dailyTrends.length === 0) return 0;
    const installs = dailyTrends.reduce((sum, t) => sum + (t.dailyInstalls || t.dailyUserInstalls || 0), 0);
    const uninstalls = dailyTrends.reduce((sum, t) => sum + (t.dailyUninstalls || t.dailyUserUninstalls || 0), 0);
    return installs - uninstalls;
  }, [dailyTrends]);

  // Dimension Insights
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

  const deviceShiftInfo = activeDimension === 'device' && Array.isArray(dimensionStats) && dimensionStats.length > 0 ? (() => {
    const topDevice = dimensionStats[0];
    if (!topDevice) return null;
    return `Dominant device: ${topDevice.label || topDevice.key} (${topDevice.percentage || 0}% of active users)`;
  })() : null;

  // Filtered & Sorted Dimension Breakdown Table
  const sortedDimensionStats = useMemo(() => {
    if (!Array.isArray(dimensionStats)) return [];
    let items = dimensionStats.filter(item => {
      if (!searchTerm) return true;
      const label = item.label || item.key || '';
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return items.sort((a, b) => {
      let valA = a[sortField] ?? 0;
      let valB = b[sortField] ?? 0;
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [dimensionStats, searchTerm, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-accent-blue" size={26} />
            Retention & User Survival Analytics
          </h2>
          <p className="text-sm text-white/50">
            Monitor active retention proxies, cohort decay heatmaps, stickiness, and churn risk intelligence
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/70">
            {isAllProjects ? 'Portfolio Overview' : (platform === 'ios' ? 'Apple App Store' : 'Google Play')}
          </span>
        </div>
      </div>

      {/* Executive Retention KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Retention Rate Card */}
        <div className="glass-card p-5 border border-white/10 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Active Retention Proxy</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${retentionStatus.color}`}>
              {retentionStatus.label}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{activeRetentionRate}%</div>
            <p className="text-[11px] text-white/40 mt-1">Active devices / total installs</p>
          </div>
        </div>

        {/* Stickiness Index (DAU/MAU) */}
        <div className="glass-card p-5 border border-white/10 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Stickiness Index</span>
            <div className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Zap size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-teal-300 font-mono">{stickinessIndex}%</div>
            <p className="text-[11px] text-white/40 mt-1">DAU / MAU engagement ratio</p>
          </div>
        </div>

        {/* D1 / D30 Benchmarks */}
        <div className="glass-card p-5 border border-white/10 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Est. Retention Benchmarks</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Flame size={14} />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <div>
              <span className="text-[10px] text-white/40 block">Day 1</span>
              <span className="text-xl font-bold text-indigo-300 font-mono">
                {Math.round(Math.min(85, Math.max(40, activeRetentionRate * 1.3)))}%
              </span>
            </div>
            <span className="text-white/20">/</span>
            <div>
              <span className="text-[10px] text-white/40 block">Day 30</span>
              <span className="text-xl font-bold text-indigo-300 font-mono">
                {Math.round(Math.max(8, activeRetentionRate * 0.45))}%
              </span>
            </div>
          </div>
        </div>

        {/* Net Velocity */}
        <div className="glass-card p-5 border border-white/10 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Net User Velocity</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              netVelocity >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black font-mono ${netVelocity >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netVelocity > 0 ? '+' : ''}{new Intl.NumberFormat().format(netVelocity)}
            </div>
            <p className="text-[11px] text-white/40 mt-1">Period net user growth</p>
          </div>
        </div>

        {/* Churn Anomalies Card */}
        <div className="glass-card p-5 border border-white/10 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Churn Anomalies</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              churnAnomalies.length > 0 ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              <ShieldAlert size={14} />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black font-mono ${churnAnomalies.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {churnAnomalies.length}
            </div>
            <p className="text-[11px] text-white/40 mt-1">Severe spikes detected (&gt;2.0σ)</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Dimension Distribution */}
        <div className="glass-card p-6 min-h-[440px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-accent-blue" />
                <span>Install & Active Distribution</span>
              </h3>
              {osRec && (
                <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse text-[10px] font-bold uppercase">
                  <CheckCircle2 size={12} />
                  <span>Safe to drop {osRec.os} ({osRec.percentage}%)</span>
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

          {/* Dimension Selector Buttons */}
          <div className="flex flex-wrap bg-white/5 p-1 rounded-xl mt-4 gap-1">
            {['country', 'os_version', 'app_version', 'device'].map((dim) => (
              <button
                key={dim}
                onClick={() => setActiveDimension(dim)}
                className={`flex-1 min-w-[70px] py-1.5 px-2 text-[10px] font-bold rounded-lg transition-all ${
                  activeDimension === dim ? 'bg-accent-blue text-slate-950 font-bold shadow-md' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {dim.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Right Card: Interactive Retention Trends & Survival Curve */}
        <div className="glass-card p-6 min-h-[440px]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setChartViewMode('survival')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartViewMode === 'survival'
                    ? 'bg-accent-blue text-slate-950 shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Survival Curve
              </button>
              <button
                onClick={() => setChartViewMode('trends')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartViewMode === 'trends'
                    ? 'bg-accent-blue text-slate-950 shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Daily Trends
              </button>
            </div>

            {chartViewMode === 'trends' && (
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
            )}
          </div>

          <div className="h-[360px]">
            {chartViewMode === 'survival' ? (
              <RetentionSurvivalChart dailyTrends={dailyTrends} />
            ) : isAllProjects ? (
              <CombinedInstallsChart
                dailyTrends={dailyTrends}
                appTrends={stats.appTrends}
                isLogarithmic={isLogarithmic}
              />
            ) : (
              <TrendChart
                data={dailyTrends}
                platform={platform}
                isLogarithmic={isLogarithmic}
              />
            )}
          </div>
        </div>
      </div>

      {/* Cohort Heatmap Section */}
      <div className="glass-card p-6 border border-white/10">
        <RetentionCohortHeatmap dailyTrends={dailyTrends} />
      </div>

      {/* Churn Anomaly Risk Log Section */}
      <ChurnAnomalyTable churnAnomalies={churnAnomalies} releases={releases} />

      {/* Detailed Multi-Dimensional Retention Table */}
      <div className="glass-card p-6 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-accent-blue" />
              <span>Multi-Dimensional Retention Breakdown ({activeDimension.replace('_', ' ').toUpperCase()})</span>
            </h3>
            <p className="text-xs text-white/40">Detailed retention rates, active device counts, and growth status per dimension segment</p>
          </div>

          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder={`Search ${activeDimension.replace('_', ' ')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-accent-blue/50"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-bold text-white/40 uppercase bg-white/2">
                <th className="py-3 px-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('label')}>
                  <div className="flex items-center gap-1">
                    <span>Segment Label</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('activeDevices')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Active Devices</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('totalInstalls')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Installs / Share</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('netUserGrowth')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Growth</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('retentionRate')}>
                  <div className="flex items-center gap-1">
                    <span>Retention Rate</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {sortedDimensionStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    No matching dimension segments found.
                  </td>
                </tr>
              ) : (
                sortedDimensionStats.map((item, idx) => {
                  const label = item.label || item.key || 'Unknown';
                  const active = item.activeDevices || item.active_devices || 0;
                  const installs = item.totalInstalls || item.installs || 0;
                  const netGrowth = item.netUserGrowth ?? item.netGrowth ?? 0;
                  const retRate = item.retentionRate ?? (installs > 0 ? parseFloat(((active / installs) * 100).toFixed(1)) : 0);

                  const isOptimal = retRate >= 45;
                  const isModerate = retRate >= 25;

                  return (
                    <tr key={idx} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white/90">
                        {label}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white/80">
                        {new Intl.NumberFormat().format(active)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white/60">
                        {new Intl.NumberFormat().format(installs)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono ${netGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {netGrowth > 0 ? '+' : ''}{new Intl.NumberFormat().format(netGrowth)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isOptimal ? 'bg-emerald-500' : isModerate ? 'bg-teal-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, retRate)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-xs">{retRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOptimal ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                            : isModerate ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                        }`}>
                          {isOptimal ? 'OPTIMAL' : isModerate ? 'STABLE' : 'LOW RETENTION'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
