import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { clsx } from 'clsx';

export default function InfoTooltip({ subheader, text }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block ml-1.5 group">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="text-white/20 hover:text-accent-blue transition-colors focus:outline-none"
      >
        <Info size={14} />
      </button>

      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 glass-card bg-[#16213e] border-white/20 shadow-2xl animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">{subheader}</p>
          <p className="text-xs leading-relaxed text-white/80">{text}</p>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/10" />
        </div>
      )}
    </div>
  );
}
