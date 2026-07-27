import React from 'react';
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

const findNearestDataIndex = (data, releaseDateStr) => {
  const targetNorm = normalizeDateStr(releaseDateStr);
  if (!targetNorm || !Array.isArray(data) || data.length === 0) return -1;

  // 1. Exact match
  const exactIndex = data.findIndex(d => normalizeDateStr(d.date) === targetNorm);
  if (exactIndex !== -1) return exactIndex;

  // 2. Out-of-bounds check: if release date is outside active chart date window, do not plot it
  const firstNorm = normalizeDateStr(data[0].date);
  const lastNorm = normalizeDateStr(data[data.length - 1].date);
  if (firstNorm && lastNorm) {
    if (targetNorm < firstNorm || targetNorm > lastNorm) {
      return -1;
    }
  }

  // 3. Nearest date match within 7 days for in-range gap dates
  const targetTime = new Date(targetNorm + 'T00:00:00Z').getTime();
  if (isNaN(targetTime)) return -1;

  let minDiff = Infinity;
  let closestIndex = -1;

  data.forEach((d, i) => {
    const dNorm = normalizeDateStr(d.date);
    if (!dNorm) return;
    const dTime = new Date(dNorm + 'T00:00:00Z').getTime();
    if (isNaN(dTime)) return;

    const diff = Math.abs(dTime - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  });

  const MAX_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days max
  if (minDiff <= MAX_THRESHOLD_MS) {
    return closestIndex;
  }

  return -1;
};

export default function TrendChart({ data, releases = [], platform = 'google', hasUninstallData, isLogarithmic = false, onSelectPoint }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 italic p-6 text-center">
        No daily trend data available for selected platform scope.
      </div>
    );
  }

  const labels = data.map(item => {
    const norm = normalizeDateStr(item.date);
    const date = norm ? new Date(norm + 'T00:00:00Z') : new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const filteredReleases = (releases || []).filter(r => {
    if (!r) return false;
    if (!platform || platform === 'all' || platform === 'auto') return true;
    if (!r.platform || r.platform === 'all' || r.platform === 'both') return true;
    return r.platform === platform;
  });

  const showUninstalls = hasUninstallData !== undefined
    ? hasUninstallData
    : (platform !== 'apple' && platform !== 'appstore');

  const totalInstallsInWindow = data.reduce((sum, item) => sum + (item.dailyUserInstalls || item.dailyInstalls || 0), 0);
  const showForecast = data.length >= 7 && totalInstallsInWindow >= 20;

  let extendedLabels = [...labels];
  let forecastPoints = Array(data.length).fill(null);

  if (showForecast) {
    const series = data.map(item => item.dailyUserInstalls || item.dailyInstalls || 0);
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

    const lastNorm = normalizeDateStr(data[data.length - 1].date);
    const lastDateObj = lastNorm ? new Date(lastNorm + 'T00:00:00Z') : new Date(data[data.length - 1].date);
    forecastPoints[data.length - 1] = series[n - 1]; // connect seamlessly

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
      data: showForecast ? [...data.map(item => {
        const val = item.dailyUserInstalls || item.dailyInstalls || 0;
        return isLogarithmic ? Math.max(val, 1) : val;
      }), ...Array(14).fill(null)] : data.map(item => {
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
    const uninstData = data.map(item => {
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
        if (data[index]) {
          onSelectPoint(data[index]);
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
            const index = context[0].dataIndex;
            if (index >= data.length) return '';

            const dayReleases = filteredReleases.filter(r => {
              const rIndex = findNearestDataIndex(data, r.releaseDate || r.date);
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

  const plugins = [{
    id: 'releaseLines',
    afterDraw: (chart) => {
      const { ctx, scales: { x, y } } = chart;
      if (!x || !y) return;

      const releasesByIndex = new Map();
      filteredReleases.forEach(release => {
        const index = findNearestDataIndex(data, release.releaseDate || release.date);
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
  }];

  return <Line data={chartData} options={options} plugins={plugins} />;
}

