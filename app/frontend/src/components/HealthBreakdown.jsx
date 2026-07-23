import React from 'react';
import { Star, ShieldAlert, Users, Activity, TrendingUp } from 'lucide-react';
import Sparkline from './Sparkline';

export default function HealthBreakdown({ stats }) {
  if (!stats) return null;

  const latestTrend = stats.dailyTrends?.[stats.dailyTrends.length - 1];
  const previousTrend = stats.dailyTrends?.[stats.dailyTrends.length - 8]; // 7 days ago

  const ratingTrendData = stats.dailyTrends?.map(t => t.totalAvgRating || t.dailyAvgRating || 0).filter(v => v > 0);
  const installTrendData = stats.dailyTrends?.map(t => t.dailyUserInstalls || 0);

  const signals = [
    {
      label: 'Avg Rating',
      value: stats.averageRating ? `★ ${stats.averageRating.toFixed(1)}` : 'N/A',
      change: stats.dailyTrends && stats.dailyTrends.length > 7 ?
        (stats.dailyTrends[stats.dailyTrends.length - 1].totalAvgRating - stats.dailyTrends[stats.dailyTrends.length - 8].totalAvgRating).toFixed(2) : null,
      icon: Star,
      status: stats.averageRating >= 4.0 ? 'Improving' : 'Needs Attention',
      sparkline: ratingTrendData,
      sparklineColor: '#fbbf24'
    },
    {
      label: 'Install/Uninstall',
      value: `${(stats.totalDailyUserInstalls / (stats.totalDailyUserUninstalls || 1)).toFixed(1)}:1`,
      change: null,
      icon: TrendingUp,
      status: (stats.totalDailyUserInstalls / (stats.totalDailyUserUninstalls || 1)) > 2 ? 'Healthy' : 'Uninstalls rising',
      sparkline: installTrendData,
      sparklineColor: '#10b981'
    },
    {
      label: 'Crash-free Rate',
      value: latestTrend?.crashRate ? `${(100 - latestTrend.crashRate).toFixed(2)}%` : 'N/A',
      change: latestTrend?.crashRate && previousTrend?.crashRate ? (previousTrend.crashRate - latestTrend.crashRate).toFixed(2) : null,
      icon: ShieldAlert,
      status: (latestTrend?.crashRate || 0) < 1.09 ? 'On target' : 'Above threshold'
    },
    {
      label: 'Active Retention',
      value: stats.totalInstallCountByUser > 0 ? `${((stats.currentlyActiveDevices / stats.totalInstallCountByUser) * 100).toFixed(1)}%` : 'N/A',
      change: null,
      icon: Activity,
      status: 'On target'
    }
  ];

  return (
    <div className="glass-card p-6 mt-6">
      <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Signal-Level Health Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {signals.map((signal, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <signal.icon size={16} className="text-white/40" />
              {signal.change !== null && (
                <span className={`text-[10px] font-bold ${parseFloat(signal.change) >= 0 ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                  {parseFloat(signal.change) > 0 ? '+' : ''}{signal.change}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-white/60">{signal.label}</p>
            <p className="text-xl font-bold">{signal.value}</p>
            <p className={`text-[10px] font-bold mt-1 ${signal.status.includes('Needs') || signal.status.includes('rising') || signal.status.includes('Above') ? 'text-accent-rose' : 'text-accent-emerald'}`}>
              {signal.status}
            </p>
            {signal.sparkline && signal.sparkline.length > 2 && (
              <div className="mt-4 h-[30px] w-full">
                <Sparkline data={signal.sparkline} color={signal.sparklineColor} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Crash Impact Estimator (6.2) */}
      {latestTrend?.crashRate > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="text-rose-500 shrink-0 mt-1" size={18} />
            <div>
              <h4 className="text-sm font-bold text-rose-500">Crash Impact Estimate</h4>
              <p className="text-xs text-white/70 mt-1">
                Based on your {new Intl.NumberFormat().format(stats.currentlyActiveDevices)} daily active users:
                <br />
                <span className="font-bold text-white">~{Math.round(stats.currentlyActiveDevices * (latestTrend.crashRate / 100))} users</span> experience a crash per day.
              </p>
              <p className="text-[10px] text-white/40 mt-2">
                Fixing this to below 0.5% would save ~{Math.round(stats.currentlyActiveDevices * (Math.max(0, latestTrend.crashRate - 0.5) / 100))} users from crashing daily.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
