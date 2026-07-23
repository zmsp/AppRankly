/**
 * Helper utilities for Grafana-style date range parsing, presets, and shift calculations.
 */

export function formatDateISO(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export function parseDateExpression(expr, defaultNow = new Date()) {
  if (!expr || typeof expr !== 'string') return null;
  const cleaned = expr.trim().toLowerCase();

  if (cleaned === 'now') {
    return formatDateISO(defaultNow);
  }

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const d = new Date(cleaned + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      return cleaned;
    }
  }

  // Handle relative expressions like now-7d, now-1m, now-1y, now-24h, now-30d
  const match = cleaned.match(/^now\s*-\s*(\d+)\s*([dhmy])$/);
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const target = new Date(defaultNow);

    if (unit === 'h' || unit === 'd') {
      const days = unit === 'h' ? Math.ceil(amount / 24) : amount;
      target.setDate(target.getDate() - days);
    } else if (unit === 'm') {
      target.setMonth(target.getMonth() - amount);
    } else if (unit === 'y') {
      target.setFullYear(target.getFullYear() - amount);
    }

    return formatDateISO(target);
  }

  return null;
}

export function getPresetDateRange(preset, now = new Date()) {
  const p = (preset || '').toString().toLowerCase();
  const todayISO = formatDateISO(now);
  let start = new Date(now);

  if (p === '1d' || p === '24h' || p === 'last_24h' || p === '1 day') {
    start.setDate(now.getDate() - 1);
    return { start: formatDateISO(start), end: todayISO, label: 'Last 1 day', preset: '1D' };
  }
  if (p === '7d' || p === '7 days') {
    start.setDate(now.getDate() - 7);
    return { start: formatDateISO(start), end: todayISO, label: 'Last 7 days', preset: '7D' };
  }
  if (p === '14d' || p === '14 days') {
    start.setDate(now.getDate() - 14);
    return { start: formatDateISO(start), end: todayISO, label: 'Last 14 days', preset: '14D' };
  }
  if (p === '30d' || p === '1m' || p === '30 days') {
    start.setDate(now.getDate() - 30);
    return { start: formatDateISO(start), end: todayISO, label: 'Last 30 days', preset: '30D' };
  }
  if (p === '60d' || p === '60 days') {
    start.setDate(now.getDate() - 60);
    return { start: formatDateISO(start), end: todayISO, label: 'Last 60 days', preset: '60D' };
  }
  if (p === '3m' || p === '90d' || p === '3 months') {
    start.setMonth(now.getMonth() - 3);
    return { start: formatDateISO(start), end: todayISO, label: 'Last 90 days', preset: '3M' };
  }
  if (p === '6m' || p === '6 mo' || p === '6 months') {
    start.setMonth(now.getMonth() - 6);
    return { start: formatDateISO(start), end: todayISO, label: 'Last 6 months', preset: '6M' };
  }
  if (p === '1y' || p === '12m' || p === '1 year' || p === 'year') {
    start.setFullYear(now.getFullYear() - 1);
    return { start: formatDateISO(start), end: todayISO, label: 'Last 1 year', preset: '1Y' };
  }
  if (p === 'all') {
    start.setFullYear(now.getFullYear() - 10);
    return { start: formatDateISO(start), end: todayISO, label: 'All time (10y)', preset: 'ALL' };
  }

  // Fixed Periods
  if (p === 'today') {
    return { start: todayISO, end: todayISO, label: 'Today', preset: 'today' };
  }
  if (p === 'yesterday') {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const yISO = formatDateISO(y);
    return { start: yISO, end: yISO, label: 'Yesterday', preset: 'yesterday' };
  }
  if (p === 'this_week') {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(now.getDate() - diffToMonday);
    return { start: formatDateISO(start), end: todayISO, label: 'This week', preset: 'this_week' };
  }
  if (p === 'this_month') {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: formatDateISO(firstOfMonth), end: todayISO, label: 'This month', preset: 'this_month' };
  }
  if (p === 'this_year') {
    const firstOfYear = new Date(now.getFullYear(), 0, 1);
    return { start: formatDateISO(firstOfYear), end: todayISO, label: 'This year', preset: 'this_year' };
  }

  // Default to 7D
  start.setDate(now.getDate() - 7);
  return { start: formatDateISO(start), end: todayISO, label: 'Last 7 days', preset: '7D' };
}

/**
 * Shift the date window backward or forward by the duration in days.
 */
export function shiftDateRange(startDateStr, endDateStr, direction = 'back') {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  const factor = direction === 'back' ? -1 : 1;

  const newStart = new Date(start);
  newStart.setDate(start.getDate() + (factor * diffDays));

  const newEnd = new Date(end);
  newEnd.setDate(end.getDate() + (factor * diffDays));

  return {
    start: formatDateISO(newStart),
    end: formatDateISO(newEnd),
    label: 'Custom'
  };
}

/**
 * Zoom out date range by doubling the date range window.
 */
export function zoomOutDateRange(startDateStr, endDateStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  const newStart = new Date(start);
  newStart.setDate(start.getDate() - diffDays);

  return {
    start: formatDateISO(newStart),
    end: formatDateISO(end),
    label: 'Custom'
  };
}
