/**
 * @fileoverview AI Provider Registry — defines all supported AI providers
 * and exports helper functions for querying them.
 * @module providers
 */

/**
 * @typedef {Object} ModelDef
 * @property {string} name - Human-readable model name
 */

/**
 * @typedef {Object} Provider
 * @property {string} id                   - Unique provider identifier
 * @property {string} name                 - Display name
 * @property {'cloud'|'local'} category    - Whether this is a cloud or local provider
 * @property {string} npm                  - NPM package used by OpenCode
 * @property {string} baseURL              - Default API base URL
 * @property {boolean} requiresApiKey      - Whether an API key is required
 * @property {string} [apiKeyUrl]          - URL where the user can obtain an API key
 * @property {Record<string, ModelDef>} models - Available models keyed by model ID
 * @property {string} defaultModel         - Default model ID
 * @property {string} [smallModel]         - Smaller / cheaper model ID (optional)
 * @property {boolean} customizableBaseURL - Whether the base URL can be customised
 * @property {boolean} customizableModels  - Whether the model list can be customised
 */

/** @type {Record<string, Provider>} */
export const PROVIDERS = {
  // ─── 智谱 GLM ────────────────────────────────────────────────────────
  glm_coding_plan_global: {
    id: "glm_coding_plan_global",
    name: "GLM Global (z.ai)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["anthropic", "openai_compatible"],
    baseURL: "https://open.zai.chat/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://open.zai.chat",
    models: {
      "glm-4-plus": { name: "GLM-4 Plus" },
      "glm-4-air": { name: "GLM-4 Air" },
      "glm-4-airx": { name: "GLM-4 AirX" },
      "glm-4-long": { name: "GLM-4 Long" },
      "glm-4-flash": { name: "GLM-4 Flash" },
      "glm-4-flashx": { name: "GLM-4 FlashX" },
      "glm-4": { name: "GLM-4" },
    },
    defaultModel: "glm-4-plus",
    smallModel: "glm-4-flash",
    customizableBaseURL: false,
    customizableModels: false,
  },

  glm_coding_plan_china: {
    id: "glm_coding_plan_china",
    name: "GLM China (bigmodel.cn)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["anthropic", "openai_compatible"],
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    requiresApiKey: true,
    apiKeyUrl: "https://open.bigmodel.cn",
    models: {
      "glm-4-plus": { name: "GLM-4 Plus" },
      "glm-4-air": { name: "GLM-4 Air" },
      "glm-4-airx": { name: "GLM-4 AirX" },
      "glm-4-long": { name: "GLM-4 Long" },
      "glm-4-flash": { name: "GLM-4 Flash" },
      "glm-4-flashx": { name: "GLM-4 FlashX" },
      "glm-4": { name: "GLM-4" },
    },
    defaultModel: "glm-4-plus",
    smallModel: "glm-4-flash",
    customizableBaseURL: false,
    customizableModels: false,
  },

  // ─── 云端服务商 ──────────────────────────────────────────────────────
  openai: {
    id: "openai",
    name: "OpenAI",
    category: "cloud",
    npm: "@ai-sdk/openai",
    protocols: ["openai_compatible"],
    baseURL: "https://api.openai.com/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://platform.openai.com/api-keys",
    models: {
      "gpt-4o": { name: "GPT-4o" },
      "gpt-4o-mini": { name: "GPT-4o Mini" },
      "o3": { name: "o3" },
      "o4-mini": { name: "o4-mini" },
    },
    defaultModel: "gpt-4o",
    smallModel: "gpt-4o-mini",
    customizableBaseURL: false,
    customizableModels: false,
  },

  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    category: "cloud",
    npm: "@ai-sdk/anthropic",
    protocols: ["anthropic"],
    baseURL: "https://api.anthropic.com/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    models: {
      "claude-sonnet-4-20250514": { name: "Claude Sonnet 4" },
      "claude-haiku-4-20250514": { name: "Claude Haiku 4" },
    },
    defaultModel: "claude-sonnet-4-20250514",
    smallModel: "claude-haiku-4-20250514",
    customizableBaseURL: false,
    customizableModels: false,
  },

  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://api.deepseek.com",
    requiresApiKey: true,
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    models: {
      "deepseek-chat": { name: "DeepSeek Chat" },
      "deepseek-reasoner": { name: "DeepSeek Reasoner" },
    },
    defaultModel: "deepseek-chat",
    smallModel: "deepseek-chat",
    customizableBaseURL: false,
    customizableModels: false,
  },

  google_gemini: {
    id: "google_gemini",
    name: "Google Gemini",
    category: "cloud",
    npm: "@ai-sdk/google",
    protocols: ["openai_compatible"],
    baseURL: "",
    requiresApiKey: true,
    apiKeyUrl: "https://aistudio.google.com/apikey",
    models: {
      "gemini-2.5-pro": { name: "Gemini 2.5 Pro" },
      "gemini-2.5-flash": { name: "Gemini 2.5 Flash" },
    },
    defaultModel: "gemini-2.5-pro",
    smallModel: "gemini-2.5-flash",
    customizableBaseURL: false,
    customizableModels: false,
  },

  siliconflow: {
    id: "siliconflow",
    name: "硅基流动 (SiliconFlow)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://api.siliconflow.cn/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://cloud.siliconflow.cn/account/ak",
    models: {
      "deepseek-ai/DeepSeek-V3": { name: "DeepSeek-V3" },
      "deepseek-ai/DeepSeek-R1": { name: "DeepSeek-R1" },
    },
    defaultModel: "deepseek-ai/DeepSeek-V3",
    smallModel: "deepseek-ai/DeepSeek-V3",
    customizableBaseURL: false,
    customizableModels: true,
  },

  dashscope: {
    id: "dashscope",
    name: "通义千问 (DashScope)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://dashscope.console.aliyun.com/apiKey",
    models: {
      "qwen-max": { name: "Qwen Max" },
      "qwen-plus": { name: "Qwen Plus" },
      "qwen-turbo": { name: "Qwen Turbo" },
      "qwen-coder-plus": { name: "Qwen Coder Plus" },
    },
    defaultModel: "qwen-max",
    smallModel: "qwen-turbo",
    customizableBaseURL: false,
    customizableModels: false,
  },

  moonshot: {
    id: "moonshot",
    name: "月之暗面 (Kimi)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://api.moonshot.cn/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://platform.moonshot.cn",
    models: {
      "moonshot-v1-8k": { name: "Moonshot V1 8K" },
      "moonshot-v1-32k": { name: "Moonshot V1 32K" },
      "moonshot-v1-128k": { name: "Moonshot V1 128K" },
      "kimi-k2-0711": { name: "Kimi K2" },
    },
    defaultModel: "moonshot-v1-8k",
    smallModel: "moonshot-v1-8k",
    customizableBaseURL: false,
    customizableModels: false,
  },

  baichuan: {
    id: "baichuan",
    name: "百川智能 (Baichuan)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://api.baichuan-ai.com/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://platform.baichuan-ai.com",
    models: {
      "Baichuan4-Turbo": { name: "Baichuan4 Turbo" },
      "Baichuan4": { name: "Baichuan4" },
      "Baichuan2-Turbo-192K": { name: "Baichuan2 Turbo 192K" },
    },
    defaultModel: "Baichuan4-Turbo",
    smallModel: "Baichuan4-Turbo",
    customizableBaseURL: false,
    customizableModels: false,
  },

  yi: {
    id: "yi",
    name: "零一万物 (Yi)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://api.lingyiwanwu.com/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://platform.lingyiwanwu.com",
    models: {
      "yi-large": { name: "Yi Large" },
      "yi-medium": { name: "Yi Medium" },
      "yi-spark": { name: "Yi Spark" },
      "yi-vision": { name: "Yi Vision" },
    },
    defaultModel: "yi-large",
    smallModel: "yi-spark",
    customizableBaseURL: false,
    customizableModels: false,
  },

  minimax: {
    id: "minimax",
    name: "MiniMax (海螺AI)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://api.minimax.chat/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://platform.minimaxi.com",
    models: {
      "MiniMax-Text-01": { name: "MiniMax Text 01" },
      "abab6.5s-chat": { name: "ABAB 6.5S" },
      "abab6.5-chat": { name: "ABAB 6.5" },
    },
    defaultModel: "MiniMax-Text-01",
    smallModel: "abab6.5s-chat",
    customizableBaseURL: false,
    customizableModels: false,
  },

  spark: {
    id: "spark",
    name: "讯飞星火 (Spark)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://spark-api-open.xf-yun.com/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://xinghuo.xfyun.cn",
    models: {
      "4.0Ultra": { name: "星火 4.0 Ultra" },
      "generalv3.5": { name: "星火 3.5" },
      "generalv3": { name: "星火 3.0" },
    },
    defaultModel: "4.0Ultra",
    smallModel: "generalv3.5",
    customizableBaseURL: false,
    customizableModels: false,
  },

  zhipu: {
    id: "zhipu",
    name: "智谱AI (ChatGLM)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://open.bigmodel.cn/api/paas/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://open.bigmodel.cn",
    models: {
      "glm-4-plus": { name: "GLM-4 Plus" },
      "glm-4-air": { name: "GLM-4 Air" },
      "glm-4-flash": { name: "GLM-4 Flash" },
      "glm-4-long": { name: "GLM-4 Long" },
      "glm-4": { name: "GLM-4" },
    },
    defaultModel: "glm-4-plus",
    smallModel: "glm-4-flash",
    customizableBaseURL: false,
    customizableModels: false,
  },

  volcengine: {
    id: "volcengine",
    name: "火山引擎 (豆包)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    requiresApiKey: true,
    apiKeyUrl: "https://console.volcengine.com/ark",
    models: {
      "Doubao-1.5-pro-32k": { name: "Doubao 1.5 Pro 32K" },
      "Doubao-1.5-pro-256k": { name: "Doubao 1.5 Pro 256K" },
      "Doubao-1.5-lite-32k": { name: "Doubao 1.5 Lite 32K" },
      "Doubao-Seed-1.6-thinking": { name: "Doubao Seed 1.6 Thinking" },
      "Doubao-Seed-2.0-lite": { name: "Doubao Seed 2.0 Lite" },
    },
    defaultModel: "Doubao-1.5-pro-32k",
    smallModel: "Doubao-1.5-lite-32k",
    customizableBaseURL: false,
    customizableModels: true,
  },

  xiaomi_mimo: {
    id: "xiaomi_mimo",
    name: "小米 MiMo",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://api.xiaomimimo.com/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://platform.xiaomimimo.com",
    models: {
      "MiMo-V2-Flash": { name: "MiMo V2 Flash" },
      "MiMo-V2-Pro": { name: "MiMo V2 Pro" },
    },
    defaultModel: "MiMo-V2-Pro",
    smallModel: "MiMo-V2-Flash",
    customizableBaseURL: false,
    customizableModels: false,
  },

  longcat: {
    id: "longcat",
    name: "龙猫 (LongCat)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["anthropic", "openai_compatible"],
    baseURL: "https://api.longcat.chat/openai",
    requiresApiKey: true,
    apiKeyUrl: "https://longcat.chat",
    models: {
      "LongCat-Flash-Chat": { name: "LongCat Flash Chat" },
      "LongCat-Flash-Thinking": { name: "LongCat Flash Thinking" },
      "LongCat-Flash-Lite": { name: "LongCat Flash Lite" },
      "LongCat-2.0-Preview": { name: "LongCat 2.0 Preview" },
    },
    defaultModel: "LongCat-Flash-Chat",
    smallModel: "LongCat-Flash-Lite",
    customizableBaseURL: false,
    customizableModels: false,
  },

  tencent_hunyuan: {
    id: "tencent_hunyuan",
    name: "腾讯混元 (Hunyuan)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://api.hunyuan.cloud.tencent.com/v1",
    requiresApiKey: true,
    apiKeyUrl: "https://cloud.tencent.com/product/hunyuan",
    models: {
      "hunyuan-pro": { name: "混元 Pro" },
      "hunyuan-standard": { name: "混元 Standard" },
      "hunyuan-lite": { name: "混元 Lite" },
      "hunyuan-turbos": { name: "混元 Turbos" },
      "hunyuan-t1": { name: "混元 T1 (推理)" },
    },
    defaultModel: "hunyuan-pro",
    smallModel: "hunyuan-lite",
    customizableBaseURL: false,
    customizableModels: false,
  },

  baidu_qianfan: {
    id: "baidu_qianfan",
    name: "百度千帆 (Qianfan)",
    category: "cloud",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "https://qianfan.baidubce.com/v2",
    requiresApiKey: true,
    apiKeyUrl: "https://console.bce.baidu.com/qianfan/",
    models: {
      "ernie-4.0-8k": { name: "ERNIE 4.0 8K" },
      "ernie-4.0-turbo-8k": { name: "ERNIE 4.0 Turbo 8K" },
      "ernie-3.5-8k": { name: "ERNIE 3.5 8K" },
      "ernie-speed-8k": { name: "ERNIE Speed 8K" },
      "ernie-lite-8k": { name: "ERNIE Lite 8K" },
    },
    defaultModel: "ernie-4.0-8k",
    smallModel: "ernie-lite-8k",
    customizableBaseURL: false,
    customizableModels: false,
  },

  // ─── 本地模型 ────────────────────────────────────────────────
  lm_studio: {
    id: "lm_studio",
    name: "LM Studio (本地)",
    category: "local",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "http://localhost:1234/v1",
    requiresApiKey: false,
    models: {},
    defaultModel: "",
    customizableBaseURL: true,
    customizableModels: true,
  },

  ollama: {
    id: "ollama",
    name: "Ollama (本地)",
    category: "local",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "http://localhost:11434/v1",
    requiresApiKey: false,
    models: {},
    defaultModel: "",
    customizableBaseURL: true,
    customizableModels: true,
  },

  vllm: {
    id: "vllm",
    name: "vLLM (本地)",
    category: "local",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "http://localhost:8000/v1",
    requiresApiKey: false,
    models: {},
    defaultModel: "",
    customizableBaseURL: true,
    customizableModels: true,
  },

  custom_local: {
    id: "custom_local",
    name: "自定义 OpenAI-Compatible API",
    category: "local",
    npm: "@ai-sdk/openai-compatible",
    protocols: ["openai_compatible"],
    baseURL: "",
    requiresApiKey: false,
    models: {},
    defaultModel: "",
    customizableBaseURL: true,
    customizableModels: true,
  },
};

// ─── Helper functions ─────────────────────────────────────────────────────

/**
 * Retrieve a single provider by its unique id.
 * @param {string} id - Provider identifier.
 * @returns {Provider | undefined} The matching provider, or undefined.
 */
export function getProviderById(id) {
  return PROVIDERS[id];
}

/**
 * Return all registered providers as an array.
 * @returns {Provider[]}
 */
export function getAllProviders() {
  return Object.values(PROVIDERS);
}

/**
 * Return only cloud (remote) providers.
 * @returns {Provider[]}
 */
export function getCloudProviders() {
  return Object.values(PROVIDERS).filter((p) => p.category === "cloud");
}

/**
 * Return only local providers.
 * @returns {Provider[]}
 */
export function getLocalProviders() {
  return Object.values(PROVIDERS).filter((p) => p.category === "local");
}

/**
 * Return providers organised into labelled groups suitable for menu display.
 * Groups: 智谱 GLM → 云端服务商 → 本地模型
 * @returns {{ label: string, providers: Provider[] }[]}
 */
export function getProviderGroups() {
  const glmIds = ["glm_coding_plan_global", "glm_coding_plan_china"];
  const localIds = [
    "lm_studio",
    "ollama",
    "vllm",
    "custom_local",
  ];

  /** @type {{ label: string, providers: Provider[] }[]} */
  const groups = [];

  // Group 1 — 智谱 GLM
  const glmProviders = glmIds
    .map((id) => PROVIDERS[id])
    .filter(Boolean);
  groups.push({ label: "智谱 GLM", providers: glmProviders });

  // Group 2 — 云端服务商 (all cloud providers except GLM)
  const cloudProviders = getCloudProviders().filter(
    (p) => !glmIds.includes(p.id),
  );
  groups.push({ label: "云端服务商", providers: cloudProviders });

  // Group 3 — 本地模型
  const localProviders = localIds
    .map((id) => PROVIDERS[id])
    .filter(Boolean);
  groups.push({ label: "本地模型", providers: localProviders });

  return groups;
}
