/**
 * Formatting utilities for Store Stat Viewer UI
 */

/**
 * Formats a number with compact notation (e.g. 1.2K, 3.4M)
 */
export function formatCompactNumber(value) {
  if (value === null || value === undefined || value === 'N/A' || value === 'NaN' || isNaN(Number(value)) || !isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value));
}

/**
 * Standard integer / number formatting with commas
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === 'N/A' || value === 'NaN' || isNaN(Number(value)) || !isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US').format(Number(value));
}

/**
 * Formats a delta value (percentage or absolute difference) with explicit + / − signs
 */
export function formatDelta(value, isPercentage = true) {
  if (value === null || value === undefined || value === 'N/A' || value === 'NaN' || isNaN(Number(value)) || !isFinite(Number(value))) return '—';
  const num = Number(value);
  if (num === 0) return '0%';

  const sign = num > 0 ? '+' : '−';
  const absVal = Math.abs(num);
  const formatted = isPercentage
    ? `${absVal.toFixed(1)}%`
    : formatCompactNumber(absVal);

  return `${sign}${formatted}`;
}

/**
 * Formats a rate as a percentage (e.g. 85.4%)
 */
export function formatRate(value, decimals = 1) {
  if (value === null || value === undefined || value === 'N/A' || value === 'NaN' || isNaN(Number(value)) || !isFinite(Number(value))) return '—';
  const num = Number(value);
  const pct = Math.abs(num) <= 1 ? num * 100 : num;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Returns formatted value or em-dash '—' if value is missing/zero-rating
 */
export function formatValueOrDash(value, formatter = formatNumber) {
  if (value === null || value === undefined || value === 'N/A' || value === 'NaN' || value === '' || isNaN(Number(value)) || !isFinite(Number(value))) {
    return '—';
  }
  return formatter(value);
}

/**
 * Calculates and formats data freshness statement from last recorded date string or timestamp
 */
export function formatDataFreshness(lastDateInput) {
  if (!lastDateInput) return 'Data status unknown';
  
  const lastDate = new Date(lastDateInput);
  if (isNaN(lastDate.getTime())) return `Data through ${lastDateInput}`;

  const today = new Date();
  const diffTime = Math.abs(today - lastDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${monthNames[lastDate.getMonth()]} ${lastDate.getDate()}`;

  if (diffDays === 0) return `Data through ${formattedDate}`;
  if (diffDays === 1) return `Data through ${formattedDate} · 1 day lag`;
  return `Data through ${formattedDate} · ${diffDays} days lag`;
}
