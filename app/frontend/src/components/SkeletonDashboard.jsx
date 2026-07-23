import React from 'react';

export default function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Portfolio / Header skeleton */}
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="h-4 bg-white/10 rounded w-48" />
        <div className="h-8 bg-white/10 rounded-lg w-28" />
      </div>

      {/* Hero KPI Skeleton */}
      <div className="glass-card p-6 md:p-8 space-y-4 border border-white/10 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-5 bg-accent-blue/20 rounded-full w-36" />
            <div className="h-12 bg-white/10 rounded-xl w-44" />
            <div className="h-4 bg-white/10 rounded w-64" />
          </div>
          <div className="hidden sm:flex space-x-6">
            <div className="space-y-2">
              <div className="h-3 bg-white/10 rounded w-20" />
              <div className="h-7 bg-white/10 rounded w-24" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-white/10 rounded w-20" />
              <div className="h-7 bg-white/10 rounded w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-white/10 rounded w-24" />
              <div className="w-8 h-8 bg-white/10 rounded-full" />
            </div>
            <div className="h-8 bg-white/10 rounded w-32" />
            <div className="h-2 bg-white/10 rounded w-full" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 h-[380px] flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-5 bg-white/10 rounded w-40" />
            <div className="h-8 bg-white/10 rounded-lg w-24" />
          </div>
          <div className="h-[250px] bg-white/5 rounded-xl border border-white/5 flex items-end p-4 gap-2">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 50].map((h, idx) => (
              <div
                key={idx}
                className="flex-1 bg-accent-blue/20 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="glass-card p-6 h-[380px] flex flex-col justify-between">
          <div className="h-5 bg-white/10 rounded w-36" />
          <div className="h-8 bg-white/10 rounded-xl" />
          <div className="h-[220px] bg-white/5 rounded-xl border border-white/5" />
        </div>
      </div>
    </div>
  );
}
