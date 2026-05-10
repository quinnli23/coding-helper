import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';
export class OpenCodeManager {
    static instance;
    configPath;
    constructor() {
        // OpenCode 配置文件路径
        // ~/.config/opencode/opencode.json
        this.configPath = join(homedir(), '.config', 'opencode', 'opencode.json');
    }
    static getInstance() {
        if (!OpenCodeManager.instance) {
            OpenCodeManager.instance = new OpenCodeManager();
        }
        return OpenCodeManager.instance;
    }
    /**
     * 确保配置目录存在
     */
    ensureConfigDir() {
        const dir = dirname(this.configPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }
    /**
     * 读取配置
     */
    getConfig() {
        try {
            if (existsSync(this.configPath)) {
                const content = readFileSync(this.configPath, 'utf-8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            console.warn('Failed to read OpenCode config:', error);
            logger.logError('OpenCodeManager.getConfig', error);
        }
        return {};
    }
    /**
     * 保存配置
     */
    saveConfig(config) {
        try {
            this.ensureConfigDir();
            writeFileSync(this.configPath, JSON.stringify(config, null, 4), 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to save OpenCode config: ${error}`);
        }
    }
    /**
     * 获取 provider 名称（根据套餐类型）
     */
    getProviderName(plan) {
        return plan === 'glm_coding_plan_global' ? 'zai-coding-plan' : 'zhipuai-coding-plan';
    }
    /**
     * 加载 GLM Coding Plan 配置到 OpenCode
     */
    loadGLMConfig(plan, apiKey) {
        const currentConfig = this.getConfig();
        const providerName = this.getProviderName(plan);
        // 移除旧的 provider 配置（如果存在）
        const { provider: oldProvider, ...restConfig } = currentConfig;
        const newProvider = {};
        // 保留其他 provider（如果有的话），但移除旧的 coding-plan provider
        if (oldProvider) {
            for (const [key, value] of Object.entries(oldProvider)) {
                if (key !== 'zhipuai-coding-plan' && key !== 'zai-coding-plan') {
                    newProvider[key] = value;
                }
            }
        }
        // 添加新的 provider 配置
        newProvider[providerName] = {
            options: {
                apiKey: apiKey
            }
        };
        const newConfig = {
            $schema: 'https://opencode.ai/config.json',
            ...restConfig,
            provider: newProvider,
            model: `${providerName}/glm-4.6`,
            small_model: `${providerName}/glm-4.5-air`
        };
        this.saveConfig(newConfig);
    }
    /**
     * 卸载 GLM Coding Plan 配置
     */
    unloadGLMConfig() {
        const currentConfig = this.getConfig();
        // 移除 provider 中的 coding-plan 配置
        if (currentConfig.provider) {
            delete currentConfig.provider['zhipuai-coding-plan'];
            delete currentConfig.provider['zai-coding-plan'];
            // 如果 provider 为空，删除 provider 字段
            if (Object.keys(currentConfig.provider).length === 0) {
                delete currentConfig.provider;
            }
        }
        // 移除 model 和 small_model（如果是 coding-plan 的）
        if (currentConfig.model?.includes('coding-plan')) {
            delete currentConfig.model;
        }
        if (currentConfig.small_model?.includes('coding-plan')) {
            delete currentConfig.small_model;
        }
        this.saveConfig(currentConfig);
    }
    /**
     * 检查 MCP 服务是否已安装
     */
    isMCPInstalled(mcpId) {
        try {
            const config = this.getConfig();
            if (!config.mcp) {
                return false;
            }
            return mcpId in config.mcp;
        }
        catch {
            return false;
        }
    }
    /**
     * 安装 MCP 服务
     */
    installMCP(mcp, apiKey, plan) {
        try {
            const config = this.getConfig();
            if (!config.mcp) {
                config.mcp = {};
            }
            let mcpConfig;
            if (mcp.protocol === 'stdio') {
                // 确定环境变量
                let env = {};
                // 如果有 envTemplate，根据 plan 选择环境变量
                if (mcp.envTemplate && plan) {
                    env = { ...(mcp.envTemplate[plan] || {}) };
                }
                else if (mcp.env) {
                    env = { ...mcp.env };
                }
                // 如果需要认证，添加 API Key
                if (mcp.requiresAuth && apiKey) {
                    env.Z_AI_API_KEY = apiKey;
                }
                // OpenCode 使用 local 类型和 command 数组
                const commandArray = [mcp.command || 'npx', ...(mcp.args || [])];
                mcpConfig = {
                    type: 'local',
                    command: commandArray,
                    environment: env
                };
            }
            else if (mcp.protocol === 'streamable-http') {
                // 根据 plan 确定 URL
                let url = '';
                if (mcp.urlTemplate && plan) {
                    url = mcp.urlTemplate[plan];
                }
                else if (mcp.url) {
                    url = mcp.url;
                }
                else {
                    throw new Error(`MCP ${mcp.id} missing url or urlTemplate`);
                }
                // OpenCode 使用 remote 或 http 类型
                mcpConfig = {
                    type: 'remote',
                    url: url,
                    headers: {
                        ...(mcp.headers || {})
                    }
                };
                // 如果需要认证，添加 API Key 到 headers
                if (mcp.requiresAuth && apiKey) {
                    mcpConfig.headers = {
                        ...mcpConfig.headers,
                        'Authorization': `Bearer ${apiKey}`
                    };
                }
            }
            else {
                throw new Error(`Unsupported protocol: ${mcp.protocol}`);
            }
            config.mcp[mcp.id] = mcpConfig;
            this.saveConfig(config);
        }
        catch (error) {
            throw new Error(`Failed to install MCP ${mcp.name}: ${error}`);
        }
    }
    /**
     * 卸载 MCP 服务
     */
    uninstallMCP(mcpId) {
        try {
            const config = this.getConfig();
            if (!config.mcp) {
                return;
            }
            delete config.mcp[mcpId];
            this.saveConfig(config);
        }
        catch (error) {
            throw new Error(`Failed to uninstall MCP ${mcpId}: ${error}`);
        }
    }
    /**
     * 获取已安装的 MCP 服务列表
     */
    getInstalledMCPs() {
        try {
            const config = this.getConfig();
            if (!config.mcp) {
                return [];
            }
            return Object.keys(config.mcp);
        }
        catch {
            return [];
        }
    }
    /**
     * 获取所有 MCP 服务的安装状态
     */
    getMCPStatus(mcpServices) {
        const status = new Map();
        for (const mcp of mcpServices) {
            status.set(mcp.id, this.isMCPInstalled(mcp.id));
        }
        return status;
    }
    /**
     * 获取非内置的 MCP 服务列表
     */
    getOtherMCPs(builtinIds) {
        try {
            const config = this.getConfig();
            if (!config.mcp) {
                return [];
            }
            const otherMCPs = [];
            for (const [id, mcpConfig] of Object.entries(config.mcp)) {
                if (!builtinIds.includes(id)) {
                    otherMCPs.push({ id, config: mcpConfig });
                }
            }
            return otherMCPs;
        }
        catch {
            return [];
        }
    }
    /**
     * 获取所有 MCP 服务器配置
     */
    getAllMCPServers() {
        try {
            const config = this.getConfig();
            return config.mcp || {};
        }
        catch {
            return {};
        }
    }
    /**
     * 加载自定义本地模型配置到 OpenCode (OpenAI-compatible API)
     * 支持 LM Studio, Ollama, vLLM, LocalAI 等本地推理服务
     */
    loadLocalModelConfig(localConfig) {
        const { providerName, npm, models, baseURL, apiKey } = localConfig;
        const currentConfig = this.getConfig();

        // 移除旧的 coding-plan provider 和旧的同名 local provider
        const { provider: oldProvider, ...restConfig } = currentConfig;
        const newProvider = {};

        if (oldProvider) {
            for (const [key, value] of Object.entries(oldProvider)) {
                // 移除旧的 coding-plan 和 local-model provider
                if (key !== 'zhipuai-coding-plan' && key !== 'zai-coding-plan' && key !== providerName) {
                    newProvider[key] = value;
                }
            }
        }

        // 构造本地模型 provider 配置
        const modelEntries = {};
        for (const [modelName, modelInfo] of Object.entries(models)) {
            modelEntries[modelName] = { name: modelInfo.name || modelName };
        }

        newProvider[providerName] = {
            name: providerName,
            npm: npm || '@ai-sdk/openai-compatible',
            models: modelEntries,
            options: {
                baseURL: baseURL,
                apiKey: apiKey || 'no-key'
            }
        };

        // 使用第一个模型作为默认
        const firstModel = Object.keys(models)[0];

        const newConfig = {
            $schema: 'https://opencode.ai/config.json',
            ...restConfig,
            provider: newProvider,
            model: `${providerName}/${firstModel}`,
        };

        this.saveConfig(newConfig);
    }

    /**
     * 卸载自定义本地模型配置
     */
    unloadLocalModelConfig(providerName) {
        const currentConfig = this.getConfig();
        if (currentConfig.provider && currentConfig.provider[providerName]) {
            delete currentConfig.provider[providerName];
            if (Object.keys(currentConfig.provider).length === 0) {
                delete currentConfig.provider;
            }
        }
        // 清理 model 字段（如果指向该 provider）
        if (currentConfig.model && currentConfig.model.startsWith(`${providerName}/`)) {
            delete currentConfig.model;
        }
        if (currentConfig.small_model && currentConfig.small_model.startsWith(`${providerName}/`)) {
            delete currentConfig.small_model;
        }
        this.saveConfig(currentConfig);
    }

    /**
     * 通用方法：加载任意 provider 配置到 OpenCode
     * 支持 openai, deepseek, lm_studio 等任意 provider
     */
    loadProviderConfig(providerId, providerDef, userConfig) {
        const currentConfig = this.getConfig();

        // 保留现有 provider 中不属于 GLM coding-plan 且不是当前 providerId 的条目
        const { provider: oldProvider, ...restConfig } = currentConfig;
        const newProvider = {};

        if (oldProvider) {
            for (const [key, value] of Object.entries(oldProvider)) {
                if (key !== 'zhipuai-coding-plan' && key !== 'zai-coding-plan' && key !== providerId) {
                    newProvider[key] = value;
                }
            }
        }

        // 构造 models 映射
        const modelsMap = {};
        if (userConfig.models && Object.keys(userConfig.models).length > 0) {
            // 用户自定义了 models
            for (const [modelId, modelInfo] of Object.entries(userConfig.models)) {
                modelsMap[modelId] = { name: modelInfo.name || modelId };
            }
        } else if (providerDef.models) {
            // 使用 providerDef 中定义的默认 models
            for (const [modelId, modelInfo] of Object.entries(providerDef.models)) {
                modelsMap[modelId] = { name: modelInfo.name || modelId };
            }
        }

        // 支持 customModelName：如果用户指定了自定义模型名称
        if (userConfig.customModelName && Object.keys(modelsMap).length === 0) {
            modelsMap[userConfig.customModelName] = { name: userConfig.customModelName };
        }

        // 添加新 provider
        newProvider[providerId] = {
            name: providerDef.name || providerId,
            npm: providerDef.npm,
            models: modelsMap,
            options: {
                baseURL: userConfig.baseURL || providerDef.baseURL,
                apiKey: userConfig.apiKey || 'no-key'
            }
        };

        // 使用第一个模型作为默认 model
        const firstModel = Object.keys(modelsMap)[0];

        const newConfig = {
            $schema: 'https://opencode.ai/config.json',
            ...restConfig,
            provider: newProvider,
            model: `${providerId}/${firstModel}`,
        };

        // 如果 providerDef 有 smallModel，设置 small_model
        if (providerDef.smallModel) {
            newConfig.small_model = `${providerId}/${providerDef.smallModel}`;
        }

        this.saveConfig(newConfig);
    }

    /**
     * 通用方法：卸载指定 provider 配置
     */
    unloadProviderConfig(providerId) {
        const currentConfig = this.getConfig();

        // 删除 provider[providerId]
        if (currentConfig.provider && currentConfig.provider[providerId]) {
            delete currentConfig.provider[providerId];
            // 如果 provider 为空，删除 provider 字段
            if (Object.keys(currentConfig.provider).length === 0) {
                delete currentConfig.provider;
            }
        }

        // 清理 model 字段（如果指向该 provider）
        if (currentConfig.model && currentConfig.model.startsWith(`${providerId}/`)) {
            delete currentConfig.model;
        }

        // 清理 small_model 字段（如果指向该 provider）
        if (currentConfig.small_model && currentConfig.small_model.startsWith(`${providerId}/`)) {
            delete currentConfig.small_model;
        }

        this.saveConfig(currentConfig);
    }

    /**
     * 检测当前 OpenCode 配置的套餐和 API Key
     */
    detectCurrentConfig() {
        try {
            const config = this.getConfig();
            if (!config.provider) {
                return { providerId: null, apiKey: null, modelName: null };
            }
            // Check GLM coding-plan aliases first
            if (config.provider['zai-coding-plan']) {
                return {
                    providerId: 'glm_coding_plan_global',
                    apiKey: config.provider['zai-coding-plan'].options?.apiKey || null,
                    modelName: config.model?.replace('zai-coding-plan/', '') || null
                };
            }
            if (config.provider['zhipuai-coding-plan']) {
                return {
                    providerId: 'glm_coding_plan_china',
                    apiKey: config.provider['zhipuai-coding-plan'].options?.apiKey || null,
                    modelName: config.model?.replace('zhipuai-coding-plan/', '') || null
                };
            }
            // Scan other providers: match known provider IDs
            const knownProviderIds = ['openai', 'anthropic', 'deepseek', 'google_gemini',
                'siliconflow', 'dashscope', 'lm_studio', 'ollama', 'vllm', 'custom_local'];
            for (const [key, value] of Object.entries(config.provider)) {
                if (knownProviderIds.includes(key)) {
                    return {
                        providerId: key,
                        apiKey: value.options?.apiKey || null,
                        modelName: config.model?.replace(`${key}/`, '') || null
                    };
                }
            }
            // Unknown provider key — still return it
            const firstKey = Object.keys(config.provider)[0];
            if (firstKey) {
                const val = config.provider[firstKey];
                return {
                    providerId: firstKey,
                    apiKey: val.options?.apiKey || null,
                    modelName: config.model?.replace(`${firstKey}/`, '') || null
                };
            }
            return { providerId: null, apiKey: null, modelName: null };
        }
        catch {
            return { providerId: null, apiKey: null, modelName: null };
        }
    }
}
export const openCodeManager = OpenCodeManager.getInstance();
