import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Cpu, Activity, Star, Download, ExternalLink, Globe, Tag, RefreshCw, Database, Clock } from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import { getHealthBand } from '../lib/healthScore';
import { apiFetch } from '../lib/api';
import { formatNumber, formatDataFreshness } from '../lib/format';

const BAND_STYLES = {
  emerald: {
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/10',
    glow: 'bg-emerald-500/10',
  },
  blue: {
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/10',
    glow: 'bg-blue-500/10',
  },
  amber: {
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/10',
    glow: 'bg-amber-500/10',
  },
  rose: {
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/10',
    glow: 'bg-rose-500/10',
  },
};

export default function HeroKPI({ value, totalInstalls, activeDevices, activeProject, authToken, isStaticMode, lastDataDate }) {
  const band = getHealthBand(value);
  const styles = BAND_STYLES[band.color] || BAND_STYLES.blue;

  const [storeDetails, setStoreDetails] = useState(null);
  const [loadingScrape, setLoadingScrape] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);

  // Check if metadata exists in cache ONLY when activeProject changes (no auto-scraping)
  useEffect(() => {
    setStoreDetails(null);
    setScrapeError(null);

    if (!activeProject?.packageName || activeProject?.platform !== 'google') {
      return;
    }

    let isMounted = true;
    async function checkCache() {
      try {
        const res = await apiFetch('/api/store-details', {
          method: 'POST',
          body: JSON.stringify({ packageName: activeProject.packageName, cacheOnly: true })
        }, authToken, isStaticMode);

        if (res.ok) {
          const cachedData = await res.json();
          if (isMounted && cachedData) {
            setStoreDetails(cachedData);
          }
        }
      } catch (err) {
        // Silently ignore cache check errors
      }
    }

    checkCache();
    return () => { isMounted = false; };
  }, [activeProject?.packageName, activeProject?.platform, authToken, isStaticMode]);

  // Explicit action button to trigger live scraping
  const handleGrabMetadata = async () => {
    if (!activeProject?.packageName || activeProject?.platform !== 'google') return;

    setLoadingScrape(true);
    setScrapeError(null);

    try {
      const res = await apiFetch('/api/store-details', {
        method: 'POST',
        body: JSON.stringify({ packageName: activeProject.packageName, cacheOnly: false })
      }, authToken, isStaticMode);

      if (!res.ok) throw new Error('Failed to grab store metadata');
      const data = await res.json();
      setStoreDetails(data);
    } catch (err) {
      console.error('Error fetching store metadata:', err);
      setScrapeError(err.message);
    } finally {
      setLoadingScrape(false);
    }
  };

  const freshnessLabel = formatDataFreshness(lastDataDate);

  return (
    <div className={`glass-card relative overflow-hidden p-4 sm:p-8 ${styles.border}`}>
      {/* Background decoration */}
      <div className={`absolute -right-20 -top-20 w-80 h-80 ${styles.glow} blur-[100px] rounded-full`} />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${styles.bg} ${styles.text} border ${styles.border}`}>
              <Activity size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">App Health Score</span>
            </div>
            <InfoTooltip
              subheader="Overall App Health Score"
              text="A composite score (0-100) calculated from ratings, install-to-uninstall ratio, retention proxy, and recent trends. It gives you a single signal to monitor your app's overall market and technical standing."
            />

            {/* App Icon & Direct Store/Console Links */}
            {activeProject && (
              <div className="flex flex-wrap items-center space-x-2 ml-0 sm:ml-auto md:ml-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
                <img
                  src={activeProject.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=${activeProject.platform === 'google' ? 'play.google.com' : 'apps.apple.com'}&sz=64`}
                  alt={activeProject.name}
                  className="w-5 h-5 rounded-md object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span className="text-xs font-semibold text-white truncate max-w-[120px] sm:max-w-[140px]">{activeProject.name}</span>
                {activeProject.storeUrl && (
                  <a
                    href={activeProject.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-accent-blue hover:underline flex items-center gap-1 bg-accent-blue/10 px-2 py-0.5 rounded-lg"
                    title="Open Public Store Listing"
                  >
                    Store ↗
                  </a>
                )}
                {activeProject.consoleUrl && (
                  <a
                    href={activeProject.consoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-accent-emerald hover:underline flex items-center gap-1 bg-accent-emerald/10 px-2 py-0.5 rounded-lg"
                    title="Open Developer Console Dashboard"
                  >
                    Console ↗
                  </a>
                )}
                
                {/* Explicit Grab Metadata Button */}
                {activeProject.platform === 'google' && (
                  <button
                    onClick={handleGrabMetadata}
                    disabled={loadingScrape}
                    className="text-[11px] font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 disabled:opacity-50 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Grab live store metadata via Google Play Scraper"
                  >
                    {loadingScrape ? (
                      <>
                        <RefreshCw size={12} className="animate-spin text-accent-blue" />
                        <span>Grabbing...</span>
                      </>
                    ) : (
                      <>
                        <Database size={12} className="text-accent-blue" />
                        <span>{storeDetails ? "Refresh Meta" : "Grab Metadata"}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-2 flex items-baseline">
            {value}
            <span className={`ml-3 text-xs sm:text-sm font-bold ${styles.text} flex items-center`}>
              <span className="w-2 h-2 rounded-full bg-current inline-block mr-1.5" />
              {band.label}
            </span>
          </h1>
          <p className="text-white/60 max-w-md text-sm">
            {band.label === 'Excellent' && "Your app is in great shape. Keep focusing on growth and feature parity."}
            {band.label === 'Good' && "Overall performance is solid. Monitor slight regressions in ratings or uninstalls."}
            {band.label === 'Needs Work' && "Some metrics are underperforming. Check your rating trends and uninstall rates."}
            {band.label === 'At Risk' && "Immediate action recommended. Significant issues detected in retention or ratings."}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 lg:gap-10 items-center">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Total Userbase</p>
            <p className="text-2xl font-bold">{formatNumber(totalInstalls)}</p>
            <div className="flex items-center text-[11px] text-slate-400 font-medium">
              <Clock size={12} className="mr-1 text-accent-blue" />
              {freshnessLabel}
            </div>
          </div>
          <div className="w-px h-12 bg-white/10 hidden lg:block" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Active Devices</p>
            <p className="text-2xl font-bold">{formatNumber(activeDevices)}</p>
            <div className="flex items-center text-[11px] text-slate-400 font-medium">
              Install Survival: <span className="font-bold text-accent-emerald ml-1">{totalInstalls > 0 ? `${((activeDevices / totalInstalls) * 100).toFixed(1)}%` : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Render Scraped Metadata Section if cached or freshly grabbed */}
      {(storeDetails || loadingScrape || scrapeError) && (
        <div className="mt-6 pt-6 border-t border-white/10 transition-all duration-300">
          {loadingScrape ? (
            <div className="flex items-center space-x-2 text-xs text-white/60 py-4">
              <RefreshCw className="animate-spin w-4 h-4 text-accent-blue" />
              <span>Grabbing Play Store metadata via scraper...</span>
            </div>
          ) : scrapeError ? (
            <div className="text-xs text-rose-400 py-2">
              Failed to grab store metadata: {scrapeError}
            </div>
          ) : storeDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* App Summary & Developer */}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center space-x-3">
                  {storeDetails.iconUrl && (
                    <img src={storeDetails.iconUrl} alt={storeDetails.title} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {storeDetails.title}
                      {storeDetails.isCached && (
                        <span className="text-[10px] font-semibold text-white/40 bg-white/10 px-1.5 py-0.5 rounded">Cached</span>
                      )}
                    </h3>
                    <p className="text-xs text-white/60">
                      Developer: <span className="text-accent-blue font-semibold">{storeDetails.developer || 'N/A'}</span>
                      {storeDetails.version && ` • v${storeDetails.version}`}
                    </p>
                  </div>
                </div>

                {storeDetails.summary && (
                  <p className="text-xs text-white/70 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
                    {storeDetails.summary}
                  </p>
                )}
              </div>

              {/* Scraped Stats Badges */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-white/50 flex items-center gap-1"><Star size={12} className="text-amber-400" /> Play Rating</span>
                  <span className="font-bold text-amber-400">{storeDetails.scoreText || (storeDetails.score ? storeDetails.score.toFixed(1) : 'Unrated')}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-white/50 flex items-center gap-1"><Download size={12} className="text-accent-blue" /> Store Installs</span>
                  <span className="font-bold text-white">{storeDetails.installs || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-white/50 flex items-center gap-1"><Tag size={12} className="text-accent-emerald" /> Category & Price</span>
                  <span className="font-bold text-white">{storeDetails.genre || 'N/A'} ({storeDetails.priceText || (storeDetails.free ? 'Free' : 'Paid')})</span>
                </div>
                {storeDetails.developerWebsite && (
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 truncate">
                    <span className="text-white/50 flex items-center gap-1"><Globe size={12} className="text-purple-400" /> Website</span>
                    <a href={storeDetails.developerWebsite} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline font-semibold truncate max-w-[150px]">
                      {new URL(storeDetails.developerWebsite).hostname} ↗
                    </a>
                  </div>
                )}
                {storeDetails.developerEmail && (
                  <div className="flex justify-between items-center truncate">
                    <span className="text-white/50">Support</span>
                    <a href={`mailto:${storeDetails.developerEmail}`} className="text-accent-blue hover:underline font-semibold truncate max-w-[150px]">
                      {storeDetails.developerEmail}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
