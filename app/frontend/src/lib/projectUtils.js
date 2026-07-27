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

/**
 * Flexible project lookup matching identifier against packageName, bundleId, sku, index, id, or name
 * 
 * @param {Array} projectList 
 * @param {string|object} identifier 
 * @returns {object|null} Matched project or null
 */
export function findProject(projectList, identifier) {
  if (!Array.isArray(projectList) || !projectList.length || !identifier || identifier === 'all') {
    return null;
  }
  if (typeof identifier === 'object') {
    return identifier;
  }
  const idStr = String(identifier).trim().toLowerCase();

  // 1. Match by packageName
  let match = projectList.find(p => p.packageName && String(p.packageName).toLowerCase() === idStr);
  if (match) return match;

  // 2. Match by bundleId
  match = projectList.find(p => p.bundleId && String(p.bundleId).toLowerCase() === idStr);
  if (match) return match;

  // 3. Match by index (e.g. g-0, a-0)
  match = projectList.find(p => p.index && String(p.index).toLowerCase() === idStr);
  if (match) return match;

  // 4. Match by sku or id
  match = projectList.find(p => (p.sku && String(p.sku).toLowerCase() === idStr) || (p.id && String(p.id).toLowerCase() === idStr));
  if (match) return match;

  // 5. Match by name / displayName
  match = projectList.find(p => p.name && String(p.name).toLowerCase() === idStr);
  if (match) return match;

  return null;
}

/**
 * Returns the canonical URL segment for a project (packageName || bundleId || index || 'all')
 * 
 * @param {object|string} project 
 * @returns {string} URL segment
 */
export function getProjectUrlSegment(project) {
  if (!project || project === 'all') return 'all';
  if (typeof project === 'string') return project;
  return project.packageName || project.bundleId || project.index || 'all';
}

