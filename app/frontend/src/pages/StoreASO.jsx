import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, MousePointer, Download, Percent, Search, Sparkles, CheckCircle,
  TrendingUp, Key, Globe, Shield, RefreshCw, Copy, Plus, AlertCircle, Bot,
  Users, MessageSquare, Sliders, CheckSquare, BookOpen, Info, HelpCircle, Zap,
  BarChart2, ArrowRight, ChevronDown, ChevronUp, Layers, AlertTriangle, FileText,
  LayoutGrid, Star, Target, Calendar, Award, Trash2, Camera, Check, DollarSign
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PortfolioAsoScores from '../components/PortfolioAsoScores';
import { saveCachedAudit, getCachedAudit, getCachedAuditStats, getAppAsoAudit } from '../lib/asoCache';
import { formatNumber, formatRate } from '../lib/format';
import { apiFetch } from '../lib/api';
import AppIcon from '../components/AppIcon';
import KeywordHintsRadar from '../components/KeywordHintsRadar';
import MetadataLinterPanel from '../components/MetadataLinterPanel';
import PppPricingCalculator from '../components/PppPricingCalculator';
import { MOCK_PROJECTS } from '../lib/mockData';
import { findProject, getProjectUrlSegment } from '../lib/projectUtils';

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const PROVIDER_PRESET_MODELS = {
  gemini: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest Flash / Recommended)' },
    { id: 'gemini-3.8-flash-lite', name: 'Gemini 3.8 Flash Lite (Latest Lite / Fast)' },
    { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro (Advanced Reasoning)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
  ],
  openai: [
    { id: 'gpt-5-nano', name: 'GPT-5 Nano (Ultra-fast)' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano (Balanced)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal)' },
    { id: 'o3-mini', name: 'o3-mini (Reasoning)' },
    { id: 'o1', name: 'o1 (Complex Reasoning)' }
  ],
  anthropic: [
    { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (Fast)' },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
  ]
};

export function getDemoAsoData(pkgName = '', project = {}) {
  const name = project?.name || 'Selected App';
  const isAlpha = pkgName.includes('alpha') || name.includes('Alpha') || pkgName === 'com.demo.alpha' || project?.index === 'demo1';
  const isBeta = pkgName.includes('beta') || name.includes('Beta') || pkgName === 'com.demo.beta' || project?.index === 'demo2';
  const isGamma = pkgName.includes('gamma') || name.includes('Gamma') || pkgName === 'com.demo.gamma' || project?.index === 'demo3';

  const baseSnapshot = {
    title: isBeta ? `${name} - Fitness & Calorie Macro Counter` : isGamma ? `${name} - Budget & Expense Tracker` : `${name} - AI Task Manager & Todo List`,
    developer: "Demo Studios",
    category: isBeta ? "Health & Fitness" : isGamma ? "Finance" : "Productivity",
    score: isBeta ? 4.8 : isGamma ? 4.6 : 4.9,
    content_rating: "Everyone",
    price: "Free",
    icon_url: project?.iconUrl
  };

  const lastAudit = isBeta ? {
    score: 92,
    headline: "Excellent screenshot conversion & high keyword coverage! Strong category ranking potential.",
    improvements: [
      { type: "Localization", impact: "high", issue: "Global Market Reach", recommendation: "Translate short description into Spanish (ES) & German (DE) to capture non-English search traffic (+18% growth)." },
      { type: "Subtitle", impact: "high", issue: "Brand vs Generic Keywords", recommendation: "Replace redundant brand word with high-volume search query 'Macro Tracker' in subtitle." },
      { type: "Keywords Field", impact: "medium", issue: "Unused Character Limit", recommendation: "Utilize remaining 18 characters in Apple 100-char keyword field with 'meal,planner'." }
    ]
  } : isGamma ? {
    score: 84,
    headline: "Solid base metadata; subtitle and description require secondary keyword enrichment to improve indexation.",
    improvements: [
      { type: "Subtitle", impact: "high", issue: "Search Relevance", recommendation: "Incorporate 'Money Manager' and 'Bill Organizer' into subtitle for targeted search indexation." },
      { type: "Description", impact: "high", issue: "Formatting Retention", recommendation: "Format top 5 feature benefits as bullet points to increase reader retention by 22%." },
      { type: "Rating Prompt", impact: "medium", issue: "In-App Prompting", recommendation: "Trigger rating dialog after 3rd completed budget entry to boost 5-star review volume." }
    ]
  } : isAlpha ? {
    score: 88,
    headline: "Strong title keyword density; short description requires a clearer value proposition & call-to-action.",
    improvements: [
      { type: "Title", impact: "high", issue: "Keyword Placement", recommendation: "Incorporate primary seed term 'Planner' in title prefix for +14% search impression boost." },
      { type: "Short Description", impact: "high", issue: "Call to Action", recommendation: "Add explicit benefit 'Boost productivity 2x daily' in first 80 characters of short description." },
      { type: "Screenshots", impact: "high", issue: "Feature Callouts", recommendation: "Add high-contrast feature caption badges to first 3 preview screenshots." },
      { type: "Description", impact: "medium", issue: "Keyword Density", recommendation: "Increase density for 'task tracker' and 'todo list' to optimal 2.5% target." }
    ]
  } : null;

  const keywords = isBeta ? [
    { id: 1, term: 'calorie counter', search_volume: 88, difficulty: 64, current_rank: 3, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
    { id: 2, term: 'macro tracker', search_volume: 79, difficulty: 52, current_rank: 5, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
    { id: 3, term: 'workout log', search_volume: 74, difficulty: 48, current_rank: 7, tracked: 1, source: 'seed', autocomplete_verified: 1 },
    { id: 4, term: 'diet planner', search_volume: 68, difficulty: 41, current_rank: 4, tracked: 1, source: 'suggest', autocomplete_verified: 0 }
  ] : isGamma ? [
    { id: 1, term: 'budget planner', search_volume: 82, difficulty: 58, current_rank: 4, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
    { id: 2, term: 'expense tracker', search_volume: 85, difficulty: 62, current_rank: 6, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
    { id: 3, term: 'money manager', search_volume: 71, difficulty: 45, current_rank: 8, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
    { id: 4, term: 'bill reminder', search_volume: 64, difficulty: 38, current_rank: 5, tracked: 1, source: 'seed', autocomplete_verified: 0 }
  ] : [
    { id: 1, term: 'task manager', search_volume: 91, difficulty: 70, current_rank: 2, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
    { id: 2, term: 'todo list', search_volume: 94, difficulty: 78, current_rank: 5, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
    { id: 3, term: 'productivity planner', search_volume: 76, difficulty: 51, current_rank: 3, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
    { id: 4, term: 'daily schedule', search_volume: 69, difficulty: 44, current_rank: 6, tracked: 1, source: 'seed', autocomplete_verified: 0 }
  ];

  const competitors = [
    {
      appId: "com.competitor.alpha",
      title: "FitPulse - Calorie & Macro Log",
      developer: "FitPulse Inc.",
      category: isBeta ? "Health & Fitness" : "Productivity",
      score: 4.7,
      installs: "1,000,000+",
      priceText: "Free",
      icon: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=100&auto=format&fit=crop&q=60"
    },
    {
      appId: "com.competitor.beta",
      title: "FocusFlow Daily Planner",
      developer: "FocusFlow Labs",
      category: "Productivity",
      score: 4.5,
      installs: "500,000+",
      priceText: "Free",
      icon: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=100&auto=format&fit=crop&q=60"
    },
    {
      appId: "com.competitor.gamma",
      title: "SmartSpend Money Manager",
      developer: "SmartSpend Tech",
      category: "Finance",
      score: 4.4,
      installs: "250,000+",
      priceText: "Free",
      icon: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=100&auto=format&fit=crop&q=60"
    }
  ];

  const competitorGaps = [
    { term: "intermittent fasting", targetedByCompetitors: ["FitPulse - Calorie & Macro Log"], opportunity: "High demand search volume (84/100). Competitor uses it in Title prefix." },
    { term: "bill split calculator", targetedByCompetitors: ["SmartSpend Money Manager"], opportunity: "Medium difficulty (42/100). Unused opportunity in your subtitle." },
    { term: "pomodoro timer", targetedByCompetitors: ["FocusFlow Daily Planner"], opportunity: "High intent term (+24% conversion hook). Add to short description." }
  ];

  const competitorHooks = [
    { competitorKey: "com.competitor.alpha", primaryHook: "AI Photo Calorie Scanner with 99% macro accuracy" },
    { competitorKey: "com.competitor.beta", primaryHook: "1-Tap Habit Stacking & GTD Matrix Sync" },
    { competitorKey: "com.competitor.gamma", primaryHook: "Zero-Data Collection Offline Budget Tracker" }
  ];

  const reviewThemes = [
    { themeName: "Feature Request: Apple Watch & Widget Sync", sentiment: "feature_request", count: 42, sampleQuote: "Love the app but desperately need home screen widgets and watch sync!", insight: "High user demand for widgets. Mentioning 'Widget & Sync' in metadata could boost conversion." },
    { themeName: "Clean UI & Fast Offline Mode", sentiment: "positive", count: 128, sampleQuote: "Super fast log without annoying login screens. Best tracker I've used.", insight: "Core selling point is 'Fast & Offline'. Highlight this in the first 80 characters of short description." },
    { themeName: "Dark Mode Contrast Request", sentiment: "negative", count: 15, sampleQuote: "Hard to read text in dark mode on low brightness.", insight: "UX issue affecting ratings. Fixing in next build will protect 4.8★ rating." }
  ];

  const actionPlan = [
    { id: 1, task: "Incorporate 'Macro Tracker' in Subtitle", impact: "high", status: "pending", category: "Metadata Optimization" },
    { id: 2, task: "Fill remaining 18 characters in Apple Keyword Field with 'meal,planner'", impact: "high", status: "completed", category: "Character Efficiency" },
    { id: 3, task: "Format top 5 feature benefits as bullet points in full description", impact: "medium", status: "pending", category: "Conversion Hook" },
    { id: 4, task: "Add 'Widget' & 'Offline' feature callouts to Screenshot 1 & 2 captions", impact: "high", status: "pending", category: "Creative Asset ASO" },
    { id: 5, task: "Remove duplicate keyword 'Tracker' from Apple keyword field (already in Title)", impact: "medium", status: "pending", category: "Apple Store Indexation" }
  ];

  return {
    listingSnapshot: baseSnapshot,
    lastAudit,
    keywords,
    competitors,
    competitorGaps,
    competitorHooks,
    reviewThemes,
    actionPlan
  };
}

function AsoAppSwitcher({ projects, activeProject, isAllScope, platform, onSelectProject, setPlatform }) {
  const navigate = useNavigate();
  const go = (proj) => {
    if (!proj) {
      onSelectProject?.('all');
      setPlatform?.('all');
      navigate('/store/all/all');
      return;
    }
    const plat = proj.platform || 'google';
    const seg = getProjectUrlSegment(proj);
    setPlatform?.(plat);
    onSelectProject?.(seg);
    navigate(`/store/${plat === 'apple' ? 'apple' : 'android'}/${seg}`);
  };
  const pill = (active) => clsx(
    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer",
    active ? "bg-indigo-600 text-white ring-1 ring-indigo-400/40" : "text-slate-400 hover:text-white hover:bg-white/5"
  );
  return (
    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar p-1.5 bg-slate-900/60 rounded-2xl border border-white/10" role="tablist" aria-label="Select app">
      <button id="aso-switch-all" role="tab" aria-selected={isAllScope} onClick={() => go(null)} className={pill(isAllScope)}>
        <LayoutGrid size={14} />
        <span>All Apps</span>
        <span className="px-1.5 rounded-full text-[10px] font-mono bg-white/10">{projects.length}</span>
      </button>
      {projects.map(p => {
        const active = !isAllScope && activeProject && p.index === activeProject.index && p.platform === activeProject.platform;
        return (
          <button key={`${p.platform}-${p.index}`} id={`aso-switch-${p.platform}-${p.index}`} role="tab" aria-selected={!!active} onClick={() => go(p)} className={pill(active)} title={p.packageName}>
            <AppIcon iconUrl={p.iconUrl} name={p.name} platform={p.platform} className="w-5 h-5 rounded-md shrink-0" />
            <span className="max-w-[140px] truncate">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function StoreASO({ stats, isDemoMode, projects: rawProjects = [], selectedProjectIndex, platform = 'play', authToken, onSelectProject, setPlatform }) {
  const projects = rawProjects.length > 0 ? rawProjects : MOCK_PROJECTS;
  const activeProject = findProject(projects, selectedProjectIndex, platform) || projects[0] || MOCK_PROJECTS[0];
  const packageName = activeProject?.packageName || 'com.example.app';
  const effectivePlatform = activeProject?.platform || platform;
  const isAllScope = selectedProjectIndex === 'all' || !selectedProjectIndex;
  const appSwitcher = (
    <AsoAppSwitcher projects={projects} activeProject={activeProject} isAllScope={isAllScope} platform={platform} onSelectProject={onSelectProject} setPlatform={setPlatform} />
  );

  // Sub-Navigation Tab State
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'keywords' | 'competitors' | 'reviews' | 'builder' | 'action_plan'

  // AI & Overview States
  const [aiStatus, setAiStatus] = useState({ providers: [], defaultProvider: 'anthropic' });
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [customModel, setCustomModel] = useState('');
  const [asoData, setAsoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [compLoading, setCompLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Portfolio ASO Section state (default collapsed)
  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  const [refreshingAsoStats, setRefreshingAsoStats] = useState(false);

  const handleRefreshAsoStats = async () => {
    setRefreshingAsoStats(true);
    try {
      await fetchAsoOverview();
    } catch (e) {
      console.warn('ASO overview refresh error:', e);
    } finally {
      setTimeout(() => {
        setRefreshingAsoStats(false);
      }, 500);
    }
  };

  // Input fields for features
  const [seedKeyword, setSeedKeyword] = useState('');
  const [clusterTarget, setClusterTarget] = useState('general');
  const [candidates, setCandidates] = useState([]);
  const [coverageData, setCoverageData] = useState(null);

  // Metadata Sandbox Input States
  const [metadataInputs, setMetadataInputs] = useState({
    title: '',
    short_description: '',
    subtitle: '',
    keyword_field: '',
    description: ''
  });
  const [densityKeyword, setDensityKeyword] = useState('tracker');

  // Action Plan Checklist State
  const [actionItems, setActionItems] = useState([]);

  // Draft Review Response State
  const [selectedThemeForResponse, setSelectedThemeForResponse] = useState(null);
  const [draftedResponse, setDraftedResponse] = useState('');
  const [draftingLoading, setDraftingLoading] = useState(false);

  // Rating Target & Trajectory Calculator State
  const [targetRating, setTargetRating] = useState(4.5);
  const [weeklyVelocity, setWeeklyVelocity] = useState(5);
  const [customRatingInput, setCustomRatingInput] = useState(null);
  const [customRatingsCountInput, setCustomRatingsCountInput] = useState(null);

  // Live Keyword Rank Tracking State (v2.0.0)
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [singleRankChecking, setSingleRankChecking] = useState({});

  // Manual Competitor Tracking State (v1.6.0)
  const [newCompetitorInput, setNewCompetitorInput] = useState('');
  const [addingCompetitor, setAddingCompetitor] = useState(false);

  // Negative Review Alert Scan State (v1.6.0)
  const [reviewScanLoading, setReviewScanLoading] = useState(false);
  const [reviewScanResult, setReviewScanResult] = useState(null);

  // Metadata Change Timeline State (v1.6.0)
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Compute live impressions, page views, downloads from selected app stats
  const impressions = stats?.storeImpressions ?? (isDemoMode ? 4520 : 0);
  const pageViews = stats?.productPageViews ?? (isDemoMode ? 1130 : 0);
  const downloads = stats?.totalDailyUserInstalls ?? stats?.totalInstallCountByUser ?? (isDemoMode ? 248 : 0);

  const viewConversionRate = impressions > 0 ? pageViews / impressions : (isDemoMode ? 0.25 : 0);
  const downloadConversionRate = pageViews > 0 ? downloads / pageViews : (isDemoMode ? 0.22 : 0);

  useEffect(() => {
    fetchAiStatus();
    fetchAsoOverview();
  }, [selectedProjectIndex, platform, packageName]);

  useEffect(() => {
    if (asoData?.actionPlan) {
      setActionItems(asoData.actionPlan);
    }
  }, [asoData]);

  // Pre-fill metadata inputs when listingSnapshot changes
  useEffect(() => {
    if (asoData?.listingSnapshot) {
      setMetadataInputs(prev => ({
        ...prev,
        title: asoData.listingSnapshot.title || '',
        short_description: asoData.listingSnapshot.short_desc || '',
        subtitle: asoData.listingSnapshot.subtitle || '',
        keyword_field: 'fitness,macro,diet,planner,calorie',
        description: asoData.listingSnapshot.description || 'Track your daily goals with AI assistance and instant analytics.'
      }));
    }
  }, [asoData]);

  const fetchAiStatus = async () => {
    try {
      const res = await apiFetch('/api/ai/status', {}, authToken);
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
        if (data.defaultProvider) setSelectedProvider(data.defaultProvider);
      }
    } catch (e) {
      console.warn('Could not fetch AI status:', e.message);
    }
  };

  const fetchAsoOverview = async () => {
    const cachedAudit = getCachedAudit(packageName);

    if (isDemoMode) {
      const demo = getDemoAsoData(packageName, activeProject);
      if (cachedAudit) {
        demo.lastAudit = { ...demo.lastAudit, ...cachedAudit };
      }
      setAsoData(demo);
      setActionItems(demo.actionPlan);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/aso/overview', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform, projectIndex: selectedProjectIndex })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        const demoFallback = getDemoAsoData(packageName, activeProject);
        const finalAudit = cachedAudit || data.lastAudit || demoFallback.lastAudit;
        const reviewThemes = data.reviewThemes || demoFallback.reviewThemes;
        setAsoData({
          ...demoFallback,
          ...data,
          reviewThemes,
          lastAudit: finalAudit
        });
      }
    } catch (e) {
      console.error('Failed to load ASO overview:', e);
      const demoFallback = getDemoAsoData(packageName, activeProject);
      if (cachedAudit) demoFallback.lastAudit = { ...demoFallback.lastAudit, ...cachedAudit };
      setAsoData(demoFallback);
    } finally {
      setLoading(false);
    }
  };

  // Store Metadata Repull State (v2.0.0)
  const [repullLoading, setRepullLoading] = useState(false);
  const [repullFeedback, setRepullFeedback] = useState(null);

  const handleRepullStoreData = async () => {
    setRepullLoading(true);
    setRepullFeedback(null);
    try {
      if (isDemoMode) {
        setTimeout(() => {
          setRepullLoading(false);
          setRepullFeedback('Fresh demo store metadata re-pulled!');
          setTimeout(() => setRepullFeedback(null), 3000);
        }, 600);
        return;
      }
      const res = await apiFetch('/api/aso/repull', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data?.listingSnapshot) {
          setAsoData(prev => ({
            ...prev,
            listingSnapshot: data.listingSnapshot
          }));
          setMetadataInputs(prev => ({
            ...prev,
            title: data.listingSnapshot.title || '',
            short_description: data.listingSnapshot.short_desc || '',
            subtitle: data.listingSnapshot.subtitle || '',
            description: data.listingSnapshot.description || prev.description
          }));
          setRepullFeedback('Store metadata re-pulled & cache updated!');
          fetchPromptPreview();
          setTimeout(() => setRepullFeedback(null), 3500);
        }
      } else {
        setRepullFeedback('Could not repull from store. Check network/rate-limits.');
        setTimeout(() => setRepullFeedback(null), 4000);
      }
    } catch (e) {
      console.error('Repull error:', e);
      setRepullFeedback('Error repulling store data');
      setTimeout(() => setRepullFeedback(null), 4000);
    } finally {
      setRepullLoading(false);
    }
  };

  // Portfolio ASO Job State (Parent ASO Tab)
  const [jobStatus, setJobStatus] = useState(null);
  const [jobRunning, setJobRunning] = useState(false);

  useEffect(() => {
    if (!isDemoMode) {
      apiFetch('/api/aso/portfolio/job/status', {}, authToken)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.status === 'running') {
            setJobStatus(data);
            setJobRunning(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    let timer = null;
    if (jobRunning && !isDemoMode) {
      timer = setInterval(async () => {
        try {
          const res = await apiFetch('/api/aso/portfolio/job/status', {}, authToken);
          if (res.ok) {
            const data = await res.json();
            setJobStatus(data);
            if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
              setJobRunning(false);
              if (data.results && Array.isArray(data.results)) {
                data.results.forEach(item => {
                  if (item.packageName && item.score != null) {
                    saveCachedAudit(item.packageName, {
                      score: item.score,
                      headline: item.headline,
                      improvements: item.improvements || []
                    });
                  }
                });
              }
              window.dispatchEvent(new CustomEvent('aso_audit_updated', { detail: { job: data } }));
            }
          }
        } catch (e) {
          console.warn('Job status poll error:', e);
        }
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [jobRunning, isDemoMode]);

  const handleStartPortfolioJob = async (options = {}) => {
    const opts = typeof options === 'boolean' ? { force: options } : options;
    const refreshOnly = Boolean(opts?.refreshOnly);
    const runAi = Boolean(opts?.runAi ?? !refreshOnly);
    const force = Boolean(opts?.force);

    if (isDemoMode) {
      setJobRunning(true);
      setJobStatus({
        status: 'running',
        jobType: refreshOnly ? 'refresh' : 'ai',
        phase: refreshOnly ? 'Refreshing store metadata from stores...' : 'Running AI listing audit & ASO analytics...',
        progress: 25,
        currentApp: 'Demo App 1 (Alpha)',
        total: 3,
        processed: 0
      });
      setTimeout(() => {
        setJobStatus(prev => ({ ...prev, progress: 65, currentApp: 'Demo App 2 (Beta)', processed: 1 }));
        setTimeout(() => {
          setJobStatus({
            status: 'completed',
            jobType: refreshOnly ? 'refresh' : 'ai',
            phase: refreshOnly ? 'Completed metadata refresh across 3 demo apps' : 'Completed AI analytics across 3 demo apps',
            progress: 100,
            currentApp: null,
            total: 3,
            processed: 3,
            avgScore: 89,
            results: [
              { packageName: 'com.demo.alpha', score: 92, headline: 'Strong title keyword density; short description requires value proposition.' },
              { packageName: 'com.demo.beta', score: 86, headline: 'Solid base metadata; subtitle needs secondary keyword enrichment.' },
              { packageName: 'com.demo.gamma', score: 88, headline: 'High conversion screenshot structure and keyword placement.' }
            ]
          });
          setJobRunning(false);
          if (runAi) {
            ['com.demo.alpha', 'com.demo.beta', 'com.demo.gamma'].forEach((pkg, idx) => {
              saveCachedAudit(pkg, {
                score: [92, 86, 88][idx],
                headline: 'Audit completed via Portfolio ASO Job.',
                improvements: []
              });
            });
          }
          window.dispatchEvent(new CustomEvent('aso_audit_updated', { detail: {} }));
        }, 1000);
      }, 1000);
      return;
    }

    setJobRunning(true);
    try {
      const res = await apiFetch('/api/aso/portfolio/job/start', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          force,
          refreshOnly,
          runAi,
          provider: selectedProvider,
          model: customModel
        })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        setJobStatus(data.job || { status: 'running', progress: 0, jobType: refreshOnly ? 'refresh' : 'ai' });
      } else {
        setJobRunning(false);
      }
    } catch (e) {
      console.error('Failed to start portfolio job:', e);
      setJobRunning(false);
    }
  };

  const handleCancelPortfolioJob = async () => {
    if (isDemoMode) {
      setJobRunning(false);
      setJobStatus(null);
      return;
    }
    try {
      await apiFetch('/api/aso/portfolio/job/cancel', { method: 'POST' }, authToken);
    } catch (e) {
      console.error('Cancel job error:', e);
    }
  };

  // Audit Editable Parameters Drawer State
  const [showAuditParams, setShowAuditParams] = useState(false);
  const [focusArea, setFocusArea] = useState('Metadata optimization & keyword placement');
  const [customListingText, setCustomListingText] = useState('');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPromptPreview = async (overrideFocus) => {
    setPreviewLoading(true);
    try {
      const res = await apiFetch('/api/aso/prompt-preview', {
        method: 'POST',
        body: JSON.stringify({
          packageName,
          platform: effectivePlatform,
          focusArea: overrideFocus || focusArea
        })
      }, authToken);

      if (res.ok) {
        const data = await res.json();
        if (data?.scrapedListingText) {
          setCustomListingText(data.scrapedListingText);
        }
      }
    } catch (e) {
      console.warn('Could not fetch prompt preview:', e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleParamsDrawer = () => {
    const nextState = !showAuditParams;
    setShowAuditParams(nextState);
    if (nextState && !customListingText) {
      fetchPromptPreview();
    }
  };

  useEffect(() => {
    if (!isDemoMode) {
      fetchPromptPreview();
    }
  }, [packageName, platform]);

  const handleRunAudit = async () => {
    setAuditLoading(true);
    if (isDemoMode) {
      setTimeout(() => {
        const auditObj = {
          score: 95,
          headline: "AI Listing Audit complete! High conversion metadata structure with primary keyword placement.",
          improvements: [
            { type: "Subtitle", impact: "high", issue: "Keyword Placement", recommendation: "Include primary seed term in subtitle to capture +15% search impression traffic." },
            { type: "Short Description", impact: "high", issue: "Call to Action", recommendation: "Lead with explicit user benefit in first line of short description." },
            { type: "Screenshots", impact: "medium", issue: "Social Proof", recommendation: "Feature top rating badge '4.9★ Rated by Users' on screenshot 1 preview." }
          ]
        };
        setAsoData(prev => ({
          ...prev,
          lastAudit: auditObj
        }));
        saveCachedAudit(packageName, auditObj);
        setAuditLoading(false);
      }, 600);
      return;
    }
    try {
      const summarizedData = {
        installs: stats?.totalDailyUserInstalls || 0,
        uninstalls: stats?.totalDailyUserUninstalls || 0,
        activeDevices: stats?.currentlyActiveDevices || 0,
        healthScore: stats?.appHealthScore || 0
      };

      const res = await apiFetch('/api/aso/audit', {
        method: 'POST',
        body: JSON.stringify({
          packageName,
          platform: effectivePlatform,
          provider: selectedProvider,
          model: customModel || undefined,
          focusArea,
          customListingText: customListingText || undefined,
          maxTokens: parseInt(maxTokens, 10) || undefined,
          summarizedData
        })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data?.audit) {
          setAsoData(prev => ({ ...prev, lastAudit: data.audit }));
          saveCachedAudit(packageName, data.audit);
        }
      }
    } catch (e) {
      alert('Audit error: ' + e.message);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleExpandKeywords = async () => {
    if (!seedKeyword.trim()) return;
    setLoading(true);
    if (isDemoMode) {
      setTimeout(() => {
        const newTerms = [
          { id: Date.now() + 1, term: `${seedKeyword} app`, search_volume: 75, difficulty: 45, current_rank: 8, tracked: 1, source: 'suggest', autocomplete_verified: 1 },
          { id: Date.now() + 2, term: `${seedKeyword} free`, search_volume: 82, difficulty: 55, current_rank: 12, tracked: 0, source: 'suggest', autocomplete_verified: 1 },
          { id: Date.now() + 3, term: `best ${seedKeyword}`, search_volume: 89, difficulty: 68, current_rank: 4, tracked: 1, source: 'suggest', autocomplete_verified: 1 }
        ];
        setAsoData(prev => ({
          ...prev,
          keywords: [...newTerms, ...(prev?.keywords || [])]
        }));
        setSeedKeyword('');
        setLoading(false);
      }, 500);
      return;
    }
    try {
      await apiFetch('/api/aso/keywords/expand', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform, seed: seedKeyword })
      }, authToken);
      setSeedKeyword('');
      fetchAsoOverview();
    } catch (e) {
      alert('Expansion error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const [rankChecking, setRankChecking] = useState(false);
  const handleCheckKeywordRanks = async () => {
    setRankChecking(true);
    try {
      if (!isDemoMode) {
        await apiFetch('/api/aso/ranks/check', {
          method: 'POST',
          body: JSON.stringify({ packageName, platform: effectivePlatform })
        }, authToken);
        await fetchAsoOverview();
      }
    } catch (e) {
      alert('Rank check error: ' + e.message);
    } finally {
      setRankChecking(false);
    }
  };

  const handleRunCompetitorAnalysis = async () => {
    setCompLoading(true);
    if (isDemoMode) {
      setTimeout(() => {
        setCompLoading(false);
      }, 500);
      return;
    }
    try {
      const res = await apiFetch('/api/aso/competitors', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform, provider: selectedProvider, model: customModel || undefined })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data?.gaps) {
          setAsoData(prev => ({
            ...prev,
            competitorGaps: data.gaps.gaps || prev.competitorGaps,
            competitorHooks: data.gaps.competitorHooks || prev.competitorHooks
          }));
        }
      }
    } catch (e) {
      console.warn('Competitor analysis error:', e.message);
    } finally {
      setCompLoading(false);
    }
  };

  const handleSyncReviews = async () => {
    setReviewsLoading(true);
    if (isDemoMode) {
      setTimeout(() => {
        setReviewsLoading(false);
      }, 500);
      return;
    }
    try {
      const res = await apiFetch('/api/aso/reviews/digest', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform, provider: selectedProvider, model: customModel || undefined })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data?.digest?.themes) {
          setAsoData(prev => ({
            ...prev,
            reviewThemes: data.digest.themes
          }));
        }
      }
    } catch (e) {
      console.warn('Reviews digest error:', e.message);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDraftReviewResponse = async (theme) => {
    setSelectedThemeForResponse(theme);
    setDraftingLoading(true);
    setDraftedResponse('');
    if (isDemoMode) {
      setTimeout(() => {
        setDraftedResponse(`Hi there! Thank you so much for your feedback regarding "${theme.themeName}". We're excited to share that our team is actively working on enhancing this feature in our upcoming update. Stay tuned, and feel free to reach out to support if you have any questions!`);
        setDraftingLoading(false);
      }, 400);
      return;
    }
    try {
      const res = await apiFetch('/api/aso/reviews/reply', {
        method: 'POST',
        body: JSON.stringify({
          themeName: theme.themeName,
          sentiment: theme.sentiment,
          sampleQuote: theme.sampleQuote,
          insight: theme.insight,
          provider: selectedProvider,
          model: customModel || undefined
        })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data?.reply) {
          setDraftedResponse(data.reply);
        }
      }
    } catch (e) {
      console.warn('Draft reply error:', e.message);
      setDraftedResponse(`Hi there! Thank you so much for your feedback regarding "${theme.themeName}". We appreciate your input and are actively working on improvements for our next release!`);
    } finally {
      setDraftingLoading(false);
    }
  };

  const handleGenerateVariants = async () => {
    setLoading(true);
    if (isDemoMode) {
      setTimeout(() => {
        setCandidates([
          { field: 'title', text: `${activeProject?.name || 'App'} - Smart ${clusterTarget} Tracker`, actualCharCount: 28, maxLimit: 30, isValid: true, rationale: "Optimized for Play Store 30-char hard limit with primary category keyword." },
          { field: 'subtitle', text: `Fast ${clusterTarget} planner & log`, actualCharCount: 26, maxLimit: 30, isValid: true, rationale: "Apple Subtitle targeted to high conversion benefit hook." },
          { field: 'keyword_field', text: `${clusterTarget},planner,organizer,log,habit`, actualCharCount: 42, maxLimit: 100, isValid: true, rationale: "No duplicate words from title; comma-separated without spaces." }
        ]);
        setLoading(false);
      }, 500);
      return;
    }
    try {
      const res = await apiFetch('/api/aso/variants', {
        method: 'POST',
        body: JSON.stringify({
          packageName,
          platform: effectivePlatform,
          cluster: clusterTarget,
          provider: selectedProvider,
          model: customModel || undefined
        })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data?.candidates) {
          setCandidates(data.candidates);
        }
      }
    } catch (e) {
      alert('Variant generation error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateCoverage = async () => {
    if (isDemoMode) {
      setCoverageData({
        coverageScorePct: 85,
        coveredKeywords: 3,
        totalKeywords: 4,
        details: [
          { keyword: 'calorie counter', covered: true, foundInField: 'Title' },
          { keyword: 'macro tracker', covered: true, foundInField: 'Subtitle / Short Description' },
          { keyword: 'workout log', covered: true, foundInField: 'Description' },
          { keyword: 'diet planner', covered: false, foundInField: 'None' }
        ]
      });
      return;
    }
    try {
      const res = await apiFetch('/api/aso/coverage', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform, metadata: metadataInputs })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        setCoverageData(data);
      }
    } catch (e) {
      alert('Coverage simulation error: ' + e.message);
    }
  };

  const handleAddKeyword = async (e) => {
    e?.preventDefault();
    if (!newKeywordInput.trim()) return;
    const term = newKeywordInput.trim();
    if (isDemoMode) {
      setAsoData(prev => ({
        ...prev,
        keywords: [{ id: Date.now(), term, tracked: 1, rank: Math.floor(Math.random() * 12) + 1 }, ...(prev?.keywords || [])]
      }));
      setNewKeywordInput('');
      return;
    }
    try {
      const res = await apiFetch('/api/aso/keywords/add', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform, term })
      }, authToken);
      if (res.ok) {
        setNewKeywordInput('');
        fetchAsoOverview();
      }
    } catch (err) {
      console.warn('Error adding keyword:', err.message);
    }
  };

  const handleCheckSingleRank = async (kw) => {
    setSingleRankChecking(prev => ({ ...prev, [kw.id || kw.term]: true }));
    if (isDemoMode) {
      setTimeout(() => {
        setAsoData(prev => ({
          ...prev,
          keywords: (prev?.keywords || []).map(k => k.id === kw.id ? { ...k, rank: Math.floor(Math.random() * 10) + 1 } : k)
        }));
        setSingleRankChecking(prev => ({ ...prev, [kw.id || kw.term]: false }));
      }, 500);
      return;
    }
    try {
      const res = await apiFetch('/api/aso/keywords/check-single', {
        method: 'POST',
        body: JSON.stringify({
          keywordId: kw.id,
          packageName,
          platform: effectivePlatform,
          term: kw.term
        })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        setAsoData(prev => ({
          ...prev,
          keywords: (prev?.keywords || []).map(k => k.id === kw.id ? { ...k, rank: data.rank } : k)
        }));
      }
    } catch (err) {
      console.warn('Rank check error:', err.message);
    } finally {
      setSingleRankChecking(prev => ({ ...prev, [kw.id || kw.term]: false }));
    }
  };

  const handleDeleteKeyword = async (id) => {
    if (isDemoMode) {
      setAsoData(prev => ({ ...prev, keywords: (prev?.keywords || []).filter(k => k.id !== id) }));
      return;
    }
    try {
      const res = await apiFetch(`/api/aso/keywords/${id}`, { method: 'DELETE' }, authToken);
      if (res.ok) {
        setAsoData(prev => ({ ...prev, keywords: (prev?.keywords || []).filter(k => k.id !== id) }));
      }
    } catch (err) {
      console.warn('Delete keyword error:', err.message);
    }
  };

  const handleAddCompetitor = async (e) => {
    e?.preventDefault();
    if (!newCompetitorInput.trim()) return;
    const compPkg = newCompetitorInput.trim();
    setAddingCompetitor(true);
    if (isDemoMode) {
      setTimeout(() => {
        setAsoData(prev => ({
          ...prev,
          competitors: [{
            title: compPkg,
            competitor_key: compPkg,
            score: 4.4,
            installs: '100K+',
            developer: 'Competitor Studio',
            pinned: 1
          }, ...(prev?.competitors || [])]
        }));
        setNewCompetitorInput('');
        setAddingCompetitor(false);
      }, 500);
      return;
    }
    try {
      const res = await apiFetch('/api/aso/competitors/add', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform, competitorPackage: compPkg })
      }, authToken);
      if (res.ok) {
        setNewCompetitorInput('');
        fetchAsoOverview();
      }
    } catch (err) {
      console.warn('Add competitor error:', err.message);
    } finally {
      setAddingCompetitor(false);
    }
  };

  const handleDeleteCompetitor = async (competitorKey) => {
    if (isDemoMode) {
      setAsoData(prev => ({ ...prev, competitors: (prev?.competitors || []).filter(c => c.competitor_key !== competitorKey) }));
      return;
    }
    try {
      const res = await apiFetch(`/api/aso/competitors/${encodeURIComponent(competitorKey)}?packageName=${encodeURIComponent(packageName)}&platform=${effectivePlatform}`, { method: 'DELETE' }, authToken);
      if (res.ok) {
        setAsoData(prev => ({ ...prev, competitors: (prev?.competitors || []).filter(c => c.competitor_key !== competitorKey) }));
      }
    } catch (err) {
      console.warn('Delete competitor error:', err.message);
    }
  };

  const handleScanNegativeReviews = async () => {
    setReviewScanLoading(true);
    setReviewScanResult(null);
    if (isDemoMode) {
      setTimeout(() => {
        setReviewScanResult({ newAlertsCount: 0, message: 'All recent 1-2★ reviews already alerted to Webhook.' });
        setReviewScanLoading(false);
      }, 500);
      return;
    }
    try {
      const res = await apiFetch('/api/aso/reviews/scan-negative', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform, displayName: activeProject?.name || packageName })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        setReviewScanResult(data);
      }
    } catch (err) {
      setReviewScanResult({ error: err.message });
    } finally {
      setReviewScanLoading(false);
    }
  };

  const handleSnapshotTimeline = async () => {
    setTimelineLoading(true);
    try {
      const res = await apiFetch('/api/aso/timeline/snapshot', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform: effectivePlatform })
      }, authToken);
      if (res.ok) {
        fetchAsoOverview();
      }
    } catch (err) {
      console.warn('Snapshot error:', err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const toggleActionItem = (id) => {
    setActionItems(prev => prev.map(item => item.id === id ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' } : item));
  };

  // Helper calculations for Live Metadata Builder Sandbox
  const titleCharCount = (metadataInputs.title || '').length;
  const shortDescCharCount = (metadataInputs.short_description || '').length;
  const subtitleCharCount = (metadataInputs.subtitle || '').length;
  const keywordFieldCharCount = (metadataInputs.keyword_field || '').length;
  const fullDescCharCount = (metadataInputs.description || '').length;

  // Apple Duplicate Keyword Detector: detect if any word in title is repeated in Apple Keyword Field
  const getDuplicateAppleKeywords = () => {
    if (!metadataInputs.title || !metadataInputs.keyword_field) return [];
    const titleWords = metadataInputs.title.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    const kwWords = metadataInputs.keyword_field.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const duplicates = kwWords.filter(kw => titleWords.includes(kw));
    return [...new Set(duplicates)];
  };

  const duplicateKeywords = getDuplicateAppleKeywords();

  // Calculate live keyword density for densityKeyword in Full Description
  const getKeywordDensity = (text, term) => {
    if (!text || !term) return { count: 0, density: 0, totalWords: 0 };
    const words = text.toLowerCase().match(/\b[a-z0-9'-]+\b/g) || [];
    if (words.length === 0) return { count: 0, density: 0, totalWords: 0 };
    const termLower = term.toLowerCase().trim();
    const count = words.filter(w => w === termLower || w.includes(termLower)).length;
    const density = ((count / words.length) * 100).toFixed(1);
    return { count, density, totalWords: words.length };
  };

  const densityStats = getKeywordDensity(metadataInputs.description, densityKeyword);

  if (isAllScope) {
    const scopeLabel = platform === 'apple' ? 'Apple Store' : platform === 'google' ? 'Play Store' : 'All App';
    const filteredForScope = projects.filter(p => {
      if (platform === 'apple') return p.platform === 'apple';
      if (platform === 'google' || platform === 'android') return p.platform === 'google' || p.platform === 'android';
      return true;
    });
    const cacheStats = getCachedAuditStats(filteredForScope);
    const analyzedCount = isDemoMode ? filteredForScope.length : cacheStats.cached;
    const avgScoreDisplay = isDemoMode
      ? Math.round(filteredForScope.reduce((acc, proj) => {
          const demo = getDemoAsoData(proj.packageName || proj.index, proj);
          return acc + (demo?.lastAudit?.score || 0);
        }, 0) / Math.max(filteredForScope.length, 1))
      : cacheStats.avgScore;

    return (
      <div className="space-y-6 pb-12">
        {appSwitcher}
        {/* Custom Portfolio Scope Header Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center space-x-3 text-accent-blue">
              <LayoutGrid size={24} />
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Portfolio ASO Studio ({scopeLabel})
              </h1>
            </div>
            {/* Cache / Audit Stats Strip & Portfolio Job Action Button */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <Layers size={13} className="text-accent-blue" />
                <span className="text-[11px] text-slate-400 font-semibold">Total Apps</span>
                <span className="text-xs font-black text-white font-mono">{filteredForScope.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles size={13} className="text-emerald-400" />
                <span className="text-[11px] text-slate-400 font-semibold">AI Audited</span>
                <span className="text-xs font-black text-emerald-400 font-mono">{analyzedCount}/{filteredForScope.length}</span>
              </div>
              {avgScoreDisplay != null && (
                <div className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border",
                  avgScoreDisplay >= 90 ? "bg-emerald-500/10 border-emerald-500/20" :
                  avgScoreDisplay >= 80 ? "bg-indigo-500/10 border-indigo-500/20" :
                  "bg-amber-500/10 border-amber-500/20"
                )}>
                  <TrendingUp size={13} className={avgScoreDisplay >= 90 ? "text-emerald-400" : avgScoreDisplay >= 80 ? "text-indigo-300" : "text-amber-400"} />
                  <span className="text-[11px] text-slate-400 font-semibold">Avg Score</span>
                  <span className={clsx(
                    "text-xs font-black font-mono",
                    avgScoreDisplay >= 90 ? "text-emerald-400" : avgScoreDisplay >= 80 ? "text-indigo-300" : "text-amber-400"
                  )}>{avgScoreDisplay}/100</span>
                </div>
              )}

              {/* Refresh ASO Data Button (All Apps) */}
              <button
                onClick={() => handleStartPortfolioJob({ refreshOnly: true, force: true })}
                disabled={jobRunning}
                className="px-3.5 py-1.5 rounded-xl border border-slate-700/80 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                title="Re-pull latest store metadata and screenshots from App Store / Google Play for all apps"
              >
                <RefreshCw size={13} className={clsx(jobRunning && jobStatus?.jobType === 'refresh' ? "animate-spin text-emerald-400" : "text-slate-400")} />
                <span>{jobRunning && jobStatus?.jobType === 'refresh' ? "Refreshing ASO Data..." : "Refresh ASO Data"}</span>
              </button>

              {/* Run AI Analytics for All Apps Button */}
              <button
                onClick={() => handleStartPortfolioJob({ runAi: true, force: false })}
                disabled={jobRunning}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-accent-blue hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
                title="Run AI listing audit and calculate ASO scores across all portfolio apps"
              >
                <Sparkles size={14} className={clsx(jobRunning && jobStatus?.jobType !== 'refresh' ? "animate-spin text-amber-300" : "text-white")} />
                <span>{jobRunning && jobStatus?.jobType !== 'refresh' ? "Running AI Analytics..." : "Run AI Analytics for All Apps"}</span>
              </button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Viewing aggregated portfolio ASO health scores and top priority fixes. Select an individual app below or from the top navigation to unlock per-app AI listing audit, keyword workspace, competitor gap intelligence, review digest, and metadata sandbox.
          </p>

          {/* Portfolio Job Live Progress & Results Banner */}
          {jobStatus && (jobStatus.status === 'running' || jobStatus.status === 'completed') && (
            <div className={clsx(
              "p-4 rounded-xl border transition-all shadow-lg",
              jobStatus.status === 'running'
                ? "bg-indigo-950/50 border-indigo-500/40 text-white"
                : "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
            )}>
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  {jobStatus.status === 'running' ? (
                    <RefreshCw size={15} className="text-indigo-400 animate-spin" />
                  ) : (
                    <CheckCircle size={15} className="text-emerald-400" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {jobStatus.status === 'running'
                      ? (jobStatus.jobType === 'refresh' ? "Refreshing Portfolio Store Metadata" : "Running Portfolio AI Analytics")
                      : (jobStatus.jobType === 'refresh' ? "Store Metadata Refresh Completed" : "Portfolio AI Analytics Completed")}
                  </span>
                  {jobStatus.currentApp && (
                    <span className="text-xs font-medium text-slate-300">
                      • Processing: <strong className="text-white">{jobStatus.currentApp}</strong>
                    </span>
                  )}
                </div>
                <div>
                  {jobStatus.status === 'running' ? (
                    <button
                      onClick={handleCancelPortfolioJob}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                    >
                      Cancel Job
                    </button>
                  ) : (
                    <button
                      onClick={() => setJobStatus(null)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>

              {jobStatus.status === 'running' && (
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-sky-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, jobStatus.progress || 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{jobStatus.phase || 'Analyzing app metadata...'}</span>
                    <span className="font-mono font-bold text-slate-200">{jobStatus.progress || 0}%</span>
                  </div>
                </div>
              )}

              {jobStatus.status === 'completed' && (
                <div className="text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    Refreshed metadata and completed ASO analytics across <strong>{jobStatus.processed || jobStatus.total}</strong> apps.
                    {jobStatus.avgScore != null && (
                      <> Portfolio average score: <strong className="text-emerald-400 font-mono">{jobStatus.avgScore}/100</strong>.</>
                    )}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">Scores and fixes updated live below.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Portfolio ASO Scores & Recommendations Grid (Default Expanded) */}
        <PortfolioAsoScores
          projects={projects}
          platform={platform}
          onSelectProject={onSelectProject}
          setPlatform={setPlatform}
          isDemoMode={isDemoMode}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {appSwitcher}
      {/* Header & AI Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-card p-6 border border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Eye className="text-accent-blue" size={28} />
            Per-App ASO Studio (AI-Powered)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Zero-cost keyword discovery, competitor intelligence, review sentiment digest, and strict length metadata optimization.
          </p>
        </div>

        {/* AI Provider Config Header Strip */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
          <Bot size={18} className="text-indigo-400 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">AI Provider</span>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setCustomModel('');
              }}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              {(aiStatus.providers?.length > 0 ? aiStatus.providers : [
                { id: 'gemini', model: 'gemini-3.8-flash', available: true },
                { id: 'openai', model: 'gpt-5-nano', available: true },
                { id: 'anthropic', model: 'claude-3-7-sonnet-latest', available: true }
              ]).map(p => (
                <option key={p.id} value={p.id} disabled={!p.available} className="bg-slate-800 text-white">
                  {p.id.toUpperCase()} {p.available ? `(${p.model})` : '(No Key)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col border-l border-white/10 pl-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Model</span>
            <select
              value={customModel || ''}
              onChange={(e) => setCustomModel(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer max-w-[200px]"
            >
              <option value="" className="bg-slate-800 text-slate-300">
                Default ({aiStatus?.providers?.find(p => p.id === selectedProvider)?.model || 'Configured'})
              </option>
              {(aiStatus?.supportedModels?.[selectedProvider] || PROVIDER_PRESET_MODELS[selectedProvider] || []).map(m => (
                <option key={m.id} value={m.id} className="bg-slate-800 text-white">
                  {m.name || m.id}
                </option>
              ))}
              <option value="__custom__" className="bg-slate-800 text-amber-300">Custom / Enter ID...</option>
            </select>
          </div>

          {(customModel === '__custom__' || (customModel && !(aiStatus?.supportedModels?.[selectedProvider] || PROVIDER_PRESET_MODELS[selectedProvider] || []).some(m => m.id === customModel))) && (
            <div className="flex flex-col border-l border-white/10 pl-3">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Custom ID</span>
              <input
                type="text"
                placeholder="e.g. gemini-3.8-flash"
                value={customModel === '__custom__' ? '' : customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-200 outline-none w-28 placeholder-slate-600"
              />
            </div>
          )}

          <div className="flex items-center border-l border-white/10 pl-3">
            <button
              onClick={handleRepullStoreData}
              disabled={repullLoading}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Repull fresh store metadata directly from App Store / Play Store and update cache"
            >
              <RefreshCw size={12} className={clsx(repullLoading && "animate-spin text-accent-blue")} />
              <span>{repullLoading ? "Repulling..." : "Repull Data"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar p-1.5 bg-slate-900/60 rounded-2xl border border-white/10">
        {[
          { id: 'audit', label: 'Overview & Audit', icon: Shield, badge: asoData?.lastAudit ? `${asoData.lastAudit.score}/100` : null },
          { id: 'keywords', label: 'Keyword Discovery', icon: Search, badge: (asoData?.keywords || []).length },
          { id: 'competitors', label: 'Competitor Gap', icon: Users, badge: (asoData?.competitors || []).length },
          { id: 'reviews', label: 'Review Sentiment', icon: MessageSquare, badge: (asoData?.reviewThemes || []).length },
          { id: 'timeline', label: 'Metadata Timeline', icon: Calendar, badge: (asoData?.timeline || []).length || null },
          { id: 'builder', label: 'Metadata Builder', icon: FileText, badge: 'Live Limits' },
          { id: 'pricing', label: 'PPP Pricing', icon: DollarSign, badge: 'Global Lift' },
          { id: 'action_plan', label: 'Action Plan', icon: CheckSquare, badge: `${actionItems.filter(i => i.status === 'completed').length}/${actionItems.length}` }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-mono",
                  isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & AI AUDIT */}
      {activeTab === 'audit' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Funnel Explainer Guide Banner */}
          <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/60 p-5 rounded-2xl border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
                <BookOpen size={16} /> How to utilize Store Funnel & Conversion Rates
              </div>
              {!stats?.storeImpressions && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                  Sample Data (Requires Apple Analytics API)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Store optimization operates on a 2-stage conversion funnel:
              <strong className="text-white"> Store Impressions</strong> (search/browse views) →
              <strong className="text-white"> Product Page Views</strong> (taps on your icon/title) →
              <strong className="text-white"> Installs</strong>.
              If page view tap-through is below 20%, optimize your <strong className="text-amber-300">App Icon & Title</strong>. If install conversion is below 25%, improve your <strong className="text-amber-300">Screenshots & Short Description hook</strong>.
            </p>
          </div>

          {/* Funnel Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              label="Store Impressions"
              value={formatNumber(impressions)}
              sublabel="Times listing appeared in search or browse"
              icon={Eye}
              color="blue"
              tooltipSubheader="Search & Category Visibility"
              tooltipText="How many total unique times users viewed your app icon or title in search results, featured categories, or top charts."
            />
            <MetricCard
              label="Product Page Views"
              value={formatNumber(pageViews)}
              sublabel={`Tap-through: ${formatRate(viewConversionRate)}`}
              icon={MousePointer}
              color="emerald"
              progress={viewConversionRate * 100}
              tooltipSubheader="Store Listing Tap-Through Rate"
              tooltipText="Percentage of users who saw your icon in search or browse and tapped into your full product page to read more."
            />
            <MetricCard
              label="Conversion Rate (ASO)"
              value={formatRate(downloadConversionRate)}
              sublabel={`Page View → Download (${formatNumber(downloads)} downloads)`}
              icon={Percent}
              color="amber"
              progress={downloadConversionRate * 100}
              tooltipSubheader="Product Page Install Rate"
              tooltipText="The percentage of product page visitors who clicked Install. Measures screenshot appeal, short description hook clarity, and rating trust."
            />
          </div>

          {/* Store Indexation Cheat Sheet Banner */}
          <div className="glass-card p-5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
              <Zap size={16} /> Store Indexation Algorithm Cheat Sheet
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-1.5">
                <span className="font-extrabold text-indigo-400 flex items-center gap-1.5">
                  <Globe size={14} /> Apple App Store (iOS)
                </span>
                <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                  <li><strong>App Name:</strong> 30 chars limit. Highest keyword weight!</li>
                  <li><strong>Subtitle:</strong> 30 chars limit. High keyword weight.</li>
                  <li><strong>Keyword Field:</strong> 100 chars comma-separated. Do NOT repeat words from Title!</li>
                  <li><strong className="text-rose-400">Description:</strong> NOT indexed for search ranking! Use strictly for user conversion.</li>
                </ul>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-1.5">
                <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <Globe size={14} /> Google Play Store (Android)
                </span>
                <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                  <li><strong>App Title:</strong> 30 chars limit. Highest keyword weight!</li>
                  <li><strong>Short Description:</strong> 80 chars limit. High indexation weight.</li>
                  <li><strong>Full Description:</strong> 4000 chars limit. Target 2.0% - 3.0% keyword density.</li>
                  <li><strong>Package Name:</strong> Contains implicit search weight if relevant keyword is in bundle id.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Portfolio ASO Scores & Recommendations Grid */}
          <div className="glass-card p-6 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-amber-400" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  Portfolio ASO Scores & Recommendations Per App
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPortfolioExpanded(!portfolioExpanded)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                  title={portfolioExpanded ? "Collapse Portfolio ASO View" : "Expand Portfolio ASO View"}
                >
                  {portfolioExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{portfolioExpanded ? 'Collapse' : 'Expand'}</span>
                </button>

                <button
                  onClick={handleRefreshAsoStats}
                  disabled={refreshingAsoStats}
                  className="px-3 py-1.5 bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue rounded-xl text-xs font-bold border border-accent-blue/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Refresh Portfolio ASO Stats"
                >
                  <RefreshCw size={13} className={refreshingAsoStats ? 'animate-spin' : ''} />
                  <span>Refresh Stats</span>
                </button>

                <span className="text-xs text-slate-400 font-semibold ml-1 hidden md:inline">
                  {(projects.length > 0 ? projects : MOCK_PROJECTS).length} Apps Evaluated
                </span>
              </div>
            </div>

            {!portfolioExpanded ? (
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <Sparkles size={14} className="text-amber-400 shrink-0" />
                  <span>Portfolio ASO breakdown collapsed ({(projects.length > 0 ? projects : MOCK_PROJECTS).length} Apps). Click <strong>Expand</strong> to inspect app scores and top fixes.</span>
                </div>
                <button
                  onClick={() => setPortfolioExpanded(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold ml-2 shrink-0 cursor-pointer"
                >
                  Expand View →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(projects.length > 0 ? projects : MOCK_PROJECTS).map((proj) => {
                  const isCurrent = proj.packageName === packageName || proj.packageName === activeProject?.packageName || proj.index === activeProject?.index;
                  const auditInfo = (isCurrent && asoData?.lastAudit?.score)
                    ? asoData.lastAudit
                    : getAppAsoAudit(proj, isDemoMode, getDemoAsoData);

                  const isKnown = auditInfo?.score != null && auditInfo.score > 0;
                  const topFix = auditInfo?.topFix || auditInfo?.improvements?.[0];

                  return (
                    <div
                      key={proj.index || proj.packageName}
                      onClick={() => {
                        if (typeof onSelectProject === 'function') onSelectProject(getProjectUrlSegment(proj));
                      }}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all cursor-pointer space-y-3",
                        isCurrent
                          ? "bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 truncate">
                          <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-7 h-7 rounded-lg" />
                          <div className="truncate">
                            <h4 className="text-xs font-extrabold text-white truncate">{proj.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{proj.packageName}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          {isKnown ? (
                            <>
                              <span className={clsx(
                                "text-xs font-black px-2.5 py-0.5 rounded-full border font-mono",
                                auditInfo.score >= 90
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                  : auditInfo.score >= 80
                                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                                    : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                              )}>
                                {auditInfo.score}/100
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold mt-0.5">ASO Score</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-mono">
                                N/A
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Not Audited</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Top Priority Fix</span>
                          {topFix?.impact && (
                            <span className={clsx(
                              "text-[9px] px-1.5 py-0.2 rounded uppercase font-bold",
                              topFix.impact === 'high' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                            )}>
                              {topFix.impact} Impact
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                          {topFix ? (
                            <><strong className="text-white">{topFix.type}:</strong> {topFix.recommendation || auditInfo?.headline}</>
                          ) : (
                            <span className="text-slate-400 italic">No AI listing audit run yet. Select app to run audit.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 1: Listing Audit */}
          <div className="glass-card p-6 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="text-emerald-400" size={20} />
                <h2 className="text-lg font-bold text-white">Listing Health & AI Audit</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleParamsDrawer}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition-all flex items-center gap-1.5"
                >
                  {previewLoading && <RefreshCw size={12} className="animate-spin text-indigo-400" />}
                  {showAuditParams ? 'Hide Audit Params' : 'Edit Audit Params & Prompt'}
                </button>
                <button
                  onClick={handleRunAudit}
                  disabled={auditLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                >
                  {auditLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {auditLoading ? 'Auditing Listing...' : 'Run AI Audit'}
                </button>
              </div>
            </div>

            {/* Expandable Editable Parameters Drawer */}
            {showAuditParams && (
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Bot size={14} /> AI Audit Prompt Context (Pre-filled from pulled store metadata)
                  </span>
                  <button
                    onClick={() => fetchPromptPreview()}
                    disabled={previewLoading}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                  >
                    <RefreshCw size={10} className={previewLoading ? 'animate-spin' : ''} /> Reload Pulled Store Data
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Focus Area</label>
                    <input
                      type="text"
                      value={focusArea}
                      onChange={(e) => setFocusArea(e.target.value)}
                      placeholder="e.g. Title keyword density vs conversion hook"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Output Tokens</label>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      placeholder="4096"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Prompt Context / Listing Override (Optional)</label>
                  <textarea
                    rows={3}
                    value={customListingText}
                    onChange={(e) => setCustomListingText(e.target.value)}
                    placeholder="Leave blank to automatically scrape latest Play/Apple store metadata, or paste raw text override..."
                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 custom-scrollbar resize-none"
                  />
                </div>
              </div>
            )}

            {asoData?.listingSnapshot ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-4 min-w-0">
                    {asoData.listingSnapshot.icon_url && (
                      <img src={asoData.listingSnapshot.icon_url} alt="App Icon" className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                    )}
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-white truncate">{asoData.listingSnapshot.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 font-mono">
                          Cached Metadata
                        </span>
                        {asoData.listingSnapshot.fetched_at && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(asoData.listingSnapshot.fetched_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        {asoData.listingSnapshot.developer && <span>Dev: <strong className="text-slate-200">{asoData.listingSnapshot.developer}</strong></span>}
                        {asoData.listingSnapshot.category && <span>Category: <strong className="text-slate-200">{asoData.listingSnapshot.category}</strong></span>}
                        {asoData.listingSnapshot.score > 0 && <span>Rating: <strong className="text-amber-400">{asoData.listingSnapshot.score.toFixed(1)}★</strong></span>}
                        {asoData.listingSnapshot.content_rating && <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">{asoData.listingSnapshot.content_rating}</span>}
                        {asoData.listingSnapshot.price && <span className="text-emerald-400 font-bold">{asoData.listingSnapshot.price}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleRepullStoreData}
                      disabled={repullLoading}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow"
                      title="Bypass cache and repull fresh store metadata directly from App Store / Google Play"
                    >
                      <RefreshCw size={13} className={clsx(repullLoading && "animate-spin")} />
                      <span>{repullLoading ? "Repulling..." : "Repull Store Data"}</span>
                    </button>
                  </div>
                </div>

                {repullFeedback && (
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                    <Info size={14} className="shrink-0" />
                    <span>{repullFeedback}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                <div className="text-xs text-slate-400">
                  No store metadata snapshot cached for <strong className="text-white">{packageName}</strong> yet.
                </div>
                <button
                  onClick={handleRepullStoreData}
                  disabled={repullLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={clsx(repullLoading && "animate-spin")} />
                  <span>{repullLoading ? "Pulling..." : "Pull Store Data"}</span>
                </button>
              </div>
            )}

            {asoData?.lastAudit ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start pt-2">
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/10 text-center">
                  <span className="text-xs text-slate-400 font-semibold">Audit Score</span>
                  <div className="text-4xl font-extrabold text-indigo-400 my-2">{asoData.lastAudit.score || 85}/100</div>
                  <p className="text-xs text-slate-300 font-medium">{asoData.lastAudit.headline}</p>
                </div>

                <div className="md:col-span-3 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ranked Fix Recommendations</h4>
                  {asoData.lastAudit.improvements?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${item.impact === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                        {item.impact}
                      </span>
                      <div className="space-y-0.5">
                        <strong className="text-xs text-white block">{item.type}</strong>
                        <p className="text-xs text-slate-300 leading-relaxed">{item.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No AI audit data cached yet. Click "Run AI Audit" above to analyze your listing against store algorithm indexing rules.
              </div>
            )}
          </div>

          {/* Compliance & Listing Quality Automated Checklist */}
          <div className="glass-card p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-400" size={18} />
                <h3 className="text-base font-bold text-white">Store Compliance & Quality Checklist</h3>
              </div>
              <span className="text-xs text-slate-400">Automated Policy Checks</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">Privacy Policy URL</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={13} /> Present
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">Ratings & Social Proof</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={13} /> Rating Count &gt; 0
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">Content Rating Badge</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={13} /> Certified
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">Screenshots (≥ 4 recommended)</span>
                <span className="font-bold text-indigo-400 flex items-center gap-1">
                  <CheckCircle size={13} /> 5 Assets
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">Description Length Limit</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={13} /> Within 4000 limit
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">Last Update Freshness</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={13} /> Updated &lt; 12 mo
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEYWORD DISCOVERY & FAN-OUT */}
      {activeTab === 'keywords' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <KeywordHintsRadar
            packageName={currentPackage}
            platform={platform}
            onKeywordAdded={fetchAsoOverview}
          />

          <div className="glass-card p-6 border border-white/10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Search className="text-accent-blue" size={20} />
                  Keyword Workspace & Autocomplete Fan-Out
                </h2>
                <p className="text-xs text-slate-400">Discover real user query terms via zero-cost store autocomplete mining.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form onSubmit={handleAddKeyword} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="+ Add target keyword..."
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    className="bg-slate-900 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-400 w-44"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                  >
                    Add
                  </button>
                </form>

                <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

                <button
                  onClick={handleCheckKeywordRanks}
                  disabled={rankChecking}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
                >
                  {rankChecking ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                  <span>{rankChecking ? 'Checking...' : 'Check All'}</span>
                </button>
                <input
                  type="text"
                  placeholder="Seed term (a-z)..."
                  value={seedKeyword}
                  onChange={(e) => setSeedKeyword(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-accent-blue w-32"
                />
                <button
                  onClick={handleExpandKeywords}
                  disabled={loading}
                  className="px-3.5 py-2 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  Expand
                </button>
              </div>
            </div>

            {/* Help Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-200 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white">
                  <AlertCircle size={14} className="text-blue-400" />
                  Popularity Proxy & Live Search Rank Tracker (v2.0.0)
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">Store Search API</span>
              </div>
              <p className="text-[11px] text-blue-200/80 leading-relaxed">
                Add target terms or expand seeds via zero-cost autocomplete. Click <strong>Check All</strong> or the per-keyword <strong><TrendingUp size={11} className="inline mx-0.5" /></strong> button to poll live store search rankings up to top 50.
              </p>
            </div>

            {/* Keyword Opportunity Table */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Keyword Term</th>
                    <th className="py-3 px-4">Est. Popularity (Proxy)</th>
                    <th className="py-3 px-4">Current Rank</th>
                    <th className="py-3 px-4">Status / Opportunity</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(asoData?.keywords || []).map((kw) => {
                    const proxyScore = (kw.autocomplete_verified ? 40 : 15) + (kw.source === 'seed' ? 15 : 0) + (kw.term.split(' ').length <= 2 ? 15 : 0) + 15;
                    const matchedRankRow = (asoData?.ranks || []).find(r => r.keyword_id === kw.id || r.term === kw.term);
                    const currentRank = matchedRankRow?.rank;

                    let tierBadge = '🟢 Win';
                    let tierColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                    if (!currentRank || currentRank > 30 || proxyScore < 30) {
                      tierBadge = '🔴 Low Priority';
                      tierColor = 'bg-slate-800 text-slate-400 border-slate-700';
                    } else if (currentRank > 5) {
                      tierBadge = '🟡 Opportunity';
                      tierColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                    }

                    return (
                      <tr key={kw.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          <div className="flex items-center space-x-2">
                            <span>{kw.term}</span>
                            {kw.autocomplete_verified === 1 && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                                Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-accent-blue h-full rounded-full" style={{ width: `${proxyScore}%` }} />
                            </div>
                            <span className="font-mono text-[10px] text-slate-300">{proxyScore}/100</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {currentRank ? (
                            <span className="font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">#{currentRank}</span>
                          ) : (
                            <span className="text-slate-500 text-[10px] font-mono">&gt; 50 (Unranked)</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tierColor}`}>
                            {tierBadge}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCheckSingleRank(kw)}
                              disabled={singleRankChecking[kw.id || kw.term]}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="Check live search rank position"
                            >
                              {singleRankChecking[kw.id || kw.term] ? <RefreshCw size={12} className="animate-spin text-accent-blue" /> : <TrendingUp size={12} />}
                            </button>
                            <button
                              onClick={async () => {
                                if (!isDemoMode) {
                                  await apiFetch('/api/aso/keywords/track', {
                                    method: 'POST',
                                    body: JSON.stringify({ packageName, platform, keywordId: kw.id, tracked: !kw.tracked })
                                  }, authToken);
                                }
                                setAsoData(prev => ({
                                  ...prev,
                                  keywords: prev.keywords.map(k => k.id === kw.id ? { ...k, tracked: !k.tracked } : k)
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${kw.tracked ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              {kw.tracked ? 'Tracking' : 'Track'}
                            </button>
                            <button
                              onClick={() => handleDeleteKeyword(kw.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Delete keyword"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!asoData?.keywords || asoData.keywords.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 italic">No keywords added yet. Use "Expand (a-z)" above to discover terms.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Share of Voice Competitor Matrix */}
          {asoData?.competitors && asoData.competitors.length > 0 && (
            <div className="glass-card p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Competitor Share of Voice</h3>
                </div>
                <span className="text-xs text-slate-400">Scraped from Top-3 Store Search Results</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {asoData.competitors.slice(0, 6).map((comp, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center space-x-3 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate">{comp.title || comp.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{comp.short_desc || comp.subtitle || comp.competitor_key}</p>
                    </div>
                    {comp.rating > 0 && (
                      <span className="text-amber-400 font-bold text-[10px] shrink-0">{comp.rating.toFixed(1)}★</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPETITOR GAP INTELLIGENCE */}
      {activeTab === 'competitors' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Competitor Help Explainer */}
          <div className="bg-purple-900/30 border border-purple-500/20 rounded-2xl p-4 text-xs text-purple-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-white">
              <Users size={16} className="text-purple-400" />
              How to utilize Competitor Gap Intelligence
            </div>
            <p className="text-[11px] text-purple-200/80 leading-relaxed">
              Competitor Gap Analysis compares your metadata against top-chart rivals to uncover <strong>missing high-volume search terms</strong> they index for. Incorporate these missing target keywords into your title prefix or short description to capture market share.
            </p>
          </div>

          <div className="glass-card p-6 border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="text-purple-400" size={20} />
                  Category Competitor Intelligence & Keyword Gaps
                </h2>
                <p className="text-xs text-slate-400">Track competitors, scrape listings, and extract missing search terms & value hooks.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form onSubmit={handleAddCompetitor} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Competitor Bundle/Package..."
                    value={newCompetitorInput}
                    onChange={(e) => setNewCompetitorInput(e.target.value)}
                    className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-44 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={addingCompetitor || !newCompetitorInput.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {addingCompetitor ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                    Track
                  </button>
                </form>

                <button
                  onClick={handleRunCompetitorAnalysis}
                  disabled={compLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  {compLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {compLoading ? 'Analyzing...' : 'Run Gap Analysis'}
                </button>
              </div>
            </div>

            {/* Competitor Benchmarks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(asoData?.competitors || []).map((comp, idx) => (
                <div key={idx} className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <img src={comp.icon || comp.icon_url || 'https://via.placeholder.com/48'} alt={comp.title} className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0" />
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-white truncate">{comp.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{comp.competitor_key || comp.developer}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCompetitor(comp.competitor_key || comp.packageName || comp.title)}
                      title="Remove tracked competitor"
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-white/5">
                    <span>Rating: <strong className="text-amber-400">{comp.score}★</strong></span>
                    <span>Installs: <strong className="text-emerald-400">{comp.installs || '50K+'}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Keyword Gaps & Opportunities */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Identified Keyword Coverage Gaps</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(asoData?.competitorGaps || []).map((gap, idx) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-300">{gap.term}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">Opportunity</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{gap.opportunity}</p>
                    <div className="text-[10px] text-slate-400 italic">
                      Targeted by: {gap.targetedByCompetitors?.join(', ') || 'Competitors'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor Value Hooks */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Competitor Primary Conversion Hooks</h3>
              <div className="space-y-2">
                {(asoData?.competitorHooks || []).map((hook, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-white/5 text-xs">
                    <span className="font-bold text-slate-200">{hook.competitorKey}</span>
                    <span className="text-indigo-300 italic">{hook.primaryHook}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REVIEW SENTIMENT & VOICE OF CUSTOMER */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* STAR RATING TARGET CALCULATOR & TRAJECTORY PREDICTOR */}
          {(() => {
            const currentScore = customRatingInput !== null ? Number(customRatingInput) : Number(asoData?.metadata?.score || activeProject?.score || 4.2);
            const currentCount = customRatingsCountInput !== null ? Number(customRatingsCountInput) : Number(asoData?.metadata?.ratings || asoData?.metadata?.reviews || 150);
            
            const rawNeeded = Math.ceil((targetRating * currentCount - currentScore * currentCount) / Math.max(0.01, (5 - targetRating)));
            const neededFiveStars = targetRating <= currentScore ? 0 : Math.max(0, rawNeeded);
            const weeksToTarget = weeklyVelocity > 0 ? (neededFiveStars / weeklyVelocity) : 0;
            const daysToTarget = Math.round(weeksToTarget * 7);

            const presetTargets = [4.5, 4.6, 4.7, 4.8, 4.9];

            return (
              <div className="glass-card p-6 border border-white/10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Target className="text-amber-400" size={20} />
                      Star Rating Target Calculator & Trajectory
                    </h2>
                    <p className="text-xs text-slate-400">
                      Compute the exact count of consecutive 5★ reviews required to hit store rating display thresholds.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Target Presets:</span>
                    <div className="flex gap-1.5">
                      {presetTargets.map(preset => (
                        <button
                          key={preset}
                          onClick={() => setTargetRating(preset)}
                          className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                            targetRating === preset
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                              : "bg-white/5 text-slate-400 hover:text-white border-white/5"
                          )}
                        >
                          {preset}★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metric Summary Hero Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Current Store Score</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">{currentScore.toFixed(2)}</span>
                      <Star size={16} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs text-slate-400">({currentCount.toLocaleString()} ratings)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                      <span>Edit:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max="5"
                        value={currentScore}
                        onChange={(e) => setCustomRatingInput(parseFloat(e.target.value) || 1)}
                        className="w-16 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono"
                      />
                      <span>Count:</span>
                      <input
                        type="number"
                        min="1"
                        value={currentCount}
                        onChange={(e) => setCustomRatingsCountInput(parseInt(e.target.value, 10) || 1)}
                        className="w-20 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Goal Target Rating</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400">{targetRating.toFixed(2)}</span>
                      <Star size={16} className="text-amber-400 fill-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {targetRating >= 4.5 ? '⭐ Unlocks 4.5+ store star display' : 'Milestone rating goal'}
                    </p>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-900/60 space-y-2">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">5★ Reviews Needed</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">{neededFiveStars.toLocaleString()}</span>
                      <span className="text-xs text-amber-400 font-medium">consecutive</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {neededFiveStars === 0 ? '🎉 Target already reached!' : `At 5.0★ avg rating`}
                    </p>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Projected Timeline</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-400">
                        {neededFiveStars === 0 ? '0 days' : daysToTarget < 30 ? `~${daysToTarget} days` : `~${weeksToTarget.toFixed(1)} wks`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Paced at {weeklyVelocity} review(s) / week
                    </p>
                  </div>
                </div>

                {/* Interactive Controls & Strategy Guidance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-900/40 p-5 rounded-2xl border border-white/5">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders size={14} className="text-amber-400" />
                      Simulation Controls
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Target Rating:</span>
                        <span className="font-bold text-amber-400 font-mono">{targetRating.toFixed(2)} ★</span>
                      </div>
                      <input
                        type="range"
                        min="4.0"
                        max="4.95"
                        step="0.05"
                        value={targetRating}
                        onChange={(e) => setTargetRating(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>4.00★</span>
                        <span>4.50★ (Apple / Google Display Tier)</span>
                        <span>4.95★</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Estimated Weekly Review Velocity:</span>
                        <span className="font-bold text-emerald-400 font-mono">{weeklyVelocity} reviews/wk</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        step="1"
                        value={weeklyVelocity}
                        onChange={(e) => setWeeklyVelocity(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>1/wk (Slow)</span>
                        <span>10/wk (Moderate)</span>
                        <span>50/wk (High-growth)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-6 pt-4 lg:pt-0">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Award size={14} className="text-emerald-400" />
                      In-App Review Prompt Strategy Rules
                    </h4>
                    <ul className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold shrink-0">✓</span>
                        <span><strong>Trigger during moments of delight:</strong> Fire SKStoreReviewController / Google In-App Review after users complete a core loop action (e.g. successfully export report, hit a 7-day streak).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold shrink-0">✗</span>
                        <span><strong>Never gate with pre-dialogs:</strong> Showing "Do you enjoy this app?" and routing unhappy users to support while sending happy users to the store violates <strong>Apple App Store Review Guideline 5.6.1</strong> and causes app rejection.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">⏱️</span>
                        <span><strong>Respect OS throttling:</strong> iOS limits native review prompts to 3 times per 365-day rolling window per device. Google Play applies internal quota limits.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Review Strategy Explainer */}
          <div className="bg-emerald-900/30 border border-emerald-500/20 rounded-2xl p-4 text-xs text-emerald-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-white">
              <MessageSquare size={16} className="text-emerald-400" />
              Mining Customer Reviews for ASO Metadata Copy
            </div>
            <p className="text-[11px] text-emerald-200/80 leading-relaxed">
              Real user reviews reveal the exact language customers use when describing your app's core value. Use these themes to craft <strong>high-converting short description hooks</strong> and identify high-priority feature requests before competitors build them.
            </p>
          </div>

          <div className="glass-card p-6 border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="text-emerald-400" size={20} />
                  Review Sentiment & Feedback Theme Digest
                </h2>
                <p className="text-xs text-slate-400">Extract positive feedback, feature requests, and issue clusters with AI response drafting.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleScanNegativeReviews}
                  disabled={reviewScanLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/90 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                  title="Scan recent reviews for 1-2★ ratings and trigger automated alert webhook"
                >
                  {reviewScanLoading ? <RefreshCw size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
                  {reviewScanLoading ? 'Scanning...' : 'Scan 1-2★ Alerts'}
                </button>

                <button
                  onClick={handleSyncReviews}
                  disabled={reviewsLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  {reviewsLoading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {reviewsLoading ? 'Syncing Reviews...' : 'Sync & Digest Reviews'}
                </button>
              </div>
            </div>

            {/* Negative Review Alert Result Banner */}
            {reviewScanResult && (
              <div className={clsx(
                "p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150",
                reviewScanResult.error
                  ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                  : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              )}>
                <div className="flex items-center gap-2">
                  {reviewScanResult.error ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
                  <span>
                    {reviewScanResult.error
                      ? reviewScanResult.error
                      : `Automated Scan Complete: Dispatched ${reviewScanResult.newAlertsCount ?? 0} new negative (1-2★) review alert(s) to Telegram & Webhook.`}
                  </span>
                </div>
                <button
                  onClick={() => setReviewScanResult(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded bg-white/5"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Feedback Themes Grid */}
            {(!asoData?.reviewThemes || asoData.reviewThemes.length === 0) ? (
              <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8 text-center space-y-3">
                <MessageSquare size={32} className="mx-auto text-emerald-400/60" />
                <h3 className="text-sm font-bold text-white">No Review Sentiment Themes Digested Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Click <strong>"Sync & Digest Reviews"</strong> above to analyze user reviews and generate AI feedback sentiment themes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {asoData.reviewThemes.map((theme, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase",
                        theme.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          theme.sentiment === 'negative' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      )}>
                        {(theme.sentiment || 'neutral').replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">{theme.count || 0} mentions</span>
                    </div>

                  <h4 className="text-xs font-bold text-white leading-snug">{theme.themeName}</h4>

                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 italic text-[11px] text-slate-300">
                    "{theme.sampleQuote}"
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    <strong className="text-slate-200">ASO Action:</strong> {theme.insight}
                  </p>

                  <button
                    onClick={() => handleDraftReviewResponse(theme)}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-[10px] font-bold border border-white/10 transition-all flex items-center justify-center gap-1"
                  >
                    <Sparkles size={12} /> Draft AI Response
                  </button>
                </div>
              ))}
            </div>
            )}

            {/* AI Draft Response Modal / Drawer */}
            {selectedThemeForResponse && (
              <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-500/30 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Bot size={14} /> AI Reply Draft for: "{selectedThemeForResponse.themeName}"
                  </span>
                  <button
                    onClick={() => setSelectedThemeForResponse(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                {draftingLoading ? (
                  <div className="flex items-center gap-2 text-xs text-indigo-300 py-2">
                    <RefreshCw size={14} className="animate-spin" /> Drafting polite customer response...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={draftedResponse}
                      onChange={(e) => setDraftedResponse(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none custom-scrollbar"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(draftedResponse);
                          alert('Response copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <Copy size={12} /> Copy Response
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: METADATA BUILDER & LIMIT SIMULATOR */}
      {activeTab === 'builder' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Builder Strategy Explainer */}
          <div className="bg-amber-900/30 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-white">
              <Sliders size={16} className="text-amber-400" />
              Interactive Metadata Builder & Hard-Limit Sandbox
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Craft your metadata live with automatic character limit validation. Detect duplicated keywords between Apple Title and Keyword Field to save precious space, and check keyword density for Google Play indexing!
            </p>
          </div>

          {/* Duplicate Keyword Alert Banner */}
          {duplicateKeywords.length > 0 && (
            <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200 space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <AlertTriangle size={16} /> Apple Duplicate Keyword Warning
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                The following words appear in your <strong>Title</strong> and are duplicated in your <strong>Apple Keyword Field</strong>:
                <span className="font-bold text-white ml-1 font-mono">[{duplicateKeywords.join(', ')}]</span>.
                Apple automatically indexes words in the App Title, so repeating them in the Keyword field wastes your 100-character limit! Remove them from the keyword field to add new terms.
              </p>
            </div>
          )}

          <MetadataLinterPanel
            platform={platform}
            metadata={metadataInputs}
            onApplyFixes={(fixes) => setMetadataInputs(prev => ({ ...prev, ...fixes }))}
          />

          <div className="glass-card p-6 border border-white/10 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interactive Metadata Live Input Fields */}
              <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-white/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Live Store Metadata Sandbox</span>
                  <span className="text-[10px] text-indigo-400 font-mono">{platform.toUpperCase()} Rules</span>
                </h3>

                {/* Title Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-bold text-slate-300">App Title / Name</label>
                    <span className={clsx("font-mono text-[10px] font-bold", titleCharCount > 30 ? "text-rose-400" : "text-emerald-400")}>
                      {titleCharCount} / 30 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={metadataInputs.title}
                    onChange={(e) => setMetadataInputs({ ...metadataInputs, title: e.target.value })}
                    placeholder="App Title..."
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full", titleCharCount > 30 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, (titleCharCount / 30) * 100)}%` }} />
                  </div>
                </div>

                {/* Subtitle / Short Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-bold text-slate-300">Short Description (Play) / Subtitle (Apple)</label>
                    <span className={clsx("font-mono text-[10px] font-bold", shortDescCharCount > 80 ? "text-rose-400" : "text-emerald-400")}>
                      {shortDescCharCount} / 80 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={metadataInputs.short_description}
                    onChange={(e) => setMetadataInputs({ ...metadataInputs, short_description: e.target.value })}
                    placeholder="Short description or subtitle hook..."
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full", shortDescCharCount > 80 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, (shortDescCharCount / 80) * 100)}%` }} />
                  </div>
                </div>

                {/* Apple Keywords Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-bold text-slate-300">Apple Keyword Field (100 Chars Limit)</label>
                    <span className={clsx("font-mono text-[10px] font-bold", keywordFieldCharCount > 100 ? "text-rose-400" : "text-emerald-400")}>
                      {keywordFieldCharCount} / 100 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={metadataInputs.keyword_field}
                    onChange={(e) => setMetadataInputs({ ...metadataInputs, keyword_field: e.target.value })}
                    placeholder="comma,separated,keywords..."
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full", keywordFieldCharCount > 100 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, (keywordFieldCharCount / 100) * 100)}%` }} />
                  </div>
                </div>

                {/* Full Description & Density Calculator */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-bold text-slate-300">Full Description</label>
                    <span className="font-mono text-[10px] text-slate-400">{fullDescCharCount} / 4000 chars</span>
                  </div>
                  <textarea
                    rows={4}
                    value={metadataInputs.description}
                    onChange={(e) => setMetadataInputs({ ...metadataInputs, description: e.target.value })}
                    placeholder="Enter full app description..."
                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 custom-scrollbar"
                  />

                  {/* Live Keyword Density Inspector */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-300 flex items-center gap-1">
                        <BarChart2 size={12} className="text-indigo-400" /> Live Keyword Density Calculator
                      </span>
                      <input
                        type="text"
                        value={densityKeyword}
                        onChange={(e) => setDensityKeyword(e.target.value)}
                        placeholder="Keyword..."
                        className="bg-slate-800 border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-white w-24 outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Term "{densityKeyword}":</span>
                      <span className={clsx(
                        "font-bold px-2 py-0.5 rounded text-[10px]",
                        parseFloat(densityStats.density) >= 1.5 && parseFloat(densityStats.density) <= 3.0
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-300"
                      )}>
                        {densityStats.count} times ({densityStats.density}%) - {parseFloat(densityStats.density) >= 1.5 && parseFloat(densityStats.density) <= 3.0 ? 'Optimal (1.5% - 3.0%)' : 'Target: 2.0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidate Variant Generator & Coverage Simulator */}
              <div className="space-y-6">
                {/* Candidate Generator Controls */}
                <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Generate AI Candidate Variants</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Target Cluster (e.g. productivity)"
                      value={clusterTarget}
                      onChange={(e) => setClusterTarget(e.target.value)}
                      className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <button
                      onClick={handleGenerateVariants}
                      disabled={loading}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg"
                    >
                      Generate Candidates
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    {candidates.map((cand, idx) => (
                      <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-400 capitalize">{cand.field}</span>
                          <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${cand.isValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            {cand.actualCharCount} / {cand.maxLimit} chars
                          </span>
                        </div>
                        <p className="text-xs font-medium text-white">{cand.text}</p>
                        <p className="text-[10px] text-slate-400 italic">{cand.rationale}</p>
                      </div>
                    ))}
                    {candidates.length === 0 && (
                      <p className="text-xs text-slate-500 italic">Click "Generate Candidates" to generate strict-length metadata copy variants.</p>
                    )}
                  </div>
                </div>

                {/* Coverage Simulator */}
                <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Deterministic Coverage Matrix</h3>
                    <button
                      onClick={handleSimulateCoverage}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold"
                    >
                      Calculate Coverage
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Checks exact match indexation across Title, Subtitle, and Description without spending AI tokens.
                  </p>

                  {coverageData && (
                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">Coverage Score:</span>
                        <span className="text-lg font-extrabold text-indigo-400">{coverageData.coverageScorePct}%</span>
                      </div>
                      <div className="space-y-1.5">
                        {coverageData.details?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg">
                            <span className="font-bold text-white">{item.keyword}</span>
                            <span className={clsx(
                              "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                              item.covered ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            )}>
                              {item.covered ? `Covered in ${item.foundInField}` : 'Not Found'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: METADATA CHANGE TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-sky-900/30 border border-sky-500/20 rounded-2xl p-4 text-xs text-sky-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-white">
              <Calendar size={16} className="text-sky-400" />
              App Store & Google Play Metadata Change Timeline
            </div>
            <p className="text-[11px] text-sky-200/80 leading-relaxed">
              Track chronological listing changes across app versions, release notes (What's New), and title iterations. Comparing release dates against download rank movements isolates exactly which metadata tweaks drove organic ranking gains.
            </p>
          </div>

          <div className="glass-card p-6 border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="text-sky-400" size={20} />
                  Metadata & Release History Log
                </h2>
                <p className="text-xs text-slate-400">Chronological snapshots of listing titles, version strings, what's new, and store scores.</p>
              </div>

              <button
                onClick={handleSnapshotTimeline}
                disabled={timelineLoading}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shrink-0"
              >
                {timelineLoading ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
                {timelineLoading ? 'Capturing Snapshot...' : 'Snapshot Current Metadata'}
              </button>
            </div>

            {(!asoData?.timeline || asoData.timeline.length === 0) ? (
              <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8 text-center space-y-3">
                <Calendar size={32} className="mx-auto text-sky-400/60" />
                <h3 className="text-sm font-bold text-white">No Metadata Snapshots Recorded Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Click <strong>"Snapshot Current Metadata"</strong> to record your current store title, version, and release notes in the change history ledger.
                </p>
              </div>
            ) : (
              <div className="relative border-l border-white/10 ml-4 space-y-6 pl-6 py-2">
                {asoData.timeline.map((entry, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-sky-500 border-2 border-slate-900 ring-2 ring-sky-500/30" />
                    
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 space-y-3 hover:border-sky-500/30 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                            v{entry.version || '1.0.0'}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {entry.title || packageName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {entry.score && (
                            <span className="text-amber-400 font-bold">{entry.score}★</span>
                          )}
                          <span className="font-mono">
                            {entry.detected_at ? new Date(entry.detected_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        </div>
                      </div>

                      {entry.whats_new && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                          <div className="text-[10px] uppercase font-bold text-slate-400">What's New in this Version</div>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{entry.whats_new}</p>
                        </div>
                      )}

                      {entry.short_desc && (
                        <div className="text-xs text-slate-400">
                          <strong className="text-slate-300">Short Description / Subtitle:</strong> {entry.short_desc}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ASO ACTION PLAN & CHECKLIST */}
      {activeTab === 'action_plan' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-2xl p-4 text-xs text-indigo-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-white">
              <CheckSquare size={16} className="text-indigo-400" />
              Optimization Roadmap & Quick Wins Checklist
            </div>
            <p className="text-[11px] text-indigo-200/80 leading-relaxed">
              Track your implemented listing updates step-by-step. Prioritize <strong className="text-rose-400">High Impact</strong> fixes first to see immediate conversion gains on your store dashboard.
            </p>
          </div>

          <div className="glass-card p-6 border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckSquare className="text-indigo-400" size={20} />
                  ASO Optimization Roadmap
                </h2>
                <p className="text-xs text-slate-400">
                  {actionItems.filter(i => i.status === 'completed').length} of {actionItems.length} optimization tasks completed
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Progress</span>
                  <span className="text-indigo-400 font-bold">
                    {Math.round((actionItems.filter(i => i.status === 'completed').length / (actionItems.length || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(actionItems.filter(i => i.status === 'completed').length / (actionItems.length || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleActionItem(item.id)}
                  className={clsx(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                    item.status === 'completed'
                      ? "bg-emerald-500/5 border-emerald-500/20 opacity-75"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-5 h-5 rounded-lg flex items-center justify-center border transition-all",
                      item.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-500"
                    )}>
                      {item.status === 'completed' && <CheckCircle size={14} />}
                    </div>
                    <div>
                      <h4 className={clsx("text-xs font-bold", item.status === 'completed' ? "line-through text-slate-400" : "text-white")}>
                        {item.task}
                      </h4>
                      <span className="text-[10px] text-slate-400">{item.category}</span>
                    </div>
                  </div>

                  <span className={clsx(
                    "text-[9px] px-2 py-0.5 rounded font-extrabold uppercase",
                    item.impact === 'high' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  )}>
                    {item.impact} Impact
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PURCHASING POWER PARITY (PPP) PRICING */}
      {activeTab === 'pricing' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <PppPricingCalculator />
        </div>
      )}
    </div>
  );
}

