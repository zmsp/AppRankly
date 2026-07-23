const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const dbModule = require('../lib/db');
const db = dbModule.db;
const { getAIStatus, generateJSON } = require('../lib/ai');
const prompts = require('../lib/ai/prompts');
const scraper = require('../lib/aso/scraper');
const { validateMetadata, simulateCoverage } = require('../lib/aso/coverage');

/**
 * AI Provider Endpoints
 */
router.get('/ai/status', (req, res) => {
  try {
    const status = getAIStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ai/test', async (req, res) => {
  const { provider, model } = req.body;
  try {
    const testPrompt = "Ping check. Reply with ok: true.";
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['ok'],
      properties: { ok: { type: 'boolean' } }
    };

    const result = await generateJSON({
      system: "Return json confirmation.",
      prompt: testPrompt,
      schema,
      provider,
      customModel: model
    });

    res.json({ success: true, provider: result.provider, model: result.model });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ASO Overview - Return all cached keyword, rank, competitor, review, listing data
 */
router.post('/aso/overview', (req, res) => {
  const { packageName, platform = 'play' } = req.body;
  if (!packageName) return res.status(400).json({ error: 'packageName is required' });

  if (!db) {
    return res.json({
      keywords: [],
      ranks: [],
      competitors: [],
      reviews: [],
      lastAudit: null,
      aiSpend: { totalCost: 0, runCount: 0 }
    });
  }

  try {
    const keywords = db.prepare(`
      SELECT * FROM aso_keyword 
      WHERE package_name = ? AND platform = ?
      ORDER BY tracked DESC, added_at DESC
    `).all(packageName, platform);

    const ranks = db.prepare(`
      SELECT r.*, k.term FROM aso_rank_history r
      JOIN aso_keyword k ON r.keyword_id = k.id
      WHERE r.package_name = ? AND r.platform = ?
      ORDER BY r.checked_at DESC
      LIMIT 200
    `).all(packageName, platform);

    const competitors = db.prepare(`
      SELECT * FROM aso_competitor
      WHERE package_name = ? AND platform = ?
      ORDER BY pinned DESC, rating DESC
    `).all(packageName, platform);

    const reviews = db.prepare(`
      SELECT * FROM aso_review
      WHERE package_name = ? AND platform = ?
      ORDER BY review_date DESC
      LIMIT 100
    `).all(packageName, platform);

    const lastAuditRun = db.prepare(`
      SELECT * FROM aso_ai_run
      WHERE package_name = ? AND platform = ? AND kind = 'audit'
      ORDER BY created_at DESC LIMIT 1
    `).get(packageName, platform);

    let lastAudit = null;
    if (lastAuditRun) {
      try {
        lastAudit = {
          ...JSON.parse(lastAuditRun.payload),
          provider: lastAuditRun.provider,
          model: lastAuditRun.model,
          createdAt: lastAuditRun.created_at
        };
      } catch (e) { }
    }

    const aiSpend = db.prepare(`
      SELECT COUNT(*) as runCount, SUM(est_cost_usd) as totalCost
      FROM aso_ai_run
      WHERE package_name = ? AND platform = ?
    `).get(packageName, platform) || { runCount: 0, totalCost: 0 };

    const latestSnapshot = db.prepare(`
      SELECT * FROM aso_listing_snapshot
      WHERE package_name = ? AND platform = ?
      ORDER BY fetched_at DESC LIMIT 1
    `).get(packageName, platform);

    res.json({
      keywords,
      ranks,
      competitors,
      reviews,
      lastAudit,
      listingSnapshot: latestSnapshot || null,
      aiSpend: {
        totalCost: aiSpend.totalCost || 0,
        runCount: aiSpend.runCount || 0
      }
    });
  } catch (err) {
    console.error('[ASO Endpoint] Overview error:', err);
    res.status(500).json({ error: 'Failed to fetch ASO overview' });
  }
});

/**
 * Keyword Discovery & Expansion
 */
router.post('/aso/keywords/expand', async (req, res) => {
  const { packageName, platform = 'play', seed, provider, model } = req.body;
  if (!packageName || !seed) return res.status(400).json({ error: 'packageName and seed are required' });

  try {
    const discovered = await scraper.expandKeywordsAutocomplete([seed], platform);

    if (db) {
      const stmt = db.prepare(`
        INSERT INTO aso_keyword (package_name, platform, term, normalized, source, autocomplete_verified, added_at)
        VALUES (?, ?, ?, ?, 'suggest', 1, datetime('now'))
        ON CONFLICT(package_name, platform, normalized) DO UPDATE SET autocomplete_verified = 1
      `);

      for (const term of discovered) {
        stmt.run(packageName, platform, term, term.toLowerCase().trim());
      }
    }

    res.json({ seed, discoveredCount: discovered.length, terms: discovered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/aso/keywords/track', (req, res) => {
  const { packageName, platform = 'play', keywordId, tracked } = req.body;
  if (!db || !keywordId) return res.status(400).json({ error: 'Database or keywordId missing' });

  try {
    db.prepare(`
      UPDATE aso_keyword SET tracked = ? WHERE id = ? AND package_name = ? AND platform = ?
    `).run(tracked ? 1 : 0, keywordId, packageName, platform);
    res.json({ success: true, keywordId, tracked: Boolean(tracked) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate pre-filled AI Prompt Preview based on pulled store data
 */
router.post('/aso/prompt-preview', async (req, res) => {
  const { packageName, platform = 'play', focusArea } = req.body;
  if (!packageName) return res.status(400).json({ error: 'packageName is required' });

  try {
    let detailedData = null;
    if (platform === 'play') {
      detailedData = await scraper.getPlayListing(packageName);
    } else {
      detailedData = await scraper.getAppleLookup(packageName);
    }

    if (!detailedData && db) {
      const snap = db.prepare(`
        SELECT * FROM aso_listing_snapshot WHERE package_name = ? AND platform = ? ORDER BY fetched_at DESC LIMIT 1
      `).get(packageName, platform);
      if (snap) {
        detailedData = {
          title: snap.title,
          developer: snap.developer,
          category: snap.category,
          score: snap.score,
          ratings: snap.ratings_count,
          contentRating: snap.content_rating,
          priceText: snap.price,
          installs: snap.installs_exact ? `${snap.installs_exact}+` : '',
          summary: snap.short_desc,
          subtitle: snap.subtitle,
          description: snap.description
        };
      }
    }

    const defaultFocus = focusArea || 'Metadata optimization & keyword placement';

    let title = detailedData?.title || detailedData?.trackName || packageName;
    let dev = detailedData?.developer || 'N/A';
    let cat = detailedData?.category || 'N/A';
    let summaryHeader = platform === 'apple' ? '[SUBTITLE / PROMOTIONAL TEXT]' : '[SHORT DESCRIPTION]';
    let summary = detailedData?.promotionalText || detailedData?.subtitle || detailedData?.summary || '';
    let desc = detailedData?.description || '';

    let userPrompt = `Audit the following ${platform} app listing against store conversion and keyword discovery best practices:
Focus Area: ${defaultFocus}

=== STORE LISTING METADATA ===
App Title / Name: ${title}
Package / App ID: ${packageName}
Developer: ${dev}
Category: ${cat}
Rating: ${detailedData?.score || 0} (${detailedData?.ratings || 0} ratings)
Content Rating: ${detailedData?.contentRating || 'N/A'}
Price: ${detailedData?.priceText || 'Free'}
Installs: ${detailedData?.installs || 'N/A'}

${summaryHeader}
${summary || 'None'}

[FULL DESCRIPTION]
${desc || 'None'}`;

    res.json({
      systemPrompt: prompts.auditPrompt.system,
      userPrompt,
      scrapedListingText: userPrompt,
      focusArea: defaultFocus,
      detailedData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Listing Audit
 */
router.post('/aso/audit', async (req, res) => {
  const { packageName, platform = 'play', provider, model, customListingText, focusArea, maxTokens } = req.body;
  if (!packageName) return res.status(400).json({ error: 'packageName required' });

  try {
    let listingText = customListingText || '';
    let detailedData = null;

    if (!listingText) {
      if (platform === 'play') {
        detailedData = await scraper.getPlayListing(packageName);
        if (detailedData) {
          listingText = `Title: ${detailedData.title}\nDeveloper: ${detailedData.developer}\nCategory: ${detailedData.category}\nRating: ${detailedData.score} (${detailedData.ratings} ratings)\nContent Rating: ${detailedData.contentRating}\nInstalls: ${detailedData.installs}\nShort Description: ${detailedData.summary}\nDescription: ${detailedData.description}`;
        } else {
          listingText = `Package: ${packageName}`;
        }
      } else {
        detailedData = await scraper.getAppleLookup(packageName);
        if (detailedData) {
          listingText = `Name: ${detailedData.trackName}\nDeveloper: ${detailedData.developer}\nCategory: ${detailedData.category}\nRating: ${detailedData.score} (${detailedData.ratings} ratings)\nContent Rating: ${detailedData.contentRating}\nPrice: ${detailedData.priceText}\nSubtitle: ${detailedData.subtitle}\nDescription: ${detailedData.description}`;
        } else {
          listingText = `App ID: ${packageName}`;
        }
      }
    }

    // Cache detailed snapshot in SQLite
    if (db && detailedData) {
      db.prepare(`
        INSERT INTO aso_listing_snapshot (
          package_name, platform, store, title, short_desc, subtitle, description,
          developer, category, icon_url, screenshots_json, score, ratings_count, installs_exact, price, content_rating, updated_at, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(package_name, platform, store, fetched_at) DO UPDATE SET title = excluded.title
      `).run(
        packageName, platform, platform,
        detailedData.title || detailedData.trackName || '',
        detailedData.summary || '',
        detailedData.subtitle || '',
        detailedData.description || '',
        detailedData.developer || '',
        detailedData.category || '',
        detailedData.icon || '',
        JSON.stringify(detailedData.screenshots || []),
        detailedData.score || 0,
        detailedData.ratings || 0,
        detailedData.minInstalls || 0,
        detailedData.priceText || '',
        detailedData.contentRating || '',
        detailedData.updated || ''
      );
    }

    const promptText = customListingText || `Audit the following ${platform} listing:${focusArea ? `\nFocus Area: ${focusArea}` : ''}\n\n${listingText}`;
    const result = await generateJSON({
      system: prompts.auditPrompt.system,
      prompt: promptText,
      schema: prompts.auditPrompt.schema,
      provider,
      customModel: model,
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined
    });

    if (db) {
      const inputHash = crypto.createHash('md5').update(promptText).digest('hex');
      db.prepare(`
        INSERT INTO aso_ai_run (package_name, platform, kind, provider, model, input_hash, prompt_version, input_tokens, output_tokens, est_cost_usd, payload)
        VALUES (?, ?, 'audit', ?, ?, ?, 1, ?, ?, ?, ?)
      `).run(
        packageName, platform, result.provider, result.model, inputHash,
        result.usage.inputTokens, result.usage.outputTokens,
        (result.usage.inputTokens * 0.000003) + (result.usage.outputTokens * 0.000015),
        JSON.stringify(result.data)
      );
    }

    res.json({
      audit: result.data,
      provider: result.provider,
      model: result.model,
      usage: result.usage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Metadata Studio Variants
 */
router.post('/aso/variants', async (req, res) => {
  const { packageName, platform = 'play', cluster = 'general', provider, model, customContext } = req.body;

  try {
    let scrapedMeta = '';
    if (db) {
      const snap = db.prepare(`
        SELECT title, short_desc, subtitle, description FROM aso_listing_snapshot
        WHERE package_name = ? AND platform = ? ORDER BY fetched_at DESC LIMIT 1
      `).get(packageName, platform);
      if (snap) {
        scrapedMeta = `Current Title/Name: ${snap.title || ''}\nCurrent Short Description/Subtitle: ${snap.short_desc || snap.subtitle || ''}\nCurrent Full Description: ${snap.description || ''}`;
      }

      const tracked = db.prepare(`
        SELECT term FROM aso_keyword WHERE package_name = ? AND platform = ? AND tracked = 1
      `).all(packageName, platform).map(k => k.term);
      if (tracked.length > 0) {
        scrapedMeta += `\nTracked Keywords: ${tracked.join(', ')}`;
      }
    }

    if (!scrapedMeta) {
      if (platform === 'play') {
        const pData = await scraper.getPlayListing(packageName);
        if (pData) {
          scrapedMeta = `Current Title: ${pData.title}\nCurrent Short Description: ${pData.summary}\nCurrent Description: ${pData.description}`;
        }
      } else {
        const aData = await scraper.getAppleLookup(packageName);
        if (aData) {
          scrapedMeta = `Current Name: ${aData.trackName}\nCurrent Subtitle: ${aData.subtitle}\nCurrent Description: ${aData.description}`;
        }
      }
    }

    const promptText = `Generate optimized ${platform} metadata candidates targeting the cluster: "${cluster}".
${scrapedMeta ? `\n=== CURRENT APP METADATA & TRACKED KEYWORDS ===\n${scrapedMeta}\n` : ''}
${customContext ? `\nExtra Context: ${customContext}` : ''}`;

    const result = await generateJSON({
      system: prompts.variantsPrompt.system,
      prompt: promptText,
      schema: prompts.variantsPrompt.schema,
      provider,
      customModel: model
    });

    // Validate candidates code-side
    const validatedCandidates = result.data.candidates.map(cand => {
      const val = validateMetadata(cand.field, cand.text, platform);
      return {
        ...cand,
        actualCharCount: val.length,
        maxLimit: val.maxLimit,
        isValid: val.isValid
      };
    });

    res.json({
      candidates: validatedCandidates,
      provider: result.provider,
      model: result.model
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Deterministic Coverage Matrix Simulator
 */
router.post('/aso/coverage', (req, res) => {
  const { packageName, platform = 'play', metadata } = req.body;
  if (!db) return res.json(simulateCoverage([], metadata, platform));

  try {
    const trackedKeywords = db.prepare(`
      SELECT term FROM aso_keyword WHERE package_name = ? AND platform = ? AND tracked = 1
    `).all(packageName, platform).map(k => k.term);

    const simulation = simulateCoverage(trackedKeywords, metadata || {}, platform);
    res.json(simulation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Competitor Gap Analysis
 */
router.post('/aso/competitors', async (req, res) => {
  const { packageName, platform = 'play', provider, model } = req.body;

  try {
    let comps = [];
    if (platform === 'play') {
      comps = await scraper.getPlaySimilar(packageName);
    }

    if (db && comps.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO aso_competitor (
          package_name, platform, store, competitor_key, title, short_desc, rating, installs_text, developer, category, icon_url, price, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(package_name, platform, store, competitor_key) DO UPDATE SET 
          title = excluded.title, rating = excluded.rating, icon_url = excluded.icon_url, developer = excluded.developer
      `);

      comps.slice(0, 5).forEach(c => {
        stmt.run(
          packageName, platform, platform, c.appId || c.title, c.title, c.summary || '',
          c.score || 0, c.installs || '', c.developer || '', c.category || '', c.icon || '', c.priceText || ''
        );
      });
    }

    const promptText = `Competitor gap analysis for ${packageName}. Competitors: ${comps.slice(0, 5).map(c => c.title).join(', ')}`;
    const result = await generateJSON({
      system: prompts.gapsPrompt.system,
      prompt: promptText,
      schema: prompts.gapsPrompt.schema,
      provider,
      customModel: model
    });

    res.json({
      gaps: result.data,
      provider: result.provider,
      model: result.model
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Review Sync & Theme Digest
 */
router.post('/aso/reviews/digest', async (req, res) => {
  const { packageName, platform = 'play', provider, model } = req.body;

  try {
    let reviews = [];
    if (platform === 'play') {
      reviews = await scraper.getPlayReviews(packageName, 30);
    } else {
      reviews = await scraper.getAppleReviewsRSS(packageName);
    }

    if (db && reviews.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO aso_review (id, package_name, platform, store, author, title, body, rating, review_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id, store) DO UPDATE SET body = excluded.body
      `);
      reviews.forEach(r => {
        stmt.run(String(r.id), packageName, platform, platform, r.userName || r.author || 'User', r.title || '', r.text || r.body || '', r.score || r.rating || 5);
      });
    }

    const reviewTexts = reviews.slice(0, 20).map(r => `[Rating: ${r.score || r.rating}] ${r.text || r.body}`).join('\n');
    const promptText = `Analyze these customer reviews:\n\n${reviewTexts}`;

    const result = await generateJSON({
      system: prompts.reviewsPrompt.system,
      prompt: promptText,
      schema: prompts.reviewsPrompt.schema,
      provider,
      customModel: model
    });

    res.json({
      digest: result.data,
      reviewsCount: reviews.length,
      provider: result.provider,
      model: result.model
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
