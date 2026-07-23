export function toCSV(rows, columns) {
  if (!rows || !rows.length) return '';
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => JSON.stringify(r[c] ?? '')).join(','));
  return [header, ...body].join('\n');
}

export function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
