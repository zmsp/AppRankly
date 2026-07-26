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
import OnboardingChecklist from '../components/OnboardingChecklist';
import ChartPanel from '../components/ChartPanel';
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
        <p className="font-semibold text-slate-300">Quick Troubleshooting:</p>
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
    if (!isFinite(diff) || isNaN(diff)) return '0%';
    return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  };

  const rawSurvival = (stats.totalInstallCountByUser > 0 && stats.currentlyActiveDevices >= 0)
    ? ((stats.currentlyActiveDevices / stats.totalInstallCountByUser) * 100)
    : null;
  const installSurvivalIndex = (rawSurvival !== null && !isNaN(rawSurvival) && isFinite(rawSurvival))
    ? rawSurvival.toFixed(1)
    : '—';

  const rawChurn = (stats.currentlyActiveDevices > 0 && stats.totalDailyUserUninstalls >= 0)
    ? ((stats.totalDailyUserUninstalls / stats.currentlyActiveDevices) * 100)
    : null;
  const churnRate = (rawChurn !== null && !isNaN(rawChurn) && isFinite(rawChurn))
    ? rawChurn.toFixed(1)
    : '—';

  const healthScore = calculateHealthScore(stats);

  const isAllProjects = selectedProjectIndex === 'all' || platform === 'all';
  const filteredProjects = platform === 'all' ? projects : projects.filter(p => p.platform === platform);
  const activeProject = projects.find(p => p.index === selectedProjectIndex);
  const lastDataDate = stats.lastDate || (stats.dailyTrends?.length > 0 ? stats.dailyTrends[stats.dailyTrends.length - 1].date : null);

  const hasUninstallData = stats.hasUninstallData !== false &&
    !['apple', 'appstore', 'ios'].includes(platform?.toLowerCase()) &&
    !['apple', 'appstore', 'ios'].includes(stats.platform?.toLowerCase()) &&
    !['apple', 'appstore', 'ios'].includes(activeProject?.platform?.toLowerCase());

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

  const renderSummary = (total, avg, label1 = "Total", label2 = "Average") => (
    <div className="flex items-center space-x-6 mb-3 bg-white/5 w-fit px-3 py-2 rounded-lg border border-white/10">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-400 mb-0.5">{label1}</span>
        <span className="text-sm font-semibold text-white leading-none">{formatNumber(total)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-400 mb-0.5">{label2}</span>
        <span className="text-sm font-semibold text-white leading-none">{formatNumber(avg)}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 relative">
      {/* Standard Tab Switcher UI and Portfolio Grid (rendered ONLY on Portfolio / All Apps view) */}
      {(selectedProjectIndex === 'all' || !selectedProjectIndex) && (
        <>
          {/* Compact Segmented Control Pill Switcher & Main Page Refresh Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-md">
            <div className="flex items-center space-x-2 px-1">
              <LayoutGrid size={16} className="text-accent-blue" />
              <span className="text-sm font-bold text-white">Platform Scope</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="inline-flex items-center p-1 rounded-lg bg-slate-950/80 border border-white/10 text-xs gap-1 flex-1 sm:flex-none">
                {[
                  { id: 'all', title: 'All App', count: projects.length || 0, icon: LayoutGrid, activeColor: 'text-accent-blue border-accent-blue/40 bg-accent-blue/15' },
                  { id: 'apple', title: 'Apple Store', count: projects.filter(p => p.platform === 'apple').length || 0, icon: AppleStoreIcon, activeColor: 'text-sky-300 border-sky-500/40 bg-sky-500/15' },
                  { id: 'google', title: 'Play Store', count: projects.filter(p => p.platform === 'google').length || 0, icon: PlayStoreIcon, activeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15' },
                ].map((tab) => {
                  const isSelected = platform === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPlatform && setPlatform(tab.id)}
                      className={clsx(
                        "flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border select-none",
                        isSelected
                          ? `${tab.activeColor} shadow-sm font-bold`
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      )}
                    >
                      <Icon size={13} className={isSelected ? "currentColor" : "text-slate-400"} />
                      <span>{tab.title}</span>
                      <span className={clsx("text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ml-1", isSelected ? "bg-white/15" : "bg-white/5 text-slate-400")}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {refreshData && (
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-slate-950 rounded-lg text-xs font-extrabold transition-all shadow-md shadow-accent-blue/20 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  title="Refresh all stats on the main page"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh Stats</span>
                </button>
              )}
            </div>
          </div>

          {/* Platform Breakdown Cards & Portfolio Grid */}
          <AllPlatformDashboard
            projects={projects}
            filteredProjects={filteredProjects}
            stats={stats}
            platform={platform}
            setSelectedProjectIndex={setSelectedProjectIndex}
            setPlatform={setPlatform}
          />
        </>
      )}

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

      {/* Scope Indicator Banner */}
      {isAllProjects ? (
        <div className="p-3.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <LayoutGrid size={16} className="text-accent-blue" />
            <span className="font-bold text-white">Aggregated Portfolio View</span>
            <span className="text-slate-400">— Showing combined metrics across {filteredProjects.length} active apps ({platform === 'all' ? 'All Platforms' : platform})</span>
          </div>
          <span className="text-[10px] font-mono bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded-full font-bold">All Projects</span>
        </div>
      ) : activeProject && (
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            {activeProject.platform === 'google' ? <PlayStoreIcon size={16} /> : <AppleStoreIcon size={16} />}
            <span className="font-bold text-white">{activeProject.name}</span>
            <span className="text-slate-400">— Single App Analytics Dashboard</span>
          </div>
          <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-bold capitalize">{activeProject.platform}</span>
        </div>
      )}

      {/* Onboarding & Setup Progress Checklist */}
      <OnboardingChecklist projects={projects} releases={releases} />

      {/* Hero KPI Card */}
      <HeroKPI
        value={healthScore}
        totalInstalls={stats.totalInstallCountByUser}
        activeDevices={stats.currentlyActiveDevices}
        activeProject={activeProject}
        authToken={authToken}
        isStaticMode={isStaticMode}
        lastDataDate={lastDataDate}
        hasUninstallData={hasUninstallData}
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
          sublabel="Total User Acquisitions"
          trend={computeTrend('dailyUserInstalls')}
          icon={TrendingUp}
          color="emerald"
          tooltipSubheader="Daily User Acquisitions"
          tooltipText="Total count of new first-time app installations completed by unique users during this period."
        />
        <MetricCard
          label="Uninstall Ratio"
          value={hasUninstallData ? (churnRate === '—' ? '—' : `${churnRate}%`) : '—'}
          sublabel={hasUninstallData ? "Uninstalls / Active Devices" : "Not tracked by Apple App Store"}
          trend={hasUninstallData ? computeTrend('dailyUserUninstalls') : null}
          icon={LogOut}
          color="rose"
          progress={hasUninstallData && churnRate !== '—' ? parseFloat(churnRate) : 0}
          tooltipSubheader="Uninstall Ratio"
          tooltipText={hasUninstallData ? "The percentage of currently active devices that uninstalled during the selected window." : "Apple App Store Connect does not report uninstall metrics."}
        />
        <MetricCard
          label="Install Survival Rate"
          value={installSurvivalIndex === '—' ? '—' : `${installSurvivalIndex}%`}
          sublabel="Active / Lifetime Installs"
          trend={computeTrend('activeDevices')}
          icon={Activity}
          color="blue"
          progress={installSurvivalIndex !== '—' ? parseFloat(installSurvivalIndex) : 0}
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
                {isAllProjects ? 'Combined Installs per App & Total' : (hasUninstallData ? 'Installs vs Uninstalls' : 'Daily Installs & Acquisitions')}
              </h3>
              <p className="text-xs text-slate-400">
                {isAllProjects ? 'Individual app installs alongside total aggregate installs' : (hasUninstallData ? 'User acquisition and churn trend (click points for drilldown)' : 'User acquisition trend over time (click points for drilldown)')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              {/* Log Scale Toggle */}
              <button
                onClick={() => setIsLogarithmic(!isLogarithmic)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center space-x-1.5",
                  isLogarithmic 
                    ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue" 
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                )}
                title="Toggle logarithmic vertical scale for wide-range data"
              >
                <Percent size={12} />
                <span>Log Scale</span>
              </button>
              
              <div className="flex items-center space-x-3 text-xs bg-white/5 border border-white/5 rounded-xl px-3 py-1.5">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
                  <span className="text-[10px] font-bold text-slate-300">Installs</span>
                </div>
                {hasUninstallData && (
                  <>
                    <span className="text-slate-600">|</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-rose" />
                      <span className="text-[10px] font-bold text-slate-300">Uninstalls</span>
                    </div>
                  </>
                )}
              </div>
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
                hasUninstallData={hasUninstallData}
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
        <ChartPanel title="Daily Net Growth" total={netGrowthTotal} avg={netGrowthAvg}>
          <NetGrowthChart data={stats.dailyTrends} />
        </ChartPanel>
        <ChartPanel title="Daily Upgrades" total={upgradesTotal} avg={upgradesAvg}>
          <UpgradesChart data={stats.dailyTrends} />
        </ChartPanel>
        <ChartPanel title="Active Devices Trend" total={activeDevicesMax} avg={activeDevicesAvg} label1="Max" label2="Avg">
          <ActiveDevicesChart data={stats.dailyTrends} />
        </ChartPanel>
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
