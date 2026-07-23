import React from 'react';
import { clsx } from 'clsx';
import InfoTooltip from './InfoTooltip';

export default function MetricCard({ label, value, sublabel, trend, icon: Icon, color, progress, tooltipSubheader, tooltipText, contextRange }) {
  const colorMap = {
    blue: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
    emerald: "text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20",
    rose: "text-accent-rose bg-accent-rose/10 border-accent-rose/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };

  const isPositive = trend && (trend.startsWith('+') || trend.startsWith('▲'));
  const isNegative = trend && (trend.startsWith('-') || trend.startsWith('−') || trend.startsWith('▼'));

  return (
    <div className="glass-card p-4 sm:p-6 group relative overflow-hidden transition-all duration-200 hover:border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className={clsx("p-2.5 sm:p-3 rounded-xl border transition-transform group-hover:scale-105 duration-300", colorMap[color] || colorMap.blue)}>
          <Icon size={22} className="sm:w-6 sm:h-6" />
        </div>
        {trend && (
          <div className={clsx(
            "text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1",
            isPositive ? "text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20" :
            isNegative ? "text-accent-rose bg-accent-rose/10 border-accent-rose/20" :
            "text-slate-300 bg-white/5 border-white/10"
          )}>
            <span>{isPositive ? '▲' : isNegative ? '▼' : ''}</span>
            <span>{trend}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">{label}</h3>
          {tooltipText && <InfoTooltip subheader={tooltipSubheader || label} text={tooltipText} />}
        </div>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{value}</p>
        {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
      </div>

      {contextRange && (
        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>90d range</span>
          <span className="font-mono text-slate-300">{contextRange}</span>
        </div>
      )}

      {progress !== undefined && (
        <div className="mt-4">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={clsx("h-full transition-all duration-1000", color === 'rose' ? 'bg-accent-rose' : color === 'emerald' ? 'bg-accent-emerald' : 'bg-accent-blue')}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
