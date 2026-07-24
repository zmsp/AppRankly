import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles, MapPin, Cpu, Layers } from 'lucide-react';

export default function WhatChangedDigest({ stats, dimensionStats, deviceStats, onNavigateChart }) {
  if (!stats || !stats.dailyTrends || stats.dailyTrends.length < 2) return null;

  const findings = [];

  const trends = stats.dailyTrends;
  const half = Math.floor(trends.length / 2);
  const firstHalf = trends.slice(0, half);
  const secondHalf = trends.slice(half);

  const firstInstalls = firstHalf.reduce((sum, d) => sum + (d.dailyUserInstalls || 0), 0);
  const secondInstalls = secondHalf.reduce((sum, d) => sum + (d.dailyUserInstalls || 0), 0);

  // 1. Growth / Decline finding
  if (firstInstalls > 0) {
    const installDelta = Math.round(((secondInstalls - firstInstalls) / firstInstalls) * 100);
    if (installDelta >= 20) {
      findings.push({
        id: 'growth-spike',
        type: 'positive',
        icon: TrendingUp,
        color: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20',
        text: `Installs surged +${installDelta}% in the second half of this period (${secondInstalls} total).`,
        action: 'View Growth Trend',
        target: 'trend-chart'
      });
    } else if (installDelta <= -20) {
      findings.push({
        id: 'growth-drop',
        type: 'negative',
        icon: TrendingDown,
        color: 'text-accent-rose bg-accent-rose/10 border-accent-rose/20',
        text: `Installs dropped ${installDelta}% compared to the prior half (${secondInstalls} vs ${firstInstalls}).`,
        action: 'Investigate Acquisition',
        target: 'trend-chart'
      });
    }
  }

  const hasUninstallData = stats.hasUninstallData !== false &&
    !['apple', 'appstore', 'ios'].includes(stats.platform?.toLowerCase()) &&
    !['apple', 'appstore', 'ios'].includes(stats.store?.toLowerCase());

  // 2. Churn spike check (Only if uninstall data exists)
  if (hasUninstallData) {
    const maxUninstallDay = trends.reduce((max, d) => (d.dailyUserUninstalls > (max?.dailyUserUninstalls || 0) ? d : max), null);
    const avgUninstalls = trends.reduce((sum, d) => sum + (d.dailyUserUninstalls || 0), 0) / trends.length;
    if (maxUninstallDay && maxUninstallDay.dailyUserUninstalls > Math.max(5, avgUninstalls * 2.5)) {
      findings.push({
        id: 'churn-spike',
        type: 'warning',
        icon: AlertTriangle,
        color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        text: `Uninstall spike detected on ${maxUninstallDay.date} (${maxUninstallDay.dailyUserUninstalls} uninstalls, ${(maxUninstallDay.dailyUserUninstalls / avgUninstalls).toFixed(1)}× normal rate).`,
        action: 'Decompose Segment',
        target: 'churn-chart'
      });
    }
  }

  // 3. Top country market finding
  if (dimensionStats && Array.isArray(dimensionStats) && dimensionStats.length > 0) {
    const topMarket = dimensionStats[0];
    if (topMarket && topMarket.installs > 0) {
      findings.push({
        id: 'top-market',
        type: 'info',
        icon: MapPin,
        color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20',
        text: `Top market: ${topMarket.name || topMarket.key} with ${topMarket.installs} installs (${topMarket.percentage || ''}% of userbase).`,
        action: 'See Geography',
        target: 'dimension-chart'
      });
    }
  }

  // 4. Install survival rate evaluation
  if (stats.totalInstallCountByUser > 0 && stats.currentlyActiveDevices > 0) {
    const survivalPct = (stats.currentlyActiveDevices / stats.totalInstallCountByUser) * 100;
    if (survivalPct > 60) {
      findings.push({
        id: 'high-retention',
        type: 'positive',
        icon: Sparkles,
        color: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20',
        text: `High install survival rate: ${survivalPct.toFixed(1)}% of all-time downloaders still have the app active.`,
        action: 'View Active Base',
        target: 'active-chart'
      });
    } else if (survivalPct < 25 && stats.totalInstallCountByUser > 50) {
      findings.push({
        id: 'low-retention',
        type: 'negative',
        icon: AlertTriangle,
        color: 'text-accent-rose bg-accent-rose/10 border-accent-rose/20',
        text: `Install survival is under ${survivalPct.toFixed(1)}%. Most users uninstall after initial download.`,
        action: 'Review Retention',
        target: 'active-chart'
      });
    }
  }

  if (findings.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-4 sm:p-6 border border-white/10 space-y-3">
      <div className="flex items-center space-x-2 pb-2 border-b border-white/5">
        <Sparkles size={16} className="text-amber-400" />
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">What Changed This Period</h3>
        <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-full font-mono">{findings.length} key insights</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {findings.map((f) => {
          const IconComponent = f.icon;
          return (
            <div key={f.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${f.color}`}>
              <div className="flex items-start space-x-2.5">
                <IconComponent size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs text-slate-200 font-medium leading-relaxed">{f.text}</p>
              </div>
              {onNavigateChart && (
                <button
                  onClick={() => onNavigateChart(f.target)}
                  className="text-[10px] font-bold text-white/80 hover:text-white underline shrink-0 self-center"
                >
                  {f.action} →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
