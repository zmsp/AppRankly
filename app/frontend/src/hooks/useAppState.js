import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { MOCK_DATA, generateDemoTrends, MOCK_PROJECTS } from '../lib/mockData';
import { getPresetDateRange, parseDateExpression, formatDateISO } from '../lib/dateUtils';
import { buildCacheKey, getCached, setCached, cachedFetch, clearCache } from '../lib/statsCache';
import { sortProjectsByPlatformAndName, findProject, getProjectUrlSegment } from '../lib/projectUtils';

const MOCK_NOTES = [
  {
    id: 'note_demo_1',
    title: 'ASO Screenshot & Title Optimization',
    content: `# ASO Strategy & Keyword Testing\n\n> App Package: \`com.demo.alpha\` | Platform: \`ANDROID\`\n\n- [x] Test new subtitle keywords: "Fast & Privacy-Focused"\n- [x] Design high-contrast icon variant\n- [ ] Set up Google Play Store listing experiment\n- [ ] Reply to recent 3-star customer reviews\n`,
    packageName: 'com.demo.alpha',
    platform: 'google',
    tags: ['aso', 'keywords', 'ab-test'],
    pinned: true,
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-11T14:30:00.000Z'
  },
  {
    id: 'note_demo_2',
    title: 'v2.4 Release Changelog & QA Checklist',
    content: `# Release v2.4 Roadmap\n\n- [x] Finalize production build bundle\n- [x] Run static analysis and unit tests\n- [ ] Prepare App Store Connect release notes\n- [ ] Coordinate launch day marketing push\n`,
    packageName: 'com.demo.gamma',
    platform: 'apple',
    tags: ['release', 'v2.4', 'qa'],
    pinned: false,
    createdAt: '2026-08-08T09:00:00.000Z',
    updatedAt: '2026-08-09T11:15:00.000Z'
  }
];

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
  const [pairings, setPairings] = useState(null);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(() => localStorage.getItem('apprankly_project') || initialProject);
  const [authToken, setAuthToken] = useState(() => {
    const stored = localStorage.getItem('apprankly_token');
    return (stored && stored !== 'null' && stored !== 'undefined') ? stored : null;
  });

  const [starredApps, setStarredApps] = useState(() => {
    try {
      const stored = localStorage.getItem('apprankly_starred_apps');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleStarApp = useCallback((appKey) => {
    setStarredApps(prev => {
      const next = prev.includes(appKey) ? prev.filter(k => k !== appKey) : [...prev, appKey];
      localStorage.setItem('apprankly_starred_apps', JSON.stringify(next));
      if (next.includes(appKey)) {
        toast.success('App starred');
      } else {
        toast('App unstarred', { icon: '⭐' });
      }
      return next;
    });
  }, []);

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
  const [notes, setNotes] = useState([]);
  const [quickNotesOpen, setQuickNotesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dimensionLoading, setDimensionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          setSetupRequired(!!data.setupRequired);
        }
      } catch (err) {
        console.warn('Failed to check auth status:', err);
      }
    };
    if (!isDemoMode) {
      checkAuthStatus();
    }
  }, [isDemoMode]);

  const switchToDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setProjects(MOCK_PROJECTS);
    setError(null);
    if (!window.location.hash.includes('#/demo')) {
      navigate('/demo', { replace: true });
    }
  }, [navigate]);

  // Sync URL when platform, selectedProjectIndex, or dateRange changes
  const updateUrl = useCallback((newPlatform, newProject, newRangePreset, customStart, customEnd) => {
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
      navigate(newPath);
    }
  }, [location.pathname, location.search, navigate, projects, dateRange, platform]);

  const setPlatformAndProject = useCallback((newPlatform, newProject, newRangePreset, customStart, customEnd) => {
    const targetProj = findProject(projects, newProject, newPlatform);
    const projSeg = targetProj ? getProjectUrlSegment(targetProj) : newProject;

    if (newPlatform) setPlatform(newPlatform);
    if (projSeg) setSelectedProjectIndex(projSeg);
    updateUrl(newPlatform || platform, projSeg, newRangePreset, customStart, customEnd);
  }, [projects, platform, updateUrl]);

  // Sync state from location pathname if URL segments change
  useEffect(() => {
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
  }, [location.pathname, platform, selectedProjectIndex]);

  // Sync dateRange state from location search params if query changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get('start');
    const e = params.get('end');
    const r = params.get('range')?.toLowerCase();

    if (s && e) {
      const parsedStart = parseDateExpression(s);
      const parsedEnd = parseDateExpression(e);
      if (parsedStart && parsedEnd) {
        setDateRange(prev => {
          if (prev?.start === parsedStart && prev?.end === parsedEnd && !prev?.preset) return prev;
          return { start: parsedStart, end: parsedEnd, label: 'Custom' };
        });
      }
    } else if (r) {
      const presetRange = getPresetDateRange(r);
      setDateRange(prev => {
        if (prev?.preset?.toLowerCase() === r) return prev;
        return presetRange;
      });
    }
  }, [location.search, isDemoMode]);

  const handleSetPlatform = useCallback((p) => {
    let nextProj = selectedProjectIndex;
    if (p === 'all') {
      nextProj = 'all';
    } else if (selectedProjectIndex !== 'all' && selectedProjectIndex !== 'manual') {
      const activeProj = findProject(projects, selectedProjectIndex, p);
      if (activeProj && activeProj.platform && activeProj.platform !== p) {
        const filtered = projects.filter(proj => proj.platform === p);
        if (filtered.length > 0) {
          nextProj = getProjectUrlSegment(filtered[0]);
        } else {
          nextProj = 'all';
        }
      }
    }
    setPlatformAndProject(p, nextProj);
  }, [selectedProjectIndex, projects, setPlatformAndProject]);

  const handleSetSelectedProjectIndex = useCallback((pIndex) => {
    let nextPlatform = platform;
    const targetProj = findProject(projects, pIndex, platform);
    if (pIndex === 'all') {
      if (!nextPlatform) nextPlatform = 'all';
    } else if (targetProj && targetProj.platform) {
      nextPlatform = targetProj.platform;
    } else if (platform === 'all' && pIndex !== 'manual') {
      nextPlatform = 'google';
    }
    setPlatformAndProject(nextPlatform, pIndex);
  }, [platform, projects, setPlatformAndProject]);

  const handleSetDateRange = useCallback((rangeObj, presetName) => {
    setDateRange(rangeObj);
    if (presetName) {
      updateUrl(platform, selectedProjectIndex, presetName.toLowerCase());
    } else {
      updateUrl(platform, selectedProjectIndex, null, rangeObj.start, rangeObj.end);
    }
  }, [platform, selectedProjectIndex, updateUrl]);

  const fetchProjects = useCallback(async (token) => {
    if (isDemoMode) {
      setProjects(MOCK_PROJECTS);
      setPairings(null);
      return;
    }
    const tokenToUse = token || authToken;
    try {
      const res = await apiFetch('/api/projects?format=object', {}, tokenToUse, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        const rawProjects = Array.isArray(data) ? data : (data.projects || []);
        if (data.pairings) {
          setPairings(data.pairings);
        }
        const sortedData = sortProjectsByPlatformAndName(rawProjects);
        if (sortedData && sortedData.length > 0) {
          setProjects(sortedData);
          if (!window.location.hash.includes('#/demo') && !location.pathname.startsWith('/demo')) {
            setIsDemoMode(false);
          }
          if (selectedProjectIndex === 'manual') {
            const platformFiltered = sortedData.filter(p => p.platform === platform);
            const defaultProj = platformFiltered.length > 1 ? 'all' : (sortedData[0]?.index ?? 'all');
            setSelectedProjectIndex(defaultProj);
          }
        } else {
          // If no projects found on backend, populate MOCK_PROJECTS so Demo Mode presents realistic artificial data
          setProjects(MOCK_PROJECTS);
        }
      }
    } catch (err) {
      if (err.message === 'Unauthorized') {
        setAuthToken(null);
        localStorage.removeItem('apprankly_token');
      }
      console.error('Failed to fetch projects', err);
      setProjects(MOCK_PROJECTS);
    }
  }, [isStaticMode, authToken, isDemoMode, platform, selectedProjectIndex, location.pathname]);

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

  const fetchNotes = useCallback(async () => {
    if (isDemoMode) {
      setNotes(MOCK_NOTES);
      return;
    }
    try {
      const res = await apiFetch('/api/notes', {}, authToken, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to fetch notes', err);
      setNotes(MOCK_NOTES);
    }
  }, [authToken, isStaticMode, isDemoMode]);

  const addNote = useCallback(async (noteData) => {
    if (isDemoMode) {
      const newNote = {
        id: `demo_note_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...noteData
      };
      setNotes(prev => [newNote, ...prev]);
      return { success: true, note: newNote };
    }
    try {
      const res = await apiFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify(noteData)
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchNotes();
        return result;
      }
    } catch (err) {
      console.error('Failed to add note:', err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchNotes]);

  const updateNote = useCallback(async (id, noteData) => {
    if (isDemoMode) {
      setNotes(prev => prev.map(n => String(n.id) === String(id) ? { ...n, ...noteData, updatedAt: new Date().toISOString() } : n));
      return { success: true };
    }
    try {
      const res = await apiFetch(`/api/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(noteData)
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchNotes();
        return result;
      }
    } catch (err) {
      console.error(`Failed to update note ${id}:`, err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchNotes]);

  const deleteNote = useCallback(async (id) => {
    if (isDemoMode) {
      setNotes(prev => prev.filter(n => String(n.id) !== String(id)));
      return { success: true };
    }
    try {
      const res = await apiFetch(`/api/notes/${id}`, {
        method: 'DELETE'
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchNotes();
        return result;
      }
    } catch (err) {
      console.error(`Failed to delete note ${id}:`, err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchNotes]);

  const generateAsoNote = useCallback(async (targetPackageName, targetPlatform, appTitle, summarizedData) => {
    let telemetrySection = '';
    if (summarizedData) {
      const inst = Number(summarizedData.installs || 0).toLocaleString();
      const uninst = Number(summarizedData.uninstalls || 0).toLocaleString();
      const net = Number(summarizedData.netGrowth || ((summarizedData.installs || 0) - (summarizedData.uninstalls || 0)));
      const netFormatted = (net >= 0 ? '+' : '') + net.toLocaleString();
      const active = Number(summarizedData.activeDevices || 0).toLocaleString();
      const ver = summarizedData.version || 'N/A';

      telemetrySection = `## 📊 Telemetry & Performance Summary
- **Total Installs**: ${inst}
- **Total Uninstalls**: ${uninst}
- **Net Growth**: ${netFormatted}
- **Active Devices**: ${active}
- **App Version**: ${ver}

---
`;
    }

    if (isDemoMode) {
      const asoNote = {
        id: `demo_note_aso_${Date.now()}`,
        title: `ASO Recommendations & Audit: ${appTitle || targetPackageName}`,
        content: `# ASO Audit & Strategy: ${appTitle || targetPackageName}

> Generated on: ${new Date().toLocaleDateString()}
> App Package: \`${targetPackageName}\` | Platform: \`${(targetPlatform || 'all').toUpperCase()}\` 

---

${telemetrySection}## 🎯 1. Title & Subtitle Keywords Optimization
- [ ] **Title Keyword Placement**: Ensure high-volume target keywords appear in the primary title (first 30 characters).
- [ ] **Subtitle / Short Description**: Use compelling action verbs and top features.
- [ ] **Character Count Check**:
  - App Store Title: Max 30 chars
  - App Store Subtitle: Max 30 chars
  - Play Store Short Description: Max 80 chars

## 🖼️ 2. Visual Creative Optimization (Screenshots & Icon)
- [ ] **Icon Contrast & Clarity**: Test minimalist vs detailed icon variants.
- [ ] **First 3 Screenshots**: Focus on core value proposition in slide 1 & 2.
- [ ] **Caption Legibility**: Use bold, readable headlines above screenshots.
- [ ] **Localized Assets**: Ensure screenshots are localized for top target markets.

## ⭐ 3. Ratings, Reviews & Conversion Rate
- [ ] **In-App Rating Prompt Trigger**: Trigger prompt after key positive user actions.
- [ ] **Negative Review Outreach**: Reply to all 1-3 star reviews within 48 hours.
- [ ] **A/B Testing Hypothesis**: Set up Product Page Optimization (PPO) or Google Play Store Listing Experiment.

## 📝 4. Action Items & Notes
- Write brainstorming notes here...
`,
        packageName: targetPackageName || 'all',
        platform: targetPlatform || 'all',
        tags: ['aso', 'audit', 'recommendations', 'telemetry'],
        pinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setNotes(prev => [asoNote, ...prev]);
      return { success: true, note: asoNote };
    }
    try {
      const res = await apiFetch('/api/notes/generate-aso', {
        method: 'POST',
        body: JSON.stringify({ packageName: targetPackageName, platform: targetPlatform, appTitle, summarizedData })
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchNotes();
        return result;
      }
    } catch (err) {
      console.error('Failed to generate ASO note:', err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchNotes]);

  const fetchNoteHistory = useCallback(async (noteId) => {
    if (!noteId || isDemoMode) return [];
    try {
      const res = await apiFetch(`/api/notes/${noteId}/history`, {}, authToken, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        return data.history || [];
      }
    } catch (err) {
      console.error(`Failed to fetch history for note ${noteId}:`, err);
    }
    return [];
  }, [authToken, isStaticMode, isDemoMode]);

  const restoreNoteVersion = useCallback(async (noteId, commitHash, restoredContent, title) => {
    if (isDemoMode) {
      setNotes(prev => prev.map(n => String(n.id) === String(noteId) ? { ...n, content: restoredContent, title: title || n.title, updatedAt: new Date().toISOString() } : n));
      return { success: true };
    }
    try {
      const res = await apiFetch(`/api/notes/${noteId}/restore`, {
        method: 'POST',
        body: JSON.stringify({ commitHash, content: restoredContent, title })
      }, authToken, isStaticMode);
      if (res.ok) {
        const result = await res.json();
        await fetchNotes();
        return result;
      }
    } catch (err) {
      console.error(`Failed to restore note ${noteId}:`, err);
      throw err;
    }
  }, [authToken, isStaticMode, isDemoMode, fetchNotes]);

  const sendNoteAiChat = useCallback(async (noteTitle, noteContent, messages, provider, model, confirmDownload = false) => {
    if (isStaticMode || isDemoMode) {
      if (provider === 'local') {
        try {
          const { pipeline } = await import('@huggingface/transformers');
          const lastUserMsg = messages[messages.length - 1]?.content || "";
          const generator = await pipeline('text-generation', 'HuggingFaceTB/SmolLM2-135M-Instruct');
          const output = await generator(lastUserMsg, { max_new_tokens: 120, temperature: 0.7, repetition_penalty: 1.2 });
          let replyText = output[0]?.generated_text || "";
          if (replyText.startsWith(lastUserMsg)) {
            replyText = replyText.slice(lastUserMsg.length).trim();
          }
          return { reply: replyText || "SmolLM2 Demo: Direct concise answer generated." };
        } catch (e) {
          console.warn("Client-side local AI error:", e);
          return { reply: `[Static/Demo Mode] Local AI Browser Inference initialized (${e.message || 'Falling back'}). Configure an API key in backend for remote models.` };
        }
      }
      return { reply: "Demo Mode: AI Chat responses are simulated for remote API providers. Switch to 'Local Model (SmolLM2-135M)' in the dropdown to test browser-side local AI!" };
    }
    try {
      const res = await apiFetch('/api/notes/ai-chat', {
        method: 'POST',
        body: JSON.stringify({ noteTitle, noteContent, messages, provider, model, confirmDownload })
      }, authToken, isStaticMode);
      if (res.ok) {
        return await res.json();
      }
      return { reply: "Error contacting AI server." };
    } catch (err) {
      console.error('Note AI Chat error:', err);
      return { reply: `Error: ${err.message}` };
    }
  }, [authToken, isStaticMode, isDemoMode]);

  // Load Main Stats Overview
  const loadOverviewStats = useCallback(async () => {
    setError(null);

    if (isDemoMode) {
      setLoading(true);
      setTimeout(() => {
        const { dailyTrends, appTrends, platformTotals } = generateDemoTrends(dateRange.start, dateRange.end);
        let currentTrends = dailyTrends;
        let currentActive = dailyTrends[dailyTrends.length - 1]?.activeDevices || MOCK_DATA.overview.currentlyActiveDevices;

        const effectiveProjects = projects.length > 0 ? projects : MOCK_PROJECTS;
        if (selectedProjectIndex !== 'all' && selectedProjectIndex !== 'manual') {
            const proj = findProject(effectiveProjects, selectedProjectIndex, platform);
            if (proj && (appTrends[proj.packageName] || appTrends[proj.name])) {
               const entry = appTrends[proj.packageName] || appTrends[proj.name];
               currentTrends = entry.trends || entry;
               currentActive = currentTrends[currentTrends.length - 1]?.activeDevices || currentActive;
            }
        }

        setStats({
          ...MOCK_DATA.overview,
          dailyTrends: currentTrends,
          appTrends,
          platformTotals,
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
      fetchNotes();
    }
  }, [fetchProjects, fetchReleases, fetchNotes, authToken, isDemoMode, noPass]);

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

  const forceRefresh = useCallback(async () => {
    setLoading(true);
    setDimensionLoading(true);
    const toastId = toast.loading('Refreshing data...');
    try {
      if (!isDemoMode) {
        await apiFetch('/api/refresh', { method: 'POST' }, authToken, isStaticMode);
      }
      toast.success('Data refreshed successfully', { id: toastId });
    } catch (err) {
      console.warn('Backend stats refresh error:', err);
      toast.error('Failed to refresh data', { id: toastId });
    } finally {
      clearCache();
      await Promise.all([
        loadOverviewStats(),
        loadDimensionStats(activeDimension),
        fetchDeviceStatsIfNeeded()
      ]);
    }
  }, [isDemoMode, authToken, isStaticMode, loadOverviewStats, loadDimensionStats, activeDimension, fetchDeviceStatsIfNeeded]);

  const forceRefreshRange = useCallback(async (customStart, customEnd) => {
    const start = customStart || dateRange?.start;
    const end = customEnd || dateRange?.end;
    setLoading(true);
    setDimensionLoading(true);
    const toastId = toast.loading(`Refreshing date range (${start} - ${end})...`);
    try {
      if (!isDemoMode) {
        console.log(`[Frontend] Calling /api/force-refresh-range for ${start} to ${end}`);
        await apiFetch('/api/force-refresh-range', {
          method: 'POST',
          body: JSON.stringify({
            startDate: start,
            endDate: end,
            platform,
            projectIndex: selectedProjectIndex
          })
        }, authToken, isStaticMode);
      }
      toast.success(`Refreshed data for ${start} to ${end}`, { id: toastId });
    } catch (err) {
      console.warn('Backend force refresh date range error:', err);
      toast.error('Failed to refresh range', { id: toastId });
    } finally {
      clearCache();
      await Promise.all([
        loadOverviewStats(),
        loadDimensionStats(activeDimension),
        fetchDeviceStatsIfNeeded()
      ]);
    }
  }, [dateRange, platform, selectedProjectIndex, isDemoMode, authToken, isStaticMode, loadOverviewStats, loadDimensionStats, activeDimension, fetchDeviceStatsIfNeeded]);

  return {
    isDemoMode, setIsDemoMode,
    isStaticMode, noPass,
    platform, setPlatform: handleSetPlatform, setRawPlatform: setPlatform, setPlatformAndProject,
    activeDimension, setActiveDimension,
    comparisonMode, setComparisonMode,
    granularity, setGranularity,
    projects, setProjects,
    pairings, setPairings,
    selectedProjectIndex, setSelectedProjectIndex: handleSetSelectedProjectIndex,
    authToken, setAuthToken,
    starredApps, toggleStarApp,
    dateRange, setDateRange: handleSetDateRange,
    stats, dimensionStats, deviceStats,
    releases, setReleases,
    notes, setNotes,
    quickNotesOpen, setQuickNotesOpen,
    loading, dimensionLoading, error,
    setupRequired, setSetupRequired,
    refreshData: forceRefresh,
    forceRefreshRange,
    switchToDemoMode,
    fetchProjects,
    fetchReleases,
    addRelease,
    updateRelease,
    deleteRelease,
    autoDetectReleases,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    generateAsoNote,
    fetchNoteHistory,
    restoreNoteVersion,
    sendNoteAiChat
  };
}


