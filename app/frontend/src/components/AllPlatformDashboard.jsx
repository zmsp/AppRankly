import React, { useMemo } from 'react';
import PortfolioSmallMultiples from './PortfolioSmallMultiples';
import MetricCard from './MetricCard';
import { Download } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { formatNumber } from '../lib/format';

export default function AllPlatformDashboard({ projects = [], filteredProjects, stats, platform = 'all', setSelectedProjectIndex, setPlatform }) {
  const displayProjects = filteredProjects && filteredProjects.length > 0
    ? filteredProjects
    : (platform === 'all' ? projects : projects.filter(p => p.platform === platform));

  const { appleTotal, googleTotal, combinedTotal, appleCount, googleCount } = useMemo(() => {
    let appleC = 0, googleC = 0;
    projects.forEach(proj => {
      if (proj.platform === 'apple') appleC++;
      else googleC++;
    });

    // Prefer server-computed platform totals (reliable, no key-matching fragility)
    if (stats?.platformTotals) {
      const googlePT = stats.platformTotals.google || {};
      const applePT = stats.platformTotals.apple || {};
      const googleT = googlePT.totalDailyUserInstalls || googlePT.totalInstalls || 0;
      const appleT = applePT.totalDailyUserInstalls || applePT.totalInstalls || 0;
      return {
        appleTotal: appleT,
        googleTotal: googleT,
        combinedTotal: appleT + googleT,
        appleCount: appleC,
        googleCount: googleC
      };
    }

    // Fallback: reconstruct from appTrends using exact packageName lookup
    let appleT = 0, googleT = 0;
    projects.forEach(proj => {
      const entry = stats?.appTrends?.[proj.packageName];
      const trendData = entry?.trends || entry || [];
      const installs = trendData.reduce((sum, d) => sum + (d.dailyUserInstalls || d.dailyInstalls || 0), 0);
      
      if (proj.platform === 'apple') {
        appleT += installs;
      } else {
        googleT += installs;
      }
    });

    return {
      appleTotal: appleT,
      googleTotal: googleT,
      combinedTotal: appleT + googleT,
      appleCount: appleC,
      googleCount: googleC
    };
  }, [projects, stats]);

  const googleShare = combinedTotal > 0 ? ((googleTotal / combinedTotal) * 100).toFixed(1) + '%' : '0%';
  const appleShare = combinedTotal > 0 ? ((appleTotal / combinedTotal) * 100).toFixed(1) + '%' : '0%';

  return (
    <div className="space-y-6">
      {/* Top Platform Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={platform === 'apple' ? 'ring-2 ring-sky-500/50 rounded-2xl transition-all shadow-lg' : ''}>
          <MetricCard
            label="Apple Installs"
            value={formatNumber(appleTotal)}
            sublabel={`${appleCount} App Store ${appleCount === 1 ? 'App' : 'Apps'} • ${appleShare} Share`}
            icon={AppleStoreIcon}
            color="amber"
          />
        </div>

        <div className={platform === 'google' ? 'ring-2 ring-emerald-500/50 rounded-2xl transition-all shadow-lg' : ''}>
          <MetricCard
            label="Google Installs"
            value={formatNumber(googleTotal)}
            sublabel={`${googleCount} Google Play ${googleCount === 1 ? 'App' : 'Apps'} • ${googleShare} Share`}
            icon={PlayStoreIcon}
            color="blue"
          />
        </div>

        <div className={platform === 'all' ? 'ring-2 ring-accent-blue/50 rounded-2xl transition-all shadow-lg' : ''}>
          <MetricCard
            label="Combined Installs"
            value={formatNumber(combinedTotal)}
            sublabel={`${projects.length} Total ${projects.length === 1 ? 'App' : 'Apps'} Tracked`}
            icon={Download}
            color="emerald"
          />
        </div>
      </div>
      
      {/* App Portfolio Grid with Mini Sparkline Graphs */}
      <div className="mt-8">
        <PortfolioSmallMultiples
          projects={displayProjects}
          appTrends={stats?.appTrends || {}}
          onSelectProject={setSelectedProjectIndex}
        />
      </div>
    </div>
  );
}
