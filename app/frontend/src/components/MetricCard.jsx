import React from 'react';
import { clsx } from 'clsx';
import InfoTooltip from './InfoTooltip';
import { Copy, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MetricCard({ label, value, sublabel, trend, icon: Icon, color, progress, tooltipSubheader, tooltipText, contextRange }) {
  const colorMap = {
    blue: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
    emerald: "text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20",
    rose: "text-accent-rose bg-accent-rose/10 border-accent-rose/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };

  const isPositive = trend && (trend.startsWith('+') || trend.startsWith('▲'));
  const isNegative = trend && (trend.startsWith('-') || trend.startsWith('−') || trend.startsWith('▼'));

  const handleCopy = (e) => {
    e.stopPropagation();
    const summaryStr = `${label}: ${value}${trend ? ` (${trend})` : ''}${sublabel ? ` - ${sublabel}` : ''}`;
    navigator.clipboard.writeText(summaryStr);
    toast.success(`Copied: "${summaryStr}"`);
  };

  const handleExportCsv = (e) => {
    e.stopPropagation();
    const csvContent = "data:text/csv;charset=utf-8," + ["Metric,Value,Trend,Sublabel", `"${label}","${value}","${trend || ''}","${sublabel || ''}"`].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${label.toLowerCase().replace(/\s+/g, '_')}_metric.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${label} CSV`);
  };

  return (
    <div className="glass-card p-4 sm:p-6 group relative overflow-hidden transition-all duration-200 hover:border-white/20">
      {/* Top action row */}
      <div className="flex items-center justify-between mb-4">
        <div className={clsx("p-2.5 sm:p-3 rounded-xl border transition-transform group-hover:scale-105 duration-300", colorMap[color] || colorMap.blue)}>
          <Icon size={22} className="sm:w-6 sm:h-6" />
        </div>
        <div className="flex items-center space-x-1.5">
          {/* Quick action buttons visible on card hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-slate-900/80 p-1 rounded-lg border border-white/10">
            <button
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Copy Summary to Clipboard"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={handleExportCsv}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Export CSV"
            >
              <Download size={13} />
            </button>
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

