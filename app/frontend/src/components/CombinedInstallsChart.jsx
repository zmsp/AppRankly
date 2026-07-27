import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const COLOR_PALETTE = [
  '#00ff88',
  '#ff9f43',
  '#a55eea',
  '#ff5252',
  '#48dbfb',
  '#fabca1',
  '#1dd1a1'
];

const normalizeDateStr = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return String(dateVal).trim().substring(0, 10);
};

export default function CombinedInstallsChart({
  dailyTrends = [],
  appTrends = {},
  isLogarithmic = true,
  showZoomControls = true
}) {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(() => (dailyTrends && dailyTrends.length > 0 ? dailyTrends.length - 1 : 0));

  // Sync zoom range when dataset length changes
  useEffect(() => {
    if (dailyTrends && dailyTrends.length > 0) {
      setStartIndex(0);
      setEndIndex(dailyTrends.length - 1);
    }
  }, [dailyTrends?.length]);

  const totalPoints = dailyTrends ? dailyTrends.length : 0;
  const isZoomed = startIndex > 0 || (totalPoints > 0 && endIndex < totalPoints - 1);
  const visibleCount = Math.max(0, endIndex - startIndex + 1);

  // Zoom & Pan Handlers
  const handleZoomIn = useCallback(() => {
    if (visibleCount <= 4) return;
    const currentRange = endIndex - startIndex + 1;
    const newRangeSize = Math.max(4, Math.floor(currentRange * 0.7));
    const delta = currentRange - newRangeSize;
    const trimLeft = Math.floor(delta / 2);
    const trimRight = delta - trimLeft;

    const newStart = Math.min(endIndex - 3, startIndex + trimLeft);
    const newEnd = Math.max(newStart + 3, endIndex - trimRight);

    setStartIndex(newStart);
    setEndIndex(newEnd);
  }, [startIndex, endIndex, visibleCount]);

  const handleZoomOut = useCallback(() => {
    if (!dailyTrends || dailyTrends.length === 0) return;
    const currentRange = endIndex - startIndex + 1;
    if (currentRange >= dailyTrends.length) {
      setStartIndex(0);
      setEndIndex(dailyTrends.length - 1);
      return;
    }
    const newRangeSize = Math.min(dailyTrends.length, Math.ceil(currentRange * 1.4));
    const delta = newRangeSize - currentRange;
    const expandLeft = Math.floor(delta / 2);
    const expandRight = delta - expandLeft;

    let newStart = Math.max(0, startIndex - expandLeft);
    let newEnd = Math.min(dailyTrends.length - 1, endIndex + expandRight);

    if (newStart === 0) {
      newEnd = Math.min(dailyTrends.length - 1, newStart + newRangeSize - 1);
    }
    if (newEnd === dailyTrends.length - 1) {
      newStart = Math.max(0, newEnd - newRangeSize + 1);
    }

    setStartIndex(newStart);
    setEndIndex(newEnd);
  }, [dailyTrends, startIndex, endIndex]);

  const handleResetZoom = useCallback(() => {
    if (dailyTrends && dailyTrends.length > 0) {
      setStartIndex(0);
      setEndIndex(dailyTrends.length - 1);
    }
  }, [dailyTrends]);

  const handlePanLeft = useCallback(() => {
    if (startIndex <= 0) return;
    const currentRange = endIndex - startIndex + 1;
    const shift = Math.max(1, Math.floor(currentRange * 0.25));
    const actualShift = Math.min(shift, startIndex);
    setStartIndex(startIndex - actualShift);
    setEndIndex(endIndex - actualShift);
  }, [startIndex, endIndex]);

  const handlePanRight = useCallback(() => {
    if (!dailyTrends || endIndex >= dailyTrends.length - 1) return;
    const currentRange = endIndex - startIndex + 1;
    const shift = Math.max(1, Math.floor(currentRange * 0.25));
    const actualShift = Math.min(shift, dailyTrends.length - 1 - endIndex);
    setStartIndex(startIndex + actualShift);
    setEndIndex(endIndex + actualShift);
  }, [dailyTrends, startIndex, endIndex]);

  const handlePresetDays = useCallback((days) => {
    if (!dailyTrends || dailyTrends.length === 0) return;
    if (days >= dailyTrends.length) {
      setStartIndex(0);
      setEndIndex(dailyTrends.length - 1);
    } else {
      setEndIndex(dailyTrends.length - 1);
      setStartIndex(Math.max(0, dailyTrends.length - days));
    }
  }, [dailyTrends]);

  if (!dailyTrends || dailyTrends.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 italic p-6 text-center">
        No installation trend data available for selected platform scope or date range.
      </div>
    );
  }

  // Slice dailyTrends according to active zoom range
  const slicedTrends = dailyTrends.slice(startIndex, endIndex + 1);

  const labels = slicedTrends.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const appNames = Object.keys(appTrends);

  const datasets = [
    {
      label: 'Total Installs (All Apps)',
      data: slicedTrends.map(item => {
        const val = item.dailyUserInstalls || item.dailyInstalls || 0;
        return isLogarithmic ? Math.max(val, 1) : val;
      }),
      borderColor: '#00d2ff',
      backgroundColor: 'rgba(0, 210, 255, 0.15)',
      borderWidth: 3.5,
      pointRadius: 0,
      pointHoverRadius: 6,
      fill: false,
      tension: 0.3
    },
    ...appNames.map((appName, index) => {
      const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
      const trendEntry = appTrends[appName] || [];
      const trends = trendEntry?.trends || (Array.isArray(trendEntry) ? trendEntry : []);
      const trendMap = new Map(trends.map(t => [t.date, t.dailyUserInstalls || t.dailyInstalls || 0]));

      return {
        label: trendEntry?.displayName || appName,
        data: slicedTrends.map(item => {
          const val = trendMap.get(item.date) || 0;
          return isLogarithmic ? Math.max(val, 1) : val;
        }),
        borderColor: color,
        borderWidth: 2,
        borderDash: [3, 3],
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: false,
        tension: 0.3
      };
    })
  ];

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { family: 'Inter', size: 11, weight: 'bold' },
          boxWidth: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(11, 19, 38, 0.9)',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat().format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 10 } }
      },
      y: {
        type: isLogarithmic ? 'logarithmic' : 'linear',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: 'rgba(255, 255, 255, 0.3)',
          font: { size: 10 },
          callback: (value) => new Intl.NumberFormat().format(value)
        }
      }
    }
  };

  const startDateLabel = dailyTrends[startIndex]?.date ? normalizeDateStr(dailyTrends[startIndex].date) : '';
  const endDateLabel = dailyTrends[endIndex]?.date ? normalizeDateStr(dailyTrends[endIndex].date) : '';

  const canPanLeft = startIndex > 0;
  const canPanRight = endIndex < dailyTrends.length - 1;
  const canZoomIn = visibleCount > 4;

  return (
    <div className="flex flex-col h-full w-full">
      {showZoomControls && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-slate-900/60 p-2 px-3 rounded-xl border border-white/10 text-xs shrink-0">
          {/* Quick Presets & Zoom Info */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-lg border border-white/10 font-medium text-[11px]">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 px-1">Zoom:</span>
              <button
                type="button"
                onClick={() => handlePresetDays(7)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${visibleCount === 7 && endIndex === dailyTrends.length - 1 ? 'bg-accent-blue text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => handlePresetDays(14)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${visibleCount === 14 && endIndex === dailyTrends.length - 1 ? 'bg-accent-blue text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                14D
              </button>
              <button
                type="button"
                onClick={() => handlePresetDays(30)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${visibleCount === 30 && endIndex === dailyTrends.length - 1 ? 'bg-accent-blue text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${!isZoomed ? 'bg-accent-blue text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                All ({dailyTrends.length}D)
              </button>
            </div>

            {isZoomed && (
              <span className="hidden sm:inline-flex items-center text-[10px] text-accent-blue font-bold px-2 py-1 bg-accent-blue/10 rounded-lg border border-accent-blue/20">
                Viewing {visibleCount} of {dailyTrends.length} days ({startDateLabel} → {endDateLabel})
              </span>
            )}
          </div>

          {/* Interactive Zoom Buttons */}
          <div className="flex items-center space-x-1.5">
            {/* Pan Left / Right */}
            <div className="flex items-center space-x-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={handlePanLeft}
                disabled={!canPanLeft}
                className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Pan Left (Earlier dates)"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handlePanRight}
                disabled={!canPanRight}
                className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Pan Right (Later dates)"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="h-4 w-px bg-white/10" />

            {/* Zoom In / Zoom Out / Reset */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!canZoomIn}
              className="flex items-center space-x-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 font-bold transition-all disabled:opacity-30 disabled:hover:bg-white/5 cursor-pointer"
              title="Zoom In to inspect closer date range"
            >
              <ZoomIn size={13} className="text-accent-blue" />
              <span>Zoom In</span>
            </button>

            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!isZoomed}
              className="flex items-center space-x-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 font-bold transition-all disabled:opacity-30 disabled:hover:bg-white/5 cursor-pointer"
              title="Zoom Out to widen date range"
            >
              <ZoomOut size={13} className="text-slate-400" />
              <span>Zoom Out</span>
            </button>

            {isZoomed && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="flex items-center space-x-1 px-2 py-1 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded-lg border border-accent-blue/30 font-bold transition-all cursor-pointer"
                title="Reset Zoom to 100% full dataset"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 w-full min-h-0 relative">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

