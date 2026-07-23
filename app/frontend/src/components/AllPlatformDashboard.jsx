import React, { useMemo } from 'react';
import PortfolioSmallMultiples from './PortfolioSmallMultiples';
import MetricCard from './MetricCard';
import { Apple, Download } from 'lucide-react';
import { PlayStoreIcon } from './icons/StoreIcons';
import { formatNumber } from '../lib/format';

export default function AllPlatformDashboard({ projects, stats, setSelectedProjectIndex }) {
  const { appleTotal, googleTotal, combinedTotal } = useMemo(() => {
    let appleT = 0, googleT = 0;
    
    projects.forEach(proj => {
      const trendKey = Object.keys(stats?.appTrends || {}).find(k => 
        k === proj.name || k === proj.packageName || 
        (proj.name && k.toLowerCase() === proj.name.toLowerCase()) || 
        (proj.packageName && k.toLowerCase() === proj.packageName.toLowerCase()) ||
        (proj.packageName && k.toLowerCase() === proj.packageName.split('.').pop().toLowerCase()) ||
        (proj.name && k.toLowerCase().includes(proj.name.toLowerCase()))
      );
      
      const trendData = trendKey ? stats.appTrends[trendKey] : [];
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
    };
  }, [projects, stats]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Apple Installs"
          value={formatNumber(appleTotal)}
          icon={Apple}
          color="amber" // or a custom color, but amber works
        />
        <MetricCard
          label="Google Installs"
          value={formatNumber(googleTotal)}
          icon={PlayStoreIcon}
          color="blue"
        />
        <MetricCard
          label="Combined Installs"
          value={formatNumber(combinedTotal)}
          icon={Download}
          color="emerald"
        />
      </div>
      
      <div className="mt-8">
        <PortfolioSmallMultiples
          projects={projects}
          appTrends={stats?.appTrends || {}}
          onSelectProject={setSelectedProjectIndex}
        />
      </div>
    </div>
  );
}
