import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ISO_COUNTRY_MAP } from '../lib/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Tooltip,
  Legend
);

export default function DimensionChart({ data, dimension, isLogarithmic = true }) {
  if (!data) return null;

  const chartData = {
    labels: data.map(item => {
      if (dimension === 'country') return ISO_COUNTRY_MAP[item.label] || item.label;
      return item.label;
    }),
    datasets: [
      {
        label: 'Active Devices',
        data: data.map(item => isLogarithmic ? Math.max(item.activeDevices || 0, 1) : item.activeDevices),
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 400, 0);
          gradient.addColorStop(0, '#00d2ff');
          gradient.addColorStop(1, '#00ff88');
          return gradient;
        },
        borderRadius: 8,
        barThickness: 12
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11, 19, 38, 0.9)',
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (context) => `Active Devices: ${new Intl.NumberFormat().format(context.raw)}`
        }
      }
    },
    scales: {
      x: {
        type: isLogarithmic ? 'logarithmic' : 'linear',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: 'rgba(255, 255, 255, 0.3)',
          font: { size: 10 },
          callback: (val) => new Intl.NumberFormat().format(val)
        }
      },
      y: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.8)', font: { size: 11, weight: '500' } }
      }
    }
  };

  return <Bar data={chartData} options={options} />;
}
