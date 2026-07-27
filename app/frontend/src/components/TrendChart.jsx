import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { CHART_COLORS, baseOptions } from '../lib/chartTheme';
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const normalizeDateStr = (dateVal) => {
  if (!dateVal) return '';
  
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    // Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return String(dateVal).trim().substring(0, 10);
};

const findExactDataIndex = (data, releaseDateStr) => {
  const targetNorm = normalizeDateStr(releaseDateStr);
  if (!targetNorm || !Array.isArray(data) || data.length === 0) return -1;

  // Strictly match exact dates in trend data. Drop unmatched or bad dates.
  return data.findIndex(d => normalizeDateStr(d.date) === targetNorm);
};

export default function TrendChart({
  data = [],
  releases = [],
  platform = 'google',
  packageName,
  hasUninstallData,
  isLogarithmic = false,
  onSelectPoint,
  showZoomControls = true
}) {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(() => (data && data.length > 0 ? data.length - 1 : 0));

  // Sync zoom range when data length changes
  useEffect(() => {
    if (data && data.length > 0) {
      setStartIndex(0);
      setEndIndex(data.length - 1);
    }
  }, [data?.length]);

  const totalPoints = data ? data.length : 0;
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
    if (!data || data.length === 0) return;
    const currentRange = endIndex - startIndex + 1;
    if (currentRange >= data.length) {
      setStartIndex(0);
      setEndIndex(data.length - 1);
      return;
    }
    const newRangeSize = Math.min(data.length, Math.ceil(currentRange * 1.4));
    const delta = newRangeSize - currentRange;
    const expandLeft = Math.floor(delta / 2);
    const expandRight = delta - expandLeft;

    let newStart = Math.max(0, startIndex - expandLeft);
    let newEnd = Math.min(data.length - 1, endIndex + expandRight);

    if (newStart === 0) {
      newEnd = Math.min(data.length - 1, newStart + newRangeSize - 1);
    }
    if (newEnd === data.length - 1) {
      newStart = Math.max(0, newEnd - newRangeSize + 1);
    }

    setStartIndex(newStart);
    setEndIndex(newEnd);
  }, [data, startIndex, endIndex]);

  const handleResetZoom = useCallback(() => {
    if (data && data.length > 0) {
      setStartIndex(0);
      setEndIndex(data.length - 1);
    }
  }, [data]);

  const handlePanLeft = useCallback(() => {
    if (startIndex <= 0) return;
    const currentRange = endIndex - startIndex + 1;
    const shift = Math.max(1, Math.floor(currentRange * 0.25));
    const actualShift = Math.min(shift, startIndex);
    setStartIndex(startIndex - actualShift);
    setEndIndex(endIndex - actualShift);
  }, [startIndex, endIndex]);

  const handlePanRight = useCallback(() => {
    if (!data || endIndex >= data.length - 1) return;
    const currentRange = endIndex - startIndex + 1;
    const shift = Math.max(1, Math.floor(currentRange * 0.25));
    const actualShift = Math.min(shift, data.length - 1 - endIndex);
    setStartIndex(startIndex + actualShift);
    setEndIndex(endIndex + actualShift);
  }, [data, startIndex, endIndex]);

  const handlePresetDays = useCallback((days) => {
    if (!data || data.length === 0) return;
    if (days >= data.length) {
      setStartIndex(0);
      setEndIndex(data.length - 1);
    } else {
      setEndIndex(data.length - 1);
      setStartIndex(Math.max(0, data.length - days));
    }
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 italic p-6 text-center">
        No daily trend data available for selected platform scope.
      </div>
    );
  }

  // Slice data based on zoom range
  const slicedData = data.slice(startIndex, endIndex + 1);

  const labels = slicedData.map(item => {
    const norm = normalizeDateStr(item.date);
    const date = norm ? new Date(norm + 'T00:00:00Z') : new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const filteredReleases = useMemo(() => {
    return (releases || []).filter(r => {
      if (!r) return false;
      if (packageName && packageName !== 'all') {
        const rPkg = r.packageName || r.bundleId || r.appId;
        if (!rPkg || rPkg === 'all') return false;
        const rPkgNorm = String(rPkg).trim().toLowerCase().replace(/[-_]/g, '');
        const targetPkgNorm = String(packageName).trim().toLowerCase().replace(/[-_]/g, '');
        if (rPkgNorm !== targetPkgNorm) return false;
      }
      if (!platform || platform === 'all' || platform === 'auto') return true;
      if (!r.platform || r.platform === 'all' || r.platform === 'both') return true;
      return r.platform === platform;
    });
  }, [releases, platform, packageName]);

  const releasesRef = useRef(filteredReleases);
  releasesRef.current = filteredReleases;
  const slicedDataRef = useRef(slicedData);
  slicedDataRef.current = slicedData;

  const showUninstalls = hasUninstallData !== undefined
    ? hasUninstallData
    : (platform !== 'apple' && platform !== 'appstore');

  // Show forecast only when viewing full data or right end of dataset
  const totalInstallsInWindow = slicedData.reduce((sum, item) => sum + (item.dailyUserInstalls || item.dailyInstalls || 0), 0);
  const isAtRightEdge = endIndex === data.length - 1;
  const showForecast = isAtRightEdge && slicedData.length >= 7 && totalInstallsInWindow >= 20;

  let extendedLabels = [...labels];
  let forecastPoints = Array(slicedData.length).fill(null);

  if (showForecast) {
    const series = slicedData.map(item => item.dailyUserInstalls || item.dailyInstalls || 0);
    const n = series.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += series[i];
      sumXY += i * series[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lastNorm = normalizeDateStr(slicedData[slicedData.length - 1].date);
    const lastDateObj = lastNorm ? new Date(lastNorm + 'T00:00:00Z') : new Date(slicedData[slicedData.length - 1].date);
    forecastPoints[slicedData.length - 1] = series[n - 1]; // connect seamlessly

    for (let i = 1; i <= 14; i++) {
      const nextDate = new Date(lastDateObj);
      nextDate.setUTCDate(nextDate.getUTCDate() + i);
      extendedLabels.push(nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
      const val = Math.max(0, slope * (n + i - 1) + intercept);
      forecastPoints.push(Math.round(val));
    }
  }

  const datasets = [
    {
      label: 'Daily Installs',
      data: showForecast ? [...slicedData.map(item => {
        const val = item.dailyUserInstalls || item.dailyInstalls || 0;
        return isLogarithmic ? Math.max(val, 1) : val;
      }), ...Array(14).fill(null)] : slicedData.map(item => {
        const val = item.dailyUserInstalls || item.dailyInstalls || 0;
        return isLogarithmic ? Math.max(val, 1) : val;
      }),
      borderColor: CHART_COLORS.accent.blue,
      backgroundColor: (context) => {
        const chart = context.chart;
        const {ctx, chartArea} = chart;
        if (!chartArea) return null;
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(0, 210, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 210, 255, 0)');
        return gradient;
      },
      borderWidth: 3,
      pointRadius: 2,
      pointHoverRadius: 6,
      fill: true,
      tension: 0.4
    }
  ];

  if (showUninstalls) {
    const uninstData = slicedData.map(item => {
      const val = item.dailyUserUninstalls || item.dailyUninstalls || 0;
      return isLogarithmic ? Math.max(val, 1) : val;
    });
    datasets.push({
      label: 'Daily Uninstalls',
      data: showForecast ? [...uninstData, ...Array(14).fill(null)] : uninstData,
      borderColor: CHART_COLORS.accent.rose,
      borderDash: [5, 5],
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 6,
      fill: false,
      tension: 0.4
    });
  }

  if (showForecast) {
    datasets.push({
      label: '14-Day Forecast',
      data: forecastPoints,
      borderColor: '#a855f7',
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: false,
      tension: 0.2
    });
  }

  const chartData = {
    labels: extendedLabels,
    datasets
  };

  const options = {
    ...baseOptions,
    layout: {
      padding: {
        top: 32,
        bottom: 4,
        left: 8,
        right: 8
      }
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0 && onSelectPoint) {
        const index = elements[0].index;
        if (slicedData[index]) {
          onSelectPoint(slicedData[index]);
        }
      }
    },
    plugins: {
      ...baseOptions.plugins,
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat().format(context.parsed.y);
            }
            return label;
          },
          afterBody: function(context) {
            if (!context || !context.length) return '';
            const currentSliced = slicedDataRef.current || [];
            const currentRels = releasesRef.current || [];
            const index = context[0].dataIndex;
            if (index >= currentSliced.length) return '';

            const dayReleases = currentRels.filter(r => {
              const rIndex = findExactDataIndex(currentSliced, r.releaseDate || r.date);
              return rIndex === index;
            });

            if (dayReleases.length > 0) {
              return dayReleases.map(r => {
                const version = r.version || r.releaseName || 'Release';
                const versionLabel = version.startsWith('v') ? version : `v${version}`;
                const pkg = r.packageName ? ` (${r.packageName})` : '';
                const notes = r.notes ? ` - ${r.notes}` : '';
                return `\n🚀 Release: ${versionLabel}${pkg}${notes}`;
              }).join('');
            }
            return '';
          }
        }
      }
    },
    scales: {
      ...baseOptions.scales,
      y: {
        ...baseOptions.scales.y,
        type: isLogarithmic ? 'logarithmic' : 'linear',
        ticks: {
          ...baseOptions.scales.y.ticks,
          callback: (value) => new Intl.NumberFormat().format(value)
        }
      }
    }
  };

  const plugins = useMemo(() => [{
    id: 'releaseLines',
    afterDraw: (chart) => {
      const { ctx, scales: { x, y } } = chart;
      if (!x || !y) return;

      const currentSliced = slicedDataRef.current || [];
      const currentRels = releasesRef.current || [];

      const releasesByIndex = new Map();
      currentRels.forEach(release => {
        const index = findExactDataIndex(currentSliced, release.releaseDate || release.date);
        if (index === -1) return;

        if (!releasesByIndex.has(index)) {
          releasesByIndex.set(index, []);
        }
        releasesByIndex.get(index).push(release);
      });

      releasesByIndex.forEach((rels, index) => {
        const xPos = x.getPixelForValue(index);
        if (isNaN(xPos) || xPos < x.left || xPos > x.right) return;

        ctx.save();

        // Dashed Vertical Line
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(xPos, y.top);
        ctx.lineTo(xPos, y.bottom);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();

        // Circle marker at top
        ctx.beginPath();
        ctx.arc(xPos, y.top, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        // Release label badge text
        const versions = rels.map(r => {
          const v = r.version || r.releaseName || 'Release';
          return v.startsWith('v') ? v : `v${v}`;
        });
        const badgeText = `🚀 ${versions.join(', ')}`;

        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        const metrics = ctx.measureText(badgeText);
        const paddingX = 6;
        const rectWidth = metrics.width + paddingX * 2;
        const rectHeight = 18;
        const badgeY = Math.max(0, y.top - rectHeight - 4);

        let badgeX = xPos - rectWidth / 2;
        if (badgeX < x.left) badgeX = x.left;
        if (badgeX + rectWidth > x.right) badgeX = x.right - rectWidth;

        // Pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1;

        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, rectWidth, rectHeight, 4);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(badgeX, badgeY, rectWidth, rectHeight);
          ctx.strokeRect(badgeX, badgeY, rectWidth, rectHeight);
        }

        // Text label
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + rectWidth / 2, badgeY + rectHeight / 2);

        ctx.restore();
      });
    }
  }], []);

  const startDateLabel = data[startIndex]?.date ? normalizeDateStr(data[startIndex].date) : '';
  const endDateLabel = data[endIndex]?.date ? normalizeDateStr(data[endIndex].date) : '';

  const canPanLeft = startIndex > 0;
  const canPanRight = endIndex < data.length - 1;
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
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${visibleCount === 7 && endIndex === data.length - 1 ? 'bg-accent-blue text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => handlePresetDays(14)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${visibleCount === 14 && endIndex === data.length - 1 ? 'bg-accent-blue text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                14D
              </button>
              <button
                type="button"
                onClick={() => handlePresetDays(30)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${visibleCount === 30 && endIndex === data.length - 1 ? 'bg-accent-blue text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${!isZoomed ? 'bg-accent-blue text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                All ({data.length}D)
              </button>
            </div>

            {isZoomed && (
              <span className="hidden sm:inline-flex items-center text-[10px] text-accent-blue font-bold px-2 py-1 bg-accent-blue/10 rounded-lg border border-accent-blue/20">
                Viewing {visibleCount} of {data.length} days ({startDateLabel} → {endDateLabel})
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
        <Line key={`${packageName || 'all'}_${platform}`} data={chartData} options={options} plugins={plugins} />
      </div>
    </div>
  );
}


