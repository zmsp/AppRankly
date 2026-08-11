import React from 'react';
import { X, Keyboard, Command, Sparkles } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ K / Ctrl+K', desc: 'Open Command Palette & App Switcher' },
    { key: '?', desc: 'Show Keyboard Shortcuts (this menu)' },
    { key: 'R', desc: 'Force Refresh & Sync App Data' },
    { key: '[ / ]', desc: 'Switch to Previous / Next App' },
    { key: 'G then D', desc: 'Navigate to Dashboard Overview' },
    { key: 'G then S', desc: 'Navigate to Store ASO' },
    { key: 'G then A', desc: 'Navigate to Analytics & Retention' },
    { key: 'G then R', desc: 'Navigate to Releases' },
    { key: 'G then C', desc: 'Navigate to Config' },
    { key: 'Esc', desc: 'Close open overlays & modals' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2 text-white">
            <Keyboard size={20} className="text-accent-blue" />
            <h3 className="font-semibold text-base">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcut List */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2 custom-scrollbar">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
            >
              <span className="text-xs text-slate-300 font-medium">{item.desc}</span>
              <kbd className="px-2 py-1 bg-slate-800 border border-white/15 rounded-md text-[11px] font-mono text-slate-200 shadow-inner shrink-0 ml-2">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" /> Pro Tip: Keyboard navigation works anywhere
          </span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-[10px]">Esc</kbd>
        </div>
      </div>
    </div>
  );
}
