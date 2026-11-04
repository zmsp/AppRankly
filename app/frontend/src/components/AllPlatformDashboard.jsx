import React, { useMemo } from 'react';
import PortfolioSmallMultiples from './PortfolioSmallMultiples';
import GitHubReposTracker from './GitHubReposTracker';
import MetricCard from './MetricCard';
import { Download } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import { formatNumber, formatAsOfDate } from '../lib/format';
import { groupProjectsByPair } from '../lib/projectUtils';
import { clsx } from 'clsx';

export default function AllPlatformDashboard({ projects = [], filteredProjects, stats, platform = 'all', setSelectedProjectIndex, setPlatform, setPlatformAndProject, pairings, authToken, isStaticMode, isDemoMode }) {
  const displayProjects = useMemo(() => {
    if (platform === 'all') {
      return groupProjectsByPair(projects, pairings?.paired || pairings);
    }
    return filteredProjects && filteredProjects.length > 0
      ? filteredProjects
      : projects.filter(p => p.platform === platform);
  }, [projects, filteredProjects, platform, pairings]);

  const { appleTotal, googleTotal, combinedTotal, appleCount, googleCount, appleLatestDate, googleLatestDate, combinedLatestDate } = useMemo(() => {
    let appleC = 0, googleC = 0;
    let appleLatest = null;
    let googleLatest = null;

    projects.forEach(proj => {
      if (proj.platform === 'apple') appleC++;
      else googleC++;
    });

    // Scan app trends for latest dates per store
    if (stats?.appTrends) {
      Object.entries(stats.appTrends).forEach(([key, entry]) => {
        const trendData = entry?.dailyTrends || entry?.trends || (Array.isArray(entry) ? entry : []);
        if (trendData.length > 0) {
          const lastPoint = trendData[trendData.length - 1];
          if (lastPoint?.date) {
            const isApple = entry?.platform === 'apple' || key.startsWith('apple:');
            if (isApple) {
              if (!appleLatest || lastPoint.date > appleLatest) appleLatest = lastPoint.date;
            } else {
              if (!googleLatest || lastPoint.date > googleLatest) googleLatest = lastPoint.date;
            }
          }
        }
      });
    }

    if (!appleLatest && stats?.dailyTrends?.length > 0) {
      appleLatest = stats.dailyTrends[stats.dailyTrends.length - 1]?.date || null;
    }
    if (!googleLatest && stats?.dailyTrends?.length > 0) {
      googleLatest = stats.dailyTrends[stats.dailyTrends.length - 1]?.date || null;
    }

    const combinedLatest = [appleLatest, googleLatest].filter(Boolean).sort().reverse()[0] || null;

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
        googleCount: googleC,
        appleLatestDate: appleLatest,
        googleLatestDate: googleLatest,
        combinedLatestDate: combinedLatest
      };
    }

    // Fallback: reconstruct from appTrends using platform-prefixed and exact packageName lookup
    let appleT = 0, googleT = 0;
    projects.forEach(proj => {
      const platKey = `${proj.platform}:${proj.packageName || proj.bundleId}`;
      const entry = stats?.appTrends?.[platKey] || stats?.appTrends?.[proj.packageName] || stats?.appTrends?.[proj.bundleId] || stats?.appTrends?.[proj.name];
      const trendData = entry?.dailyTrends || entry?.trends || (Array.isArray(entry) ? entry : []);
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
      googleCount: googleC,
      appleLatestDate: appleLatest,
      googleLatestDate: googleLatest,
      combinedLatestDate: combinedLatest
    };
  }, [projects, stats]);

  const googleShare = combinedTotal > 0 ? ((googleTotal / combinedTotal) * 100).toFixed(1) + '%' : '0%';
  const appleShare = combinedTotal > 0 ? ((appleTotal / combinedTotal) * 100).toFixed(1) + '%' : '0%';

  const handleScopeClick = (targetPlatform) => {
    if (setPlatformAndProject) {
      setPlatformAndProject(targetPlatform, 'all');
    } else {
      if (setPlatform) setPlatform(targetPlatform);
      if (setSelectedProjectIndex) setSelectedProjectIndex('all');
    }
  };

  const topApp = useMemo(() => {
    let best = null;
    let maxInstalls = -1;
    displayProjects.forEach(proj => {
      const platKey = `${proj.platform}:${proj.packageName || proj.bundleId}`;
      const entry = stats?.appTrends?.[platKey] || stats?.appTrends?.[proj.packageName] || stats?.appTrends?.[proj.bundleId] || stats?.appTrends?.[proj.name];
      const trendData = entry?.dailyTrends || entry?.trends || (Array.isArray(entry) ? entry : []);
      const installs = trendData.reduce((sum, d) => sum + (d.dailyUserInstalls || d.dailyInstalls || 0), 0);
      if (installs > maxInstalls) {
        maxInstalls = installs;
        best = { name: proj.name, installs };
      }
    });
    return best && maxInstalls > 0 ? best : null;
  }, [displayProjects, stats]);

  return (
    <div className="space-y-6">
      {/* Top Platform Overview Stat Cards */}
      {platform === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Combined Installs (First) */}
          <div
            onClick={() => handleScopeClick('all')}
            className={clsx(
              "cursor-pointer transition-all duration-200 rounded-2xl group",
              platform === 'all'
                ? 'ring-2 ring-accent-blue/60 shadow-lg shadow-accent-blue/15 bg-accent-blue/5'
                : 'hover:scale-[1.015] hover:brightness-110 active:scale-[0.99]'
            )}
            title="Click to view Combined Multi-Platform Apps scope"
          >
            <MetricCard
              label="Combined Installs"
              value={formatNumber(combinedTotal)}
              sublabel={`${projects.length} Total ${projects.length === 1 ? 'App' : 'Apps'} Tracked • ${appleShare} iOS / ${googleShare} Android`}
              contextRange={combinedLatestDate ? formatAsOfDate(combinedLatestDate) : undefined}
              icon={Download}
              color="emerald"
            />
          </div>

          {/* 2. Apple Installs (Second) */}
          <div
            onClick={() => handleScopeClick('apple')}
            className="cursor-pointer transition-all duration-200 rounded-2xl group hover:scale-[1.015] hover:brightness-110 active:scale-[0.99]"
            title="Click to view Apple App Store apps scope"
          >
            <MetricCard
              label="Apple Installs"
              value={formatNumber(appleTotal)}
              sublabel={`${appleCount} App Store ${appleCount === 1 ? 'App' : 'Apps'} • ${appleShare} Share`}
              contextRange={appleLatestDate ? formatAsOfDate(appleLatestDate) : undefined}
              icon={AppleStoreIcon}
              color="amber"
            />
          </div>

          {/* 3. Google Installs (Third) */}
          <div
            onClick={() => handleScopeClick('google')}
            className="cursor-pointer transition-all duration-200 rounded-2xl group hover:scale-[1.015] hover:brightness-110 active:scale-[0.99]"
            title="Click to view Google Play Store apps scope"
          >
            <MetricCard
              label="Google Installs"
              value={formatNumber(googleTotal)}
              sublabel={`${googleCount} Google Play ${googleCount === 1 ? 'App' : 'Apps'} • ${googleShare} Share`}
              contextRange={googleLatestDate ? formatAsOfDate(googleLatestDate) : undefined}
              icon={PlayStoreIcon}
              color="blue"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scoped Installs Card */}
          <div className="rounded-2xl ring-2 ring-accent-blue/60 shadow-lg shadow-accent-blue/15 bg-accent-blue/5">
            <MetricCard
              label={platform === 'apple' ? "Apple Store Installs" : "Google Play Installs"}
              value={formatNumber(platform === 'apple' ? appleTotal : googleTotal)}
              sublabel={platform === 'apple' ? `${appleShare} Portfolio Share` : `${googleShare} Portfolio Share`}
              contextRange={formatAsOfDate(platform === 'apple' ? appleLatestDate : googleLatestDate)}
              icon={platform === 'apple' ? AppleStoreIcon : PlayStoreIcon}
              color={platform === 'apple' ? "amber" : "emerald"}
            />
          </div>

          {/* Scoped Apps Count Card */}
          <div className="rounded-2xl bg-white/5 border border-white/5">
            <MetricCard
              label={platform === 'apple' ? "Active iOS Apps" : "Active Android Apps"}
              value={formatNumber(platform === 'apple' ? appleCount : googleCount)}
              sublabel={`Across ${formatNumber(projects.length)} total portfolio apps`}
              icon={platform === 'apple' ? AppleStoreIcon : PlayStoreIcon}
              color="blue"
            />
          </div>

          {/* Top Performing App in Scope Card */}
          <div className="rounded-2xl bg-white/5 border border-white/5">
            <MetricCard
              label="Top Performing App"
              value={topApp ? formatNumber(topApp.installs) : '—'}
              sublabel={topApp ? `${topApp.name} (${topApp.installs} installs)` : "No installs recorded"}
              icon={Download}
              color="emerald"
            />
          </div>
        </div>
      )}
      
      {/* App Portfolio Grid with Mini Sparkline Graphs */}
      <div className="mt-8">
        <PortfolioSmallMultiples
          projects={displayProjects}
          appTrends={stats?.appTrends || {}}
          onSelectProject={setSelectedProjectIndex}
        />
      </div>

      {/* GitHub Repository Tracking (Stars & Package Downloads) */}
      <GitHubReposTracker authToken={authToken} isStaticMode={isStaticMode || isDemoMode} />
    </div>
  );
}
