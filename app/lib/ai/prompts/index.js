const auditPrompt = {
  system: `You are an expert App Store Optimization (ASO) auditor. Your task is to evaluate an app's listing metadata strictly based on provided store facts.
Check keyword placement, clarity of hook, balance of features vs benefits, and character limit efficiency.
Never invent download numbers or rank volume. Return structured JSON matching the provided schema.`,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['score', 'headline', 'improvements'],
    properties: {
      score: { type: 'integer' },
      headline: { type: 'string' },
      improvements: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'impact', 'issue', 'recommendation'],
          properties: {
            type: { type: 'string', enum: ['title', 'short_description', 'subtitle', 'keyword_field', 'description', 'redundancy'] },
            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            issue: { type: 'string' },
            recommendation: { type: 'string' }
          }
        }
      }
    }
  }
};

const variantsPrompt = {
  system: `You are an expert ASO copywriter. Generate concise metadata candidate variants targeting the requested keyword cluster.
STRICT RULE: Respect hard character limits!
- Play Title <= 30 chars
- Play Short Description <= 80 chars
- Apple Subtitle <= 30 chars
- Apple Keyword field <= 100 chars (comma-separated, NO duplicated words from title)
Return structured JSON with candidate details.`,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['candidates'],
    properties: {
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['field', 'text', 'charCount', 'targetTerms', 'rationale'],
          properties: {
            field: { type: 'string', enum: ['title', 'short_description', 'subtitle', 'keyword_field', 'promotional_text'] },
            text: { type: 'string' },
            charCount: { type: 'integer' },
            targetTerms: { type: 'array', items: { type: 'string' } },
            rationale: { type: 'string' }
          }
        }
      }
    }
  }
};

const gapsPrompt = {
  system: `Analyze app listings against competitors to find keyword coverage gaps and value proposition differences. Ground all claims in the provided text.`,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['gaps', 'competitorHooks'],
    properties: {
      gaps: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['term', 'targetedByCompetitors', 'opportunity'],
          properties: {
            term: { type: 'string' },
            targetedByCompetitors: { type: 'array', items: { type: 'string' } },
            opportunity: { type: 'string' }
          }
        }
      },
      competitorHooks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['competitorKey', 'primaryHook'],
          properties: {
            competitorKey: { type: 'string' },
            primaryHook: { type: 'string' }
          }
        }
      }
    }
  }
};

const reviewsPrompt = {
  system: `Analyze app customer reviews to group them into key feedback themes and draft helpful, polite customer responses. Never auto-post.`,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['themes'],
    properties: {
      themes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['themeName', 'sentiment', 'count', 'sampleQuote', 'insight'],
          properties: {
            themeName: { type: 'string' },
            sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'feature_request'] },
            count: { type: 'integer' },
            sampleQuote: { type: 'string' },
            insight: { type: 'string' }
          }
        }
      }
    }
  }
};

module.exports = {
  auditPrompt,
  variantsPrompt,
  gapsPrompt,
  reviewsPrompt
};
