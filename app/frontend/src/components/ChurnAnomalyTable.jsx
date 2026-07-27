import React from 'react';
import { AlertTriangle, AlertCircle, ShieldAlert, ArrowUpRight, CheckCircle } from 'lucide-react';

export default function ChurnAnomalyTable({ churnAnomalies = [], releases = [] }) {
  if (!churnAnomalies || churnAnomalies.length === 0) {
    return (
      <div className="glass-card p-6 border border-emerald-500/20 bg-emerald-500/5 text-center space-y-2">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle size={20} />
        </div>
        <h4 className="font-bold text-white text-sm">No Churn Anomalies Detected</h4>
        <p className="text-xs text-white/50 max-w-md mx-auto">
          Uninstall rates have remained stable within standard statistical variation (&lt; 2.0σ deviation).
        </p>
      </div>
    );
  }

  // Sort anomalies by date descending
  const sortedAnomalies = [...churnAnomalies].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="glass-card p-6 space-y-4 border border-rose-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Retention & Churn Anomaly Risk Log</h3>
            <p className="text-xs text-white/40">Statistical uninstall spikes exceeding 2.0 standard deviations</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
          {churnAnomalies.length} Spike{churnAnomalies.length === 1 ? '' : 's'} Detected
        </span>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-bold text-white/40 uppercase bg-white/2">
              <th className="py-3 px-4">Spike Date</th>
              <th className="py-3 px-4 text-right">Uninstalls</th>
              <th className="py-3 px-4 text-center">Dev Deviation (Z-Score)</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Correlated Release</th>
              <th className="py-3 px-4">Recommended Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {sortedAnomalies.map((anom, idx) => {
              const dateStr = new Date(anom.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
              
              // Check if any release was deployed near this date (+/- 3 days)
              const corrRelease = Array.isArray(releases) ? releases.find(r => {
                if (!r.date) return false;
                const rTime = new Date(r.date).getTime();
                const aTime = new Date(anom.date).getTime();
                return Math.abs(rTime - aTime) <= 3 * 86400 * 1000;
              }) : null;

              const isHigh = anom.severity === 'high' || Math.abs(anom.zScore || 0) > 3.0;

              return (
                <tr key={idx} className="hover:bg-white/2 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white/90 whitespace-nowrap">
                    {dateStr}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-300 font-bold">
                    {new Intl.NumberFormat().format(anom.uninstalls)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10">
                      +{anom.zScore || (anom.z ? anom.z.toFixed(2) : '2.10')}σ
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                      isHigh ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {isHigh ? <AlertTriangle size={12} /> : <AlertCircle size={12} />}
                      {isHigh ? 'HIGH RISK' : 'MODERATE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/70">
                    {corrRelease ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-accent-blue">
                        v{corrRelease.version}
                        <ArrowUpRight size={12} />
                      </span>
                    ) : (
                      <span className="text-white/30 italic">Organic Market Spike</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-white/70 text-[11px]">
                    {corrRelease ? 'Inspect recent update release notes for crash or performance regressions.' : 'Check acquisition channel quality & push notifications.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
