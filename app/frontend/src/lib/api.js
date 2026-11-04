import { MOCK_GITHUB_REPOS } from './mockData';

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
    if (url.startsWith('/api/releases')) {
      if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
        return new Response(JSON.stringify({ success: true, message: 'Static mode response' }), { status: 200 });
      }
      return fetch('data/releases.json');
    }
    if (url.startsWith('/api/notifications')) {
      return new Response(JSON.stringify({ success: true, notifications: [], unreadCount: 0 }), { status: 200 });
    }
    if (url.startsWith('/api/github')) {
      if (url.includes('/api/github/history')) {
        const repo = MOCK_GITHUB_REPOS[0];
        return new Response(JSON.stringify({
          success: true,
          url: repo.url,
          history: repo.history
        }), { status: 200 });
      }
      if (url.includes('/api/github/poll')) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Polled 1 repository in demo mode'
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        success: true,
        repos: MOCK_GITHUB_REPOS
      }), { status: 200 });
    }
    if (url.startsWith('/api/ai/executive-brief')) {
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        summaryBullets: [
          'Portfolio Installs: +1,380 daily installs across 3 apps (+8.4% WoW).',
          'ASO Score Leader: App Beta achieved 92/100 ASO health with 88 volume keyword rank #3.',
          'GitHub Package Velocity: AppRankly crossed 2,149 pulls and 36 ⭐ stars on GitHub.',
          'Release Stability: App Alpha v2.4.0 rollout shows -1.2% churn reduction post-launch.'
        ]
      }), { status: 200 });
    }
    if (url.startsWith('/api/ai/ask-sql')) {
      const body = options.body ? JSON.parse(options.body) : {};
      const q = (body.question || '').toLowerCase();
      let sql = 'SELECT package_name, title, total_installs, active_devices FROM apps ORDER BY total_installs DESC;';
      let columns = ['package_name', 'title', 'total_installs', 'active_devices'];
      let rows = [
        { package_name: 'com.demo.alpha', title: 'App Alpha', total_installs: '245,100', active_devices: '64,200' },
        { package_name: 'com.demo.beta', title: 'App Beta', total_installs: '185,400', active_devices: '43,100' },
        { package_name: 'com.demo.gamma', title: 'App Gamma', total_installs: '55,410', active_devices: '21,150' }
      ];

      if (q.includes('country') || q.includes('region') || q.includes('geography')) {
        sql = 'SELECT country_code, installs, active_devices FROM dimension_stats WHERE dimension = "country" ORDER BY installs DESC LIMIT 5;';
        columns = ['country_code', 'installs', 'active_devices'];
        rows = [
          { country_code: 'US', installs: '155,000', active_devices: '45,200' },
          { country_code: 'IN', installs: '124,000', active_devices: '32,400' },
          { country_code: 'GB', installs: '48,000', active_devices: '12,800' },
          { country_code: 'DE', installs: '35,000', active_devices: '9,500' },
          { country_code: 'CA', installs: '31,000', active_devices: '8,200' }
        ];
      } else if (q.includes('release') || q.includes('churn') || q.includes('version')) {
        sql = 'SELECT version, package_name, release_date, churn_delta FROM releases ORDER BY release_date DESC;';
        columns = ['version', 'package_name', 'release_date', 'churn_delta'];
        rows = [
          { version: '2.4.0', package_name: 'com.demo.alpha', release_date: '2026-10-28', churn_delta: '-1.2%' },
          { version: '3.1.0', package_name: 'com.demo.beta', release_date: '2026-10-20', churn_delta: '-1.5%' },
          { version: '1.5.0', package_name: 'com.demo.gamma', release_date: '2026-10-25', churn_delta: '-0.8%' }
        ];
      }

      return new Response(JSON.stringify({
        success: true,
        sql,
        columns,
        rows,
        rowCount: rows.length
      }), { status: 200 });
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
       throw new Error('Unauthorized');
    }
    return response;
  } catch (err) {
    if (url.startsWith('/api/github')) {
      return new Response(JSON.stringify({
        success: true,
        repos: MOCK_GITHUB_REPOS
      }), { status: 200 });
    }
    throw err;
  }
}
