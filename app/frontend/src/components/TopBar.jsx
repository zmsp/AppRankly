import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  Bell,
  Calendar,
  Apple,
  LogOut,
  LayoutGrid,
  Settings,
  Play,
  GitCompare,
  RefreshCw,
  BarChart2,
  Globe
} from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { clsx } from 'clsx';
import GrafanaDatePicker from './GrafanaDatePicker';
import AppIcon from './AppIcon';
import { getPresetDateRange } from '../lib/dateUtils';
import { sortProjectsByPlatformAndName } from '../lib/projectUtils';

export default function TopBar({
  onMenuClick,
  platform,
  setPlatform,
  dateRange,
  setDateRange,
  projects = [],
  selectedProjectIndex,
  setSelectedProjectIndex,
  isDemoMode,
  setIsDemoMode,
  loading,
  authToken,
  setAuthToken,
  comparisonMode,
  setComparisonMode,
  granularity,
  setGranularity,
  refreshData
}) {
  const location = useLocation();
  const isAsoPage = location.pathname.startsWith('/store');
  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('apprankly_token');
  };

  const getPageName = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    return path.substring(1).charAt(0).toUpperCase() + path.slice(2);
  };

  const handleDatePreset = (range) => {
    if (!setDateRange) return;
    const newRange = getPresetDateRange(range);
    setDateRange(newRange, newRange.preset || range);
  };

  const filteredProjects = platform === 'all' ? projects : projects.filter(p => p.platform === platform);

  const currentRangeParam = new URLSearchParams(location.search).get('range')?.toUpperCase() || (dateRange?.preset?.toUpperCase() || '7D');

  return (
    <header className="flex flex-col gap-3 md:gap-4 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-20 px-2 sm:px-6 md:px-8 py-3 sm:py-4">
      {/* Top Row: Breadcrumbs & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={onMenuClick}
            className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-colors md:hidden text-white/80"
            aria-label="Toggle navigation menu"
          >
            <Menu size={22} />
          </button>
          <div className="hidden xs:flex items-center text-xs sm:text-sm font-medium text-white/40">
            <span>Pages</span>
            <span className="mx-1.5 sm:mx-2">/</span>
            <span className="text-white font-semibold">{getPageName()}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent-rose rounded-full border-2 border-background" />
          </button>

          {authToken && (
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-blue to-accent-emerald flex items-center justify-center font-bold text-background text-sm cursor-pointer shadow-lg shadow-accent-blue/20">
            A
          </div>
        </div>
      </div>

      {/* Bottom Row: Controls & Filters */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar pb-1">
        
        {/* Demo Mode Toggle */}
        {setIsDemoMode && (
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={clsx(
              "flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-[10px] sm:rounded-xl text-[10px] font-bold transition-all border shrink-0",
              isDemoMode ? "bg-accent-blue/20 border-accent-blue/30 text-accent-blue" : "bg-white/5 border-white/10 text-white/60 hover:text-white"
            )}
            title="Toggle Demo Mode"
          >
            <Play size={14} className={clsx(isDemoMode && "fill-current")} />
            <span className="hidden sm:inline ml-1.5 uppercase tracking-wider">Demo</span>
          </button>
        )}


        {/* Consolidated Grafana Time Range Controls & Popover */}
        {setDateRange && (
          <div className="flex items-center space-x-2 shrink-0">
            <GrafanaDatePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
              comparisonMode={comparisonMode}
              setComparisonMode={setComparisonMode}
              granularity={granularity}
              setGranularity={setGranularity}
            />
          </div>
        )}

        {/* Sync Action Button */}
        {refreshData && (
          <button
            onClick={refreshData}
            disabled={loading}
            className={clsx(
              "flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3.5 sm:py-1.5 rounded-[10px] sm:rounded-xl text-[11px] font-extrabold transition-all shrink-0 bg-accent-blue hover:bg-accent-blue/90 text-slate-950 shadow-md shadow-accent-blue/20 border border-accent-blue/30 active:scale-95",
              loading && "opacity-50 cursor-not-allowed"
            )}
            title="Sync Analytics Data"
          >
            <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
            <span className="hidden sm:inline ml-1.5 uppercase tracking-wider">Sync</span>
          </button>
        )}

        <div className="w-px h-6 bg-white/10 mx-2 shrink-0" />

        {/* App / Project Selector */}
        {!isDemoMode && projects.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            {/* 1. All App */}
            <button
              onClick={() => {
                setSelectedProjectIndex('all');
                if (setPlatform) setPlatform('all');
              }}
              className={clsx(
                "relative w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center transition-all overflow-hidden border",
                selectedProjectIndex === 'all' && (platform === 'all' || !platform)
                  ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg bg-accent-blue/20"
                  : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10"
              )}
              title="All App"
            >
              <div className={clsx("w-full h-full flex items-center justify-center", selectedProjectIndex === 'all' && (platform === 'all' || !platform) ? "text-accent-blue" : "text-white/60")}>
                <LayoutGrid size={18} />
              </div>
            </button>

            {/* 2. Apple Store */}
            <button
              onClick={() => {
                setSelectedProjectIndex('all');
                if (setPlatform) setPlatform('apple');
              }}
              className={clsx(
                "relative w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center transition-all overflow-hidden border",
                selectedProjectIndex === 'all' && platform === 'apple'
                  ? "border-sky-500 ring-2 ring-sky-500/30 scale-105 shadow-lg bg-sky-500/20"
                  : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10"
              )}
              title="Apple Store"
            >
              <div className={clsx("w-full h-full flex items-center justify-center", selectedProjectIndex === 'all' && platform === 'apple' ? "text-sky-300" : "text-white/60")}>
                <AppleStoreIcon size={18} />
              </div>
            </button>

            {/* 3. Play Store */}
            <button
              onClick={() => {
                setSelectedProjectIndex('all');
                if (setPlatform) setPlatform('google');
              }}
              className={clsx(
                "relative w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center transition-all overflow-hidden border",
                selectedProjectIndex === 'all' && platform === 'google'
                  ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-105 shadow-lg bg-emerald-500/20"
                  : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10"
              )}
              title="Play Store"
            >
              <div className={clsx("w-full h-full flex items-center justify-center", selectedProjectIndex === 'all' && platform === 'google' ? "text-emerald-400" : "text-white/60")}>
                <PlayStoreIcon size={18} />
              </div>
            </button>
            
            {/* The rest of the apps: sorted alphabetically, Apple first, Google second */}
            {sortProjectsByPlatformAndName(filteredProjects).map(proj => (
              <button
                key={proj.index}
                onClick={() => setSelectedProjectIndex(proj.index.toString())}
                className={clsx(
                  "relative w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center transition-all overflow-hidden border bg-white/5",
                  selectedProjectIndex === proj.index.toString() || selectedProjectIndex === proj.index
                    ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg"
                    : "border-transparent hover:scale-105 hover:bg-white/10"
                )}
                title={`${proj.name} (${proj.platform === 'apple' ? 'Apple Store' : 'Play Store'})`}
              >
                <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-full h-full rounded-[10px] sm:rounded-xl" />
              </button>
            ))}

            <button
              onClick={() => setSelectedProjectIndex('manual')}
              className={clsx(
                "relative w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center transition-all overflow-hidden border",
                selectedProjectIndex === 'manual'
                  ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg bg-accent-blue/20"
                  : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10"
              )}
              title="Manual Configuration"
            >
              <div className={clsx("w-full h-full flex items-center justify-center", selectedProjectIndex === 'manual' ? "text-accent-blue" : "text-white/60")}>
                <Settings size={18} />
              </div>
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
