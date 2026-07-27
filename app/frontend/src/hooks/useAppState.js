import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { MOCK_DATA, generateDemoTrends, MOCK_PROJECTS } from '../lib/mockData';
import { getPresetDateRange, parseDateExpression, formatDateISO } from '../lib/dateUtils';
import { buildCacheKey, getCached, setCached, cachedFetch, clearCache } from '../lib/statsCache';
import { sortProjectsByPlatformAndName, findProject, getProjectUrlSegment } from '../lib/projectUtils';

export function useAppState() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isDemoMode, setIsDemoMode] = useState(() => {
    return window.location.hash.includes('#/demo') || location.pathname.startsWith('/demo');
  });
  const [isStaticMode, setIsStaticMode] = useState(false);
  const [noPass, setNoPass] = useState(false);

  // Parse initial state from URL if present (handling sub-routes like /details/android/g-0)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const knownSubRoutes = ['details', 'store', 'retention', 'releases', 'reports', 'config', 'glossary'];
  const hasSubRoute = knownSubRoutes.includes(pathParts[0]);

  const platIdx = hasSubRoute ? 1 : 0;
  const projIdx = hasSubRoute ? 2 : 1;

  const rawPlat = pathParts[platIdx];
  const initialPlatform = (rawPlat === 'android' || rawPlat === 'google') ? 'google'
    : (rawPlat === 'apple' || rawPlat === 'ios') ? 'apple'
    : (rawPlat === 'all' || !rawPlat) ? 'all'
    : 'google';

  const initialProject = pathParts[projIdx] ? pathParts[projIdx] : (initialPlatform === 'all' ? 'all' : 'manual');

  const searchParams = new URLSearchParams(location.search);
  const rangeParam = searchParams.get('range')?.toLowerCase();
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  const [platform, setPlatform] = useState(() => localStorage.getItem('apprankly_platform') || initialPlatform);
  const [activeDimension, setActiveDimension] = useState('country');
  const [comparisonMode, setComparisonMode] = useState('prev_period'); // 'prev_period' | 'prev_year' | 'none'
  const [granularity, setGranularity] = useState('day'); // 'day' | 'week' | 'month'
  const [projects, setProjects] = useState([]);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(() => localStorage.getItem('apprankly_project') || initialProject);
  const [authToken, setAuthToken] = useState(() => {
    const stored = localStorage.getItem('apprankly_token');
    return (stored && stored !== 'null' && stored !== 'undefined') ? stored : null;
  });

  useEffect(() => {
    if (platform) localStorage.setItem('apprankly_platform', platform);
  }, [platform]);

  useEffect(() => {
    if (selectedProjectIndex) localStorage.setItem('apprankly_project', selectedProjectIndex);
  }, [selectedProjectIndex]);

  const calculateInitialRange = () => {
    if (startParam && endParam) {
      const parsedStart = parseDateExpression(startParam);
      const parsedEnd = parseDateExpression(endParam);
      if (parsedStart && parsedEnd) {
        return { start: parsedStart, end: parsedEnd, label: 'Custom' };
      }
    }
    if (rangeParam) {
      return getPresetDateRange(rangeParam);
    }
    const storedStart = localStorage.getItem('apprankly_date_start');
    const storedEnd = localStorage.getItem('apprankly_date_end');
    if (storedStart && storedEnd) {
      return { start: storedStart, end: storedEnd, label: 'Custom' };
    }
    const storedPreset = localStorage.getItem('apprankly_date_preset');
    return getPresetDateRange(storedPreset || '7d');
  };

  const [dateRange, setDateRange] = useState(calculateInitialRange);

  useEffect(() => {
    if (dateRange) {
      if (dateRange.preset) {
        localStorage.setItem('apprankly_date_preset', dateRange.preset.toLowerCase());
        localStorage.removeItem('apprankly_date_start');
        localStorage.removeItem('apprankly_date_end');
      } else if (dateRange.start && dateRange.end) {
        localStorage.removeItem('apprankly_date_preset');
        localStorage.setItem('apprankly_date_start', dateRange.start);
        localStorage.setItem('apprankly_date_end', dateRange.end);
      }
    }
  }, [dateRange]);

  const [stats, setStats] = useState(null);
  const [dimensionStats, setDimensionStats] = useState(null);
  const [deviceStats, setDeviceStats] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dimensionLoading, setDimensionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const switchToDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setError(null);
    if (!window.location.hash.includes('#/demo')) {
      navigate('/demo', { replace: true });
    }
  }, [navigate]);

  // Sync URL when platform, selectedProjectIndex, or dateRange changes
  const updateUrl = useCallback((newPlatform, newProject, newRangePreset, customStart, customEnd) => {
    if (isDemoMode) {
      if (!window.location.hash.includes('#/demo') && !location.pathname.startsWith('/demo')) {
        navigate('/demo', { replace: true });
      }
      return;
    }
    const targetProj = findProject(projects, newProject, newPlatform || platform);
    const platSegment = newPlatform === 'google' ? 'android' : newPlatform === 'apple' ? 'apple' : 'all';
    const projSegment = targetProj ? getProjectUrlSegment(targetProj) : (newProject || 'all');
    const currentSearch = new URLSearchParams(location.search);

    const rangeToUse = newRangePreset || (dateRange?.preset ? dateRange.preset.toLowerCase() : null);
    const startToUse = customStart || dateRange?.start;
    const endToUse = customEnd || dateRange?.end;

    if (newRangePreset) {
      currentSearch.set('range', newRangePreset);
      currentSearch.delete('start');
      currentSearch.delete('end');
    } else if (customStart && customEnd) {
      currentSearch.delete('range');
      currentSearch.set('start', customStart);
      currentSearch.set('end', customEnd);
    } else if (rangeToUse && rangeToUse !== 'custom') {
      currentSearch.set('range', rangeToUse);
      currentSearch.delete('start');
      currentSearch.delete('end');
    } else if (startToUse && endToUse) {
      currentSearch.delete('range');
      currentSearch.set('start', startToUse);
      currentSearch.set('end', endToUse);
    }

    const searchStr = currentSearch.toString() ? `?${currentSearch.toString()}` : '';

    // Preserve sub-routes like /details, /store, /retention, /releases while appending platform/project
    const currentParts = location.pathname.split('/').filter(Boolean);
    const knownSubRoutes = ['details', 'store', 'retention', 'releases', 'reports', 'config', 'glossary'];
    let currentSubRoute = currentParts.find(part => knownSubRoutes.includes(part));

    if (newProject !== 'all' && newProject !== 'manual' && !currentSubRoute) {
      currentSubRoute = 'details';
    } else if (newProject === 'all' && currentSubRoute === 'details') {
      currentSubRoute = null;
    }

    let newPath = `/${platSegment}/${projSegment}${searchStr}`;
    if (currentSubRoute) {
      newPath = `/${currentSubRoute}/${platSegment}/${projSegment}${searchStr}`;
    }

    if (location.pathname + location.search !== newPath) {
      navigate(newPath, { replace: true });
    }
  }, [location.pathname, location.search, navigate, isDemoMode, projects, dateRange]);

  // Sync state from location pathname if URL segments change
  useEffect(() => {
    if (isDemoMode) return;
    const currentParts = location.pathname.split('/').filter(Boolean);
    const knownSubRoutes = ['details', 'store', 'retention', 'releases', 'reports', 'config', 'glossary'];
    const hasSubRoute = knownSubRoutes.includes(currentParts[0]);

    const platIdx = hasSubRoute ? 1 : 0;
    const projIdx = hasSubRoute ? 2 : 1;

    const rawPlat = currentParts[platIdx];
    const urlPlatform = (rawPlat === 'android' || rawPlat === 'google') ? 'google'
      : (rawPlat === 'apple' || rawPlat === 'ios') ? 'apple'
      : (rawPlat === 'all') ? 'all'
      : null;

    const urlProject = currentParts[projIdx] || null;

    if (urlPlatform && urlPlatform !== platform) {
      setPlatform(urlPlatform);
    }
    if (urlProject && urlProject !== selectedProjectIndex) {
      setSelectedProjectIndex(urlProject);
    }
  }, [location.pathname, isDemoMode, platform, selectedProjectIndex]);

  const handleSetPlatform = (p) => {
    setPlatform(p);
    let nextProj = selectedProjectIndex;
    if (p === 'all' || selectedProjectIndex === 'all') {
      nextProj = 'all';
      setSelectedProjectIndex('all');
    } else if (p !== 'all') {
      const activeProj = findProject(projects, selectedProjectIndex, p);
      if (activeProj && activeProj.platform && activeProj.platform !== p) {
        const filtered = projects.filter(proj => proj.platform === p);
        if (filtered.length > 0) {
          nextProj = getProjectUrlSegment(filtered[0]);
          setSelectedProjectIndex(nextProj);
        } else {
          nextProj = 'all';
          setSelectedProjectIndex('all');
        }
      }
    }
    const targetProj = findProject(projects, nextProj, p);
    const projSeg = targetProj ? getProjectUrlSegment(targetProj) : nextProj;
    updateUrl(p, projSeg, dateRange.preset ? dateRange.preset.toLowerCase() : null, dateRange.start, dateRange.end);
  };

  const handleSetSelectedProjectIndex = (pIndex) => {
    let nextPlatform = platform;
    const targetProj = findProject(projects, pIndex, platform);
    if (pIndex === 'all') {
      nextPlatform = 'all';
    } else if (targetProj && targetProj.platform) {
      nextPlatform = targetProj.platform;
    } else if (platform === 'all' && pIndex !== 'manual') {
      nextPlatform = 'google';
    }

    if (nextPlatform !== platform) {
      setPlatform(nextPlatform);
    }
    const newProjSegment = targetProj ? getProjectUrlSegment(targetProj) : pIndex;
    setSelectedProjectIndex(newProjSegment);
    updateUrl(nextPlatform, newProjSegment, dateRange.preset ? dateRange.preset.toLowerCase() : null, dateRange.start, dateRange.end);
  };

  const handleSetDateRange = (rangeObj, presetName) => {
    setDateRange(rangeObj);
    if (presetName) {
      updateUrl(platform, selectedProjectIndex, presetName.toLowerCase());
    } else {
      updateUrl(platform, selectedProjectIndex, null, rangeObj.start, rangeObj.end);
    }
  };

  const fetchProjects = useCallback(async (token) => {
    const tokenToUse = token || authToken;
    try {
      const res = await apiFetch('/api/projects', {}, tokenToUse, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        const sortedData = sortProjectsByPlatformAndName(data);
        setProjects(sortedData);
        if (sortedData.length > 0) {
          setIsDemoMode(false);
          if (selectedProjectIndex === 'manual') {
            const platformFiltered = sortedData.filter(p => p.platform === platform);
            const defaultProj = platformFiltered.length > 1 ? 'all' : (sortedData[0]?.index ?? 'all');
            setSelectedProjectIndex(defaultProj);
          }
        }
      }
    } catch (err) {
      if (err.message === 'Unauthorized') {
        setAuthToken(null);
        localStorage.removeItem('apprankly_token');
      }
      console.error('Failed to fetch projects', err);
    }
  }, [isStaticMode, authToken]);

  const fetchReleases = useCallback(async () => {
    try {
      const res = await apiFetch('/api/releases', {}, authToken, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        setReleases(data);
      }
    } catch (err) {
      if (err.message === 'Unauthorized') {
        setAuthToken(null);
        localStorage.removeItem('apprankly_token');
      }
      console.error('Failed to fetch releases', err);
    }
  }, [authToken, isStaticMode]);

  // Load Main Stats Overview
  const loadOverviewStats = useCallback(async () => {
    setError(null);

    if (isDemoMode) {
      setLoading(true);
      setTimeout(() => {
        const { dailyTrends, appTrends } = generateDemoTrends(dateRange.start, dateRange.end);
        let currentTrends = dailyTrends;
        let currentActive = dailyTrends[dailyTrends.length - 1]?.activeDevices || MOCK_DATA.overview.currentlyActiveDevices;

        if (selectedProjectIndex !== 'all' && selectedProjectIndex !== 'manual') {
            const proj = findProject(projects, selectedProjectIndex, platform);
            if (proj && appTrends[proj.name]) {
               currentTrends = appTrends[proj.name];
               currentActive = currentTrends[currentTrends.length - 1]?.activeDevices || currentActive;
            }
        }

        setStats({
          ...MOCK_DATA.overview,
          dailyTrends: currentTrends,
          appTrends,
          currentlyActiveDevices: currentActive
        });
        setLoading(false);
      }, 300);
      return;
    }

    try {
      const project = findProject(projects, selectedProjectIndex, platform);
      const body = {
        platform,
        projectIndex: selectedProjectIndex,
        packageName: project ? project.packageName : '',
        startDate: dateRange.start,
        endDate: dateRange.end
      };

      const cacheKey = buildCacheKey({ type: 'overview', ...body });
      setLoading(true);
      const statsData = await cachedFetch(cacheKey, async () => {
        const statsRes = await apiFetch('/api/stats', {
          method: 'POST',
          body: JSON.stringify(body)
        }, authToken, isStaticMode);

        if (!statsRes.ok) throw new Error('Failed to fetch stats');
        return await statsRes.json();
      });

      setStats(statsData);

    } catch (err) {
      if (err.message === 'Unauthorized') {
        setAuthToken(null);
        localStorage.removeItem('apprankly_token');
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, dateRange, projects, selectedProjectIndex, platform, authToken, isStaticMode]);

  const addRelease = useCallback(async (releaseData) => {
    if (isDemoMode) {
      const newRel = {
        id: `demo_${Date.now()}`,
        source: 'manual',
        ...releaseData
      };
      setReleases(prev => [newRel, ...prev]);
      return { success: true, release: newRel };
    }
    try {
      const res = await apiFetch('/api/releases', {
        method: 'POST',
        body: JSON.stringify(releaseData)
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchReleases();
        clearCache();
        loadOverviewStats();
        return result;
      }
    } catch (err) {
      console.error('Failed to add release:', err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchReleases, loadOverviewStats]);

  const updateRelease = useCallback(async (id, releaseData) => {
    if (isDemoMode) {
      setReleases(prev => prev.map(r => String(r.id) === String(id) ? { ...r, ...releaseData } : r));
      return { success: true };
    }
    try {
      const res = await apiFetch(`/api/releases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(releaseData)
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchReleases();
        clearCache();
        loadOverviewStats();
        return result;
      }
    } catch (err) {
      console.error(`Failed to update release ${id}:`, err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchReleases, loadOverviewStats]);

  const deleteRelease = useCallback(async (id) => {
    if (isDemoMode) {
      setReleases(prev => prev.filter(r => String(r.id) !== String(id)));
      return { success: true };
    }
    try {
      const res = await apiFetch(`/api/releases/${id}`, {
        method: 'DELETE'
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchReleases();
        clearCache();
        loadOverviewStats();
        return result;
      }
    } catch (err) {
      console.error(`Failed to delete release ${id}:`, err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchReleases, loadOverviewStats]);

  const autoDetectReleases = useCallback(async (targetPackageName, targetPlatform) => {
    if (isDemoMode) {
      const mockAuto = [
        { id: 'demo_auto_1', version: 'v2.4.0', platform: 'google', packageName: 'com.demo.alpha', date: '2026-07-20', notes: 'Auto-detected store release for App Alpha', source: 'auto' },
        { id: 'demo_auto_2', version: 'v2.3.1', platform: 'apple', packageName: 'com.demo.gamma', date: '2026-07-15', notes: 'Auto-detected store release for App Gamma', source: 'auto' }
      ];
      setReleases(prev => {
        const existingVersions = new Set(prev.map(r => r.version));
        const newOnes = mockAuto.filter(m => !existingVersions.has(m.version));
        return [...newOnes, ...prev];
      });
      return { success: true, addedCount: 2 };
    }
    try {
      const res = await apiFetch('/api/releases/auto-detect', {
        method: 'POST',
        body: JSON.stringify({
          packageName: targetPackageName || 'all',
          platform: targetPlatform || 'all'
        })
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchReleases();
        clearCache();
        loadOverviewStats();
        return result;
      }
    } catch (err) {
      console.error('Failed to auto-detect releases:', err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchReleases, loadOverviewStats]);

  // Load Dimension Stats separately to avoid blanking whole page on tab switch
  const loadDimensionStats = useCallback(async (dimensionName) => {
    if (isDemoMode) {
      setDimensionStats(MOCK_DATA.dimensions[dimensionName] || []);
      if (dimensionName === 'device') {
        setDeviceStats(MOCK_DATA.dimensions.device || []);
      }
      return;
    }

    try {
      const project = findProject(projects, selectedProjectIndex, platform);
      const body = {
        platform,
        projectIndex: selectedProjectIndex,
        packageName: project ? project.packageName : '',
        startDate: dateRange.start,
        endDate: dateRange.end,
        dimension: dimensionName
      };

      const cacheKey = buildCacheKey({ type: 'dimension', ...body });
      setDimensionLoading(true);
      const dimData = await cachedFetch(cacheKey, async () => {
        const dimRes = await apiFetch('/api/dimension', {
          method: 'POST',
          body: JSON.stringify(body)
        }, authToken, isStaticMode);

        if (!dimRes.ok) throw new Error(`Failed to fetch dimension ${dimensionName}`);
        return await dimRes.json();
      });

      setDimensionStats(dimData);
      if (dimensionName === 'device') {
        setDeviceStats(dimData);
      }
    } catch (err) {
      console.error(`Failed to fetch dimension ${dimensionName}:`, err);
    } finally {
      setDimensionLoading(false);
    }
  }, [isDemoMode, dateRange, projects, selectedProjectIndex, platform, authToken, isStaticMode]);

  // Fetch device stats independently for DeviceHealthTable if activeDimension is not device
  const fetchDeviceStatsIfNeeded = useCallback(async () => {
    if (activeDimension === 'device' && dimensionStats) {
      setDeviceStats(dimensionStats);
      return;
    }

    if (isDemoMode) {
      setDeviceStats(MOCK_DATA.dimensions.device || []);
      return;
    }

    try {
      const project = findProject(projects, selectedProjectIndex, platform);
      const body = {
        platform,
        projectIndex: selectedProjectIndex,
        packageName: project ? project.packageName : '',
        startDate: dateRange.start,
        endDate: dateRange.end,
        dimension: 'device'
      };

      const cacheKey = buildCacheKey({ type: 'dimension', ...body });
      const dimData = await cachedFetch(cacheKey, async () => {
        const dimRes = await apiFetch('/api/dimension', {
          method: 'POST',
          body: JSON.stringify(body)
        }, authToken, isStaticMode);

        if (!dimRes.ok) throw new Error('Failed to fetch device stats');
        return await dimRes.json();
      });

      setDeviceStats(dimData);
    } catch (err) {
      // ignore
    }
  }, [activeDimension, dimensionStats, isDemoMode, projects, selectedProjectIndex, platform, dateRange, authToken, isStaticMode]);

  useEffect(() => {
    if (authToken || isDemoMode || noPass) {
      fetchProjects(authToken);
      fetchReleases();
    }
  }, [fetchProjects, fetchReleases, authToken, isDemoMode, noPass]);

  useEffect(() => {
    if (authToken || isDemoMode || noPass) {
      loadOverviewStats();
    }
  }, [loadOverviewStats, authToken, isDemoMode, noPass]);

  useEffect(() => {
    if (authToken || isDemoMode || noPass) {
      loadDimensionStats(activeDimension);
    }
  }, [activeDimension, loadDimensionStats, authToken, isDemoMode, noPass]);

  useEffect(() => {
    if ((authToken || isDemoMode || noPass) && activeDimension !== 'device') {
      fetchDeviceStatsIfNeeded();
    }
  }, [fetchDeviceStatsIfNeeded, activeDimension, authToken, isDemoMode, noPass]);

  const forceRefresh = useCallback(() => {
    clearCache();
    loadOverviewStats();
  }, [loadOverviewStats]);

  return {
    isDemoMode, setIsDemoMode,
    isStaticMode, noPass,
    platform, setPlatform: handleSetPlatform, setRawPlatform: setPlatform,
    activeDimension, setActiveDimension,
    comparisonMode, setComparisonMode,
    granularity, setGranularity,
    projects, setProjects,
    selectedProjectIndex, setSelectedProjectIndex: handleSetSelectedProjectIndex,
    authToken, setAuthToken,
    dateRange, setDateRange: handleSetDateRange,
    stats, dimensionStats, deviceStats,
    releases, setReleases,
    loading, dimensionLoading, error,
    setupRequired, setSetupRequired,
    refreshData: forceRefresh,
    switchToDemoMode,
    fetchProjects,
    fetchReleases,
    addRelease,
    updateRelease,
    deleteRelease,
    autoDetectReleases
  };
}

