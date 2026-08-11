import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import {
  Menu,
  LogOut,
  ChevronDown
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
  const navigate = useNavigate();
  const isAsoPage = location.pathname.startsWith('/store');

  const [isAppsExpanded, setIsAppsExpanded] = useState(() => {
    const saved = localStorage.getItem('apprankly_apps_expanded');
    return saved !== null ? saved === 'true' : true;
  });

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

  const filteredProjects = platform === 'all' ? projects : projects.filter(p => p.platform === platform);

  return (
    <header className="border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-20 px-2 sm:px-6 md:px-8 py-3">
      {/* Single unified row — wraps naturally, no separate scroll strip */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">

        {/* ── Left: hamburger + breadcrumb ── */}
        <button
          onClick={onMenuClick}
          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors md:hidden text-white/80 shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
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

        {/* ── Right: Logout ── */}
        <div className="flex items-center gap-2 shrink-0">
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
