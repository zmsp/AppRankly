import React, { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, X, ArrowRight } from 'lucide-react';

export default function DemoPopup({ isDemoMode }) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setIsOpen(true);
    }
  }, [isDemoMode]);

  if (!isDemoMode || !isOpen) return null;

  const docUrl = "https://github.com/zmsp/AppRankly/blob/main/README.md";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md p-6 sm:p-8 shadow-2xl border-accent-blue/30 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          aria-label="Close demo popup"
        >
          <X size={18} />
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 bg-accent-blue/10 border border-accent-blue/20 rounded-2xl flex items-center justify-center text-accent-blue mb-5 shadow-lg shadow-accent-blue/10">
          <Sparkles size={28} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-3">
          Demo Mode
        </h2>

        {/* Message */}
        <p className="text-white/80 text-sm leading-relaxed mb-6">
          This demo mode uses artificial sample data for display purposes to explore features — there is no real data. To view live analytics, AppRankly must be self-hosted and configured. Visit{' '}
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:text-accent-blue/80 underline font-semibold inline-flex items-center gap-1 transition-colors break-all"
          >
            https://github.com/zmsp/AppRankly/blob/main/README.md
            <ExternalLink size={13} className="inline shrink-0" />
          </a>{' '}
          for details.
        </p>

        {/* Action Buttons: Enter, then Visit Doc */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-3 px-4 bg-accent-blue hover:bg-accent-blue/90 text-background font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent-blue/20 text-sm"
          >
            <span>Enter</span>
            <ArrowRight size={16} />
          </button>
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
          >
            <span>Visit Doc</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
