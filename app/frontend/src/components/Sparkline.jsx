import React from 'react';

export default function Sparkline({ data, color = '#00d2ff', height = 30, strokeWidth = 1.5, isDashed = false }) {
  if (!data || data.length === 0) return null;
  const pointsData = data.length === 1 ? [data[0], data[0]] : data;

  const min = Math.min(...pointsData);
  const max = Math.max(...pointsData);
  const range = max - min;
  const width = 100;

  const points = pointsData.map((val, i) => {
    const x = (i / (pointsData.length - 1)) * width;
    const y = range === 0 ? height / 2 : (height - 4) - ((val - min) / range) * (height - 8) + 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible w-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={isDashed ? "4 4" : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
