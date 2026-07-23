import React from 'react';
import { Activity } from 'lucide-react';

export default function DeviceHealthTable({ data, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Activity className="animate-spin text-accent-blue mr-2" />
      <span className="text-white/40">Loading device health data...</span>
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="p-12 text-center text-white/40">
      No device data available for the selected period.
    </div>
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white/2">
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-white/40 uppercase">Device Model</th>
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-white/40 uppercase">Active Devices</th>
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-white/40 uppercase">Net Growth</th>
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-white/40 uppercase">Retention</th>
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-white/40 uppercase text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((device, i) => (
            <tr key={i} className="hover:bg-white/2 transition-colors group">
              <td className="px-3 sm:px-6 py-3 sm:py-4">
                <div className="font-semibold text-white/90 text-xs sm:text-sm">{device.label}</div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4">
                <span className="text-xs sm:text-sm font-mono">{new Intl.NumberFormat().format(device.activeDevices)}</span>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4">
                <span className={`text-xs sm:text-sm ${device.netUserGrowth >= 0 ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                  {device.netUserGrowth > 0 ? '+' : ''}{new Intl.NumberFormat().format(device.netUserGrowth)}
                </span>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="flex-1 w-16 sm:w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-blue"
                      style={{ width: `${Math.min(device.retentionRate || 0, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold">{device.retentionRate || 0}%</span>
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold ${
                  (device.retentionRate || 0) > 50 ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-accent-rose/10 text-accent-rose'
                }`}>
                  {(device.retentionRate || 0) > 50 ? 'OPTIMAL' : 'LOW RETENTION'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
