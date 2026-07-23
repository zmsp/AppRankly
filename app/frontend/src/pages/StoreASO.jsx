import React, { useState, useEffect } from 'react';
import { 
  Eye, MousePointer, Download, Percent, Search, Sparkles, CheckCircle, 
  TrendingUp, Key, Globe, Shield, RefreshCw, Copy, Plus, AlertCircle, Bot
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { formatNumber, formatRate } from '../lib/format';
import { apiFetch } from '../lib/api';

export default function StoreASO({ stats, isDemoMode, projects = [], selectedProjectIndex, platform = 'play', authToken }) {
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
    if (isDemoMode) return;
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

  const handleRunAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await apiFetch('/api/aso/audit', {
        method: 'POST',
        body: JSON.stringify({
          packageName,
          platform,
          provider: selectedProvider,
          model: customModel || undefined
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
        />
        <MetricCard
          label="Product Page Views"
          value={formatNumber(pageViews)}
          sublabel={`Click-through: ${formatRate(viewConversionRate)}`}
          icon={MousePointer}
          color="emerald"
          progress={viewConversionRate * 100}
        />
        <MetricCard
          label="Conversion Rate (ASO)"
          value={formatRate(downloadConversionRate)}
          sublabel={`Page View → Download (${formatNumber(downloads)} downloads)`}
          icon={Percent}
          color="amber"
          progress={downloadConversionRate * 100}
        />
      </div>

      {/* Section 1: Listing Audit */}
      <div className="glass-card p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-400" size={20} />
            <h2 className="text-lg font-bold text-white">Listing Health & AI Audit</h2>
          </div>
          <button
            onClick={handleRunAudit}
            disabled={auditLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
          >
            {auditLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {auditLoading ? 'Auditing Listing...' : 'Run AI Audit'}
          </button>
        </div>

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
