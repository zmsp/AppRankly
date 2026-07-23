export async function apiFetch(url, options = {}, authToken = null, isStaticMode = false) {
  // If in static mode, redirect API calls to local JSON files
  if (isStaticMode) {
    if (url === '/api/projects') return fetch('data/projects.json');
    if (url === '/api/stats') {
      const body = options.body ? JSON.parse(options.body) : {};
      const pkg = body.projectIndex === 'all'
        ? `all_${body.platform || 'google'}`
        : (body.packageName || body.projectIndex);
      return fetch(`data/${pkg}/overview.json`);
    }
    if (url === '/api/dimension') {
      const body = options.body ? JSON.parse(options.body) : {};
      const pkg = body.projectIndex === 'all'
        ? `all_${body.platform || 'google'}`
        : (body.packageName || body.projectIndex);
      return fetch(`data/${pkg}/${body.dimension}.json`);
    }
    if (url === '/api/store-details') {
      const body = options.body ? JSON.parse(options.body) : {};
      return fetch(`data/${body.packageName}/store-details.json`);
    }
    if (url === '/api/releases') {
      return fetch('data/releases.json');
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
     throw new Error('Unauthorized');
  }

  return response;
}
