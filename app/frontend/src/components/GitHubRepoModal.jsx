import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Github,
  Star,
  Download,
  GitFork,
  AlertCircle,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  Calendar,
  Tag,
  TrendingUp,
  BarChart2,
  Layers,
  Code2
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { apiFetch } from '../lib/api';
import { formatNumber } from '../lib/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export default function GitHubRepoModal({
  isOpen,
  onClose,
  repo,
  authToken,
  isStaticMode
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('dailyDownloads'); // 'dailyDownloads' | 'totalDownloads' | 'dailyStars' | 'totalStars'

  // Global escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch full daily history
  useEffect(() => {
    if (!isOpen || !repo?.url) return;

    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/github/history?url=${encodeURIComponent(repo.url)}&days=60`, {}, authToken, isStaticMode);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.history)) {
          setHistory(data.history);
        }
      } catch (err) {
        console.warn('[GitHubRepoModal] Error fetching history:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [isOpen, repo?.url, authToken, isStaticMode]);

  const displayHistory = useMemo(() => {
    if (history.length > 0) return history;
    if (repo?.history && repo.history.length > 0) return repo.history;
    // Fallback: single point for today
    return [{
      date: repo?.latestDate || new Date().toISOString().split('T')[0],
      stars: repo?.stars || 0,
      dailyStars: repo?.dailyStars || 0,
      totalDownloads: repo?.totalDownloads || 0,
      dailyDownloads: repo?.dailyDownloads || 0,
      latestReleaseTag: repo?.latestReleaseTag || null
    }];
  }, [history, repo]);

  const chartData = useMemo(() => {
    const labels = displayHistory.map(d => d.date);

    let dataPoints = [];
    let label = '';
    let color = '#38bdf8'; // accent blue
    let isBar = false;

    if (activeMetric === 'dailyDownloads') {
      dataPoints = displayHistory.map(d => d.dailyDownloads ?? 0);
      label = 'Daily Downloads';
      color = '#38bdf8'; // blue
      isBar = true;
    } else if (activeMetric === 'totalDownloads') {
      dataPoints = displayHistory.map(d => d.totalDownloads ?? 0);
      label = 'Total Downloads';
      color = '#0ea5e9';
    } else if (activeMetric === 'dailyStars') {
      dataPoints = displayHistory.map(d => d.dailyStars ?? 0);
      label = 'Daily New Stars';
      color = '#f59e0b'; // amber
      isBar = true;
    } else if (activeMetric === 'totalStars') {
      dataPoints = displayHistory.map(d => d.stars ?? 0);
      label = 'Total Stars';
      color = '#eab308';
    }

    return {
      isBar,
      data: {
        labels,
        datasets: [
          {
            label,
            data: dataPoints,
            borderColor: color,
            backgroundColor: isBar ? `${color}bb` : `${color}22`,
            borderWidth: 2,
            borderRadius: isBar ? 4 : 0,
            pointBackgroundColor: color,
            pointRadius: displayHistory.length === 1 ? 6 : (displayHistory.length > 30 ? 2 : 4),
            pointHoverRadius: 6,
            fill: !isBar,
            tension: 0.3
          }
        ]
      }
    };
  }, [displayHistory, activeMetric]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: { size: 10 },
          callback: (v) => formatNumber(v)
        },
        beginAtZero: true
      }
    }
  }), []);

  if (!isOpen || !repo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="glass-card w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-slate-950/90 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Github size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white truncate">
                  {repo.owner}/{repo.repo}
                </h2>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-accent-blue transition-colors"
                  title="Open on GitHub"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
              <p className="text-xs text-white/50 truncate mt-0.5">
                {repo.description || 'No description provided'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Close modal (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-semibold mb-1">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span>Stars</span>
              </div>
              <div className="text-xl font-bold text-white">
                {formatNumber(repo.stars)}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                +{(repo.dailyStars || 0) > 0 ? formatNumber(repo.dailyStars) : '0'} today
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center space-x-1.5 text-xs text-accent-blue font-semibold mb-1">
                <Download size={13} />
                <span>Downloads</span>
              </div>
              <div className="text-xl font-bold text-white">
                {formatNumber(repo.totalDownloads)}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                +{(repo.dailyDownloads || 0) > 0 ? formatNumber(repo.dailyDownloads) : '0'} today
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center space-x-1.5 text-xs text-purple-400 font-semibold mb-1">
                <GitCommit size={13} />
                <span>Commits</span>
              </div>
              <div className="text-xl font-bold text-white">
                {repo.totalCommits ? formatNumber(repo.totalCommits) : '—'}
              </div>
              <div className="text-[10px] text-white/40 font-mono mt-0.5">
                {repo.latestCommit?.sha ? `Latest: ${repo.latestCommit.sha}` : 'Repository log'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold mb-1">
                <GitPullRequest size={13} />
                <span>Pull Requests</span>
              </div>
              <div className="text-xl font-bold text-white">
                {formatNumber(repo.openPullRequests || 0)}
              </div>
              <div className="text-[10px] text-white/40 font-mono mt-0.5">
                {formatNumber(repo.openIssuesOnly ?? repo.openIssues ?? 0)} open issues
              </div>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-blue" />
              Trends & Historical Growth
            </h3>

            <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                onClick={() => setActiveMetric('dailyDownloads')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMetric === 'dailyDownloads'
                    ? 'bg-accent-blue text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Daily Downloads
              </button>
              <button
                onClick={() => setActiveMetric('totalDownloads')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMetric === 'totalDownloads'
                    ? 'bg-accent-blue text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Total Downloads
              </button>
              <button
                onClick={() => setActiveMetric('dailyStars')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMetric === 'dailyStars'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Daily Stars
              </button>
              <button
                onClick={() => setActiveMetric('totalStars')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMetric === 'totalStars'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Total Stars
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-[280px] w-full p-4 rounded-xl bg-black/30 border border-white/5">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-white/40 animate-pulse">
                Loading daily history graph...
              </div>
            ) : chartData.isBar ? (
              <Bar data={chartData.data} options={chartOptions} />
            ) : (
              <Line data={chartData.data} options={chartOptions} />
            )}
          </div>

          {/* Daily History Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider">
              Daily Snapshot History ({displayHistory.length} {displayHistory.length === 1 ? 'day' : 'days'})
            </h4>
            <div className="max-h-[200px] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-white/50 border-b border-white/10 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Date</th>
                    <th className="py-2 px-3 font-semibold">Daily Downloads</th>
                    <th className="py-2 px-3 font-semibold">Total Downloads</th>
                    <th className="py-2 px-3 font-semibold">Daily Stars</th>
                    <th className="py-2 px-3 font-semibold">Total Stars</th>
                    <th className="py-2 px-3 font-semibold">Release</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                  {[...displayHistory].reverse().map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2 px-3 text-white font-medium">{row.date}</td>
                      <td className="py-2 px-3 text-accent-blue font-semibold">
                        {(row.dailyDownloads || 0) > 0 ? `+${formatNumber(row.dailyDownloads)}` : '0'}
                      </td>
                      <td className="py-2 px-3">{formatNumber(row.totalDownloads || 0)}</td>
                      <td className="py-2 px-3 text-amber-400 font-semibold">
                        {(row.dailyStars || 0) > 0 ? `+${formatNumber(row.dailyStars)}` : '0'}
                      </td>
                      <td className="py-2 px-3">{formatNumber(row.stars || 0)}</td>
                      <td className="py-2 px-3 text-white/50">
                        {row.latestReleaseTag || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40 bg-white/[0.01]">
          <span>Polled automatically daily by AppRankly</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

