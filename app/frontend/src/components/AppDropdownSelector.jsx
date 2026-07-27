import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, LayoutGrid, Check, X } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { clsx } from 'clsx';

import AppIcon from './AppIcon';
import { sortProjectsByPlatformAndName, findProject, getProjectUrlSegment } from '../lib/projectUtils';

import { useLocation } from 'react-router-dom';

export default function AppDropdownSelector({
  projects = [],
  selectedProjectIndex,
  onSelectProject,
  platform = 'all',
  setPlatform
}) {
  const location = useLocation();
  const isAsoPage = location.pathname.startsWith('/store');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeProject = findProject(projects, selectedProjectIndex, platform);

  const isAllApps = selectedProjectIndex === 'all' || !activeProject;
  const isAppleStoreSelected = isAllApps && platform === 'apple';
  const isPlayStoreSelected = isAllApps && platform === 'google';
  const isAllAppsSelected = isAllApps && (platform === 'all' || !platform);

  const handleSelectAll = () => {
    onSelectProject('all');
    if (setPlatform) setPlatform('all');
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectAppleStore = () => {
    onSelectProject('all');
    if (setPlatform) setPlatform('apple');
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectPlayStore = () => {
    onSelectProject('all');
    if (setPlatform) setPlatform('google');
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectProject = (proj) => {
    onSelectProject(getProjectUrlSegment(proj));
    if (setPlatform && proj.platform) setPlatform(proj.platform);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Group and sort projects alphabetically within each platform group
  const sortedProjects = sortProjectsByPlatformAndName(projects);

  const filterList = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.packageName && p.packageName.toLowerCase().includes(q))
    );
  };

  const appleProjects = filterList(sortedProjects.filter(p => p.platform === 'apple'));
  const googleProjects = filterList(sortedProjects.filter(p => p.platform !== 'apple'));
  const totalFound = appleProjects.length + googleProjects.length;

  return (
    <div className="relative inline-block text-left z-30" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-all shadow-md group focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
        aria-expanded={isOpen}
      >
        {isAllAppsSelected ? (
          <div className="w-6 h-6 rounded-lg bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center text-accent-blue shrink-0">
            <LayoutGrid size={14} />
          </div>
        ) : isAppleStoreSelected ? (
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
            <AppleStoreIcon size={14} />
          </div>
        ) : isPlayStoreSelected ? (
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <PlayStoreIcon size={14} />
          </div>
        ) : (
          <AppIcon iconUrl={activeProject?.iconUrl} name={activeProject?.name} platform={activeProject?.platform || platform} className="w-6 h-6 rounded-lg" />
        )}

        <span className="font-extrabold text-sm text-white tracking-tight truncate max-w-[180px] sm:max-w-[240px] group-hover:text-accent-blue transition-colors">
          {isAllAppsSelected ? 'All App' : isAppleStoreSelected ? 'Apple Store' : isPlayStoreSelected ? 'Play Store' : activeProject?.name || 'Selected App'}
        </span>

        <ChevronDown
          size={16}
          className={clsx(
            "text-white/60 transition-transform duration-200 shrink-0 ml-1 group-hover:text-white",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2.5 w-72 sm:w-80 md:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Top Pointer Arrow */}
          <div className="w-3 h-3 bg-slate-900 border-t border-l border-white/10 rotate-45 -top-1.5 left-6 absolute" />

          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-white/5 border border-white/10 focus:border-accent-blue/50 focus:bg-white/10 rounded-xl text-xs text-white placeholder:text-white/40 pl-9 pr-8 py-2 outline-none transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-white/40 hover:text-white rounded-full transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Scope & App List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {/* 1. All App */}
            <div
              onClick={handleSelectAll}
              className={clsx(
                "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group",
                isAllAppsSelected
                  ? "bg-accent-blue/15 border border-accent-blue/30 text-accent-blue font-bold"
                  : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
              )}
            >
              <div className="flex items-center space-x-3 truncate">
                <div className="w-7 h-7 rounded-lg bg-accent-blue/20 flex items-center justify-center shrink-0">
                  <LayoutGrid size={15} className="text-accent-blue" />
                </div>
                <span className="text-xs font-bold truncate">All App</span>
              </div>
              {isAllAppsSelected && <Check size={16} className="text-accent-blue shrink-0 ml-2" />}
            </div>

            {/* 2. Apple Store */}
            <div
              onClick={handleSelectAppleStore}
              className={clsx(
                "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group",
                isAppleStoreSelected
                  ? "bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold"
                  : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
              )}
            >
              <div className="flex items-center space-x-3 truncate">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
                  <AppleStoreIcon size={15} className="text-sky-300" />
                </div>
                <span className="text-xs font-bold truncate">Apple Store</span>
              </div>
              {isAppleStoreSelected && <Check size={16} className="text-sky-300 shrink-0 ml-2" />}
            </div>

            {/* 3. Play Store */}
            <div
              onClick={handleSelectPlayStore}
              className={clsx(
                "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group",
                isPlayStoreSelected
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold"
                  : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
              )}
            >
              <div className="flex items-center space-x-3 truncate">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <PlayStoreIcon size={15} className="text-emerald-400" />
                </div>
                <span className="text-xs font-bold truncate">Play Store</span>
              </div>
              {isPlayStoreSelected && <Check size={16} className="text-emerald-400 shrink-0 ml-2" />}
            </div>

            <div className="h-px bg-white/10 my-2" />

            {totalFound === 0 ? (
              <div className="p-4 text-center text-xs text-white/40">
                No apps found matching "{searchQuery}"
              </div>
            ) : (
              <>
                {/* First Group: Apple Store Apps */}
                {appleProjects.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 pt-1.5 pb-0.5">
                      Apple Store ({appleProjects.length})
                    </div>
                    {appleProjects.map((proj) => {
                      const isSelected = !isAllApps && (activeProject?.packageName === proj.packageName || activeProject?.index === proj.index);
                      return (
                        <div
                          key={proj.index}
                          onClick={() => handleSelectProject(proj)}
                          className={clsx(
                            "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ml-1",
                            isSelected
                              ? "bg-sky-500/15 border border-sky-500/30 text-white font-bold"
                              : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
                          )}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-7 h-7 rounded-lg" />
                            <div className="truncate">
                              <p className={clsx("text-xs font-semibold truncate group-hover:text-white", isSelected && "text-sky-300 font-bold")}>
                                {proj.name}
                              </p>
                              {proj.packageName && (
                                <p className="text-[10px] text-white/40 truncate font-mono">
                                  {proj.packageName}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            <AppleStoreIcon size={14} className="text-white/50" />
                            {isSelected && <Check size={16} className="text-sky-300" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Second Group: Play Store Apps */}
                {googleProjects.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 pt-1.5 pb-0.5">
                      Play Store ({googleProjects.length})
                    </div>
                    {googleProjects.map((proj) => {
                      const isSelected = !isAllApps && (activeProject?.packageName === proj.packageName || activeProject?.index === proj.index);
                      return (
                        <div
                          key={proj.index}
                          onClick={() => handleSelectProject(proj)}
                          className={clsx(
                            "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ml-1",
                            isSelected
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-white font-bold"
                              : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
                          )}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-7 h-7 rounded-lg" />
                            <div className="truncate">
                              <p className={clsx("text-xs font-semibold truncate group-hover:text-white", isSelected && "text-emerald-400 font-bold")}>
                                {proj.name}
                              </p>
                              {proj.packageName && (
                                <p className="text-[10px] text-white/40 truncate font-mono">
                                  {proj.packageName}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            <PlayStoreIcon size={14} className="text-white/50" />
                            {isSelected && <Check size={16} className="text-emerald-400" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
