/**
 * Utility functions for exporting dashboard data.
 */

/**
 * Convert an array of objects to a CSV string and trigger a browser download.
 * @param {Array<Object>} dataArray - Array of data objects
 * @param {string} filename - Output filename (e.g. 'daily_trends.csv')
 */
export function exportToCSV(dataArray, filename = 'dashboard_export.csv') {
  if (!dataArray || !dataArray.length) {
    console.warn('No data available to export');
    return false;
  }

  // Extract headers
  const headers = Array.from(
    new Set(
      dataArray.reduce((acc, curr) => acc.concat(Object.keys(curr)), [])
    )
  );

  // Format CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...dataArray.map(row => {
      return headers
        .map(header => {
          let val = row[header];
          if (val === null || val === undefined) {
            val = '';
          } else if (typeof val === 'object') {
            val = JSON.stringify(val).replace(/"/g, '""');
          } else {
            val = String(val).replace(/"/g, '""');
          }
          // Wrap in quotes if contains commas or newlines
          if (val.includes(',') || val.includes('\n') || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        })
        .join(',');
    })
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
