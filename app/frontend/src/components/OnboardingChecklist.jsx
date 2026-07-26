import React, { useState } from 'react';
import { CheckCircle2, Circle, ArrowRight, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OnboardingChecklist({ projects = [], releases = [], hasAiKey = true }) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('apprankly_onboarding_dismissed') === 'true';
  });

  if (dismissed) return null;

  const hasGoogle = projects.some(p => p.platform === 'google');
  const hasApple = projects.some(p => p.platform === 'apple');
  const hasReleases = releases && releases.length > 0;

  const steps = [
    { label: 'Google Play connected', done: hasGoogle, link: '/integrations' },
    { label: 'Apple App Store connected', done: hasApple, link: '/integrations' },
    { label: 'AI Key added', done: hasAiKey, link: '/config' },
    { label: 'Push alerts configured', done: true, link: '/config' },
    { label: 'First app release logged', done: hasReleases, link: '/releases' },
    { label: 'First keyword tracked', done: true, link: '/aso' }
  ];

  const completedCount = steps.filter(s => s.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  if (completedCount === steps.length) return null; // Auto-hide at 6/6

  const handleDismiss = () => {
    localStorage.setItem('apprankly_onboarding_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="glass-card p-5 border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-900/80 rounded-2xl space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles size={18} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white">AppRankly Setup Checklist</h3>
          <span className="text-xs text-indigo-300 font-semibold">({completedCount}/{steps.length} completed)</span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          title="Dismiss onboarding"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-accent-blue h-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
        {steps.map((step, idx) => (
          <div key={idx} className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs ${step.done ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-300' : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 transition-colors'}`}>
            {step.done ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <Circle size={16} className="text-slate-500 shrink-0" />
            )}
            <span className={step.done ? 'line-through text-slate-400' : 'font-medium flex-1'}>{step.label}</span>
            {!step.done && (
              <Link to={step.link} className="text-[10px] text-accent-blue font-bold hover:underline shrink-0">
                Setup →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
