import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { baseOptions, CHART_COLORS } from '../lib/chartTheme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function NetGrowthChart({ data }) {
  if (!data) return null;

  const chartData = {
    labels: data.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }),
    datasets: [
      {
        label: 'Net Growth',
        data: data.map(item => item.netGrowth),
        backgroundColor: data.map(item => item.netGrowth >= 0 ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 77, 77, 0.5)'),
        borderColor: data.map(item => item.netGrowth >= 0 ? '#00ff88' : '#ff4d4d'),
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: {
          label: (context) => `Net Growth: ${context.parsed.y > 0 ? '+' : ''}${new Intl.NumberFormat().format(context.parsed.y)}`
        }
      }
    }
  };

  return <Bar data={chartData} options={options} />;
}
