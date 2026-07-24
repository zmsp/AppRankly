import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, LayoutGrid, Smartphone, Check, X } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { clsx } from 'clsx';

import AppIcon from './AppIcon';

export default function AppDropdownSelector({
  projects = [],
  selectedProjectIndex,
  onSelectProject,
  platform
}) {
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

  const activeProject = projects.find(
    p => p.index.toString() === selectedProjectIndex?.toString()
  );

  const isAllApps = selectedProjectIndex === 'all' || !activeProject;

  const filteredProjects = projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.packageName && p.packageName.toLowerCase().includes(q))
    );
  });

  const handleSelect = (projIndex) => {
    onSelectProject(projIndex);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative inline-block text-left z-30" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-all shadow-md group focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
        aria-expanded={isOpen}
      >
        {isAllApps ? (
          <div className="w-6 h-6 rounded-lg bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center text-accent-blue shrink-0">
            <LayoutGrid size={14} />
          </div>
        ) : (
          <AppIcon iconUrl={activeProject?.iconUrl} name={activeProject?.name} platform={activeProject?.platform || platform} className="w-6 h-6 rounded-lg" />
        )}

        <span className="font-extrabold text-sm text-white tracking-tight truncate max-w-[180px] sm:max-w-[240px] group-hover:text-accent-blue transition-colors">
          {isAllApps ? 'All Apps Portfolio' : activeProject?.name || 'Selected App'}
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

          {/* App List */}
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {/* All Apps option */}
            <div
              onClick={() => handleSelect('all')}
              className={clsx(
                "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group",
                isAllApps
                  ? "bg-accent-blue/15 border border-accent-blue/30 text-accent-blue font-bold"
                  : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
              )}
            >
              <div className="flex items-center space-x-3 truncate">
                <div className="w-7 h-7 rounded-lg bg-accent-blue/20 flex items-center justify-center shrink-0">
                  <LayoutGrid size={15} className="text-accent-blue" />
                </div>
                <span className="text-xs font-bold truncate">All Apps Portfolio</span>
              </div>
              {isAllApps && <Check size={16} className="text-accent-blue shrink-0 ml-2" />}
            </div>

            <div className="h-px bg-white/5 my-1" />

            {/* Individual App items */}
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-xs text-white/40">
                No apps found matching "{searchQuery}"
              </div>
            ) : (
              filteredProjects.map((proj) => {
                const isSelected = !isAllApps && (activeProject?.index === proj.index || selectedProjectIndex?.toString() === proj.index?.toString());
                return (
                  <div
                    key={proj.index}
                    onClick={() => handleSelect(proj.index)}
                    className={clsx(
                      "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group",
                      isSelected
                        ? "bg-accent-blue/15 border border-accent-blue/30 text-white font-bold"
                        : "hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
                    )}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-7 h-7 rounded-lg" />
                      <div className="truncate">
                        <p className={clsx("text-xs font-semibold truncate group-hover:text-white", isSelected && "text-accent-blue font-bold")}>
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
                      {proj.platform === 'apple' ? (
                        <AppleStoreIcon size={14} className="text-white/50" />
                      ) : (
                        <PlayStoreIcon size={14} className="text-white/50" />
                      )}
                      {isSelected && <Check size={16} className="text-accent-blue" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
