import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, LayoutGrid, Check, X } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { clsx } from 'clsx';

import AppIcon from './AppIcon';
import { sortProjectsByPlatformAndName, findProject, getProjectUrlSegment } from '../lib/projectUtils';

export default function AppDropdownSelector({
  projects = [],
  selectedProjectIndex,
  onSelectProject,
  platform = 'all',
  setPlatform
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'apple' | 'google'
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const itemRefs = useRef([]);

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

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setPlatformFilter('all');
      setFocusedIndex(-1);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const activeProject = findProject(projects, selectedProjectIndex, platform);

  const isAllApps = selectedProjectIndex === 'all' || !activeProject;
  const isAppleStoreSelected = isAllApps && platform === 'apple';
  const isPlayStoreSelected = isAllApps && platform === 'google';
  const isAllAppsSelected = isAllApps && (platform === 'all' || !platform);

  const handleSelectAll = () => {
    onSelectProject('all');
    if (setPlatform) setPlatform('all');
    setIsOpen(false);
  };

  const handleSelectAppleStore = () => {
    onSelectProject('all');
    if (setPlatform) setPlatform('apple');
    setIsOpen(false);
  };

  const handleSelectPlayStore = () => {
    onSelectProject('all');
    if (setPlatform) setPlatform('google');
    setIsOpen(false);
  };

  const handleSelectProject = (proj) => {
    onSelectProject(getProjectUrlSegment(proj));
    if (setPlatform && proj.platform) setPlatform(proj.platform);
    setIsOpen(false);
  };

  // Group and sort projects alphabetically
  const sortedProjects = useMemo(() => sortProjectsByPlatformAndName(projects), [projects]);

  const totalAppleCount = useMemo(() => sortedProjects.filter(p => p.platform === 'apple').length, [sortedProjects]);
  const totalGoogleCount = useMemo(() => sortedProjects.filter(p => p.platform !== 'apple').length, [sortedProjects]);

  const filterList = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.packageName && p.packageName.toLowerCase().includes(q))
    );
  };

  const appleProjects = useMemo(() => {
    if (platformFilter === 'google') return [];
    return filterList(sortedProjects.filter(p => p.platform === 'apple'));
  }, [sortedProjects, searchQuery, platformFilter]);

  const googleProjects = useMemo(() => {
    if (platformFilter === 'apple') return [];
    return filterList(sortedProjects.filter(p => p.platform !== 'apple'));
  }, [sortedProjects, searchQuery, platformFilter]);

  const totalFound = appleProjects.length + googleProjects.length;

  // Flatten options for keyboard navigation
  const keyboardOptions = useMemo(() => {
    const opts = [];
    if (!searchQuery.trim() && platformFilter === 'all') {
      opts.push({ type: 'scope', id: 'all', action: handleSelectAll });
      opts.push({ type: 'scope', id: 'apple', action: handleSelectAppleStore });
      opts.push({ type: 'scope', id: 'google', action: handleSelectPlayStore });
    }
    appleProjects.forEach(p => opts.push({ type: 'project', data: p, action: () => handleSelectProject(p) }));
    googleProjects.forEach(p => opts.push({ type: 'project', data: p, action: () => handleSelectProject(p) }));
    return opts;
  }, [searchQuery, platformFilter, appleProjects, googleProjects]);

  // Auto-scroll highlighted keyboard item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < keyboardOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : keyboardOptions.length - 1));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < keyboardOptions.length) {
      e.preventDefault();
      keyboardOptions[focusedIndex]?.action();
    }
  };

  let optionCounter = 0;

  return (
    <div className="relative inline-block text-left z-30" ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-all shadow-md group focus:outline-none focus:ring-2 focus:ring-accent-blue/40 cursor-pointer"
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

        <span className="font-extrabold text-sm text-white tracking-tight truncate max-w-[160px] sm:max-w-[220px] group-hover:text-accent-blue transition-colors">
          {isAllAppsSelected ? 'All Apps' : isAppleStoreSelected ? 'Apple Store' : isPlayStoreSelected ? 'Play Store' : activeProject?.name || 'Selected App'}
        </span>

        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 shrink-0 hidden sm:inline-block">
          {projects.length}
        </span>

        <ChevronDown
          size={16}
          className={clsx(
            "text-white/60 transition-transform duration-200 shrink-0 ml-0.5 group-hover:text-white",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2.5 w-80 sm:w-96 md:w-[400px] rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Top Pointer Arrow */}
          <div className="w-3 h-3 bg-slate-900 border-t border-l border-white/10 rotate-45 -top-1.5 left-6 absolute" />

          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${projects.length} apps by name or package...`}
              className="w-full bg-white/5 border border-white/10 focus:border-accent-blue/50 focus:bg-white/10 rounded-xl text-xs text-white placeholder:text-white/40 pl-9 pr-14 py-2 outline-none transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-white/40 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/30">
                Esc
              </span>
            )}
          </div>

          {/* Filter Pills / Tabs */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={clsx(
                "flex-1 py-1 rounded-lg transition-all text-center cursor-pointer",
                platformFilter === 'all'
                  ? "bg-accent-blue text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              All ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('apple')}
              className={clsx(
                "flex-1 py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer",
                platformFilter === 'apple'
                  ? "bg-sky-500 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <AppleStoreIcon size={11} /> iOS ({totalAppleCount})
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('google')}
              className={clsx(
                "flex-1 py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer",
                platformFilter === 'google'
                  ? "bg-emerald-500 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <PlayStoreIcon size={11} /> Play ({totalGoogleCount})
            </button>
          </div>

          {/* Scope & App List */}
          <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {/* Top Scopes (All / Apple / Play) when no search query and 'all' filter active */}
            {!searchQuery.trim() && platformFilter === 'all' && (
              <>
                {/* 1. All Apps */}
                {(() => {
                  const idx = optionCounter++;
                  const isFocused = focusedIndex === idx;
                  return (
                    <div
                      key="scope-all"
                      ref={el => itemRefs.current[idx] = el}
                      onClick={handleSelectAll}
                      className={clsx(
                        "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group",
                        isAllAppsSelected
                          ? "bg-accent-blue/15 border border-accent-blue/30 text-accent-blue font-bold"
                          : isFocused
                          ? "bg-white/10 text-white border border-white/20"
                          : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
                      )}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="w-7 h-7 rounded-lg bg-accent-blue/20 flex items-center justify-center shrink-0">
                          <LayoutGrid size={15} className="text-accent-blue" />
                        </div>
                        <span className="text-xs font-bold truncate">All Apps</span>
                      </div>
                      {isAllAppsSelected && <Check size={16} className="text-accent-blue shrink-0 ml-2" />}
                    </div>
                  );
                })()}

                {/* 2. Apple Store Scope */}
                {(() => {
                  const idx = optionCounter++;
                  const isFocused = focusedIndex === idx;
                  return (
                    <div
                      key="scope-apple"
                      ref={el => itemRefs.current[idx] = el}
                      onClick={handleSelectAppleStore}
                      className={clsx(
                        "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group",
                        isAppleStoreSelected
                          ? "bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold"
                          : isFocused
                          ? "bg-white/10 text-white border border-white/20"
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
                  );
                })()}

                {/* 3. Play Store Scope */}
                {(() => {
                  const idx = optionCounter++;
                  const isFocused = focusedIndex === idx;
                  return (
                    <div
                      key="scope-google"
                      ref={el => itemRefs.current[idx] = el}
                      onClick={handleSelectPlayStore}
                      className={clsx(
                        "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group",
                        isPlayStoreSelected
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold"
                          : isFocused
                          ? "bg-white/10 text-white border border-white/20"
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
                  );
                })()}

                <div className="h-px bg-white/10 my-1.5" />
              </>
            )}

            {totalFound === 0 ? (
              <div className="p-6 text-center text-xs text-white/40 space-y-2">
                <p>No apps match "{searchQuery}"</p>
                <button
                  onClick={() => { setSearchQuery(''); setPlatformFilter('all'); }}
                  className="text-accent-blue hover:underline font-semibold cursor-pointer"
                >
                  Clear search & filters
                </button>
              </div>
            ) : (
              <>
                {/* First Group: Apple Store Apps */}
                {appleProjects.length > 0 && (
                  <div className="space-y-1">
                    <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 py-1.5 border-b border-white/5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sky-400">
                        <AppleStoreIcon size={12} /> Apple Store
                      </span>
                      <span className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-1.5 py-0.2 rounded font-mono text-[9px]">
                        {appleProjects.length}
                      </span>
                    </div>
                    {appleProjects.map((proj) => {
                      const idx = optionCounter++;
                      const isFocused = focusedIndex === idx;
                      const isSelected = !isAllApps && (activeProject?.packageName === proj.packageName || activeProject?.index === proj.index);
                      return (
                        <div
                          key={`apple-${proj.index || proj.packageName}`}
                          ref={el => itemRefs.current[idx] = el}
                          onClick={() => handleSelectProject(proj)}
                          className={clsx(
                            "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ml-0.5",
                            isSelected
                              ? "bg-sky-500/15 border border-sky-500/30 text-white font-bold"
                              : isFocused
                              ? "bg-white/10 text-white border border-white/20"
                              : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
                          )}
                        >
                          <div className="flex items-center space-x-3 truncate min-w-0">
                            <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-7 h-7 rounded-lg shrink-0" />
                            <div className="truncate min-w-0">
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
                            <AppleStoreIcon size={13} className="text-white/40" />
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
                    <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 py-1.5 border-b border-white/5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <PlayStoreIcon size={12} /> Play Store
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono text-[9px]">
                        {googleProjects.length}
                      </span>
                    </div>
                    {googleProjects.map((proj) => {
                      const idx = optionCounter++;
                      const isFocused = focusedIndex === idx;
                      const isSelected = !isAllApps && (activeProject?.packageName === proj.packageName || activeProject?.index === proj.index);
                      return (
                        <div
                          key={`google-${proj.index || proj.packageName}`}
                          ref={el => itemRefs.current[idx] = el}
                          onClick={() => handleSelectProject(proj)}
                          className={clsx(
                            "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ml-0.5",
                            isSelected
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-white font-bold"
                              : isFocused
                              ? "bg-white/10 text-white border border-white/20"
                              : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
                          )}
                        >
                          <div className="flex items-center space-x-3 truncate min-w-0">
                            <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-7 h-7 rounded-lg shrink-0" />
                            <div className="truncate min-w-0">
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
                            <PlayStoreIcon size={13} className="text-white/40" />
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
