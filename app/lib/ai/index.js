const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');

function getResolvedConfigPath() {
  const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, '..', 'data') : path.join(__dirname, '..', '..', 'data'));
  const candidatePaths = [
    process.env.CONFIG_PATH,
    path.join(dataDir, 'config', 'config.json'),
    path.join(dataDir, 'config.json'),
    path.join(__dirname, '..', '..', 'config', 'config.json'),
    path.join(__dirname, '..', 'config', 'config.json')
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
      model: process.env.ANTHROPIC_MODEL || aiConfig.providers?.anthropic?.model || 'claude-3-5-haiku-latest'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || aiConfig.providers?.openai?.apiKey || '',
      model: process.env.OPENAI_MODEL || aiConfig.providers?.openai?.model || 'gpt-4o-mini'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || aiConfig.providers?.gemini?.apiKey || '',
      model: process.env.GEMINI_MODEL || aiConfig.providers?.gemini?.model || 'gemini-3.6-flash'
    },
    local: {
      apiKey: '',
      model: process.env.LOCAL_MODEL || aiConfig.providers?.local?.model || 'HuggingFaceTB/SmolLM2-135M-Instruct'
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
  const params = {
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
    }
  };

  // Modern OpenAI models (o1, o3-mini, gpt-4o, etc.) use max_completion_tokens
  if (model.startsWith('o1') || model.startsWith('o3') || model.startsWith('gpt-4o')) {
    params.max_completion_tokens = maxTokens;
  } else {
    params.max_tokens = maxTokens;
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

function getStaticArchivePath() {
  const candidates = [
    path.join(__dirname, '..', 'static_assets', 'smollm2_q4.tar.gz'),
    path.join(__dirname, '..', '..', 'app', 'static_assets', 'smollm2_q4.tar.gz'),
    path.join(process.cwd(), 'app', 'static_assets', 'smollm2_q4.tar.gz'),
    path.join(process.cwd(), 'static_assets', 'smollm2_q4.tar.gz')
  ];
  return candidates.find(p => fs.existsSync(p));
}

function ensureLocalModelExtracted(modelName = 'HuggingFaceTB/SmolLM2-135M-Instruct') {
  const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, '..', 'data') : path.join(__dirname, '..', '..', 'data'));
  const modelsDir = path.join(dataDir, 'models');
  const targetDir = path.join(modelsDir, ...modelName.split('/'));

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    return targetDir;
  }

  // Check for compressed static asset archive in application assets
  const archivePath = getStaticArchivePath();
  if (archivePath) {
    console.log(`[Local AI Model] First request: Decompressing ${archivePath} into runtime data directory ${targetDir}...`);
    fs.mkdirSync(targetDir, { recursive: true });
    const { execSync } = require('child_process');
    execSync(`tar -xzf "${archivePath}" -C "${targetDir}"`);
    console.log(`[Local AI Model] Decompression complete for ${modelName} into data directory.`);
    return targetDir;
  }

  return targetDir;
}

function isLocalModelDownloaded(modelName = 'HuggingFaceTB/SmolLM2-135M-Instruct') {
  const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, '..', 'data') : path.join(__dirname, '..', '..', 'data'));
  const targetDir = path.join(dataDir, 'models', ...modelName.split('/'));

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) return true;

  return Boolean(getStaticArchivePath());
}

async function localGenerate({ prompt, system, model = 'HuggingFaceTB/SmolLM2-135M-Instruct', confirmDownload = false }) {
  const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, '..', 'data') : path.join(__dirname, '..', '..', 'data'));
  const modelsDir = path.join(dataDir, 'models');

  ensureLocalModelExtracted(model);

  const exists = isLocalModelDownloaded(model);
  if (!exists && !confirmDownload) {
    const error = new Error(`LOCAL_MODEL_NOT_DOWNLOADED`);
    error.code = 'LOCAL_MODEL_NOT_DOWNLOADED';
    error.modelName = model;
    throw error;
  }

  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  let pipeline, env;
  try {
    const tf = await import('@huggingface/transformers');
    pipeline = tf.pipeline;
    env = tf.env;
  } catch (err) {
    throw new Error(`The package '@huggingface/transformers' is missing on the server. Please run 'npm install @huggingface/transformers' in the app directory.`);
  }

  env.cacheDir = modelsDir;
  if (process.env.HF_TOKEN) {
    env.token = process.env.HF_TOKEN;
  }

  console.log(`[Local AI Model] Loading/Downloading ${model} into cache at ${modelsDir}...`);
  let generator;
  try {
    generator = await pipeline('text-generation', model, { dtype: 'q4' });
  } catch (err) {
    if (err.message?.includes('Unauthorized access') || err.message?.includes('401')) {
      throw new Error(`HuggingFace returned unauthorized access for ${model}. If downloading restricted/gated models, set process.env.HF_TOKEN in your environment or use a public open ONNX model repository.`);
    }
    throw err;
  }

  const fullPrompt = `<|im_start|>system\n${system || 'You are a helpful assistant.'}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`;
  const output = await generator(fullPrompt, { max_new_tokens: 250, temperature: 0.7, repetition_penalty: 1.2 });
  let rawText = output[0]?.generated_text || '';

  // Slicing text strictly after the last assistant token marker
  const assistantMarker = '<|im_start|>assistant\n';
  if (rawText.includes(assistantMarker)) {
    rawText = rawText.split(assistantMarker).pop();
  } else if (rawText.includes('assistant\n')) {
    rawText = rawText.split('assistant\n').pop();
  } else if (rawText.startsWith(fullPrompt)) {
    rawText = rawText.slice(fullPrompt.length).trim();
  }

  // Clean trailing ChatML tokens or artifacts
  rawText = rawText.replace(/<\|im_end\|>[\s\S]*$/g, '').trim();
  rawText = rawText.replace(/Current Note Title:[\s\S]*$/i, '').trim();

  let jsonResult = { reply: rawText || "I am currently assisting you based on your active page." };
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonResult = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Fallback reply
  }

  return {
    data: jsonResult,
    usage: { inputTokens: 0, outputTokens: 0 }
  };
}

async function generateJSON({ system, prompt, schema, provider, customModel, customApiKey, confirmDownload = false, maxTokens = 8192 }) {
  const { defaultProvider, providers } = loadAIConfig();
  const selectedProvider = provider || defaultProvider;
  const pConfig = providers[selectedProvider] || {};
  
  const activeModel = customModel || pConfig.model;
  let result;

  if (selectedProvider === 'local') {
    result = await localGenerate({ system, prompt, model: activeModel, confirmDownload });
  } else {
    // Allow API key from custom parameter, config.json, or env
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
  generateJSON,
  isLocalModelDownloaded
};
