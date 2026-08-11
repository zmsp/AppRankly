import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import {
  Menu,
  LogOut,
  ChevronDown,
  Search,
  Star,
  HelpCircle
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
  isSidebarOpen,
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
  forceRefreshRange,
  starredApps = [],
  onOpenCommandPalette,
  onOpenShortcuts
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAsoPage = location.pathname.startsWith('/store');

  const [isAppsExpanded, setIsAppsExpanded] = useState(() => {
    const saved = localStorage.getItem('apprankly_apps_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  const [starredOnly, setStarredOnly] = useState(false);

  const toggleAppsExpanded = () => {
    setIsAppsExpanded(prev => {
      const next = !prev;
      localStorage.setItem('apprankly_apps_expanded', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('apprankly_token');
  };

  let filteredProjects = platform === 'all' ? projects : projects.filter(p => p.platform === platform);

  if (starredOnly) {
    filteredProjects = filteredProjects.filter(p => starredApps.includes(p.packageName || p.index));
  }

  return (
    <header className="border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-20 px-2 sm:px-6 md:px-8 py-3">
      {/* Single unified row — wraps naturally */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">

        {/* ── Left: hamburger ── */}
        <button
          onClick={onMenuClick}
          className={clsx(
            "w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all border shrink-0 active:scale-95",
            isSidebarOpen
              ? "border-accent-blue bg-accent-blue/20 text-accent-blue ring-2 ring-accent-blue/30"
              : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/80"
          )}
          aria-label="Toggle navigation menu"
          title={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <Menu size={20} />
        </button>
        {/* ── AppRankly Overview ── */}
        <button
          onClick={() => navigate('/all/all')}
          className={clsx(
            "w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all overflow-hidden border shrink-0",
            (location.pathname === '/' || location.pathname.startsWith('/all/all'))
              ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg bg-accent-blue/20"
              : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10"
          )}
          title="AppRankly Overview"
        >
          <img src={logoImg} alt="AppRankly" className="w-5 h-5 sm:w-6 sm:h-6 rounded-md object-contain" />
        </button>

        {/* ── Command Palette Quick Launcher ── */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-[10px] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-400 hover:text-white text-xs transition-all shrink-0"
          title="Search apps, pages, date ranges (Cmd+K)"
        >
          <Search size={14} className="text-accent-blue" />
          <span>Search or jump to...</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-[10px] text-slate-300 font-mono">⌘K</kbd>
        </button>

        {/* ── Notification ── */}
        <NotificationPopover authToken={authToken} isDemoMode={isDemoMode} />

        {/* ── Toggle Apps List (Down Arrow) ── */}
        <button
          onClick={toggleAppsExpanded}
          className={clsx(
            "w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all overflow-hidden border shrink-0",
            isAppsExpanded
              ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg bg-accent-blue/20 text-accent-blue"
              : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10 text-white/60"
          )}
          title={isAppsExpanded ? "Collapse App List" : "Expand App List"}
        >
          <ChevronDown className={clsx("transition-transform duration-200", isAppsExpanded && "rotate-180")} size={18} />
        </button>

        {/* ── Spacer pushes the right side to the edge ── */}
        <div className="flex-1" />

        {/* ── Middle: date picker + sync ── */}
        {setDateRange && (
          <div className="flex items-center shrink-0">
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

        <SyncDropdown
          refreshData={refreshData}
          forceRefreshRange={forceRefreshRange}
          dateRange={dateRange}
          loading={loading}
        />

        {/* ── Divider ── */}
        {projects.length > 0 && isAppsExpanded && <div className="w-px h-6 bg-white/10 shrink-0" />}

        {/* ── App / Project Selector (Shown when expanded) ── */}
        {projects.length > 0 && isAppsExpanded && (
          <div className="flex items-center gap-1.5 flex-wrap animate-in fade-in slide-in-from-left-1 duration-150">
            {/* Starred Only Toggle */}
            {starredApps.length > 0 && (
              <button
                onClick={() => setStarredOnly(!starredOnly)}
                className={clsx(
                  "w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all border shrink-0",
                  starredOnly
                    ? "border-amber-400/50 bg-amber-400/20 text-amber-400 ring-2 ring-amber-400/30"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                )}
                title={starredOnly ? "Show All Apps" : "Filter Starred Apps"}
              >
                <Star size={15} fill={starredOnly ? "currentColor" : "none"} />
              </button>
            )}

            {/* Apple */}
            <button
              onClick={() => setPlatformAndProject ? setPlatformAndProject('apple', 'all') : (setSelectedProjectIndex('all'), setPlatform?.('apple'))}
              className={clsx(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all overflow-hidden border shrink-0",
                selectedProjectIndex === 'all' && platform === 'apple'
                  ? "border-sky-500 ring-2 ring-sky-500/30 scale-105 shadow-lg bg-sky-500/20"
                  : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10"
              )}
              title="Apple Store"
            >
              <div className={clsx("flex items-center justify-center", selectedProjectIndex === 'all' && platform === 'apple' ? "text-sky-300" : "text-white/60")}>
                <AppleStoreIcon size={16} />
              </div>
            </button>

            {/* Google */}
            <button
              onClick={() => setPlatformAndProject ? setPlatformAndProject('google', 'all') : (setSelectedProjectIndex('all'), setPlatform?.('google'))}
              className={clsx(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all overflow-hidden border shrink-0",
                selectedProjectIndex === 'all' && platform === 'google'
                  ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-105 shadow-lg bg-emerald-500/20"
                  : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10"
              )}
              title="Play Store"
            >
              <div className={clsx("flex items-center justify-center", selectedProjectIndex === 'all' && platform === 'google' ? "text-emerald-400" : "text-white/60")}>
                <PlayStoreIcon size={16} />
              </div>
            </button>

            {/* Individual app icons */}
            {sortProjectsByPlatformAndName(filteredProjects).map(proj => {
              const activeProj = findProject(projects, selectedProjectIndex, platform);
              const isSelected = activeProj?.packageName === proj.packageName || activeProj?.index === proj.index;
              return (
                <button
                  key={proj.index || proj.packageName}
                  onClick={() => setSelectedProjectIndex(getProjectUrlSegment(proj))}
                  className={clsx(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all overflow-hidden border bg-white/5 shrink-0",
                    isSelected
                      ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg"
                      : "border-transparent hover:scale-105 hover:bg-white/10"
                  )}
                  title={`${proj.name} (${proj.platform === 'apple' ? 'Apple Store' : 'Play Store'})`}
                >
                  <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-full h-full rounded-[10px]" />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Right Controls ── */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenShortcuts}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all overflow-hidden border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 shrink-0"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle size={18} />
          </button>

          {authToken && (
            <button
              onClick={handleLogout}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center transition-all overflow-hidden border border-white/10 bg-white/5 text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 shrink-0 active:scale-95"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>

      </div>
    </header>
  );
}

