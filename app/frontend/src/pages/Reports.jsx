import React from 'react';
import { FileText, Download, Activity } from 'lucide-react';
import { toCSV, downloadCSV } from '../lib/csv';

export default function Reports({ stats, dimensionStats, activeDimension, loading, projects, selectedProjectIndex }) {
  const currentProject = projects.find(p => p.index === selectedProjectIndex) || { name: 'App' };

  const handleExportOverview = () => {
    if (!stats) return;
    const columns = ['totalInstallCountByUser', 'totalUninstallCountByUser', 'currentlyActiveDevices', 'totalDailyUserInstalls', 'totalDailyUserUninstalls'];
    const csv = toCSV([stats], columns);
    downloadCSV(`${currentProject.name}_overview.csv`, csv);
  };

  const handleExportTrends = () => {
    if (!stats || !stats.dailyTrends || stats.dailyTrends.length === 0) return;
    const columns = Object.keys(stats.dailyTrends[0]);
    const csv = toCSV(stats.dailyTrends, columns);
    downloadCSV(`${currentProject.name}_trends.csv`, csv);
  };

  const handleExportDimensions = () => {
    if (!dimensionStats || dimensionStats.length === 0) return;
    const columns = Object.keys(dimensionStats[0]);
    const csv = toCSV(dimensionStats, columns);
    downloadCSV(`${currentProject.name}_${activeDimension}.csv`, csv);
  };

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-full">
      <Activity className="animate-spin text-accent-blue mr-2" />
      <span>Preparing report data...</span>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="bg-white/5 p-4 rounded-full mb-4">
        <FileText className="text-white/20 w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold mb-2">Reports Not Available</h3>
      <p className="text-white/40 mb-6 max-w-md">Sync your data to generate exportable reports.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports & Exports</h2>
        <p className="text-white/40">Download raw data for offline analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard
          title="Overview Stats"
          description="Summary of installs, uninstalls, and active devices for the selected period."
          onDownload={handleExportOverview}
          disabled={!stats}
        />
        <ReportCard
          title="Daily Trends"
          description="A day-by-day breakdown of all key performance metrics."
          onDownload={handleExportTrends}
          disabled={!stats}
        />
        <ReportCard
          title={`Dimension: ${activeDimension.replace('_', ' ')}`}
          description="Granular data for the currently selected dimension analysis."
          onDownload={handleExportDimensions}
          disabled={!dimensionStats}
        />
        <div className="glass-card p-6 flex flex-col justify-between border-dashed border-white/10 opacity-60">
          <div>
            <h3 className="font-bold mb-2 flex items-center">
              <FileText className="mr-2 text-white/40" size={18} />
              Full Archive (ZIP)
            </h3>
            <p className="text-xs text-white/40">Download all dimensions and historical trends in a single archive.</p>
          </div>
          <button disabled className="mt-4 w-full py-2 bg-white/5 text-white/20 rounded-xl font-bold text-xs uppercase cursor-not-allowed">
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, description, onDownload, disabled }) {
  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div>
        <h3 className="font-bold mb-2 flex items-center">
          <FileText className="mr-2 text-accent-blue" size={18} />
          {title}
        </h3>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <button
        onClick={onDownload}
        disabled={disabled}
        className={`mt-4 w-full py-2 flex items-center justify-center space-x-2 rounded-xl font-bold text-xs uppercase transition-all ${
          disabled ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 text-white'
        }`}
      >
        <Download size={14} />
        <span>Download CSV</span>
      </button>
    </div>
  );
}
