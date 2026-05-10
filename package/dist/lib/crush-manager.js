import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';
export class CrushManager {
    static instance;
    configPath;
    constructor() {
        // Crush 配置文件路径
        // ~/.config/crush/crush.json
        this.configPath = join(homedir(), '.config', 'crush', 'crush.json');
    }
    static getInstance() {
        if (!CrushManager.instance) {
            CrushManager.instance = new CrushManager();
        }
        return CrushManager.instance;
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
            console.warn('Failed to read Crush config:', error);
            logger.logError('CrushManager.getConfig', error);
        }
        return {};
    }
    /**
     * 保存配置
     */
    saveConfig(config) {
        try {
            this.ensureConfigDir();
            writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to save Crush config: ${error}`);
        }
    }
    /**
     * 获取 base_url（根据套餐类型）
     */
    getBaseUrl(plan) {
        return plan === 'glm_coding_plan_global'
            ? 'https://api.z.ai/api/coding/paas/v4'
            : 'https://open.bigmodel.cn/api/coding/paas/v4';
    }
    /**
     * 加载 GLM Coding Plan 配置到 Crush
     */
    loadGLMConfig(plan, apiKey) {
        const currentConfig = this.getConfig();
        const baseUrl = this.getBaseUrl(plan);
        const newConfig = {
            ...currentConfig,
            providers: {
                ...(currentConfig.providers || {}),
                zai: {
                    id: 'zai',
                    name: 'ZAI Provider',
                    base_url: baseUrl,
                    api_key: apiKey
                }
            }
        };
        this.saveConfig(newConfig);
    }
    /**
     * 卸载 GLM Coding Plan 配置
     */
    unloadGLMConfig() {
        const currentConfig = this.getConfig();
        // 移除 providers 中的 zai 配置
        if (currentConfig.providers) {
            delete currentConfig.providers['zai'];
            // 如果 providers 为空，删除 providers 字段
            if (Object.keys(currentConfig.providers).length === 0) {
                delete currentConfig.providers;
            }
        }
        this.saveConfig(currentConfig);
    }
    /**
     * 加载通用 Provider 配置到 Crush
     */
    loadProviderConfig(providerId, providerDef, userConfig) {
        const currentConfig = this.getConfig();
        // 保留 providers 中非 zai 且非当前 providerId 的条目
        const existingProviders = currentConfig.providers || {};
        const filteredProviders = {};
        for (const [key, value] of Object.entries(existingProviders)) {
            if (key !== 'zai' && key !== providerId) {
                filteredProviders[key] = value;
            }
        }
        const newConfig = {
            ...currentConfig,
            providers: {
                ...filteredProviders,
                [providerId]: {
                    id: providerId,
                    name: providerDef.name,
                    base_url: userConfig.baseURL || providerDef.baseURL,
                    api_key: userConfig.apiKey || 'no-key'
                }
            }
        };
        this.saveConfig(newConfig);
    }
    /**
     * 卸载通用 Provider 配置
     */
    unloadProviderConfig(providerId) {
        if (providerId === 'zai') {
            return this.unloadGLMConfig();
        }
        const currentConfig = this.getConfig();
        if (currentConfig.providers) {
            delete currentConfig.providers[providerId];
            if (Object.keys(currentConfig.providers).length === 0) {
                delete currentConfig.providers;
            }
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
                mcpConfig = {
                    type: 'stdio',
                    command: mcp.command || 'npx',
                    args: mcp.args || [],
                    env
                };
            }
            else if (mcp.protocol === 'sse' || mcp.protocol === 'streamable-http') {
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
                // Crush 使用 http 类型
                mcpConfig = {
                    type: mcp.protocol === 'sse' ? 'sse' : 'http',
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
     * 检测当前 Crush 配置的套餐和 API Key
     */
    detectCurrentConfig() {
        try {
            const config = this.getConfig();
            if (!config.providers || Object.keys(config.providers).length === 0) {
                return { providerId: null, apiKey: null, modelName: null };
            }
            // Check for GLM (stored under 'zai' key)
            if (config.providers['zai']) {
                const zai = config.providers['zai'];
                const baseUrl = zai.base_url;
                if (baseUrl?.includes('z.ai')) {
                    return { providerId: 'glm_coding_plan_global', apiKey: zai.api_key || null, modelName: null };
                }
                if (baseUrl?.includes('bigmodel.cn')) {
                    return { providerId: 'glm_coding_plan_china', apiKey: zai.api_key || null, modelName: null };
                }
            }
            // Check for known provider IDs
            const knownProviderIds = ['openai', 'anthropic', 'deepseek', 'google_gemini',
                'siliconflow', 'dashscope', 'lm_studio', 'ollama', 'vllm', 'custom_local'];
            for (const [key, value] of Object.entries(config.providers)) {
                if (key === 'zai') continue;
                if (knownProviderIds.includes(key)) {
                    return { providerId: key, apiKey: value.api_key || null, modelName: null };
                }
            }
            // Fallback: return first non-zai provider
            const firstKey = Object.keys(config.providers).find(k => k !== 'zai');
            if (firstKey) {
                return {
                    providerId: firstKey,
                    apiKey: config.providers[firstKey].api_key || null,
                    modelName: null
                };
            }
            return { providerId: null, apiKey: null, modelName: null };
        }
        catch {
            return { providerId: null, apiKey: null, modelName: null };
        }
    }
}
export const crushManager = CrushManager.getInstance();
