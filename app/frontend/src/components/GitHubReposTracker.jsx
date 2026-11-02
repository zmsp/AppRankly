import React, { useState, useEffect } from 'react';
import {
  Github,
  Star,
  Download,
  GitFork,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Tag,
  Package,
  GitCommit,
  GitPullRequest,
  Scale,
  Code2,
  HardDrive
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatNumber } from '../lib/format';
import GitHubRepoModal from './GitHubRepoModal';

export default function GitHubReposTracker({ authToken, isStaticMode }) {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);

  const fetchRepos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/github/repos', {}, authToken, isStaticMode);
      const data = await res.json();
      if (data.success && Array.isArray(data.repos)) {
        setRepos(data.repos);
      }
    } catch (err) {
      console.warn('[GitHubReposTracker] Error fetching repos:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [authToken]);

  const handlePollNow = async () => {
    if (polling) return;
    try {
      setPolling(true);
      const res = await apiFetch('/api/github/poll', {
        method: 'POST',
        body: JSON.stringify({ force: true })
      }, authToken, isStaticMode);
      await res.json();
      await fetchRepos();
    } catch (err) {
      console.error('[GitHubReposTracker] Poll failed:', err.message);
    } finally {
      setPolling(false);
    }
  };

  if (!loading && repos.length === 0) {
    return null;
  }

  const formatSize = (kb) => {
    if (!kb) return null;
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb} KB`;
  };

  return (
    <div className="glass-card p-4 sm:p-6 mt-8 rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Github size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              GitHub Repositories
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                {repos.length} {repos.length === 1 ? 'tracked' : 'tracked'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Daily tracked star counts, package downloads, commit activity, and repo metrics via public GitHub API
            </p>
          </div>
        </div>

        <button
          onClick={handlePollNow}
          disabled={polling || loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          title="Trigger immediate daily poll"
        >
          <RefreshCw size={13} className={polling ? "animate-spin text-accent-blue" : ""} />
          <span>{polling ? 'Polling GitHub...' : 'Poll Now'}</span>
        </button>
      </div>

      {loading && repos.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
          Loading tracked GitHub repositories...
        </div>
      ) : error && repos.length === 0 ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle size={15} />
          <span>Failed to load GitHub statistics: {error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((r, i) => {
            const hasDeltaDownloads = (r.dailyDownloads || 0) > 0;
            const hasDeltaStars = (r.dailyStars || 0) > 0;
            const sizeStr = formatSize(r.sizeKb);

            return (
              <div
                key={i}
                onClick={() => setSelectedRepo(r)}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-accent-blue/50 hover:bg-white/[0.08] transition-all flex flex-col justify-between cursor-pointer group/card shadow-sm hover:shadow-lg hover:shadow-accent-blue/5"
                title="Click to view daily graphs and historical trends"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col min-w-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-sm text-white hover:text-accent-blue transition-colors flex items-center gap-1.5 group min-w-0"
                      >
                        <span className="truncate">{r.isPackage && r.packageName ? `${r.owner}/${r.packageName}` : `${r.owner}/${r.repo}`}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </a>
                      {r.isPackage && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 font-mono mt-0.5">
                          <Package size={10} /> {r.packageType || 'package'}
                        </span>
                      )}
                    </div>

                    {r.isPolledToday ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 size={10} /> Polled Today
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {r.latestDate || 'Pending'}
                      </span>
                    )}
                  </div>

                  {r.description && (
                    <p className="text-xs text-white/50 line-clamp-2 mb-3">
                      {r.description}
                    </p>
                  )}

                  {/* Primary KPIs: Stars & Downloads */}
                  <div className="grid grid-cols-2 gap-2 my-3">
                    {/* Stars */}
                    <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                      <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-semibold mb-1">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span>Stars</span>
                      </div>
                      <div className="text-lg font-bold text-white tracking-tight">
                        {formatNumber(r.stars)}
                      </div>
                      {hasDeltaStars && (
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          +{formatNumber(r.dailyStars)} today
                        </div>
                      )}
                    </div>

                    {/* Downloads */}
                    <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                      <div className="flex items-center space-x-1.5 text-accent-blue text-xs font-semibold mb-1">
                        <Download size={13} />
                        <span>Downloads</span>
                      </div>
                      <div className="text-lg font-bold text-white tracking-tight">
                        {formatNumber(r.totalDownloads)}
                      </div>
                      {hasDeltaDownloads ? (
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          +{formatNumber(r.dailyDownloads)} today
                        </div>
                      ) : r.packageDownloads > 0 && r.releaseDownloads > 0 ? (
                        <div className="text-[10px] text-white/40 font-mono mt-0.5">
                          {formatNumber(r.packageDownloads)} pkg • {formatNumber(r.releaseDownloads)} rel
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Secondary Metrics Grid: Commits, PRs, Issues, Forks */}
                  <div className="grid grid-cols-4 gap-1.5 py-2 px-2.5 mb-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-white/70 text-center">
                    <div title="Total commits">
                      <div className="text-white/40 flex items-center justify-center gap-0.5 text-[10px]">
                        <GitCommit size={10} /> Commits
                      </div>
                      <span className="font-semibold">{r.totalCommits ? formatNumber(r.totalCommits) : '—'}</span>
                    </div>
                    <div title="Open Pull Requests">
                      <div className="text-white/40 flex items-center justify-center gap-0.5 text-[10px]">
                        <GitPullRequest size={10} /> PRs
                      </div>
                      <span className="font-semibold text-emerald-400/90">{formatNumber(r.openPullRequests || 0)}</span>
                    </div>
                    <div title="Open Issues">
                      <div className="text-white/40 flex items-center justify-center gap-0.5 text-[10px]">
                        <AlertCircle size={10} /> Issues
                      </div>
                      <span className="font-semibold text-amber-400/90">{formatNumber(r.openIssuesOnly ?? r.openIssues ?? 0)}</span>
                    </div>
                    <div title="Forks">
                      <div className="text-white/40 flex items-center justify-center gap-0.5 text-[10px]">
                        <GitFork size={10} /> Forks
                      </div>
                      <span className="font-semibold">{formatNumber(r.forks || 0)}</span>
                    </div>
                  </div>

                  {/* Topics Chips */}
                  {Array.isArray(r.topics) && r.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {r.topics.slice(0, 4).map((topic, tidx) => (
                        <span key={tidx} className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/5 text-white/50 border border-white/5">
                          #{topic}
                        </span>
                      ))}
                      {r.topics.length > 4 && (
                        <span className="text-[10px] px-1 text-white/30">+{r.topics.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer tags: Language, Size, License, Latest Release */}
                <div className="pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-white/40">
                  <div className="flex items-center gap-2">
                    {r.primaryLanguage && (
                      <span className="flex items-center gap-1 font-mono text-[10px] text-white/60">
                        <Code2 size={10} className="text-accent-blue" />
                        {r.primaryLanguage}
                        {r.languagePercentages?.[0] ? ` ${r.languagePercentages[0].percentage}%` : ''}
                      </span>
                    )}
                    {sizeStr && (
                      <span className="flex items-center gap-0.5 text-[10px] text-white/40" title="Repo size">
                        <HardDrive size={10} /> {sizeStr}
                      </span>
                    )}
                    {r.license && (
                      <span className="flex items-center gap-0.5 text-[10px] text-white/40" title="License">
                        <Scale size={10} /> {r.license}
                      </span>
                    )}
                  </div>

                  {r.latestReleaseTag && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-accent-blue/80 bg-accent-blue/10 px-1.5 py-0.5 rounded shrink-0">
                      <Tag size={9} /> {r.latestReleaseTag}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedRepo && (
        <GitHubRepoModal
          isOpen={Boolean(selectedRepo)}
          onClose={() => setSelectedRepo(null)}
          repo={selectedRepo}
          authToken={authToken}
          isStaticMode={isStaticMode}
        />
      )}
    </div>
  );
}
