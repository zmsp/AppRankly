const dbModule = require('../db');
const { generateJSON } = require('./index');

/**
 * Returns formatted schema of available tables for LLM context
 */
function getDatabaseSchemaSummary() {
  const liveDb = dbModule.db;
  if (!liveDb) return 'Database not initialized';

  try {
    const tables = liveDb.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'schema_meta'
    `).all();

    return tables.map(t => `${t.name}:\n  ${t.sql}`).join('\n\n');
  } catch (err) {
    return 'Failed to retrieve schema: ' + err.message;
  }
}

/**
 * Strict validator ensuring query is strictly a single, read-only SELECT statement
 */
function validateReadOnlySql(sql) {
  if (!sql || typeof sql !== 'string') {
    return { valid: false, error: 'Empty SQL query' };
  }

  const cleaned = sql.trim();

  // Block multiple statements
  if (cleaned.includes(';')) {
    const parts = cleaned.split(';').map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return { valid: false, error: 'Multiple statements are prohibited' };
    }
  }

  // Block SQL comments that could disguise injection
  if (cleaned.includes('--') || cleaned.includes('/*')) {
    return { valid: false, error: 'SQL comments are not allowed' };
  }

  // Must begin with SELECT
  if (!/^SELECT\s+/i.test(cleaned)) {
    return { valid: false, error: 'Only SELECT queries are permitted' };
  }

  // Block destructive / modification keywords anywhere
  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|ATTACH|DETACH|PRAGMA|REPLACE|VACUUM|REINDEX|CREATE)\b/i;
  if (forbidden.test(cleaned)) {
    return { valid: false, error: 'Query contains forbidden non-read operations' };
  }

  // Ensure reasonable LIMIT
  let safeSql = cleaned.replace(/;+$/, '');
  if (!/\bLIMIT\s+\d+/i.test(safeSql)) {
    safeSql += ' LIMIT 50';
  }

  return { valid: true, sql: safeSql };
}

/**
 * Translate natural language to SQL and execute safely
 */
async function runNaturalLanguageSql({ question, provider, model }) {
  const liveDb = dbModule.db;
  if (!liveDb) {
    return {
      success: false,
      error: 'SQLite database is not enabled or available in this runtime.',
      sql: null,
      rows: []
    };
  }

  const schemaSummary = getDatabaseSchemaSummary();

  const prompt = `You are a SQLite database analyst for AppRankly mobile app analytics.
Available SQLite Schema:
${schemaSummary}

Convert the user's natural language question into a safe, standard SQLite SELECT query.
Guidelines:
- Return ONLY valid SQLite syntax.
- Only query existing tables and columns.
- Use date functions like datetime('now', '-7 days') where appropriate.
- Order results meaningfully (e.g. by added_at DESC, score DESC, or count DESC).

User Question: "${question}"`;

  let generatedSql = '';
  try {
    const aiRes = await generateJSON({
      provider: provider || undefined,
      customModel: model || undefined,
      system: 'You generate read-only SQLite SELECT queries based on the provided schema. Output JSON with "sql" and "explanation" fields.',
      prompt,
      schema: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'The SQLite SELECT statement' },
          explanation: { type: 'string', description: 'Brief explanation of what the query calculates' }
        },
        required: ['sql']
      }
    });

    generatedSql = aiRes.data?.sql || '';
  } catch (err) {
    return {
      success: false,
      error: 'AI query generation failed: ' + err.message,
      sql: null,
      rows: []
    };
  }

  const validation = validateReadOnlySql(generatedSql);
  if (!validation.valid) {
    return {
      success: false,
      error: `Security Validation Failed: ${validation.error}`,
      sql: generatedSql,
      rows: []
    };
  }

  try {
    const rows = liveDb.prepare(validation.sql).all();
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      success: true,
      sql: validation.sql,
      columns,
      rows,
      rowCount: rows.length,
      explanation: `Found ${rows.length} records.`
    };
  } catch (dbErr) {
    return {
      success: false,
      error: `SQL Execution Error: ${dbErr.message}`,
      sql: validation.sql,
      rows: []
    };
  }
}

/**
 * Generates an executive digest of portfolio health
 */
async function generateExecutiveBrief() {
  const liveDb = dbModule.db;
  const metrics = {
    totalTrackedKeywords: 0,
    totalCompetitors: 0,
    totalCampaignLinks: 0,
    recentAlerts: 0
  };

  if (liveDb) {
    try {
      const kw = liveDb.prepare('SELECT COUNT(*) as c FROM aso_keyword WHERE tracked = 1').get();
      metrics.totalTrackedKeywords = kw?.c || 0;

      const comp = liveDb.prepare('SELECT COUNT(*) as c FROM aso_competitor').get();
      metrics.totalCompetitors = comp?.c || 0;

      const links = liveDb.prepare('SELECT COUNT(*) as c, COALESCE(SUM(clicks), 0) as clicks FROM campaign_links').get();
      metrics.totalCampaignLinks = links?.c || 0;
      metrics.totalCampaignClicks = links?.clicks || 0;

      const alerts = liveDb.prepare('SELECT COUNT(*) as c FROM negative_review_alerts WHERE alerted_at >= datetime("now", "-7 days")').get();
      metrics.recentAlerts = alerts?.c || 0;
    } catch (_) {}
  }

  return {
    timestamp: new Date().toISOString(),
    metrics,
    summaryBullets: [
      `Tracked Keywords: ${metrics.totalTrackedKeywords} search queries under active monitoring.`,
      `Competitor Radar: ${metrics.totalCompetitors} rival apps tracked across App Store & Play Store.`,
      `External Campaigns: ${metrics.totalCampaignLinks} active links tracked (${metrics.totalCampaignClicks || 0} total clicks recorded).`,
      `Quality Alerts: ${metrics.recentAlerts} critical 1-star reviews flagged in the last 7 days.`
    ]
  };
}

module.exports = {
  getDatabaseSchemaSummary,
  validateReadOnlySql,
  runNaturalLanguageSql,
  generateExecutiveBrief
};
