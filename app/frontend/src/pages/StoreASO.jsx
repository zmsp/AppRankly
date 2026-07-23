import React from 'react';
import { Eye, MousePointer, Download, TrendingUp, Percent, Smartphone, Search, Share2 } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { formatNumber, formatRate } from '../lib/format';

export default function StoreASO({ stats, isDemoMode }) {
  // Demo or parsed store funnel data
  const impressions = stats?.storeImpressions || 4520;
  const pageViews = stats?.productPageViews || 1130;
  const downloads = stats?.totalDailyUserInstalls || stats?.totalInstallCountByUser || 248;

  const viewConversionRate = impressions > 0 ? pageViews / impressions : 0.25;
  const downloadConversionRate = pageViews > 0 ? downloads / pageViews : 0.22;
  const overallConversionRate = impressions > 0 ? downloads / impressions : 0.055;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">App Store Optimization (ASO)</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Conversion funnel from store listing impressions to completed downloads.
        </p>
      </div>

      {/* Funnel Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Store Impressions"
          value={formatNumber(impressions)}
          sublabel="Times listing appeared in search or browse"
          icon={Eye}
          color="blue"
          tooltipSubheader="Search & Browse Impressions"
          tooltipText="How many total users saw your app icon or title in search results, featured lists, or category charts."
        />
        <MetricCard
          label="Product Page Views"
          value={formatNumber(pageViews)}
          sublabel={`Click-through: ${formatRate(viewConversionRate)}`}
          icon={MousePointer}
          color="emerald"
          progress={viewConversionRate * 100}
          tooltipSubheader="Product Page Tap-Through Rate"
          tooltipText="Percentage of users who saw your listing and tapped through to view your full app product page."
        />
        <MetricCard
          label="Conversion Rate (ASO)"
          value={formatRate(downloadConversionRate)}
          sublabel={`Page View → Download (${formatNumber(downloads)} downloads)`}
          icon={Percent}
          color="amber"
          progress={downloadConversionRate * 100}
          tooltipSubheader="Product Page Conversion Rate"
          tooltipText="The percentage of product page visitors who actually installed your app. Key indicator of screenshot and description effectiveness."
        />
      </div>

      {/* Visual Funnel Representation */}
      <div className="glass-card p-6 border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white">Acquisition Funnel Flow</h3>
        
        <div className="space-y-3 max-w-2xl">
          {/* Step 1: Impressions */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">1. Store Search & Category Impressions</span>
              <span className="text-accent-blue font-bold">{formatNumber(impressions)}</span>
            </div>
            <div className="w-full h-8 bg-accent-blue/20 rounded-xl overflow-hidden p-1 border border-accent-blue/30">
              <div className="h-full bg-accent-blue rounded-lg text-[10px] text-slate-950 font-bold flex items-center px-3" style={{ width: '100%' }}>
                100% Impressions
              </div>
            </div>
          </div>

          {/* Step 2: Page Views */}
          <div className="space-y-1 pl-4">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">2. Product Page Views</span>
              <span className="text-accent-emerald font-bold">{formatNumber(pageViews)} ({formatRate(viewConversionRate)})</span>
            </div>
            <div className="w-full h-8 bg-accent-emerald/20 rounded-xl overflow-hidden p-1 border border-accent-emerald/30">
              <div className="h-full bg-accent-emerald rounded-lg text-[10px] text-slate-950 font-bold flex items-center px-3" style={{ width: `${Math.max(viewConversionRate * 100, 15)}%` }}>
                {formatRate(viewConversionRate)} Clicked
              </div>
            </div>
          </div>

          {/* Step 3: Installs */}
          <div className="space-y-1 pl-8">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">3. Installed Downloads</span>
              <span className="text-amber-400 font-bold">{formatNumber(downloads)} ({formatRate(downloadConversionRate)} from page)</span>
            </div>
            <div className="w-full h-8 bg-amber-500/20 rounded-xl overflow-hidden p-1 border border-amber-500/30">
              <div className="h-full bg-amber-400 rounded-lg text-[10px] text-slate-950 font-bold flex items-center px-3" style={{ width: `${Math.max(overallConversionRate * 100, 10)}%` }}>
                {formatRate(overallConversionRate)} Net Conversion
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Source Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center space-x-2">
            <Search size={18} className="text-accent-blue" />
            <h3 className="text-base font-bold text-white">Acquisition Channel Split</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <span>App Store Search (Keywords)</span>
              <span className="font-bold text-accent-blue">62%</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <span>App Store Browse (Categories & Features)</span>
              <span className="font-bold text-accent-emerald">24%</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <span>External Referrals (Web & Social)</span>
              <span className="font-bold text-amber-400">14%</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center space-x-2">
            <Smartphone size={18} className="text-accent-emerald" />
            <h3 className="text-base font-bold text-white">Conversion by Device Family</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <span>Smartphones (Phones)</span>
              <span className="font-bold text-accent-emerald">28.4% page conversion</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <span>Tablets (iPads / Android Tablets)</span>
              <span className="font-bold text-amber-400">12.1% page conversion</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
