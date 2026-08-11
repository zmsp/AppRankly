import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, X, Check, Star, LayoutDashboard, ShoppingBag, BarChart3, Tag, FileText, Settings, BookOpen, RefreshCw, Calendar, Sparkles } from 'lucide-react';
import AppIcon from './AppIcon';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import clsx from 'clsx';
import { findProject, getProjectUrlSegment } from '../lib/projectUtils';
import toast from 'react-hot-toast';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  projects = [],
  selectedProjectIndex,
  onSelectProject,
  setPlatform,
  setPlatformAndProject,
  platform,
  starredApps = [],
  toggleStarApp,
  dateRange,
  setDateRange,
  refreshData,
  switchToDemoMode,
  openShortcutsHelp
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);

  const activeProject = findProject(projects, selectedProjectIndex, platform);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build searchable items list
  const pagesList = [
    { type: 'page', id: 'page-dash', label: 'Dashboard Overview', path: '/', icon: LayoutDashboard, category: 'Pages' },
    { type: 'page', id: 'page-store', label: 'Store ASO & Product Page', path: '/store', icon: ShoppingBag, category: 'Pages' },
    { type: 'page', id: 'page-retention', label: 'Analytics & Retention', path: '/retention', icon: BarChart3, category: 'Pages' },
    { type: 'page', id: 'page-releases', label: 'Releases & Version Tracking', path: '/releases', icon: Tag, category: 'Pages' },
    { type: 'page', id: 'page-reports', label: 'Reports & Export', path: '/reports', icon: FileText, category: 'Pages' },
    { type: 'page', id: 'page-config', label: 'Configuration & Settings', path: '/config', icon: Settings, category: 'Pages' },
    { type: 'page', id: 'page-glossary', label: 'Metrics Glossary', path: '/glossary', icon: BookOpen, category: 'Pages' },
  ];

  const datePresets = [
    { type: 'date', id: 'date-7d', label: 'Last 7 Days', preset: '7d', category: 'Date Ranges' },
    { type: 'date', id: 'date-14d', label: 'Last 14 Days', preset: '14d', category: 'Date Ranges' },
    { type: 'date', id: 'date-30d', label: 'Last 30 Days', preset: '30d', category: 'Date Ranges' },
    { type: 'date', id: 'date-90d', label: 'Last 90 Days', preset: '90d', category: 'Date Ranges' },
    { type: 'date', id: 'date-365d', label: 'Last 365 Days', preset: '365d', category: 'Date Ranges' },
  ];

  const actionsList = [
    { type: 'action', id: 'act-refresh', label: 'Refresh Data & Clear Cache', action: () => refreshData?.(), icon: RefreshCw, category: 'Actions' },
    { type: 'action', id: 'act-shortcuts', label: 'View Keyboard Shortcuts', action: () => openShortcutsHelp?.(), icon: Command, category: 'Actions' },
    { type: 'action', id: 'act-demo', label: 'Switch to Demo Mode', action: () => switchToDemoMode?.(), icon: Sparkles, category: 'Actions' },
  ];

  const appItems = [
    { type: 'app', id: 'app-all', name: 'All Apps (Combined Portfolio)', project: 'all', platform: 'all', category: 'Apps' },
    ...projects.map(p => ({
      type: 'app',
      id: `app-${p.packageName || p.index}`,
      name: p.name,
      packageName: p.packageName,
      platform: p.platform,
      iconUrl: p.iconUrl,
      project: p,
      category: 'Apps'
    }))
  ];

  const qLower = query.toLowerCase().trim();

  // Filter items
  const filteredPages = pagesList.filter(p => p.label.toLowerCase().includes(qLower));
  const filteredApps = appItems.filter(a => a.name.toLowerCase().includes(qLower) || (a.packageName && a.packageName.toLowerCase().includes(qLower)));
  const filteredDates = datePresets.filter(d => d.label.toLowerCase().includes(qLower) || d.preset.includes(qLower));
  const filteredActions = actionsList.filter(a => a.label.toLowerCase().includes(qLower));

  const allFiltered = [...filteredPages, ...filteredApps, ...filteredDates, ...filteredActions];

  const handleExecute = (item) => {
    if (!item) return;

    if (item.type === 'page') {
      navigate(item.path);
    } else if (item.type === 'app') {
      if (item.project === 'all') {
        if (setPlatformAndProject) {
          setPlatformAndProject('all', 'all');
        } else {
          onSelectProject('all');
          if (setPlatform) setPlatform('all');
        }
      } else {
        const seg = getProjectUrlSegment(item.project);
        if (setPlatformAndProject) {
          setPlatformAndProject(item.platform || platform, seg);
        } else {
          onSelectProject(seg);
          if (setPlatform && item.platform) setPlatform(item.platform);
        }
      }
    } else if (item.type === 'date') {
      if (setDateRange) {
        setDateRange({ preset: item.preset }, item.preset);
        toast.success(`Date range set to ${item.label}`);
      }
    } else if (item.type === 'action') {
      item.action?.();
    }

    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => (prev + 1) % Math.max(1, allFiltered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => (prev - 1 + allFiltered.length) % Math.max(1, allFiltered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allFiltered[highlightIdx]) {
        handleExecute(allFiltered[highlightIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let globalCounter = 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-white/10 flex items-center space-x-3 bg-slate-900/90">
          <Search size={18} className="text-accent-blue shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search apps, pages, actions..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-[10px] text-slate-400 font-mono">
            ESC
          </kbd>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Command Palette List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {allFiltered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching commands or apps found for "{query}"
            </div>
          ) : (
            <>
              {/* Pages */}
              {filteredPages.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Pages & Views
                  </div>
                  {filteredPages.map((item) => {
                    const idx = globalCounter++;
                    const isHighlighted = idx === highlightIdx;
                    const IconComp = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleExecute(item)}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={clsx(
                          "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors",
                          isHighlighted ? "bg-accent-blue/20 text-white" : "hover:bg-white/5 text-slate-300"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <IconComp size={16} className={isHighlighted ? "text-accent-blue" : "text-slate-400"} />
                          <span className="font-medium text-white">{item.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{item.path}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Apps */}
              {filteredApps.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Apps ({filteredApps.length})
                  </div>
                  {filteredApps.map((item) => {
                    const idx = globalCounter++;
                    const isHighlighted = idx === highlightIdx;
                    const isSelected = item.project === 'all'
                      ? selectedProjectIndex === 'all'
                      : (activeProject?.packageName === item.packageName || activeProject?.index === item.project.index);
                    const appKey = item.packageName || item.id;
                    const isStarred = starredApps.includes(appKey);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleExecute(item)}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={clsx(
                          "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors group",
                          isHighlighted ? "bg-accent-blue/20 text-white" : "hover:bg-white/5 text-slate-300"
                        )}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {item.project === 'all' ? (
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                              ALL
                            </div>
                          ) : (
                            <AppIcon iconUrl={item.iconUrl} name={item.name} platform={item.platform} className="w-7 h-7 rounded-lg shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-medium text-white truncate">{item.name}</span>
                              {item.platform === 'apple' && <AppleStoreIcon size={12} className="text-white/40 shrink-0" />}
                              {item.platform === 'google' && <PlayStoreIcon size={12} className="text-white/40 shrink-0" />}
                            </div>
                            {item.packageName && <p className="text-[10px] text-slate-400 truncate">{item.packageName}</p>}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {toggleStarApp && item.project !== 'all' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStarApp(appKey);
                              }}
                              className={clsx(
                                "p-1 rounded-lg hover:bg-white/10 transition-colors",
                                isStarred ? "text-amber-400" : "text-slate-500 opacity-40 group-hover:opacity-100"
                              )}
                              title={isStarred ? "Unstar app" : "Star app"}
                            >
                              <Star size={14} fill={isStarred ? "currentColor" : "none"} />
                            </button>
                          )}
                          {isSelected && <Check size={15} className="text-accent-blue shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Date Ranges */}
              {filteredDates.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Date Range
                  </div>
                  {filteredDates.map((item) => {
                    const idx = globalCounter++;
                    const isHighlighted = idx === highlightIdx;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleExecute(item)}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={clsx(
                          "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors",
                          isHighlighted ? "bg-accent-blue/20 text-white" : "hover:bg-white/5 text-slate-300"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Calendar size={16} className={isHighlighted ? "text-accent-blue" : "text-slate-400"} />
                          <span className="font-medium text-white">{item.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              {filteredActions.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Actions & Tools
                  </div>
                  {filteredActions.map((item) => {
                    const idx = globalCounter++;
                    const isHighlighted = idx === highlightIdx;
                    const IconComp = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleExecute(item)}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={clsx(
                          "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors",
                          isHighlighted ? "bg-accent-blue/20 text-white" : "hover:bg-white/5 text-slate-300"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <IconComp size={16} className={isHighlighted ? "text-accent-blue" : "text-slate-400"} />
                          <span className="font-medium text-white">{item.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 bg-slate-950/60 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span><kbd className="px-1 bg-slate-800 rounded">↑</kbd> <kbd className="px-1 bg-slate-800 rounded">↓</kbd> navigate</span>
            <span><kbd className="px-1 bg-slate-800 rounded">↵</kbd> select</span>
          </span>
          <span className="flex items-center gap-1"><Command size={11} /> + K palette</span>
        </div>
      </div>
    </div>
  );
}
