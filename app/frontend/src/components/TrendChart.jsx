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

export default function TrendChart({ data, releases = [], platform = 'google', hasUninstallData, isLogarithmic = false, onSelectPoint }) {
  if (!data || data.length === 0) return null;

  const labels = data.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const filteredReleases = releases.filter(r => r.platform === platform || r.platform === 'both');

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

    const lastDateObj = new Date(data[data.length - 1].date);
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
            const index = context[0].dataIndex;
            const dateStr = data[index]?.date;
            const release = filteredReleases.find(r => r.date === dateStr);
            if (release) {
              return [`\nRelease: v${release.version}`, release.notes || ''];
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

      filteredReleases.forEach(release => {
        const index = data.findIndex(d => d.date === release.date);
        if (index === -1) return;

        const xPos = x.getPixelForValue(index);

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(xPos, y.top);
        ctx.lineTo(xPos, y.bottom);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        const text = `v${release.version}`;
        const metrics = ctx.measureText(text);
        const padding = 4;
        const rectWidth = metrics.width + padding * 2;
        const rectHeight = 16;

        ctx.fillRect(xPos - rectWidth / 2, y.top - 20, rectWidth, rectHeight);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 9px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, xPos, y.top - 12);

        ctx.restore();
      });
    }
  }];

  return <Line data={chartData} options={options} plugins={plugins} />;
}
