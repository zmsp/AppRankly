import React from 'react';
import { formatNumber } from '../lib/format';

/**
 * A reusable glass-card panel that renders a chart with a title and
 * an optional period-summary stats row (total + avg).
 *
 * Props:
 *  - title {string}        - Card heading
 *  - total {number}        - Period total (left stat)
 *  - avg {number}          - Period average (right stat)
 *  - label1 {string}       - Label for total (default "Total")
 *  - label2 {string}       - Label for avg (default "Avg")
 *  - children              - The chart element to render
 *  - className {string}    - Optional extra class on wrapper
 */
export default function ChartPanel({
  title,
  total,
  avg,
  label1 = 'Total',
  label2 = 'Avg',
  children,
  className = ''
}) {
  return (
    <div className={`glass-card p-4 sm:p-6 h-[340px] flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold">{title}</h4>
      </div>

      {/* Summary Stats Row */}
      <div className="flex items-center space-x-6 mb-3 bg-white/5 w-fit px-3 py-2 rounded-lg border border-white/10">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label1}</span>
          <span className="text-sm font-semibold text-white leading-none">{formatNumber(total)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label2}</span>
          <span className="text-sm font-semibold text-white leading-none">{formatNumber(avg)}</span>
        </div>
      </div>

      {/* Chart Slot */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
