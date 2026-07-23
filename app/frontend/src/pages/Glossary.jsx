import React from 'react';
import { BookOpen, HelpCircle, ShieldAlert, Database, Calculator } from 'lucide-react';

export default function Glossary() {
  const metrics = [
    {
      name: 'App Health Score',
      formula: 'Weighted composite: 30% User Rating + 30% Uninstall Ratio + 20% Install Survival + 20% Growth Trend',
      source: 'Derived (Aggregated backend formula)',
      definition: 'A single 0–100 score summarizing overall product health, retention proxy, and growth trajectory.',
      howToRead: 'Scores >80 indicate strong health. 60–80 indicates stable growth with room for retention tuning. <60 signals active friction.',
      limitations: 'Calculated over selected window; historical weighting reflects available CSV window length.'
    },
    {
      name: 'Daily Installs',
      formula: 'Sum(daily_user_installs) over selected range',
      source: 'Google Play Console CSV (installs_overview.csv) / App Store Connect API',
      definition: 'The total count of initial first-time app installations completed by unique users.',
      howToRead: 'At low daily volumes (e.g. 0–5/day), daily totals carry jitter; use weekly aggregation to gauge organic momentum.',
      limitations: 'Excludes re-installs on existing Google Accounts unless registered as new user activation.'
    },
    {
      name: 'Uninstall Ratio',
      formula: '(Total Uninstalls in Period ÷ Active Devices at Period End) × 100',
      source: 'Derived from Play Console / App Store Connect daily uninstalls & device counts',
      definition: 'The proportion of active installed devices that uninstalled during the period.',
      howToRead: 'Lower is better. Spikes indicate problematic releases, crashes, or unfulfilled expectations.',
      limitations: 'Distinct from cohort churn; this measures absolute daily device removals against current installed base.'
    },
    {
      name: 'Install Survival Rate',
      formula: '(Currently Active Installed Devices ÷ Lifetime Total User Installs) × 100',
      source: 'Derived (Active Devices / Total Installs)',
      definition: 'The proportion of all-time app downloaders who still keep the app installed on their devices.',
      howToRead: 'Acts as a long-term retention proxy. Rates >50% reflect high utility apps (e.g. utilities, tools).',
      limitations: 'Does not account for device loss/upgrades where users fail to sync accounts.'
    },
    {
      name: 'Store Listing Conversion Rate (ASO)',
      formula: '(Downloads ÷ Product Page Views) × 100',
      source: 'App Store Connect API / Play Console Acquisition Reports',
      definition: 'The percentage of store visitors who download after viewing your app listing page.',
      howToRead: 'Higher conversion rates signal effective screenshots, relevant keywords, and high user trust.',
      limitations: 'Play Console stats update on 24–48 hour delay; Apple engagement API reflects reporting API availability.'
    },
    {
      name: 'Daily Net Growth',
      formula: 'Daily Installs − Daily Uninstalls',
      source: 'Derived daily calculation',
      definition: 'Net expansion or contraction of your installed userbase on a given day or week.',
      howToRead: 'Positive values increase your installed base; negative values mean churn exceeds acquisition.',
      limitations: 'Noise at low volume; best viewed aggregated over 7-day trailing windows.'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <BookOpen className="text-accent-blue" />
          Metrics Glossary & Formulas
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Transparent definitions, mathematical formulas, data origins, and technical limitations.
        </p>
      </div>

      {/* honest limitations alert box */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start space-x-3">
        <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-amber-400">Data Limitations & Honest Disclosures</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed">
            <li><strong>Data Lag:</strong> Store analytics APIs and CSV reports lag real-time by 24 to 48 hours.</li>
            <li><strong>No Cohort Retention:</strong> Store CSV exports report aggregate daily counts, not per-user cohort cohorts. Install Survival is our derived proxy.</li>
            <li><strong>Apple Engagement Data:</strong> Store impression and page view funnels are available for iOS apps with App Store Connect credentials enabled.</li>
          </ul>
        </div>
      </div>

      {/* Metrics List */}
      <div className="space-y-4">
        {metrics.map((m, idx) => (
          <div key={idx} className="glass-card p-6 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {m.name}
              </h2>
              <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-2.5 py-0.5 rounded-full">
                {m.source}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Calculator size={12} className="text-accent-emerald" /> Exact Formula
                </span>
                <p className="font-mono text-emerald-400 bg-white/5 p-2 rounded-lg border border-white/5">{m.formula}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <HelpCircle size={12} className="text-accent-blue" /> Definition
                </span>
                <p className="text-slate-300 leading-relaxed">{m.definition}</p>
              </div>
            </div>

            <div className="pt-2 text-xs grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">How to Interpret</span>
                <p className="text-slate-300 pt-0.5 leading-relaxed">{m.howToRead}</p>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Known Limitations</span>
                <p className="text-slate-400 pt-0.5 italic leading-relaxed">{m.limitations}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
