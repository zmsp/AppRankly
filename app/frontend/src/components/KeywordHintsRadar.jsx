import React, { useState } from 'react';
import { Search, Sparkles, Plus, Check, Globe, Layers, ArrowRight, Loader2, Apple, Play } from 'lucide-react';
import clsx from 'clsx';

export default function KeywordHintsRadar({ packageName, platform = 'play', onKeywordAdded }) {
  const [term, setTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('us');
  const [expandTree, setExpandTree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [addedMap, setAddedMap] = useState({});
  const [error, setError] = useState(null);

  const countries = [
    { code: 'us', label: 'United States (US)' },
    { code: 'gb', label: 'United Kingdom (UK)' },
    { code: 'de', label: 'Germany (DE)' },
    { code: 'fr', label: 'France (FR)' },
    { code: 'jp', label: 'Japan (JP)' },
    { code: 'ca', label: 'Canada (CA)' },
    { code: 'au', label: 'Australia (AU)' },
    { code: 'in', label: 'India (IN)' },
    { code: 'br', label: 'Brazil (BR)' }
  ];

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!term.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/aso/keywords/hints?term=${encodeURIComponent(term.trim())}&platform=${selectedPlatform}&country=${selectedCountry}&expand=${expandTree}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch keyword hints');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTracked = async (keywordTerm) => {
    if (!packageName) return;
    try {
      const res = await fetch('/api/aso/keywords/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName,
          platform,
          term: keywordTerm,
          tracked: true
        })
      });
      if (res.ok) {
        setAddedMap(prev => ({ ...prev, [keywordTerm]: true }));
        if (onKeywordAdded) onKeywordAdded(keywordTerm);
      }
    } catch (err) {
      console.error('Failed to add keyword:', err);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-5 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Sparkles size={16} />
            </span>
            <h3 className="text-sm font-bold text-white">Zero-Auth Keyword Hints & Volume Radar</h3>
            <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 rounded-full font-medium">
              Live Official Autocomplete
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time search suggestions directly from Apple App Store (MZSearchHints) and Google Play Store with calculated volume popularity.
          </p>
        </div>
      </div>

      {/* Search Input and Filters */}
      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-5 relative">
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Enter seed term (e.g. workout, habit tracker, budget)..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
          />
          <Search size={14} className="absolute left-3 top-3 text-slate-500" />
        </div>

        <div className="sm:col-span-2">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
          >
            <option value="all">Both Stores</option>
            <option value="apple">Apple Only</option>
            <option value="play">Google Play</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
          >
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={expandTree}
              onChange={(e) => setExpandTree(e.target.checked)}
              className="rounded bg-slate-950 border-white/20 text-indigo-600 focus:ring-0"
            />
            <span>2-Level Tree</span>
          </label>
          <button
            type="submit"
            disabled={loading || !term.trim()}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            <span>{loading ? 'Mining...' : 'Radar Scan'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className="space-y-4 pt-1 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Discovered <strong className="text-white font-mono">{results.total}</strong> suggestions for &ldquo;{results.term}&rdquo; ({results.country.toUpperCase()})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {results.keywords.map((kw) => {
              const isAdded = addedMap[kw.term];
              return (
                <div
                  key={kw.term}
                  className="bg-slate-950/70 border border-white/5 hover:border-indigo-500/30 rounded-xl p-3 flex flex-col justify-between gap-2 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-white group-hover:text-indigo-300 transition-colors">
                      {kw.term}
                    </span>
                    <button
                      onClick={() => handleAddTracked(kw.term)}
                      disabled={isAdded}
                      className={clsx(
                        "p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                        isAdded
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/5 hover:bg-indigo-600 text-slate-300 hover:text-white"
                      )}
                      title={isAdded ? "Tracked" : "Track Keyword"}
                    >
                      {isAdded ? <Check size={12} /> : <Plus size={12} />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={clsx(
                        "px-1.5 py-0.5 rounded font-mono font-bold",
                        kw.score >= 80 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                        kw.score >= 50 ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                        "bg-slate-800 text-slate-400"
                      )}>
                        Pop {kw.score}
                      </span>
                      {kw.isLongTail && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Long-Tail
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {kw.platforms.includes('apple') && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-0.5" title="App Store Autocomplete">
                          iOS #{kw.appleRank}
                        </span>
                      )}
                      {kw.platforms.includes('play') && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" title="Google Play Autocomplete">
                          Play #{kw.googleRank}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2-Level Expansion Tree */}
          {results.tree && results.tree.children && Object.keys(results.tree.children).length > 0 && (
            <div className="mt-4 p-4 bg-slate-950 border border-indigo-500/15 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Layers size={14} className="text-indigo-400" />
                <span>2-Level Keyword Expansion Clusters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(results.tree.children).map(([parentTerm, subTerms]) => (
                  <div key={parentTerm} className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-2">
                    <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                      <ArrowRight size={11} />
                      <span>{parentTerm}</span>
                    </div>
                    {subTerms.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic">No secondary branches</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {subTerms.map((st) => (
                          <button
                            key={st}
                            onClick={() => handleAddTracked(st)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-[10px] text-slate-300 hover:text-white transition-all flex items-center gap-1"
                          >
                            <span>{st}</span>
                            <Plus size={10} className="text-slate-400 hover:text-white" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
