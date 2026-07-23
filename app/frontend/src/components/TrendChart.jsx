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

export default function TrendChart({ data, releases = [], platform = 'google', isLogarithmic = false, onSelectPoint }) {
  if (!data) return null;

  const labels = data.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const filteredReleases = releases.filter(r => r.platform === platform || r.platform === 'both');

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily Installs',
        data: data.map(item => {
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
      },
      {
        label: 'Daily Uninstalls',
        data: data.map(item => {
          const val = item.dailyUserUninstalls || item.dailyUninstalls || 0;
          return isLogarithmic ? Math.max(val, 1) : val;
        }),
        borderColor: CHART_COLORS.accent.rose,
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.4
      }
    ]
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
