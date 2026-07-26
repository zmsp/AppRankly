import React, { useState, useEffect } from 'react';
import { Search, Command, X, Check } from 'lucide-react';
import AppIcon from './AppIcon';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import clsx from 'clsx';

export default function AppSwitcherModal({ projects = [], selectedProjectIndex, onSelectProject, setPlatform }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const filtered = projects.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()) || p.packageName?.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (projIndex, projPlatform) => {
    if (projIndex === 'all') {
      onSelectProject('all');
      if (setPlatform) setPlatform('all');
    } else {
      onSelectProject(projIndex);
      if (setPlatform && projPlatform) setPlatform(projPlatform);
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
        {/* Search Header */}
        <div className="p-4 border-b border-white/10 flex items-center space-x-3">
          <Search size={18} className="text-accent-blue shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps by name or package (Cmd+K)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Apps List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5 custom-scrollbar">
          {/* All Apps Option */}
          <div
            onClick={() => handleSelect('all', 'all')}
            className={clsx(
              "flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs transition-colors",
              selectedProjectIndex === 'all' ? "bg-accent-blue/15 text-white" : "hover:bg-white/5 text-slate-300"
            )}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                ALL
              </div>
              <div>
                <p className="font-bold text-white">All Apps (Combined View)</p>
                <p className="text-[10px] text-slate-400">Aggregated portfolio analytics</p>
              </div>
            </div>
            {selectedProjectIndex === 'all' && <Check size={16} className="text-accent-blue" />}
          </div>

          {filtered.map((proj) => {
            const isSelected = selectedProjectIndex?.toString() === proj.index?.toString();
            return (
              <div
                key={proj.index}
                onClick={() => handleSelect(proj.index, proj.platform)}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs transition-colors",
                  isSelected ? "bg-accent-blue/15 text-white" : "hover:bg-white/5 text-slate-300"
                )}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <p className="font-bold text-white truncate">{proj.name}</p>
                      {proj.platform === 'apple' ? (
                        <AppleStoreIcon size={12} className="text-white/40 shrink-0" />
                      ) : (
                        <PlayStoreIcon size={12} className="text-white/40 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{proj.packageName}</p>
                  </div>
                </div>
                {isSelected && <Check size={16} className="text-accent-blue shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 bg-slate-950/60 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1"><Command size={12} /> + K to toggle app switcher anytime</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
