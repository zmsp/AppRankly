const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');

function loadAIConfig() {
  let rawConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.warn('[AI Adapter] Could not parse config.json:', e.message);
    }
  }

  const projectConfig = Array.isArray(rawConfig) ? rawConfig[0] : rawConfig;
  const aiConfig = projectConfig.ai || rawConfig.ai || {};
  const defaultProvider = aiConfig.defaultProvider || 'openai';
  
  const providers = {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || aiConfig.providers?.anthropic?.apiKey || '',
      model: process.env.ANTHROPIC_MODEL || aiConfig.providers?.anthropic?.model || 'claude-opus-4-8'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || aiConfig.providers?.openai?.apiKey || '',
      model: process.env.OPENAI_MODEL || aiConfig.providers?.openai?.model || 'gpt-5'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || aiConfig.providers?.gemini?.apiKey || '',
      model: process.env.GEMINI_MODEL || aiConfig.providers?.gemini?.model || 'gemini-2.5-pro'
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
  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'structured_output',
        strict: false,
        schema
      }
    },
    max_tokens: maxTokens
  });

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

async function generateJSON({ system, prompt, schema, provider, customModel, maxTokens = 8192 }) {
  const { defaultProvider, providers } = loadAIConfig();
  const selectedProvider = provider || defaultProvider;
  const pConfig = providers[selectedProvider];

  if (!pConfig || !pConfig.apiKey) {
    throw new Error(`AI Provider "${selectedProvider}" is not configured or missing API key.`);
  }

  const activeModel = customModel || pConfig.model;
  let result;

  if (selectedProvider === 'anthropic') {
    result = await anthropicGenerate({ system, prompt, schema, apiKey: pConfig.apiKey, model: activeModel, maxTokens });
  } else if (selectedProvider === 'openai') {
    result = await openaiGenerate({ system, prompt, schema, apiKey: pConfig.apiKey, model: activeModel, maxTokens });
  } else if (selectedProvider === 'gemini') {
    result = await geminiGenerate({ system, prompt, schema, apiKey: pConfig.apiKey, model: activeModel });
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
