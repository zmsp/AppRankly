/**
 * Utility functions for project sorting and grouping across AppRankly
 */

/**
 * Sorts project array with:
 * 1. First Group: Apple Store projects, sorted alphabetically by name
 * 2. Second Group: Play Store (Google) projects, sorted alphabetically by name
 * 
 * @param {Array} projectList 
 * @returns {Array} Sorted projects
 */
export function sortProjectsByPlatformAndName(projectList) {
  if (!Array.isArray(projectList)) return [];
  const apple = projectList
    .filter(p => p?.platform === 'apple')
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  const google = projectList
    .filter(p => p?.platform !== 'apple')
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  return [...apple, ...google];
}
