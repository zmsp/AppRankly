import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle, Layers, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';
import AppIcon from './AppIcon';
import { MOCK_PROJECTS } from '../lib/mockData';
import { getDemoAsoData } from '../pages/StoreASO';
import { clsx } from 'clsx';

export default function PortfolioAsoScores({
  projects = [],
  platform = 'all',
  onSelectProject,
  setPlatform,
  isDemoMode = true,
  defaultExpanded = true
}) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const rawList = projects.length > 0 ? projects : MOCK_PROJECTS;

  // Filter projects according to portfolio scope selection (All App, Apple Store, or Play Store)
  const filteredProjects = rawList.filter(p => {
    if (platform === 'apple') return p.platform === 'apple';
    if (platform === 'google' || platform === 'android') return p.platform === 'google' || p.platform === 'android';
    return true; // 'all'
  });

  const isApple = platform === 'apple';
  const isGoogle = platform === 'google' || platform === 'android';
  const scopeLabel = isApple ? 'Apple Store' : isGoogle ? 'Play Store' : 'All App';

  const handleCardClick = (proj) => {
    if (typeof onSelectProject === 'function') {
      onSelectProject(proj.index);
    }
    if (typeof setPlatform === 'function') {
      setPlatform(proj.platform || 'google');
    }
    navigate('/store');
  };

  return (
    <div className="glass-card p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <div className={clsx(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner border",
            isApple ? "bg-sky-500/20 border-sky-500/30 text-sky-300" :
            isGoogle ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
            "bg-amber-500/20 border-amber-500/30 text-amber-400"
          )}>
            {isApple ? <AppleStoreIcon size={18} /> : isGoogle ? <PlayStoreIcon size={18} /> : <Sparkles size={18} />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Portfolio ASO Health & Recommendations
              </h3>
              <span className={clsx(
                "text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase font-mono border",
                isApple ? "bg-sky-500/15 border-sky-500/30 text-sky-300" :
                isGoogle ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
                "bg-accent-blue/15 border-accent-blue/30 text-accent-blue"
              )}>
                {scopeLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              App Store Optimization health scores and platform-specific priority fixes ({filteredProjects.length} {filteredProjects.length === 1 ? 'app' : 'apps'})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <span>{isExpanded ? 'Collapse Portfolio' : `Expand Portfolio (${filteredProjects.length})`}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Grid of App ASO Cards (Expanded by default) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 animate-in fade-in duration-200">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full p-8 text-center text-xs text-slate-400 bg-white/5 rounded-2xl border border-white/5">
              No apps found for {scopeLabel} portfolio scope.
            </div>
          ) : (
            filteredProjects.map((proj) => {
              let auditInfo = null;

              if (proj.asoScore && proj.asoScore > 0) {
                auditInfo = { score: proj.asoScore, headline: "Pre-calculated ASO health score." };
              } else {
                const demoData = getDemoAsoData(proj.packageName || proj.index, proj);
                auditInfo = demoData.lastAudit;
              }

              const score = auditInfo?.score ?? 88;
              const topFix = auditInfo?.improvements?.[0];

              return (
                <div
                  key={proj.index}
                  onClick={() => handleCardClick(proj)}
                  className="group relative p-4 rounded-2xl bg-white/5 hover:bg-slate-800/80 border border-white/10 hover:border-accent-blue/50 transition-all duration-200 cursor-pointer space-y-3 shadow-md hover:shadow-xl hover:shadow-accent-blue/5 flex flex-col justify-between"
                  title={`Click to open ASO page for ${proj.name}`}
                >
                  <div className="space-y-3">
                    {/* App Info Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3 truncate">
                        <AppIcon iconUrl={proj.iconUrl} name={proj.name} platform={proj.platform} className="w-9 h-9 rounded-xl shrink-0 shadow" />
                        <div className="truncate">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-accent-blue transition-colors">
                              {proj.name}
                            </h4>
                            {proj.platform === 'apple' ? (
                              <AppleStoreIcon size={12} className="text-sky-400 shrink-0" />
                            ) : (
                              <PlayStoreIcon size={12} className="text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{proj.packageName}</p>
                        </div>
                      </div>

                      {/* ASO Score Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className={clsx(
                          "text-xs font-black px-2.5 py-0.5 rounded-full border font-mono shadow-sm",
                          score >= 90
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : score >= 80
                            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                            : "bg-amber-500/15 border-amber-500/40 text-amber-400"
                        )}>
                          {score}/100
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                          ASO Score
                        </span>
                      </div>
                    </div>

                    {/* Audit Headline / Summary */}
                    {auditInfo?.headline && (
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
                        {auditInfo.headline}
                      </p>
                    )}

                    {/* Top Priority Fix Recommendation Box */}
                    {topFix && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          <span className="flex items-center space-x-1">
                            <AlertTriangle size={11} className="text-amber-400" />
                            <span>Top Priority Recommendation</span>
                          </span>
                          {topFix.impact && (
                            <span className={clsx(
                              "text-[9px] px-1.5 py-0.2 rounded uppercase font-bold border",
                              topFix.impact === 'high'
                                ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                                : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                            )}>
                              {topFix.impact} Impact
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 leading-normal">
                          <strong className="text-white font-semibold">{topFix.type}:</strong> {topFix.recommendation}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Link Footer */}
                  <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-accent-blue font-bold group-hover:translate-x-0.5 transition-transform">
                    <span>View ASO Page for {proj.name}</span>
                    <ArrowRight size={14} className="text-accent-blue group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
