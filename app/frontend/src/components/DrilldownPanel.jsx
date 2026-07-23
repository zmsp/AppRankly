import React from 'react';
import { X, Layers, Globe, Smartphone, Cpu, Tag, TrendingUp, LogOut } from 'lucide-react';
import { formatNumber, formatRate } from '../lib/format';

export default function DrilldownPanel({ selectedPoint, dimensionStats, onClose }) {
  if (!selectedPoint) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950/95 backdrop-blur-xl border-l border-white/10 p-6 z-50 overflow-y-auto shadow-2xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <span className="text-[10px] font-bold text-accent-blue uppercase tracking-wider">Date Segment Drilldown</span>
          <h2 className="text-xl font-bold text-white">{selectedPoint.date}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Point Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
          <div className="flex items-center space-x-1.5 text-accent-emerald text-xs font-bold mb-1">
            <TrendingUp size={14} />
            <span>Installs</span>
          </div>
          <p className="text-xl font-extrabold text-white">{formatNumber(selectedPoint.installs || selectedPoint.dailyUserInstalls || 0)}</p>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
          <div className="flex items-center space-x-1.5 text-accent-rose text-xs font-bold mb-1">
            <LogOut size={14} />
            <span>Uninstalls</span>
          </div>
          <p className="text-xl font-extrabold text-white">{formatNumber(selectedPoint.uninstalls || selectedPoint.dailyUserUninstalls || 0)}</p>
        </div>
      </div>

      {/* Active Devices & Net Growth */}
      <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Active Base on Date</span>
          <span className="font-bold text-white">{formatNumber(selectedPoint.activeDevices || 0)}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Net Change</span>
          <span className={`font-bold ${(selectedPoint.installs - selectedPoint.uninstalls) >= 0 ? 'text-accent-emerald' : 'text-accent-rose'}`}>
            {(selectedPoint.installs - selectedPoint.uninstalls) >= 0 ? '+' : ''}
            {formatNumber((selectedPoint.installs || selectedPoint.dailyUserInstalls || 0) - (selectedPoint.uninstalls || selectedPoint.dailyUserUninstalls || 0))}
          </span>
        </div>
      </div>

      {/* Segment Breakdown */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={14} className="text-accent-blue" />
          Dimension Share Breakdown
        </h3>

        {dimensionStats && dimensionStats.length > 0 ? (
          <div className="space-y-2">
            {dimensionStats.slice(0, 8).map((item, idx) => (
              <div key={idx} className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-1">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-white truncate font-bold">{item.name || item.key}</span>
                  <span className="text-accent-blue font-bold">{item.installs || 0} installs</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-blue rounded-full"
                    style={{ width: `${Math.min(item.percentage || (item.installs ? (item.installs / 10) : 10), 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic bg-white/5 p-4 rounded-xl text-center">
            Click on dimension tabs to view breakdown by country, OS, app version, or device hardware.
          </p>
        )}
      </div>
    </div>
  );
}
