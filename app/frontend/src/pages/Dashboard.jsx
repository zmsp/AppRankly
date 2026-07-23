import React, { useState } from 'react';
import { clsx } from 'clsx';
import { PlayStoreIcon, AppleStoreIcon } from '../components/icons/StoreIcons';
import HeroKPI from '../components/HeroKPI';
import HealthBreakdown from '../components/HealthBreakdown';
import MetricCard from '../components/MetricCard';
import WhatChangedDigest from '../components/WhatChangedDigest';
import PortfolioSmallMultiples from '../components/PortfolioSmallMultiples';
import DrilldownPanel from '../components/DrilldownPanel';
import TrendChart from '../components/TrendChart';
import CombinedInstallsChart from '../components/CombinedInstallsChart';
import DeviceHealthTable from '../components/DeviceHealthTable';
import DimensionChart from '../components/DimensionChart';
import NetGrowthChart from '../components/NetGrowthChart';
import UpgradesChart from '../components/UpgradesChart';
import ActiveDevicesChart from '../components/ActiveDevicesChart';
import AllPlatformDashboard from '../components/AllPlatformDashboard';
import { calculateHealthScore } from '../lib/healthScore';
import SkeletonDashboard from '../components/SkeletonDashboard';
import { formatNumber } from '../lib/format';
import {
  Users,
  Download,
  LogOut,
  TrendingUp,
  Activity,
  Zap,
  ShieldCheck,
  BarChart2,
  Percent,
  LayoutGrid,
  AlertTriangle,
  RefreshCw,
  Play
} from 'lucide-react';

export default function Dashboard({
  stats,
  dimensionStats,
  deviceStats,
  releases,
  platform,
  setPlatform,
  activeDimension,
  setActiveDimension,
  loading,
  error,
  projects = [],
  selectedProjectIndex,
  setSelectedProjectIndex,
  authToken,
  isStaticMode,
  refreshData,
  switchToDemoMode
}) {
  const [isLogarithmic, setIsLogarithmic] = useState(false);
  const [selectedDrilldownPoint, setSelectedDrilldownPoint] = useState(null);
  const [showPortfolio, setShowPortfolio] = useState(true);

  if (loading && !stats) return <SkeletonDashboard />;

  if (error && (!stats || !stats.dailyTrends)) return (
    <div className="glass-card p-8 md:p-12 text-center max-w-2xl mx-auto my-8 border border-rose-500/20 space-y-6 shadow-2xl">
      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
        <AlertTriangle size={32} />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">Data Connection Issue</h3>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          {error || 'Unable to communicate with the analytics backend service.'}
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

      <div className="text-xs text-slate-400 bg-white/5 p-4 rounded-xl border border-white/5 text-left space-y-1">
        <p className="font-semibold text-slate-300">💡 Quick Troubleshooting:</p>
        <p>• Verify your API backend is running (`npm run dev` or `node server.js`).</p>
        <p>• Check if JWT authentication or environment key configurations are valid.</p>
        <p>• You can switch to Demo Mode anytime to test all features instantly.</p>
      </div>
    </div>
  );

  if (!stats && !loading) return <SkeletonDashboard />;

  if (!stats) return null;


  // True Period-over-Period trend computation
  const computeTrend = (key) => {
    const data = stats.dailyTrends;
    if (!data || data.length < 2) return null;
    const half = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, half);
    const secondHalf = data.slice(half);

    const firstSum = firstHalf.reduce((acc, curr) => acc + (curr[key] || 0), 0);
    const secondSum = secondHalf.reduce((acc, curr) => acc + (curr[key] || 0), 0);

    if (firstSum === 0) return secondSum > 0 ? '+100%' : '0%';
    const diff = ((secondSum - firstSum) / firstSum) * 100;
    return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  };

  const installSurvivalIndex = stats.totalInstallCountByUser > 0
    ? ((stats.currentlyActiveDevices / stats.totalInstallCountByUser) * 100).toFixed(1)
    : '0';

  const churnRate = stats.currentlyActiveDevices > 0
    ? ((stats.totalDailyUserUninstalls / stats.currentlyActiveDevices) * 100).toFixed(1)
    : '0';

  const healthScore = calculateHealthScore(stats);

  const isAllProjects = selectedProjectIndex === 'all' || platform === 'all';
  const filteredProjects = platform === 'all' ? projects : projects.filter(p => p.platform === platform);
  const activeProject = projects.find(p => p.index === selectedProjectIndex);
  const lastDataDate = stats.lastDate || (stats.dailyTrends?.length > 0 ? stats.dailyTrends[stats.dailyTrends.length - 1].date : null);

  const handleNavigateChart = (targetChartId) => {
    const el = document.getElementById(targetChartId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const combinedTotalInstalls = stats.dailyTrends?.reduce((sum, item) => sum + (item.dailyUserInstalls || item.dailyInstalls || 0), 0) || 0;
  const combinedAvgInstalls = stats.dailyTrends?.length ? Math.round(combinedTotalInstalls / stats.dailyTrends.length) : 0;

  const netGrowthTotal = stats.dailyTrends?.reduce((sum, day) => sum + (day.netGrowth || 0), 0) || 0;
  const netGrowthAvg = stats.dailyTrends?.length ? Math.round(netGrowthTotal / stats.dailyTrends.length) : 0;
  
  const upgradesTotal = stats.dailyTrends?.reduce((sum, day) => sum + (day.upgrades || 0), 0) || 0;
  const upgradesAvg = stats.dailyTrends?.length ? Math.round(upgradesTotal / stats.dailyTrends.length) : 0;
  
  const activeDevicesMax = stats.dailyTrends?.reduce((max, day) => Math.max(max, day.activeDevices || 0), 0) || 0;
  const activeDevicesSum = stats.dailyTrends?.reduce((sum, day) => sum + (day.activeDevices || 0), 0) || 0;
  const activeDevicesAvg = stats.dailyTrends?.length ? Math.round(activeDevicesSum / stats.dailyTrends.length) : 0;

  const renderSummary = (total, avg, label1 = "Total", label2 = "Avg") => (
    <div className="flex items-center space-x-6 mb-3 bg-white/5 w-fit px-3 py-2 rounded-lg border border-white/10">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label1}</span>
        <span className="text-sm font-semibold text-white leading-none">{formatNumber(total)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label2}</span>
        <span className="text-sm font-semibold text-white leading-none">{formatNumber(avg)}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 relative">
      {/* Standard Tab Switcher UI with Large Icons */}
      <div className="bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1">
          {[
            {
              id: 'all',
              title: 'All Platforms',
              countBadge: `${projects.length || 0}`,
              icon: LayoutGrid,
              activeIndicator: 'bg-accent-blue',
              activeText: 'text-accent-blue',
              activeBg: 'bg-white/10 border-white/15 text-white shadow-sm',
              badgeStyle: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
            },
            {
              id: 'google',
              title: 'Google Play',
              countBadge: `${projects.filter(p => p.platform === 'google').length || 0}`,
              icon: PlayStoreIcon,
              activeIndicator: 'bg-emerald-400',
              activeText: 'text-emerald-400',
              activeBg: 'bg-white/10 border-white/15 text-white shadow-sm',
              badgeStyle: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            },
            {
              id: 'apple',
              title: 'App Store',
              countBadge: `${projects.filter(p => p.platform === 'apple').length || 0}`,
              icon: AppleStoreIcon,
              activeIndicator: 'bg-sky-400',
              activeText: 'text-sky-300',
              activeBg: 'bg-white/10 border-white/15 text-white shadow-sm',
              badgeStyle: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
            },
          ].map((tab) => {
            const isSelected = platform === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setPlatform && setPlatform(tab.id)}
                className={clsx(
                  "relative flex-1 flex items-center justify-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer border select-none",
                  isSelected
                    ? `${tab.activeBg} border`
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                )}
              >
                {/* Large Store Icon */}
                <div className={clsx(
                  "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200",
                  isSelected ? "bg-white/10 text-white scale-105" : "bg-white/5 text-slate-400"
                )}>
                  <Icon size={20} />
                </div>

                {/* Tab Title */}
                <span className={clsx(
                  "font-bold tracking-tight text-sm truncate",
                  isSelected ? "text-white" : "text-slate-300"
                )}>
                  {tab.title}
                </span>

                {/* Count Badge */}
                <span className={clsx(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border transition-colors",
                  isSelected
                    ? tab.badgeStyle
                    : "bg-white/5 text-slate-500 border-white/5"
                )}>
                  {tab.countBadge} {parseInt(tab.countBadge) === 1 ? 'App' : 'Apps'}
                </span>

                {/* Standard Tab Active Bottom Bar */}
                {isSelected && (
                  <div className={clsx(
                    "absolute bottom-0 left-4 right-4 h-0.5 rounded-t-full shadow-md transition-all",
                    tab.activeIndicator
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-3">
            <AlertTriangle size={18} className="text-rose-400 shrink-0" />
            <span><strong>Warning:</strong> {error}. Showing last available data.</span>
          </div>
          {refreshData && (
            <button
              onClick={refreshData}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg font-semibold transition-all border border-rose-500/30"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {/* Platform Breakdown Cards & Portfolio Grid */}
      <AllPlatformDashboard
        projects={projects}
        filteredProjects={filteredProjects}
        stats={stats}
        platform={platform}
        setSelectedProjectIndex={setSelectedProjectIndex}
      />

      {/* Hero KPI Card */}
      <HeroKPI
        value={healthScore}
        totalInstalls={stats.totalInstallCountByUser}
        activeDevices={stats.currentlyActiveDevices}
        activeProject={activeProject}
        authToken={authToken}
        isStaticMode={isStaticMode}
        lastDataDate={lastDataDate}
      />

      {/* Auto-Generated "What Changed" Digest */}
      <WhatChangedDigest
        stats={stats}
        dimensionStats={dimensionStats}
        deviceStats={deviceStats}
        onNavigateChart={handleNavigateChart}
      />

      <HealthBreakdown stats={stats} />

      {/* Correctly-labeled Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          label="Daily Installs"
          value={formatNumber(stats.totalDailyUserInstalls || 0)}
          sublabel="Total Acquisitions in Window"
          trend={computeTrend('dailyUserInstalls')}
          icon={TrendingUp}
          color="emerald"
          tooltipSubheader="Daily User Acquisitions"
          tooltipText="Total count of new first-time app installations completed by unique users during this period."
        />
        <MetricCard
          label="Uninstall Ratio"
          value={`${churnRate}%`}
          sublabel="Uninstalls / Active Devices"
          trend={computeTrend('dailyUserUninstalls')}
          icon={LogOut}
          color="rose"
          progress={parseFloat(churnRate)}
          tooltipSubheader="Uninstall Ratio"
          tooltipText="The percentage of currently active devices that uninstalled during the selected window."
        />
        <MetricCard
          label="Install Survival Rate"
          value={`${installSurvivalIndex}%`}
          sublabel="Active / Lifetime Installs"
          trend={computeTrend('activeDevices')}
          icon={Activity}
          color="blue"
          progress={parseFloat(installSurvivalIndex)}
          tooltipSubheader="Lifetime Retention Proxy"
          tooltipText="Percentage of all-time downloads still active on user devices."
        />
      </div>

      {/* Main Installs & Acquisition Chart */}
      <div id="trend-chart" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-4 sm:p-6 min-h-[400px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                {isAllProjects ? 'Combined Installs per App & Total' : 'Installs vs Uninstalls'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAllProjects ? 'Individual app installs alongside total aggregate installs' : 'User acquisition and churn trend (click points for drilldown)'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              {/* Log Scale Toggle */}
              <button
                onClick={() => setIsLogarithmic(!isLogarithmic)}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  isLogarithmic
                    ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Toggle Logarithmic Scale (Default linear scale)"
              >
                <BarChart2 size={12} />
                <span>Log Scale</span>
              </button>

              {!isAllProjects && (
                <>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
                    <span className="text-[10px] font-bold text-slate-300">Installs</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent-rose" />
                    <span className="text-[10px] font-bold text-slate-300">Uninstalls</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {isAllProjects && renderSummary(
            combinedTotalInstalls,
            combinedAvgInstalls,
            "Combined Total",
            "Avg / Day"
          )}
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
                onSelectPoint={(point) => setSelectedDrilldownPoint(point)}
              />
            )}
          </div>
        </div>

        {/* Dimension Breakdown Card */}
        <div id="dimension-chart" className="glass-card p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold">Dimension Analysis</h3>
            <p className="text-xs text-slate-400">Breakdown by {activeDimension.replace('_', ' ')}</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap bg-white/5 p-1 rounded-xl mb-6 gap-1">
            {['country', 'os_version', 'app_version', 'device'].map((dim) => (
              <button
                key={dim}
                onClick={() => setActiveDimension(dim)}
                className={`sm:flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg transition-all ${
                  activeDimension === dim ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                {dim.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
          <div className="h-[280px]">
            <DimensionChart data={dimensionStats} dimension={activeDimension} />
          </div>
        </div>
      </div>

      {/* Secondary Trends */}
      <div id="active-chart" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card p-4 sm:p-6 h-[340px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold">Daily Net Growth</h4>
          </div>
          {renderSummary(netGrowthTotal, netGrowthAvg)}
          <div className="flex-1 min-h-0">
            <NetGrowthChart data={stats.dailyTrends} />
          </div>
        </div>
        <div className="glass-card p-4 sm:p-6 h-[340px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold">Daily Upgrades</h4>
          </div>
          {renderSummary(upgradesTotal, upgradesAvg)}
          <div className="flex-1 min-h-0">
            <UpgradesChart data={stats.dailyTrends} />
          </div>
        </div>
        <div className="glass-card p-4 sm:p-6 h-[340px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold">Active Devices Trend</h4>
          </div>
          {renderSummary(activeDevicesMax, activeDevicesAvg, "Max", "Avg")}
          <div className="flex-1 min-h-0">
            <ActiveDevicesChart data={stats.dailyTrends} />
          </div>
        </div>
      </div>

      {/* Device Hardware Table */}
      <div className="glass-card overflow-hidden border border-white/10">
        <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold">Device Performance & Hardware Health</h3>
            <p className="text-xs text-slate-400">Hardware efficiency, device distribution, and model counts</p>
          </div>
          {activeDimension !== 'device' && (
            <button
              onClick={() => setActiveDimension('device')}
              className="text-[10px] font-bold text-accent-blue hover:underline shrink-0 ml-2"
            >
              SWITCH TO DEVICE DIMENSION
            </button>
          )}
        </div>
        <DeviceHealthTable
          data={deviceStats || (activeDimension === 'device' ? dimensionStats : [])}
          loading={loading && activeDimension === 'device'}
        />
      </div>

      {/* Segment Side Drilldown Panel */}
      <DrilldownPanel
        selectedPoint={selectedDrilldownPoint}
        dimensionStats={dimensionStats}
        onClose={() => setSelectedDrilldownPoint(null)}
      />
    </div>
  );
}
