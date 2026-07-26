import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { formatNumber } from '../lib/format';

/**
 * A reusable glass-card panel that renders a chart with a title,
 * summary stats, and a PNG export button.
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
  const containerRef = useRef(null);

  const handleExportPNG = () => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;

    // Create export canvas with dark background
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');

    // Dark background fill
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the chart onto export canvas
    ctx.drawImage(canvas, 0, 0);

    // Trigger download
    const link = document.createElement('a');
    const filename = `${(title || 'chart').toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
    link.download = filename;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div ref={containerRef} className={`glass-card p-4 sm:p-6 h-[340px] flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <button
          onClick={handleExportPNG}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-[10px] font-semibold"
          title="Export Chart as PNG Image"
        >
          <Download size={13} />
          <span className="hidden sm:inline">PNG</span>
        </button>
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
