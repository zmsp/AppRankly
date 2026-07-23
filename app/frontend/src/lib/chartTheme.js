export const CHART_COLORS = {
  primary: '#3b82f6', // blue-500
  success: '#00ff88', // emerald-500
  warning: '#fbbf24', // amber-500
  danger: '#ff4d4d', // rose-500
  accent: {
    blue: '#00d2ff',
    emerald: '#00ff88',
    rose: '#ff4d4d',
    purple: '#a855f7',
    amber: '#fbbf24',
    orange: '#ff9800',
    indigo: '#6366f1',
    teal: '#14b8a6',
  },
  comparison: 'rgba(255, 255, 255, 0.35)',
  text: {
    muted: 'rgba(255, 255, 255, 0.65)',
    normal: 'rgba(255, 255, 255, 0.90)',
  },
  grid: 'rgba(255, 255, 255, 0.08)',
  tooltip: {
    bg: 'rgba(11, 19, 38, 0.95)',
  }
};

/**
 * Color-blind safe categorical palette for dimension charts (country, device, version)
 */
export const CATEGORICAL_PALETTE = [
  '#00d2ff', // blue
  '#00ff88', // emerald
  '#fbbf24', // amber
  '#a855f7', // purple
  '#ff4d4d', // rose
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
];

export const tooltipStyle = {
  backgroundColor: CHART_COLORS.tooltip.bg,
  titleColor: '#ffffff',
  bodyColor: CHART_COLORS.text.normal,
  borderColor: 'rgba(255, 255, 255, 0.15)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 12,
  displayColors: true,
  bodyFont: { size: 12 },
  titleFont: { size: 13, weight: 'bold' },
};

export const gridStyle = {
  color: CHART_COLORS.grid,
  drawBorder: false,
};

export const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      ...tooltipStyle
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        color: CHART_COLORS.text.muted,
        font: { size: 11, weight: '500' },
        maxRotation: 0
      }
    },
    y: {
      grid: gridStyle,
      border: { display: false },
      ticks: {
        color: CHART_COLORS.text.muted,
        font: { size: 11, weight: '500' },
        padding: 8
      }
    }
  },
  interaction: {
    mode: 'index',
    intersect: false,
  }
};
