import React, { useState, useEffect } from 'react';
import { 
  Eye, MousePointer, Download, Percent, Search, Sparkles, CheckCircle, 
  TrendingUp, Key, Globe, Shield, RefreshCw, Copy, Plus, AlertCircle, Bot
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { formatNumber, formatRate } from '../lib/format';
import { apiFetch } from '../lib/api';
import AppIcon from '../components/AppIcon';
import { MOCK_PROJECTS } from '../lib/mockData';

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getDemoAsoData(pkgName = '', project = {}) {
  const name = project?.name || 'Selected App';
  const isBeta = pkgName.includes('beta') || name.includes('Beta');
  const isGamma = pkgName.includes('gamma') || name.includes('Gamma');

  if (isBeta) {
    return {
      listingSnapshot: {
        title: `${name} - Fitness & Calorie Macro Counter`,
        developer: "Demo Studios",
        category: "Health & Fitness",
        score: 4.8,
        content_rating: "Everyone",
        price: "Free",
        icon_url: project?.iconUrl
      },
      lastAudit: {
        score: 92,
        headline: "Excellent screenshot conversion & high keyword coverage! Strong category ranking potential.",
        improvements: [
          { type: "Localization", impact: "high", issue: "Global Market Reach", recommendation: "Translate short description into Spanish (ES) & German (DE) to capture non-English search traffic (+18% growth)." },
          { type: "Subtitle", impact: "high", issue: "Brand vs Generic Keywords", recommendation: "Replace redundant brand word with high-volume search query 'Macro Tracker' in subtitle." },
          { type: "Keywords Field", impact: "medium", issue: "Unused Character Limit", recommendation: "Utilize remaining 18 characters in Apple 100-char keyword field with 'meal,planner'." }
        ]
      },
      keywords: [
        { id: 1, term: 'calorie counter', search_volume: 88, difficulty: 64, current_rank: 3, tracked: 1 },
        { id: 2, term: 'macro tracker', search_volume: 79, difficulty: 52, current_rank: 5, tracked: 1 },
        { id: 3, term: 'workout log', search_volume: 74, difficulty: 48, current_rank: 7, tracked: 1 },
        { id: 4, term: 'diet planner', search_volume: 68, difficulty: 41, current_rank: 4, tracked: 1 }
      ]
    };
  } else if (isGamma) {
    return {
      listingSnapshot: {
        title: `${name} - Budget & Expense Tracker`,
        developer: "Demo Studios",
        category: "Finance",
        score: 4.6,
        content_rating: "Everyone",
        price: "Free",
        icon_url: project?.iconUrl
      },
      lastAudit: {
        score: 84,
        headline: "Solid base metadata; subtitle and description require secondary keyword enrichment to improve indexation.",
        improvements: [
          { type: "Subtitle", impact: "high", issue: "Search Relevance", recommendation: "Incorporate 'Money Manager' and 'Bill Organizer' into subtitle for targeted search indexation." },
          { type: "Description", impact: "high", issue: "Formatting Retention", recommendation: "Format top 5 feature benefits as bullet points to increase reader retention by 22%." },
          { type: "Rating Prompt", impact: "medium", issue: "In-App Prompting", recommendation: "Trigger rating dialog after 3rd completed budget entry to boost 5-star review volume." }
        ]
      },
      keywords: [
        { id: 1, term: 'budget planner', search_volume: 82, difficulty: 58, current_rank: 4, tracked: 1 },
        { id: 2, term: 'expense tracker', search_volume: 85, difficulty: 62, current_rank: 6, tracked: 1 },
        { id: 3, term: 'money manager', search_volume: 71, difficulty: 45, current_rank: 8, tracked: 1 },
        { id: 4, term: 'bill reminder', search_volume: 64, difficulty: 38, current_rank: 5, tracked: 1 }
      ]
    };
  } else {
    return {
      listingSnapshot: {
        title: `${name} - AI Task Manager & Todo List`,
        developer: "Demo Studios",
        category: "Productivity",
        score: 4.9,
        content_rating: "Everyone",
        price: "Free",
        icon_url: project?.iconUrl
      },
      lastAudit: {
        score: 88,
        headline: "Strong title keyword density; short description requires a clearer value proposition & call-to-action.",
        improvements: [
          { type: "Title", impact: "high", issue: "Keyword Placement", recommendation: "Incorporate primary seed term 'Planner' in title prefix for +14% search impression boost." },
          { type: "Short Description", impact: "high", issue: "Call to Action", recommendation: "Add explicit benefit 'Boost productivity 2x daily' in first 80 characters of short description." },
          { type: "Screenshots", impact: "high", issue: "Feature Callouts", recommendation: "Add high-contrast feature caption badges to first 3 preview screenshots." },
          { type: "Description", impact: "medium", issue: "Keyword Density", recommendation: "Increase density for 'task tracker' and 'todo list' to optimal 2.5% target." }
        ]
      },
      keywords: [
        { id: 1, term: 'task manager', search_volume: 91, difficulty: 70, current_rank: 2, tracked: 1 },
        { id: 2, term: 'todo list', search_volume: 94, difficulty: 78, current_rank: 5, tracked: 1 },
        { id: 3, term: 'productivity planner', search_volume: 76, difficulty: 51, current_rank: 3, tracked: 1 },
        { id: 4, term: 'daily schedule', search_volume: 69, difficulty: 44, current_rank: 6, tracked: 1 }
      ]
    };
  }
}

export default function StoreASO({ stats, isDemoMode, projects = [], selectedProjectIndex, platform = 'play', authToken, onSelectProject }) {
  const activeProject = projects.find(p => p.index === selectedProjectIndex) || projects[0];
  const packageName = activeProject?.packageName || 'com.example.app';

  // AI & Overview States
  const [aiStatus, setAiStatus] = useState({ providers: [], defaultProvider: 'anthropic' });
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [customModel, setCustomModel] = useState('');
  const [asoData, setAsoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  // Input fields for features
  const [seedKeyword, setSeedKeyword] = useState('');
  const [clusterTarget, setClusterTarget] = useState('general');
  const [candidates, setCandidates] = useState([]);
  const [coverageData, setCoverageData] = useState(null);
  const [metadataInputs, setMetadataInputs] = useState({
    title: '',
    short_description: '',
    subtitle: '',
    keyword_field: '',
    description: ''
  });

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
    if (isDemoMode) {
      setAsoData(getDemoAsoData(packageName, activeProject));
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/aso/overview', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform, projectIndex: selectedProjectIndex })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        setAsoData(data);
      }
    } catch (e) {
      console.error('Failed to load ASO overview:', e);
    } finally {
      setLoading(false);
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
          platform,
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
    fetchPromptPreview();
  }, [packageName, platform]);

  const handleRunAudit = async () => {
    setAuditLoading(true);
    if (isDemoMode) {
      setTimeout(() => {
        setAsoData(prev => ({
          ...prev,
          lastAudit: {
            score: 95,
            headline: "AI Listing Audit complete! High conversion metadata structure with primary keyword placement.",
            improvements: [
              { type: "Subtitle", impact: "high", issue: "Keyword Placement", recommendation: "Include primary seed term in subtitle to capture +15% search impression traffic." },
              { type: "Short Description", impact: "high", issue: "Call to Action", recommendation: "Lead with explicit user benefit in first line of short description." },
              { type: "Screenshots", impact: "medium", issue: "Social Proof", recommendation: "Feature top rating badge '4.9★ Rated by Users' on screenshot 1 preview." }
            ]
          }
        }));
        setAuditLoading(false);
      }, 600);
      return;
    }
    try {
      const res = await apiFetch('/api/aso/audit', {
        method: 'POST',
        body: JSON.stringify({
          packageName,
          platform,
          provider: selectedProvider,
          model: customModel || undefined,
          focusArea,
          customListingText: customListingText || undefined,
          maxTokens: parseInt(maxTokens, 10) || undefined
        })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data?.audit) {
          setAsoData(prev => ({ ...prev, lastAudit: data.audit }));
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
    try {
      await apiFetch('/api/aso/keywords/expand', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform, seed: seedKeyword })
      }, authToken);
      setSeedKeyword('');
      fetchAsoOverview();
    } catch (e) {
      alert('Expansion error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVariants = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/aso/variants', {
        method: 'POST',
        body: JSON.stringify({
          packageName,
          platform,
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
    try {
      const res = await apiFetch('/api/aso/coverage', {
        method: 'POST',
        body: JSON.stringify({ packageName, platform, metadata: metadataInputs })
      }, authToken);
      if (res.ok) {
        const data = await res.json();
        setCoverageData(data);
      }
    } catch (e) {
      alert('Coverage simulation error: ' + e.message);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & AI Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Eye className="text-accent-blue" size={28} />
            Per-App ASO Studio (AI-Powered)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Zero-cost keyword discovery, competitor intelligence, and hard-limit metadata optimization.
          </p>
        </div>

        {/* AI Provider Config Header Strip */}
        <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
          <Bot size={18} className="text-indigo-400 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">AI Provider</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              {aiStatus.providers.map(p => (
                <option key={p.id} value={p.id} disabled={!p.available} className="bg-slate-800 text-white">
                  {p.id.toUpperCase()} {p.available ? `(${p.model})` : '(No Key)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col border-l border-white/10 pl-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Custom Model</span>
            <input
              type="text"
              placeholder="e.g. gpt-5 / opus"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none w-28 placeholder-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Funnel Overview */}
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

      {/* Portfolio ASO Scores & Recommendations Grid */}
      <div className="glass-card p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <Sparkles size={18} className="text-amber-400" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Portfolio ASO Scores & Recommendations Per App
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {(projects.length > 0 ? projects : MOCK_PROJECTS).length} Apps Evaluated
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(projects.length > 0 ? projects : MOCK_PROJECTS).map((proj) => {
            const demoAudit = getDemoAsoData(proj.packageName || proj.index, proj);
            const auditInfo = (proj.packageName === packageName && asoData?.lastAudit)
              ? asoData.lastAudit
              : demoAudit.lastAudit;
            const isSelected = proj.packageName === packageName || proj.index === selectedProjectIndex;
            const topFix = auditInfo?.improvements?.[0];

            return (
              <div
                key={proj.index}
                onClick={() => {
                  if (typeof onSelectProject === 'function') onSelectProject(proj.index);
                }}
                className={clsx(
                  "p-4 rounded-2xl border transition-all cursor-pointer space-y-3",
                  isSelected
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
                    <strong className="text-white">{topFix?.type}:</strong> {topFix?.recommendation || auditInfo.headline}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
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

        {asoData?.listingSnapshot && (
          <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
            {asoData.listingSnapshot.icon_url && (
              <img src={asoData.listingSnapshot.icon_url} alt="App Icon" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
            )}
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-extrabold text-white">{asoData.listingSnapshot.title}</h3>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                {asoData.listingSnapshot.developer && <span>Dev: <strong className="text-slate-200">{asoData.listingSnapshot.developer}</strong></span>}
                {asoData.listingSnapshot.category && <span>Category: <strong className="text-slate-200">{asoData.listingSnapshot.category}</strong></span>}
                {asoData.listingSnapshot.score > 0 && <span>Rating: <strong className="text-amber-400">{asoData.listingSnapshot.score.toFixed(1)}★</strong></span>}
                {asoData.listingSnapshot.content_rating && <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">{asoData.listingSnapshot.content_rating}</span>}
                {asoData.listingSnapshot.price && <span className="text-emerald-400 font-bold">{asoData.listingSnapshot.price}</span>}
              </div>
            </div>
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    item.impact === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {item.impact}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white capitalize">{item.type}: </span>
                    <span className="text-xs text-slate-300">{item.issue} — {item.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No listing audit run yet. Click "Run AI Audit" to score your store presence.</p>
        )}
      </div>

      {/* Section 2: Keyword Workspace & Autocomplete Fan-Out */}
      <div className="glass-card p-6 border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="text-accent-blue" size={20} />
              Keyword Workspace & Autocomplete Fan-Out
            </h2>
            <p className="text-xs text-slate-400">Discover real user query terms via zero-cost store autocomplete mining.</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Seed term (e.g. tracker)..."
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-accent-blue"
            />
            <button
              onClick={handleExpandKeywords}
              disabled={loading}
              className="px-4 py-2 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
            >
              Expand (a-z)
            </button>
          </div>
        </div>

        {/* Help Banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-white">
            <AlertCircle size={14} className="text-blue-400" />
            What is Autocomplete Fan-Out?
          </div>
          <p className="text-[11px] text-blue-200/80 leading-relaxed">
            Store autocomplete suggestions (e.g., typing <strong>"tracker a"</strong>, <strong>"tracker b"</strong> in Play Store search) reflect actual high-volume search queries entered by real users. Terms marked <strong className="text-emerald-400">Autocomplete-Verified</strong> represent confirmed search intent without needing expensive 3rd-party rank tracker APIs.
          </p>
        </div>

        {/* Keyword Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Keyword Term</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Tracked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(asoData?.keywords || []).slice(0, 15).map((kw) => (
                <tr key={kw.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{kw.term}</td>
                  <td className="py-3 px-4">
                    {kw.autocomplete_verified ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                        <CheckCircle size={10} /> Autocomplete-Verified
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Unverified</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 uppercase text-[10px]">{kw.source}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={async () => {
                        await api.fetch('/api/aso/keywords/track', {
                          method: 'POST',
                          body: JSON.stringify({ packageName, platform, keywordId: kw.id, tracked: !kw.tracked })
                        });
                        fetchAsoOverview();
                      }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        kw.tracked ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {kw.tracked ? 'Tracking' : 'Track'}
                    </button>
                  </td>
                </tr>
              ))}
              {(!asoData?.keywords || asoData.keywords.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500 italic">No keywords added yet. Use "Expand (a-z)" above to discover terms.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Metadata Studio & Deterministic Coverage Simulator */}
      <div className="glass-card p-6 border border-white/10 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            Metadata Studio & Hard-Limit Simulator
          </h2>
          <p className="text-xs text-slate-400">Generate AI candidates with code-side strict length validation and zero-token coverage scoring.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      cand.isValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {cand.actualCharCount} / {cand.maxLimit} chars
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white">{cand.text}</p>
                  <p className="text-[10px] text-slate-400 italic">{cand.rationale}</p>
                </div>
              ))}
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
              Store algorithms index specific metadata fields differently: Google Play indexes <strong>Title &gt; Short Description &gt; Description</strong>, while Apple App Store indexes <strong>Title + Subtitle + Keyword Field</strong> (ignoring main description). This matrix checks exact coverage without spending AI tokens.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Title candidate..."
                value={metadataInputs.title}
                onChange={(e) => setMetadataInputs({ ...metadataInputs, title: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Short description / Subtitle..."
                value={metadataInputs.short_description}
                onChange={(e) => setMetadataInputs({ ...metadataInputs, short_description: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            {coverageData && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Coverage Score:</span>
                  <span className="text-lg font-extrabold text-indigo-400">{coverageData.coverageScorePct}%</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {coverageData.coveredKeywords} of {coverageData.totalKeywords} tracked keywords exact-matched in indexed store fields.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
