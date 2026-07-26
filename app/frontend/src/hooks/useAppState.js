import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { MOCK_DATA, generateDemoTrends, MOCK_PROJECTS } from '../lib/mockData';
import { getPresetDateRange, parseDateExpression, formatDateISO } from '../lib/dateUtils';
import { buildCacheKey, getCached, setCached, cachedFetch, clearCache } from '../lib/statsCache';
import { sortProjectsByPlatformAndName } from '../lib/projectUtils';

export function useAppState() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isDemoMode, setIsDemoMode] = useState(() => {
    return window.location.hash.includes('#/demo') || location.pathname.startsWith('/demo');
  });
  const [isStaticMode, setIsStaticMode] = useState(false);
  const [noPass, setNoPass] = useState(false);

  // Parse initial state from URL if present (handling sub-routes like /store/android/g-0)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const knownSubRoutes = ['store', 'retention', 'releases', 'reports', 'config', 'glossary'];
  const hasSubRoute = knownSubRoutes.includes(pathParts[0]);

  const platIdx = hasSubRoute ? 1 : 0;
  const projIdx = hasSubRoute ? 2 : 1;

  const rawPlat = pathParts[platIdx];
  const initialPlatform = (rawPlat === 'android' || rawPlat === 'google') ? 'google'
    : (rawPlat === 'apple' || rawPlat === 'ios') ? 'apple'
    : (rawPlat === 'all') ? 'all'
    : (pathParts.length === 0) ? 'all'
    : 'google';

  const initialProject = pathParts[projIdx] ? pathParts[projIdx] : (initialPlatform === 'all' ? 'all' : 'manual');

  const searchParams = new URLSearchParams(location.search);
  const rangeParam = searchParams.get('range')?.toLowerCase();
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  const [platform, setPlatform] = useState(initialPlatform);
  const [activeDimension, setActiveDimension] = useState('country');
  const [comparisonMode, setComparisonMode] = useState('prev_period'); // 'prev_period' | 'prev_year' | 'none'
  const [granularity, setGranularity] = useState('day'); // 'day' | 'week' | 'month'
  const [projects, setProjects] = useState([]);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(initialProject);
  const [authToken, setAuthToken] = useState(localStorage.getItem('apprankly_token'));
  
  const calculateInitialRange = () => {
    if (startParam && endParam) {
      const parsedStart = parseDateExpression(startParam);
      const parsedEnd = parseDateExpression(endParam);
      if (parsedStart && parsedEnd) {
        return { start: parsedStart, end: parsedEnd, label: 'Custom' };
      }
    }
    return getPresetDateRange(rangeParam);
  };

  const [dateRange, setDateRange] = useState(calculateInitialRange);

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
    const platSegment = newPlatform === 'google' ? 'android' : newPlatform === 'apple' ? 'apple' : 'all';
    const projSegment = newProject || 'all';
    const currentSearch = new URLSearchParams(location.search);

    if (newRangePreset) {
      currentSearch.set('range', newRangePreset);
      currentSearch.delete('start');
      currentSearch.delete('end');
    } else if (customStart && customEnd) {
      currentSearch.delete('range');
      currentSearch.set('start', customStart);
      currentSearch.set('end', customEnd);
    }
    
    const searchStr = currentSearch.toString() ? `?${currentSearch.toString()}` : '';
    
    // Preserve sub-routes like /store, /retention, /releases while appending platform/project
    const knownSubRoutes = ['store', 'retention', 'releases', 'reports', 'config', 'glossary'];
    const currentSubRoute = pathParts.find(part => knownSubRoutes.includes(part));

    let newPath = `/${platSegment}/${projSegment}${searchStr}`;
    if (currentSubRoute) {
      newPath = `/${currentSubRoute}/${platSegment}/${projSegment}${searchStr}`;
    }

    if (location.pathname + location.search !== newPath) {
      navigate(newPath, { replace: true });
    }
  }, [location.pathname, location.search, navigate, isDemoMode, pathParts]);

  const handleSetPlatform = (p) => {
    setPlatform(p);
    let nextProj = selectedProjectIndex;
    if (selectedProjectIndex === 'all') {
      nextProj = 'all';
    } else if (p !== 'all') {
      const filtered = projects.filter(proj => proj.platform === p);
      const exists = filtered.some(proj => proj.index.toString() === selectedProjectIndex.toString());
      if (!exists && filtered.length > 0) {
        nextProj = 'all';
        setSelectedProjectIndex('all');
      }
    }
    updateUrl(p, nextProj, dateRange.preset ? dateRange.preset.toLowerCase() : null, dateRange.start, dateRange.end);
  };

  const handleSetSelectedProjectIndex = (pIndex) => {
    let nextPlatform = platform;
    if (pIndex === 'all') {
      nextPlatform = 'all';
    } else if (pIndex !== 'manual' && projects.length > 0) {
      const targetProj = projects.find(p => p.index.toString() === pIndex.toString());
      if (targetProj && targetProj.platform) {
        nextPlatform = targetProj.platform;
      } else if (platform === 'all') {
        nextPlatform = 'google';
      }
    }

    if (nextPlatform !== platform) {
      setPlatform(nextPlatform);
    }
    setSelectedProjectIndex(pIndex);
    updateUrl(nextPlatform, pIndex, dateRange.preset ? dateRange.preset.toLowerCase() : null, dateRange.start, dateRange.end);
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
    try {
      const res = await apiFetch('/api/projects', {}, token, isStaticMode);
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
      console.error('Failed to fetch projects', err);
    }
  }, [isStaticMode, platform, selectedProjectIndex]);

  const fetchReleases = useCallback(async () => {
    try {
      const res = await apiFetch('/api/releases', {}, authToken, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        setReleases(data);
      }
    } catch (err) {
      console.error('Failed to fetch releases', err);
    }
  }, [authToken, isStaticMode]);

  useEffect(() => {
    async function checkStatic() {
      try {
        const staticRes = await fetch('./static_config.json');
        if (staticRes.ok) {
          const config = await staticRes.json();
          setIsStaticMode(true);
          setIsDemoMode(config.isDemoMode);
          setNoPass(config.noPass);
        }
      } catch (err) {}
    }
    checkStatic();
  }, []);

  useEffect(() => {
    async function checkAuthStatus() {
      if (noPass || isStaticMode) return;
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          if (data.setupRequired) {
            setSetupRequired(true);
            setIsDemoMode(false);
            setAuthToken(null);
            localStorage.removeItem('apprankly_token');
          }
        }
      } catch (err) {
        console.warn('Auth status check failed.', err);
      }
    }
    checkAuthStatus();
  }, [noPass, isStaticMode]);

  useEffect(() => {
    if (isDemoMode) {
      const sortedMock = sortProjectsByPlatformAndName(MOCK_PROJECTS);
      setProjects(sortedMock);
      if (selectedProjectIndex === 'manual' || !sortedMock.some(p => p.index.toString() === selectedProjectIndex.toString())) {
        setSelectedProjectIndex('all');
      }
      return;
    }
    if (authToken || isStaticMode || noPass) {
      fetchProjects(authToken);
    }
  }, [authToken, isStaticMode, noPass, fetchProjects, isDemoMode]);

  useEffect(() => {
    if (projects.length > 0) {
      if (platform === 'all') {
        if (selectedProjectIndex !== 'all' && selectedProjectIndex !== 'manual') {
          const proj = projects.find(p => p.index.toString() === selectedProjectIndex.toString());
          if (proj && proj.platform) {
            setPlatform(proj.platform);
          }
        }
        return;
      }

      const filtered = projects.filter(p => p.platform === platform);
      const exists = filtered.some(p => p.index.toString() === selectedProjectIndex?.toString());

      if (selectedProjectIndex === 'all') {
        return;
      }

      if (!exists && selectedProjectIndex !== 'manual' && filtered.length > 0) {
        // If current project does not exist under platform, default to first or 'all'
        setSelectedProjectIndex('all');
      }
    }
  }, [platform, projects, selectedProjectIndex]);

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
            const proj = projects.find(p => p.index.toString() === selectedProjectIndex.toString());
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
      const project = projects.find(p => p.index === selectedProjectIndex);
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
      const project = projects.find(p => p.index === selectedProjectIndex);
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
      const project = projects.find(p => p.index === selectedProjectIndex);
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
      loadOverviewStats();
      fetchReleases();
    }
  }, [loadOverviewStats, fetchReleases, authToken, isDemoMode, noPass]);

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
    fetchReleases
  };
}

