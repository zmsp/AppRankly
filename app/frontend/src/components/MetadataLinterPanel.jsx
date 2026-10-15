import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle, RefreshCw, Sparkles, Wrench } from 'lucide-react';
import clsx from 'clsx';

export default function MetadataLinterPanel({
  platform = 'apple',
  metadata,
  onApplyFixes
}) {
  const [lintResult, setLintResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runLint = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aso/lint-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          title: metadata.title || '',
          subtitle: metadata.subtitle || '',
          shortDescription: metadata.shortDescription || '',
          keywords: metadata.keywords || '',
          description: metadata.description || '',
          promoText: metadata.promoText || ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLintResult(data);
      }
    } catch (err) {
      console.error('Failed to lint metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = (fixes) => {
    if (onApplyFixes && fixes) {
      onApplyFixes(fixes);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <ShieldCheck size={16} />
          </span>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Pre-Flight Policy & Submission Linter
            </h4>
            <p className="text-[11px] text-slate-400">
              Scans for Apple Guideline 2.3.7 & Google Play Metadata violations, byte overflows, and banned claims.
            </p>
          </div>
        </div>

        <button
          onClick={runLint}
          disabled={loading}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
        >
          <RefreshCw size={12} className={clsx(loading && "animate-spin")} />
          <span>{loading ? "Linting..." : "Scan Metadata"}</span>
        </button>
      </div>

      {lintResult && (
        <div className="space-y-4 pt-2 border-t border-white/5 animate-in fade-in">
          {/* Quality Score Bar */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-white/5">
            <div className="flex items-center gap-2.5">
              {lintResult.valid ? (
                <ShieldCheck size={20} className="text-emerald-400" />
              ) : (
                <ShieldAlert size={20} className="text-rose-400" />
              )}
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Store Readiness:</span>
                  <span className={clsx(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
                    lintResult.valid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                  )}>
                    {lintResult.valid ? "PASSED" : "ACTION REQUIRED"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {lintResult.errors.length} blocking violations, {lintResult.warnings.length} optimization warnings
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-lg font-mono font-bold text-white">
                {lintResult.score}
              </span>
              <span className="text-[10px] text-slate-500"> / 100</span>
            </div>
          </div>

          {/* Byte & Char Stats */}
          {lintResult.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
              {lintResult.stats.title && (
                <div className="p-2 bg-slate-950 rounded-lg border border-white/5">
                  <div className="text-slate-500">Title Chars</div>
                  <div className="font-mono font-bold text-white mt-0.5">
                    {lintResult.stats.title.charCount} / {lintResult.stats.title.max}
                  </div>
                </div>
              )}
              {lintResult.stats.keywords && (
                <div className="p-2 bg-slate-950 rounded-lg border border-white/5">
                  <div className="text-slate-500">Keywords (UTF-8 Bytes)</div>
                  <div className={clsx(
                    "font-mono font-bold mt-0.5",
                    lintResult.stats.keywords.byteCount > 100 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {lintResult.stats.keywords.byteCount} / 100 B
                  </div>
                </div>
              )}
              {lintResult.stats.subtitle && (
                <div className="p-2 bg-slate-950 rounded-lg border border-white/5">
                  <div className="text-slate-500">Subtitle Chars</div>
                  <div className="font-mono font-bold text-white mt-0.5">
                    {lintResult.stats.subtitle.charCount} / {lintResult.stats.subtitle.max}
                  </div>
                </div>
              )}
              {lintResult.stats.shortDescription && (
                <div className="p-2 bg-slate-950 rounded-lg border border-white/5">
                  <div className="text-slate-500">Short Desc Chars</div>
                  <div className="font-mono font-bold text-white mt-0.5">
                    {lintResult.stats.shortDescription.charCount} / {lintResult.stats.shortDescription.max}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Blocking Errors */}
          {lintResult.errors.length > 0 && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5">
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert size={14} />
                <span>Blocking Violations (Will Cause App Review Rejection):</span>
              </div>
              <ul className="space-y-1 pl-4 list-disc text-[11px] text-rose-200/90">
                {lintResult.errors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Optimization Warnings */}
          {lintResult.warnings.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>Optimization Warnings:</span>
              </div>
              <ul className="space-y-1 pl-4 list-disc text-[11px] text-amber-200/90">
                {lintResult.warnings.map((warn, i) => (
                  <li key={i}>{warn.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Auto Fix Button */}
          {lintResult.fixes && Object.keys(lintResult.fixes).length > 0 && (
            <div className="flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <div className="text-xs text-indigo-200">
                <strong>Safe Auto-Fix Available:</strong> Clean whitespace and optimize keyword formatting to save bytes.
              </div>
              <button
                onClick={() => handleApplyFix(lintResult.fixes)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow"
              >
                <Wrench size={12} />
                <span>Apply Fixes</span>
              </button>
            </div>
          )}

          {lintResult.errors.length === 0 && lintResult.warnings.length === 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle size={15} />
              <span>All store guidelines passed! Clean metadata ready for deployment.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
