import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  HelpCircle,
  ShieldAlert,
  Calculator,
  Search,
  Copy,
  Check,
  Filter,
  TrendingUp,
  Layers,
  Table,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
  Sparkles,
  Info,
  ArrowUpRight,
  PieChart,
  Activity
} from 'lucide-react';

export default function Glossary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [copiedFormula, setCopiedFormula] = useState(null);
  const [expandedExamples, setExpandedExamples] = useState({});
  const [showDisclosures, setShowDisclosures] = useState(true);

  const categories = [
    { id: 'all', label: 'All Metrics', icon: Layers },
    { id: 'health', label: 'Health & Overview', icon: Activity },
    { id: 'acquisition', label: 'Acquisition & Growth', icon: TrendingUp },
    { id: 'retention', label: 'Retention & Churn', icon: Zap },
    { id: 'aso', label: 'Store Listing & ASO', icon: BarChart3 },
    { id: 'releases', label: 'Releases & Updates', icon: PieChart },
  ];

  const metrics = [
    {
      id: 'health-score',
      name: 'App Health Score',
      category: 'health',
      formula: 'Weighted Score = Σ (Metric_Score_i × Weight_i) ÷ Σ Weight_i',
      formulaMath: 'Score = 0.25(Rating) + 0.15(RatingTrend) + 0.20(UninstallRatio) + 0.25(RetentionProxy) + 0.25(GrowthTrend)',
      source: 'Derived Engine (Platform Normalized)',
      definition: 'A unified 0–100 composite score evaluating product quality, user satisfaction, retention stability, and growth trajectory.',
      howToRead: 'Scores >80 indicate exceptional health. 60–80 represents stable performance with room for retention tuning. <60 signals active friction, high churn, or declining ratings.',
      limitations: 'Missing metrics (e.g. Apple uninstall data when opt-in telemetry is unavailable) are dynamically omitted and weights are re-normalized over available signals.',
      example: 'App with 4.6/5 rating (92 score, 25% weight) + 1.2% uninstall ratio (85 score, 20% weight) + 38% survival (95 score, 25% weight) + +15% growth (90 score, 25% weight) => Composite Health Score = 91/100 (Excellent).',
      tags: ['composite', 'health', 'rating', 'retention', 'growth']
    },
    {
      id: 'daily-installs',
      name: 'Daily User Installs',
      category: 'acquisition',
      formula: 'Sum(daily_user_installs) over selected date range',
      formulaMath: 'Installs_{period} = ∑_{t=1}^{N} DailyInstalls_t',
      source: 'Play Console CSV (installs_overview.csv) / App Store Connect API',
      definition: 'The total volume of first-time app installations completed by unique store user accounts within the designated window.',
      howToRead: 'Track daily install velocity to evaluate campaign launches and organic discovery. High daily jitter is normal for niche apps; use 7-day trailing moving averages for clean trendlines.',
      limitations: 'Excludes device re-installs on existing user accounts (unless registered under a new Google/Apple account). Play Console updates daily; Apple Connect API updates on a ~24h schedule.',
      example: 'Monday: 120, Tuesday: 145, Wednesday: 110 => 3-Day Total = 375 First-Time Installs (Avg 125/day).',
      tags: ['installs', 'acquisition', 'downloads', 'volume']
    },
    {
      id: 'net-growth',
      name: 'Daily Net Growth',
      category: 'acquisition',
      formula: 'Daily Installs − Daily Uninstalls',
      formulaMath: 'NetGrowth_t = Installs_t - Uninstalls_t',
      source: 'Derived Daily Calculation',
      definition: 'The net increase or decrease in your total active installed user base on a specific day.',
      howToRead: 'Positive net growth indicates portfolio expansion. Negative net growth highlights that uninstalls exceed incoming acquisition, leading to user base contraction.',
      limitations: 'Available primarily for platforms providing daily uninstall metrics (Google Play Console CSV / App Store opt-in data).',
      example: '250 Daily Installs − 90 Daily Uninstalls = +160 Net Growth per day.',
      tags: ['growth', 'net', 'expansion', 'uninstalls']
    },
    {
      id: 'uninstall-ratio',
      name: 'Uninstall Ratio',
      category: 'acquisition',
      formula: '(Total Uninstalls in Period ÷ Active Installed Base at Period End) × 100',
      formulaMath: 'UninstallRatio = (Uninstalls_{period} ÷ ActiveDevices_{end}) × 100%',
      source: 'Play Console (device_overview.csv) / App Store Connect (Opt-in)',
      definition: 'The percentage of active installed devices that removed the app during the selected timeframe.',
      howToRead: 'Lower is better. A steady uninstall ratio <2% is healthy. Sudden spikes above 5% following a build update indicate critical bugs, broken UX, or forced ad friction.',
      limitations: 'Measures aggregate daily removals relative to current installed base; distinct from individual user cohort churn.',
      example: '500 uninstalls during week ÷ 25,000 active devices = 2.0% Weekly Uninstall Ratio.',
      tags: ['uninstalls', 'churn', 'friction', 'ratio']
    },
    {
      id: 'install-survival-rate',
      name: 'Install Survival Rate (Retention Proxy)',
      category: 'retention',
      formula: '(Currently Active Installed Devices ÷ Lifetime Total User Installs) × 100',
      formulaMath: 'SurvivalRate = (ActiveDevices_{current} ÷ CumulativeInstalls_{lifetime}) × 100%',
      source: 'Derived (Active Devices / Cumulative Installs)',
      definition: 'The proportion of all historical downloaders who still retain the app installed on an active device.',
      howToRead: 'Serves as an effective macro-retention proxy when raw user-level cohort tracking is unavailable. High-utility tools typically maintain >40% survival rates.',
      limitations: 'Does not account for uncollected device retirements or account sync gaps where old hardware remains inactive.',
      example: '14,000 active installed devices ÷ 35,000 all-time installs = 40.0% Install Survival Rate.',
      tags: ['retention', 'survival', 'installed-base', 'long-term']
    },
    {
      id: 'cohort-retention-rate',
      name: 'Cohort Retention Rate (D1 / D7 / D30)',
      category: 'retention',
      formula: '(Active Cohort Users on Day N ÷ Initial Cohort Installs on Day 0) × 100',
      formulaMath: 'Retention_{Day N} = (ActiveUsers_{Day N} ÷ CohortInstalls_{Day 0}) × 100%',
      source: 'Play Console Retention Telemetry / App Store Connect Analytics',
      definition: 'The percentage of users who installed the app on a specific day (Day 0) and re-opened or kept the app active on Day 1, Day 7, or Day 30.',
      howToRead: 'D1 retention reflects onboarding quality (benchmark: >30%). D7 reflects early habit formation (benchmark: >15%). D30 reflects long-term product-market fit (benchmark: >10%).',
      limitations: 'Requires opt-in store telemetry or SDK integration. Aggregated store exports present cohort data with 3–5 day processing latency.',
      example: 'Cohort of 1,000 installs on July 1st -> 350 active on July 2nd (D1 = 35%), 180 active on July 8th (D7 = 18%), 110 active on July 31st (D30 = 11%).',
      tags: ['cohort', 'retention', 'd1', 'd7', 'd30']
    },
    {
      id: 'aso-conversion-rate',
      name: 'Store Listing Conversion Rate (ASO)',
      category: 'aso',
      formula: '(First-Time Downloads ÷ Product Page Views) × 100',
      formulaMath: 'CVR = (Downloads ÷ PageViews) × 100%',
      source: 'App Store Connect API / Play Console Acquisition Analytics',
      definition: 'The percentage of store listing visitors who download the app after viewing the store detail page.',
      howToRead: 'Higher conversion rates signal compelling store graphics, strong rating social proof, clear value propositions, and aligned keyword traffic. Industry benchmark: 25%–45% depending on category.',
      limitations: 'Google Play Console updates acquisition stats on a 24–48 hour delay. Apple Connect metrics apply privacy filtering for low-volume apps (<5 views/day).',
      example: '2,400 downloads from 6,000 product page views = 40.0% Store Conversion Rate.',
      tags: ['aso', 'conversion', 'pageviews', 'funnel']
    },
    {
      id: 'aso-performance-index',
      name: 'ASO Performance Index',
      category: 'aso',
      formula: 'Weighted composite of Conversion Rate (40%), Store Rating (30%), & Page Impressions (30%)',
      formulaMath: 'ASOIndex = 0.40(CVRScore) + 0.30(RatingScore) + 0.30(ImpressionVolumeScore)',
      source: 'Derived ASO Engine',
      definition: 'A composite index quantifying store search visibility, metadata effectiveness, and creative conversion power.',
      howToRead: 'Index >75 demonstrates strong organic store traction and effective store listing optimization. <50 indicates opportunity for screenshot A/B testing or localization.',
      limitations: 'Requires both store impression telemetry and download counts over a minimum 7-day sample window.',
      example: 'CVR 38% (85 pts) + 4.7 Star Rating (94 pts) + 15,000 Weekly Impressions (75 pts) => ASO Index = 84.7 / 100.',
      tags: ['aso', 'index', 'impressions', 'optimization']
    },
    {
      id: 'device-upgrade-adoption',
      name: 'Version Adoption & Upgrade Rate',
      category: 'releases',
      formula: '(Active Devices on Target Version ÷ Total Active Devices) × 100',
      formulaMath: 'AdoptionRate_{v1.2} = (ActiveDevices_{v1.2} ÷ TotalActiveDevices) × 100%',
      source: 'Play Console (app_version.csv) / App Store Connect Build Analytics',
      definition: 'The percentage of your active installed user base running a specific app build version.',
      howToRead: 'Evaluates update adoption speed after launching a new version. Achieving >70% adoption within 7 days indicates seamless auto-update behavior and low user update resistance.',
      limitations: 'Stores report app versions according to active telemetry pings; background updates may take up to 72 hours to propagate fully.',
      example: '14,000 active devices on v2.4.0 ÷ 20,000 total active devices = 70.0% Version Adoption Rate.',
      tags: ['releases', 'version', 'updates', 'adoption']
    },
    {
      id: 'release-impact-delta',
      name: 'Release Impact Delta',
      category: 'releases',
      formula: '((Post-Release 7d Metric − Pre-Release 7d Metric) ÷ Pre-Release 7d Metric) × 100',
      formulaMath: 'Delta = ((Metric_{Post7d} - Metric_{Pre7d}) ÷ Metric_{Pre7d}) × 100%',
      source: 'Derived Release Timeline Engine',
      definition: 'The percentage change in key metrics (Installs, Rating, Uninstalls) comparing the 7 days immediately following a release against the 7 days prior.',
      howToRead: 'Quantifies whether a release boosted installs (+% positive delta) or introduced regression issues (e.g. +30% uninstall delta).',
      limitations: 'External factors (marketing campaigns, seasonal traffic) occurring concurrently with a release can influence 7-day comparisons.',
      example: 'Pre-release installs: 700/week -> Post-release installs: 910/week => Release Impact Delta = +30.0% Growth.',
      tags: ['releases', 'impact', 'delta', 'comparison']
    },
    {
      id: 'market-concentration-hhi',
      name: 'Market Concentration (HHI & Top-3 Share)',
      category: 'health',
      formula: 'Top-3 Share = (Sum Installs Top 3 Countries ÷ Total Installs) × 100 | HHI = Σ (Share_i)^2',
      formulaMath: 'HHI = \\sum_{i=1}^{N} (s_i)^2 \\quad \\text{where } s_i = \\frac{\\text{Installs}_i}{\\text{TotalInstalls}}',
      source: 'Derived Dimension Breakdown (Country / Device)',
      definition: 'Herfindahl-Hirschman Index (HHI) and Top-3 concentration ratio evaluating audience geographic or device model diversification.',
      howToRead: 'HHI < 0.15 indicates a well-diversified global user base. HHI > 0.25 or Top-3 share > 70% indicates heavy reliance on a few key markets.',
      limitations: 'Calculated over top active country or device breakdown entries provided in store CSV dimension exports.',
      example: 'USA (40%), UK (20%), Germany (15%) => Top-3 Share = 75%. HHI = 0.40² + 0.20² + 0.15² + ... = 0.2225 (Moderate Concentration).',
      tags: ['analytics', 'hhi', 'concentration', 'country', 'device']
    },
    {
      id: 'pop-growth',
      name: 'Period-over-Period (PoP) Growth',
      category: 'acquisition',
      formula: '((Metric Current Period − Metric Prior Period) ÷ Metric Prior Period) × 100',
      formulaMath: 'PoPGrowth = ((M_{current} - M_{previous}) ÷ M_{previous}) × 100%',
      source: 'Derived Trailing Window Engine',
      definition: 'The percentage expansion or contraction of any metric compared to an equivalent preceding time window (e.g., 7d vs prior 7d).',
      howToRead: 'Evaluates momentum over equal duration windows. Smooths out weekend/weekday volatility.',
      limitations: 'Requires full equal-length baseline data windows to avoid partial-day skew.',
      example: 'Current 30d Installs: 5,200 | Prior 30d Installs: 4,000 => PoP Growth = +30.0%.',
      tags: ['growth', 'pop', 'comparison', 'trailing']
    }
  ];

  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => {
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory;

      const matchesSearch =
        m.name.toLowerCase().includes(query) ||
        m.definition.toLowerCase().includes(query) ||
        m.formula.toLowerCase().includes(query) ||
        m.source.toLowerCase().includes(query) ||
        m.tags.some(t => t.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedFormula(id);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  const toggleExample = (id) => {
    setExpandedExamples(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shadow-lg shadow-accent-blue/5">
              <BookOpen size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Metrics Glossary & Formulas
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Authoritative mathematical formulas, interpretation guides, platform origins, and data limitations.
              </p>
            </div>
          </div>
        </div>

        {/* Header Stats */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
            <span className="block text-xs text-slate-400 font-medium">Total Metrics</span>
            <span className="text-lg font-bold text-white">{metrics.length}</span>
          </div>
          <div className="bg-accent-blue/10 border border-accent-blue/20 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
            <span className="block text-xs text-accent-blue font-medium">Filtered</span>
            <span className="text-lg font-bold text-accent-blue">{filteredMetrics.length}</span>
          </div>
        </div>
      </div>

      {/* Honest Limitations & Data Disclosures Card */}
      <div className="glass-card border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 transition-all">
        <button
          onClick={() => setShowDisclosures(!showDisclosures)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center space-x-3">
            <ShieldAlert className="text-amber-400 shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-amber-400 text-sm">Data Methodologies & Store API Disclosures</h3>
              <p className="text-xs text-slate-400">Key differences between Google Play Console and Apple App Store Connect reports</p>
            </div>
          </div>
          <div className="text-slate-400 hover:text-white transition-colors">
            {showDisclosures ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {showDisclosures && (
          <div className="mt-4 pt-4 border-t border-amber-500/10 text-xs text-slate-300 space-y-2.5 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="font-semibold text-amber-300 block text-[11px] uppercase tracking-wider">⏱️ 24–48h Data Lag</span>
                <p className="text-slate-400">Both Apple App Store Connect and Google Play Console publish aggregated CSV and API metrics on a 24 to 48-hour trailing schedule. Real-time intraday metrics are not exported by store reporting APIs.</p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="font-semibold text-amber-300 block text-[11px] uppercase tracking-wider">🔒 Privacy & Thresholds</span>
                <p className="text-slate-400">App Store Connect enforces minimum traffic thresholds (typically &lt;5 daily views/downloads) below which exact breakdowns are masked to protect user anonymity.</p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="font-semibold text-amber-300 block text-[11px] uppercase tracking-wider">📊 Cohort vs Daily Aggregates</span>
                <p className="text-slate-400">Daily uninstalls are aggregate removals on that date. Install Survival Rate acts as our derived long-term retention proxy when true user-level cohort telemetry is restricted by store policies.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Search, Category Filters, View Switcher */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search metric name, formula, source, or tag..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-white/10 rounded-md px-1.5 py-0.5"
            >
              Clear
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 border border-white/10 rounded-xl self-end md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-accent-blue text-slate-950 shadow-md shadow-accent-blue/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-accent-blue text-slate-950 shadow-md shadow-accent-blue/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Table size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'all'
            ? metrics.length
            : metrics.filter(m => m.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                isSelected
                  ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue shadow-lg shadow-accent-blue/10'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isSelected ? 'bg-accent-blue/30 text-accent-blue' : 'bg-white/10 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content: Cards or Table */}
      {filteredMetrics.length === 0 ? (
        <div className="glass-card p-12 text-center border border-white/10 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-bold text-white">No Matching Metrics Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            We couldn't find any metrics matching "{searchQuery}". Try selecting a different category or refining your search term.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl border border-white/10 transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View Cards */
        <div className="space-y-4">
          {filteredMetrics.map((m) => (
            <div
              key={m.id}
              className="glass-card p-5 sm:p-6 border border-white/10 rounded-2xl space-y-4 hover:border-white/20 transition-all shadow-lg"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-xs">
                    <Calculator size={16} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      {m.name}
                    </h2>
                    <span className="text-[10px] text-slate-400 capitalize">
                      Category: <strong className="text-slate-300">{m.category}</strong>
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-3 py-1 rounded-full">
                  {m.source}
                </span>
              </div>

              {/* Grid: Formula & Definition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Formula Container */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                      <Calculator size={13} className="text-emerald-400" />
                      Formula
                    </span>
                    <button
                      onClick={() => copyToClipboard(m.formula, m.id)}
                      className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
                      title="Copy formula text"
                    >
                      {copiedFormula === m.id ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-white/10 space-y-1.5">
                    <p className="font-mono text-emerald-400 font-semibold text-xs leading-relaxed break-all">
                      {m.formula}
                    </p>
                    {m.formulaMath && (
                      <p className="font-mono text-[11px] text-slate-400 italic pt-1 border-t border-white/5">
                        {m.formulaMath}
                      </p>
                    )}
                  </div>
                </div>

                {/* Definition Container */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                    <HelpCircle size={13} className="text-accent-blue" />
                    Definition
                  </span>
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 h-full">
                    <p className="text-slate-200 leading-relaxed text-xs">{m.definition}</p>
                  </div>
                </div>
              </div>

              {/* Interpretation & Limitations */}
              <div className="pt-2 text-xs grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1 text-slate-300">
                    <Info size={12} className="text-sky-400" />
                    How to Read & Benchmarks
                  </span>
                  <p className="text-slate-300 pt-0.5 leading-relaxed bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    {m.howToRead}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1 text-amber-400">
                    <ShieldAlert size={12} />
                    Platform Nuances & Limitations
                  </span>
                  <p className="text-slate-400 pt-0.5 italic leading-relaxed bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    {m.limitations}
                  </p>
                </div>
              </div>

              {/* Collapsible Worked Example */}
              {m.example && (
                <div className="pt-1">
                  <button
                    onClick={() => toggleExample(m.id)}
                    className="text-[11px] text-accent-blue hover:underline font-semibold flex items-center gap-1 focus:outline-none"
                  >
                    <Sparkles size={12} />
                    <span>{expandedExamples[m.id] ? 'Hide Sample Calculation' : 'View Numerical Worked Example'}</span>
                    {expandedExamples[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {expandedExamples[m.id] && (
                    <div className="mt-2 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-xl text-xs text-slate-300 font-mono space-y-1">
                      <span className="text-[10px] font-bold text-accent-blue uppercase tracking-wider block">Worked Example</span>
                      <p className="leading-relaxed">{m.example}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-white/10">
                  <th className="py-3 px-4">Metric Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Formula</th>
                  <th className="py-3 px-4">Data Source</th>
                  <th className="py-3 px-4">Key Definition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredMetrics.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {m.name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap capitalize">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300">
                        {m.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 text-[11px] max-w-xs truncate" title={m.formula}>
                      {m.formula}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {m.source}
                    </td>
                    <td className="py-3 px-4 max-w-sm text-slate-300 leading-snug">
                      {m.definition}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

