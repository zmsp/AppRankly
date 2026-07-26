import React from 'react';
import { Tag, CheckCircle, Clock, Calendar, AlertTriangle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { formatRate, formatNumber } from '../lib/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Releases({ releases = [], stats }) {
  // Prefer releaseCorrelations if provided in stats
  const correlated = stats?.releaseCorrelations || releases;
  const sortedReleases = Array.isArray(correlated) ? [...correlated].reverse() : [];

  // Calculate average churn delta across releases with valid impact data
  const impactsWithData = sortedReleases.map(r => r.impact).filter(Boolean);
  
  const avgChurnDelta = impactsWithData.length > 0
    ? impactsWithData.reduce((acc, imp) => acc + (imp.uninstallDeltaPct || 0), 0) / impactsWithData.length
    : null;

  const totalPostUninstalls = impactsWithData.reduce((acc, imp) => acc + (imp.avgPostUninstalls || 0), 0);
  const isLowVolume = totalPostUninstalls < 5;

  // Best day to ship from weekdayAverages
  let bestDayName = null;
  let bestDayAvg = 0;
  if (stats?.weekdayAverages) {
    let maxVal = -1;
    Object.entries(stats.weekdayAverages).forEach(([dayIdx, avg]) => {
      if (avg !== null && avg > maxVal) {
        maxVal = avg;
        bestDayName = WEEKDAYS[Number(dayIdx)];
        bestDayAvg = avg;
      }
    });
  }

  const churnAnomalies = stats?.retentionBenchmarks?.churnAnomalies || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">App Version Releases & Adoption</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Track real post-release uninstalls, release impacts, and version health for deployed builds.
        </p>
      </div>

      {/* Version Adoption & Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Latest Version</span>
          <p className="text-3xl font-extrabold text-accent-blue">
            {sortedReleases[0]?.version || sortedReleases[0]?.releaseName || 'v1.0.0'}
          </p>
          <p className="text-xs text-slate-400">Released {sortedReleases[0]?.releaseDate || sortedReleases[0]?.date || 'Recently'}</p>
        </div>

        <div className="glass-card p-6 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Best Shipping Day</span>
          <p className="text-3xl font-extrabold text-accent-emerald">
            {bestDayName ? bestDayName : 'N/A'}
          </p>
          <p className="text-xs text-slate-400">
            {bestDayName ? `Installs peak on ${bestDayName} (~${Math.round(bestDayAvg)}/day)` : 'Requires trend data to compute'}
          </p>
        </div>

        <div className="glass-card p-6 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Avg Post-Release Churn Delta</span>
          <div className="flex items-baseline space-x-2">
            <p className={`text-3xl font-extrabold ${avgChurnDelta !== null && avgChurnDelta > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {avgChurnDelta !== null ? `${avgChurnDelta > 0 ? '+' : ''}${avgChurnDelta.toFixed(1)}%` : '—'}
            </p>
            {isLowVolume && (
              <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                Low volume
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">7-day post vs pre-release uninstall delta</p>
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
            {sortedReleases.map((rel, idx) => {
              const imp = rel.impact;
              const hasImpact = imp && (imp.avgPreInstalls > 0 || imp.avgPostInstalls > 0 || imp.avgPreUninstalls > 0 || imp.avgPostUninstalls > 0);
              const isLowVolRow = imp && (imp.avgPostUninstalls < 5);

              return (
                <div key={idx} className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-white bg-accent-blue/10 border border-accent-blue/20 text-accent-blue px-2.5 py-1 rounded-lg">
                        {rel.version || rel.releaseName || `Release ${idx + 1}`}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={13} /> {rel.releaseDate || rel.date}
                      </span>
                      {rel.source === 'auto' && (
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-mono">
                          Auto-detected
                        </span>
                      )}
                    </div>
                    {rel.notes && (
                      <p className="text-xs text-slate-300 pt-1 leading-relaxed max-w-xl">{rel.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-6 text-xs shrink-0">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Post Avg Installs</span>
                      <span className="text-white font-bold">
                        {imp ? `${imp.avgPostInstalls}/day` : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Churn Delta</span>
                      <span className={`font-bold ${imp && imp.uninstallDeltaPct > 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {imp ? `${imp.uninstallDeltaPct > 0 ? '+' : ''}${imp.uninstallDeltaPct}%` : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                      {!hasImpact ? (
                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                          <Clock size={13} /> No data yet
                        </span>
                      ) : imp.uninstallDeltaPct > 20 ? (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle size={13} /> Churn Spike
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle size={13} /> Stable
                        </span>
                      )}
                      {isLowVolRow && hasImpact && (
                        <span className="text-[9px] text-slate-500 block">low volume</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No release history markers found. Add release events in Integrations or import CSVs.
          </div>
        )}
      </div>

      {/* Retention Churn Anomalies Section */}
      <div className="glass-card p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">Retention & Churn Anomaly Log</h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Z-Score &gt; 2.0</span>
        </div>

        {churnAnomalies.length > 0 ? (
          <div className="space-y-2">
            {churnAnomalies.map((anom, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 text-xs">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${anom.severity === 'high' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                    {anom.severity}
                  </span>
                  <span className="text-slate-300 font-mono">{anom.date}</span>
                  <span className="text-slate-400">Uninstall spike detected</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-slate-300 font-bold">{anom.uninstalls} uninstalls</span>
                  <span className="text-slate-500 font-mono">z={anom.zScore}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            No severe uninstall churn anomalies detected in the selected timeframe.
          </div>
        )}
      </div>
    </div>
  );
}
