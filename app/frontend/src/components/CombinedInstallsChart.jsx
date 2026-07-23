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
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

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

export default function CombinedInstallsChart({ dailyTrends = [], appTrends = {}, isLogarithmic = true }) {
  if (!dailyTrends || dailyTrends.length === 0) return null;

  const labels = dailyTrends.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const appNames = Object.keys(appTrends);

  const datasets = [
    {
      label: 'Total Installs (All Apps)',
      data: dailyTrends.map(item => {
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
      const trends = appTrends[appName] || [];
      const trendMap = new Map(trends.map(t => [t.date, t.dailyUserInstalls || t.dailyInstalls || 0]));

      return {
        label: appName,
        data: dailyTrends.map(item => {
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

  return <Line data={chartData} options={options} />;
}
