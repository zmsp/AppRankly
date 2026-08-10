import React from 'react';

export default function Sparkline({
  data,
  lines,
  color = '#00d2ff',
  height = 48,
  strokeWidth = 1.5,
  isDashed = false,
  showGridLines = true
}) {
  const seriesList = lines && lines.length > 0
    ? lines.filter(l => l && Array.isArray(l.data) && l.data.length > 0)
    : (data && data.length > 0 ? [{ data, color, strokeWidth, isDashed }] : []);

  if (seriesList.length === 0) return null;

  let allValues = [];
  seriesList.forEach(s => {
    const pts = s.data.length === 1 ? [s.data[0], s.data[0]] : s.data;
    allValues.push(...pts);
  });

  if (allValues.length === 0) return null;

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;
  const width = 100;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible w-full">
      <defs>
        <linearGradient id="combine-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="apple-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="android-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Background Guidelines for visual depth */}
      {showGridLines && (
        <g stroke="rgba(255, 255, 255, 0.06)" strokeWidth="0.6" strokeDasharray="3 3">
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} />
        </g>
      )}

      {/* Area fills for lines that request fill */}
      {seriesList.map((series, idx) => {
        if (!series.showFill && !series.fillGradientId) return null;
        const pointsData = series.data.length === 1 ? [series.data[0], series.data[0]] : series.data;
        const pts = pointsData.map((val, i) => {
          const x = (i / (pointsData.length - 1)) * width;
          const y = range === 0 ? height / 2 : (height - 6) - ((val - min) / range) * (height - 12) + 3;
          return { x, y };
        });

        const pathD = `M 0,${height} L ${pts.map(p => `${p.x},${p.y}`).join(' L ')} L ${width},${height} Z`;

        return (
          <path
            key={`fill-${idx}`}
            d={pathD}
            fill={series.fillGradientId ? `url(#${series.fillGradientId})` : (series.fillColor || 'rgba(0, 210, 255, 0.1)')}
          />
        );
      })}

      {/* Polyline Strokes */}
      {seriesList.map((series, idx) => {
        const pointsData = series.data.length === 1 ? [series.data[0], series.data[0]] : series.data;
        const pointsStr = pointsData.map((val, i) => {
          const x = (i / (pointsData.length - 1)) * width;
          const y = range === 0 ? height / 2 : (height - 6) - ((val - min) / range) * (height - 12) + 3;
          return `${x},${y}`;
        }).join(' ');

        return (
          <polyline
            key={`stroke-${idx}`}
            fill="none"
            stroke={series.color || color}
            strokeWidth={series.strokeWidth || strokeWidth}
            strokeDasharray={series.isDashed ? "4 4" : undefined}
            strokeOpacity={series.opacity ?? 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsStr}
          />
        );
      })}
    </svg>
  );
}
