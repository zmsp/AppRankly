import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { baseOptions, CHART_COLORS } from '../lib/chartTheme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export default function UpgradesChart({ data }) {
  if (!data) return null;

  const chartData = {
    labels: data.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }),
    datasets: [
      {
        label: 'Upgrades',
        data: data.map(item => item.upgrades),
        borderColor: CHART_COLORS.accent.amber,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0
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
          label: (context) => `Upgrades: ${new Intl.NumberFormat().format(context.parsed.y)}`
        }
      }
    }
  };

  return <Line data={chartData} options={options} />;
}
