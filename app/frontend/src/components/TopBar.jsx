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
  BarChart2
} from 'lucide-react';
import { PlayStoreIcon } from './icons/StoreIcons';
import { clsx } from 'clsx';
import GrafanaDatePicker from './GrafanaDatePicker';
import { getPresetDateRange } from '../lib/dateUtils';

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
  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('playstats_token');
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

        {/* Platform Toggle */}
        <div className="bg-white/5 p-1 rounded-xl flex items-center shrink-0">
          <button
            onClick={() => setPlatform('all')}
            className={clsx(
              "flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              platform === 'all' ? "bg-accent-blue text-background" : "text-white/60 hover:text-white"
            )}
          >
            <LayoutGrid size={13} />
            <span className="hidden sm:inline">All Platforms</span>
            <span className="sm:hidden">All</span>
          </button>
          <button
            onClick={() => setPlatform('google')}
            className={clsx(
              "flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              platform === 'google' ? "bg-accent-blue text-background" : "text-white/60 hover:text-white"
            )}
          >
            <Globe size={13} />
            <span className="hidden sm:inline">Google Play</span>
            <span className="sm:hidden">Google</span>
          </button>
          <button
            onClick={() => setPlatform('apple')}
            className={clsx(
              "flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              platform === 'apple' ? "bg-accent-blue text-background" : "text-white/60 hover:text-white"
            )}
          >
            <Apple size={13} />
            <span className="hidden sm:inline">App Store</span>
            <span className="sm:hidden">Apple</span>
          </button>
        </div>

        {/* Grafana Time Range Controls & Presets */}
        {setDateRange && (
          <div className="flex items-center space-x-2 shrink-0">
            <GrafanaDatePicker dateRange={dateRange} setDateRange={setDateRange} />

            <div className="hidden xl:flex items-center bg-white/5 rounded-xl p-1 shrink-0 border border-white/5">
              {['1D', '7D', '1M', '3M', '6M', '1Y', 'ALL'].map((preset) => {
                const isActive = currentRangeParam === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => handleDatePreset(preset)}
                    className={clsx(
                      "px-2 sm:px-2.5 py-1.5 text-[10px] font-bold transition-all rounded-lg",
                      isActive
                        ? "bg-accent-blue/20 text-accent-blue shadow-sm border border-accent-blue/30"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparison Mode */}
        {setComparisonMode && (
          <div className="hidden lg:flex items-center bg-white/5 rounded-xl p-1 shrink-0 border border-white/5">
            <div className="px-2 flex items-center text-white/40">
              <GitCompare size={14} />
            </div>
            {[
              { id: 'prev_period', label: 'Prev Period' },
              { id: 'prev_year', label: 'Last Year' },
              { id: 'none', label: 'None' },
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setComparisonMode(mode.id)}
                className={clsx(
                  "px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors",
                  comparisonMode === mode.id
                    ? "bg-accent-blue/20 text-accent-blue"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}

        {/* Granularity */}
        {setGranularity && (
          <div className="hidden lg:flex items-center bg-white/5 rounded-xl p-1 shrink-0 border border-white/5">
            <div className="px-2 flex items-center text-white/40">
              <BarChart2 size={14} />
            </div>
            {[
              { id: 'day', label: 'Daily' },
              { id: 'week', label: 'Weekly' },
              { id: 'month', label: 'Monthly' },
            ].map(g => (
              <button
                key={g.id}
                onClick={() => setGranularity(g.id)}
                className={clsx(
                  "px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors",
                  granularity === g.id
                    ? "bg-accent-blue/20 text-accent-blue"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Sync Button */}
        {refreshData && (
          <button
            onClick={refreshData}
            disabled={loading}
            className={clsx(
              "flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-[10px] sm:rounded-xl text-[10px] font-bold transition-all border shrink-0 bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10",
              loading && "opacity-50 cursor-not-allowed"
            )}
            title="Sync Data"
          >
            <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
            <span className="hidden sm:inline ml-1.5 uppercase tracking-wider">Sync</span>
          </button>
        )}

        <div className="w-px h-6 bg-white/10 mx-2 shrink-0" />

        {/* App / Project Selector */}
        {!isDemoMode && projects.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            {filteredProjects.length > 1 && (
              <button
                onClick={() => setSelectedProjectIndex('all')}
                className={clsx(
                  "relative w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center transition-all overflow-hidden border",
                  selectedProjectIndex === 'all'
                    ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg bg-accent-blue/20"
                    : "border-transparent bg-white/5 hover:scale-105 hover:bg-white/10"
                )}
                title="All Apps"
              >
                <div className={clsx("w-full h-full flex items-center justify-center", selectedProjectIndex === 'all' ? "text-accent-blue" : "text-white/60")}>
                  <LayoutGrid size={18} />
                </div>
              </button>
            )}
            
            {filteredProjects.map(proj => (
              <button
                key={proj.index}
                onClick={() => setSelectedProjectIndex(proj.index.toString())}
                className={clsx(
                  "relative w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center transition-all overflow-hidden border bg-white/5",
                  selectedProjectIndex === proj.index.toString() || selectedProjectIndex === proj.index
                    ? "border-accent-blue ring-2 ring-accent-blue/30 scale-105 shadow-lg"
                    : "border-transparent hover:scale-105 hover:bg-white/10"
                )}
                title={proj.name}
              >
                {proj.iconUrl ? (
                  <img src={proj.iconUrl} alt={proj.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={clsx("w-full h-full flex items-center justify-center", selectedProjectIndex === proj.index.toString() || selectedProjectIndex === proj.index ? "bg-accent-blue/20 text-accent-blue" : "bg-white/10 text-white/60")}>
                    {platform === 'google' ? <PlayStoreIcon size={18} /> : <Apple size={18} />}
                  </div>
                )}
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
