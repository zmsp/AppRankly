import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  Calendar,
  Apple,
  LogOut,
  LayoutGrid,
  Settings,
  Play,
  GitCompare,
  BarChart2,
  Globe
} from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { clsx } from 'clsx';
import GrafanaDatePicker from './GrafanaDatePicker';
import SyncDropdown from './SyncDropdown';
import NotificationPopover from './NotificationPopover';
import AppIcon from './AppIcon';
import { getPresetDateRange } from '../lib/dateUtils';
import { sortProjectsByPlatformAndName, findProject, getProjectUrlSegment } from '../lib/projectUtils';

export default function TopBar({
  onMenuClick,
  platform,
  setPlatform,
  setPlatformAndProject,
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
  refreshData,
  forceRefreshRange
}) {
  const location = useLocation();
  const isAsoPage = location.pathname.startsWith('/store');
  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('apprankly_token');
  };

  const getPageName = () => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/all/all')) return 'Overview';
    if (path.startsWith('/details')) return 'App Details';
    if (path.startsWith('/store')) return 'Store (ASO)';
    if (path.startsWith('/retention')) return 'Retention';
    if (path.startsWith('/releases')) return 'Releases';
    if (path.startsWith('/reports')) return 'Reports';
    if (path.startsWith('/config')) return 'Config';
    if (path.startsWith('/glossary')) return 'Glossary';
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
          <NotificationPopover authToken={authToken} isDemoMode={isDemoMode} />

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

        {/* Sync + Force Sync combined dropdown */}
        <SyncDropdown
          refreshData={refreshData}
          forceRefreshRange={forceRefreshRange}
          dateRange={dateRange}
          loading={loading}
        />

        <div className="w-px h-6 bg-white/10 mx-2 shrink-0" />

        {/* App / Project Selector */}
        {projects.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            {/* 1. All App */}
            <button
              onClick={() => {
                if (setPlatformAndProject) {
                  setPlatformAndProject('all', 'all');
                } else {
                  setSelectedProjectIndex('all');
                  if (setPlatform) setPlatform('all');
                }
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
                if (setPlatformAndProject) {
                  setPlatformAndProject('apple', 'all');
                } else {
                  setSelectedProjectIndex('all');
                  if (setPlatform) setPlatform('apple');
                }
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
                if (setPlatformAndProject) {
                  setPlatformAndProject('google', 'all');
                } else {
                  setSelectedProjectIndex('all');
                  if (setPlatform) setPlatform('google');
                }
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
            {sortProjectsByPlatformAndName(filteredProjects).map(proj => {
              const activeProj = findProject(projects, selectedProjectIndex, platform);
              const isSelected = activeProj?.packageName === proj.packageName || activeProj?.index === proj.index;
              return (
                <button
                  key={proj.index || proj.packageName}
                  onClick={() => setSelectedProjectIndex(getProjectUrlSegment(proj))}
                  className={clsx(
                    "relative w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center transition-all overflow-hidden border bg-white/5",
                    isSelected
                      ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg"
                      : "border-transparent hover:scale-105 hover:bg-white/10"
                  )}
                  title={`${proj.name} (${proj.platform === 'apple' ? 'Apple Store' : 'Play Store'})`}
                >
                  <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-full h-full rounded-[10px] sm:rounded-xl" />
                </button>
              );
            })}

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
