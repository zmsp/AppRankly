const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');

function getResolvedConfigPath() {
  const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, '..', '..', 'data') : path.join(__dirname, '..', '..', '..', 'data'));
  const candidatePaths = [
    process.env.CONFIG_PATH,
    path.join(dataDir, 'config', 'config.json'),
    path.join(dataDir, 'config.json'),
    path.join(__dirname, '..', '..', '..', 'config', 'config.json'),
    path.join(__dirname, '..', '..', 'config', 'config.json')
  ].filter(Boolean);

  return candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
}

function loadAIConfig() {
  let rawConfig = {};
  const configPath = getResolvedConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.warn('[AI Adapter] Could not parse config.json at ' + configPath + ':', e.message);
    }
  }

  const projectConfig = (Array.isArray(rawConfig) ? rawConfig[0] : rawConfig) || {};
  const aiConfig = projectConfig.ai || rawConfig.ai || {};
  const defaultProvider = aiConfig.defaultProvider || 'openai';
  
  const providers = {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || aiConfig.providers?.anthropic?.apiKey || '',
      model: process.env.ANTHROPIC_MODEL || aiConfig.providers?.anthropic?.model || 'claude-haiku-4-5-20251001'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || aiConfig.providers?.openai?.apiKey || '',
      model: process.env.OPENAI_MODEL || aiConfig.providers?.openai?.model || 'gpt-5-nano'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || aiConfig.providers?.gemini?.apiKey || '',
      model: process.env.GEMINI_MODEL || aiConfig.providers?.gemini?.model || 'gemini-2.5-flash-lite'
    }
  };

  return { defaultProvider, providers };
}

function getAIStatus() {
  const { defaultProvider, providers } = loadAIConfig();
  const providerList = Object.keys(providers).map(id => ({
    id,
    available: Boolean(providers[id].apiKey),
    model: providers[id].model,
    maskedKey: providers[id].apiKey ? `${providers[id].apiKey.slice(0, 7)}...${providers[id].apiKey.slice(-4)}` : ''
  }));

  return { defaultProvider, providers: providerList };
}

async function anthropicGenerate({ system, prompt, schema, apiKey, model, maxTokens = 8192 }) {
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: prompt }]
  });
  
  const text = resp.content.find(b => b.type === 'text')?.text || '{}';
  return {
    data: JSON.parse(text),
    usage: {
      inputTokens: resp.usage?.input_tokens || 0,
      outputTokens: resp.usage?.output_tokens || 0
    }
  };
}

async function openaiGenerate({ system, prompt, schema, apiKey, model, maxTokens = 8192 }) {
  const openai = new OpenAI({ apiKey });

  // Model capabilities check
  const isModern = model.startsWith('o1') || model.startsWith('o3') || model.startsWith('gpt-4o') || model.startsWith('gpt-5');
  const supportsStructured = isModern || model.includes('2024-08-06');

  const params = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ]
  };

  // 1. Handle tokens parameter (modern vs legacy)
  if (isModern) {
    params.max_completion_tokens = maxTokens;
  } else {
    params.max_tokens = maxTokens;
  }

  // 2. Handle response format
  if (supportsStructured) {
    params.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'structured_output',
        strict: false,
        schema
      }
    };
  } else {
    // Fallback for older models that support JSON Mode but not json_schema
    params.response_format = { type: 'json_object' };
    params.messages[0].content += "\n\nIMPORTANT: You must return valid JSON that follows this schema: " + JSON.stringify(schema);
  }

  const resp = await openai.chat.completions.create(params);

  const text = resp.choices[0]?.message?.content || '{}';
  return {
    data: JSON.parse(text),
    usage: {
      inputTokens: resp.usage?.prompt_tokens || 0,
      outputTokens: resp.usage?.completion_tokens || 0
    }
  };
}

async function geminiGenerate({ system, prompt, schema, apiKey, model }) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  const text = response.text || '{}';
  return {
    data: JSON.parse(text),
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0
    }
  };
}

async function generateJSON({ system, prompt, schema, provider, customModel, customApiKey, maxTokens = 8192 }) {
  const { defaultProvider, providers } = loadAIConfig();
  const selectedProvider = provider || defaultProvider;
  const pConfig = providers[selectedProvider] || {};
  
  const activeModel = customModel || pConfig.model;
  let result;

  const envKeyName = `${selectedProvider.toUpperCase()}_API_KEY`;
  const apiKey = customApiKey || pConfig.apiKey || process.env[envKeyName] || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(`AI Provider "${selectedProvider}" API key is missing. Please save an API key in Config -> AI & ASO Configuration or set ${envKeyName} in environment.`);
  }

  if (selectedProvider === 'anthropic') {
    result = await anthropicGenerate({ system, prompt, schema, apiKey, model: activeModel, maxTokens });
  } else if (selectedProvider === 'openai') {
    result = await openaiGenerate({ system, prompt, schema, apiKey, model: activeModel, maxTokens });
  } else if (selectedProvider === 'gemini') {
    result = await geminiGenerate({ system, prompt, schema, apiKey, model: activeModel });
  } else {
    throw new Error(`Unsupported AI provider: ${selectedProvider}`);
  }

  return {
    ...result,
    provider: selectedProvider,
    model: activeModel
  };
}

module.exports = {
  loadAIConfig,
  getAIStatus,
  generateJSON
};
