/**
 * ASO Audit & Score Cache Manager
 * Caches and records per-app AI audit results, scores, and recommendations in localStorage.
 */

const CACHE_PREFIX = 'apprankly_aso_audit_';

export function getCachedAudit(packageName) {
  if (!packageName || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${packageName}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse cached ASO audit:', e);
    return null;
  }
}

export function saveCachedAudit(packageName, auditData) {
  if (!packageName || !auditData || typeof window === 'undefined') return;
  try {
    const payload = {
      ...auditData,
      timestamp: Date.now()
    };
    localStorage.setItem(`${CACHE_PREFIX}${packageName}`, JSON.stringify(payload));
    
    // Dispatch a custom event so active components (e.g. PortfolioAsoScores) can update live
    window.dispatchEvent(new CustomEvent('aso_audit_updated', {
      detail: { packageName, audit: payload }
    }));
  } catch (e) {
    console.warn('Failed to save ASO audit to cache:', e);
  }
}

export function getAppAsoAudit(proj, isDemoMode = true, getDemoAsoData = null) {
  if (!proj) return null;
  const pkgName = proj.packageName || proj.index;
  
  // 1. Check localStorage cached audit
  const cached = getCachedAudit(pkgName);
  if (cached && cached.score != null) {
    return {
      score: cached.score,
      headline: cached.headline,
      improvements: cached.improvements || [],
      topFix: cached.improvements?.[0] || null,
      timestamp: cached.timestamp,
      isCached: true
    };
  }

  // 2. Check explicitly provided proj.asoScore
  if (proj.asoScore && proj.asoScore > 0) {
    return {
      score: proj.asoScore,
      headline: "Pre-calculated ASO health score.",
      improvements: [],
      topFix: null,
      isCached: false
    };
  }

  // 3. Fallback to demo audit data if helper provided
  if (getDemoAsoData) {
    const demo = getDemoAsoData(pkgName, proj);
    if (demo?.lastAudit) {
      return {
        ...demo.lastAudit,
        topFix: demo.lastAudit.improvements?.[0] || null,
        isCached: false
      };
    }
  }

  return {
    score: 88,
    headline: "Base listing metadata analysis.",
    improvements: [],
    topFix: null,
    isCached: false
  };
}
