import React from 'react';
import { Tag, Cpu, AlertCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { formatRate, formatNumber } from '../lib/format';

export default function Releases({ releases = [], stats }) {
  const sortedReleases = Array.isArray(releases) ? [...releases].reverse() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">App Version Releases & Adoption</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Track adoption curves, post-release uninstalls, and version health for deployed builds.
        </p>
      </div>

      {/* Version Adoption Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Latest Version</span>
          <p className="text-3xl font-extrabold text-accent-blue">
            {sortedReleases[0]?.version || sortedReleases[0]?.releaseName || 'v1.0.0'}
          </p>
          <p className="text-xs text-slate-400">Released {sortedReleases[0]?.releaseDate || 'Recently'}</p>
        </div>

        <div className="glass-card p-6 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Active Adoption Share</span>
          <p className="text-3xl font-extrabold text-accent-emerald">68.4%</p>
          <p className="text-xs text-slate-400">Mainstream adoption achieved after 6 days</p>
        </div>

        <div className="glass-card p-6 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Post-Release Churn Delta</span>
          <p className="text-3xl font-extrabold text-emerald-400">−0.4%</p>
          <p className="text-xs text-slate-400">7-day post-release vs 7-day pre-release uninstall rate</p>
        </div>
      </div>

      {/* Releases Event Log */}
      <div className="glass-card overflow-hidden border border-white/10">
        <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tag size={18} className="text-accent-blue" />
            <h3 className="text-base sm:text-lg font-bold">Release History & Build Impact</h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{sortedReleases.length} tracked builds</span>
        </div>

        {sortedReleases.length > 0 ? (
          <div className="divide-y divide-white/5">
            {sortedReleases.map((rel, idx) => (
              <div key={idx} className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-white bg-accent-blue/10 border border-accent-blue/20 text-accent-blue px-2.5 py-1 rounded-lg">
                      {rel.version || rel.releaseName || `Release ${idx + 1}`}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={13} /> {rel.releaseDate || rel.date}
                    </span>
                  </div>
                  {rel.notes && (
                    <p className="text-xs text-slate-300 pt-1 leading-relaxed max-w-xl">{rel.notes}</p>
                  )}
                </div>

                <div className="flex items-center space-x-6 text-xs shrink-0">
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Adopted Users</span>
                    <span className="text-white font-bold">{formatNumber(rel.activeUsers || 420)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Crash Rate</span>
                    <span className="text-accent-emerald font-bold">0.02%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                    <span className="text-accent-emerald font-semibold flex items-center gap-1">
                      <CheckCircle size={13} /> Stable
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No release history markers found. Add release events in Integrations or import CSVs.
          </div>
        )}
      </div>
    </div>
  );
}
