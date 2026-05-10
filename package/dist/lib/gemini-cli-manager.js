import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

const CONFIG_DIR = join(homedir(), '.gemini');
const CONFIG_FILE = join(CONFIG_DIR, 'settings.json');

export class GeminiCliManager {
    static instance;

    constructor() {
        this.configPath = CONFIG_FILE;
    }

    static getInstance() {
        if (!GeminiCliManager.instance) {
            GeminiCliManager.instance = new GeminiCliManager();
        }
        return GeminiCliManager.instance;
    }

    ensureConfigDir() {
        if (!existsSync(CONFIG_DIR)) {
            mkdirSync(CONFIG_DIR, { recursive: true });
        }
    }

    getConfig() {
        try {
            if (existsSync(CONFIG_FILE)) {
                const content = readFileSync(CONFIG_FILE, 'utf-8');
                return JSON.parse(content);
            }
        } catch (error) {
            logger.logError('GeminiCliManager.getConfig', error);
        }
        return {};
    }

    saveConfig(config) {
        try {
            this.ensureConfigDir();
            writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
        } catch (error) {
            throw new Error(`Failed to save Gemini CLI config: ${error}`);
        }
    }

    detectCurrentConfig() {
        try {
            const config = this.getConfig();
            const authType = config.security?.auth?.selectedType;
            const mcpServers = config.mcpServers || {};
            const hasApiKey = authType === 'gemini-api-key' || authType === 'api-key';

            // 检查是否有自定义 MCP server 配置（可能指向第三方 provider）
            const model = process.env.GEMINI_MODEL || null;

            return {
                providerId: null,
                apiKey: hasApiKey ? '(configured)' : null,
                modelName: model,
                mcpCount: Object.keys(mcpServers).length
            };
        } catch {
            return { providerId: null, apiKey: null, modelName: null };
        }
    }

    loadGLMConfig(plan, apiKey) {
        // Gemini CLI 不直接支持 OpenAI-compatible API
        // 但可以通过 MCP server 或环境变量间接配置
        // 设置 GEMINI_API_KEY 环境变量方式
        const currentConfig = this.getConfig();
        this.saveConfig({
            ...currentConfig,
            security: {
                ...(currentConfig.security || {}),
                auth: {
                    ...(currentConfig.security?.auth || {}),
                    selectedType: 'gemini-api-key'
                }
            }
        });
        // 提示用户需要设置环境变量
        console.log(`\n  Note: Gemini CLI uses Google's Gemini API. To use GLM, set:
    export GEMINI_API_KEY=${apiKey}
    export GEMINI_MODEL=glm-4-plus`);
    }

    unloadGLMConfig() {
        const currentConfig = this.getConfig();
        if (currentConfig.security?.auth) {
            delete currentConfig.security.auth.selectedType;
        }
        this.saveConfig(currentConfig);
    }

    loadProviderConfig(providerId, providerDef, userConfig) {
        // Gemini CLI 主要使用 Gemini API
        // 对于非 Gemini providers，通过环境变量和配置设置
        const currentConfig = this.getConfig();

        if (providerId === 'gemini' || providerId === 'google') {
            this.saveConfig({
                ...currentConfig,
                security: {
                    ...(currentConfig.security || {}),
                    auth: {
                        ...(currentConfig.security?.auth || {}),
                        selectedType: 'gemini-api-key'
                    }
                }
            });
        } else {
            // OpenAI-compatible: Gemini CLI 不原生支持，提示使用环境变量
            this.saveConfig({
                ...currentConfig,
                security: {
                    ...(currentConfig.security || {}),
                    auth: {
                        ...(currentConfig.security?.auth || {}),
                        selectedType: 'api-key'
                    }
                }
            });
            if (userConfig.apiKey) {
                console.log(`\n  Note: Set environment variables for ${providerDef.name}:`);
                console.log(`    export GEMINI_API_KEY=${userConfig.apiKey}`);
            }
        }
    }

    unloadProviderConfig(providerId) {
        this.unloadGLMConfig();
    }

    // ─── MCP 管理 ─────────────────────────────────────────────

    isMCPInstalled(mcpId) {
        const config = this.getConfig();
        return !!(config.mcpServers && config.mcpServers[mcpId]);
    }

    installMCP(mcp, apiKey, plan) {
        const config = this.getConfig();
        if (!config.mcpServers) {
            config.mcpServers = {};
        }

        if (mcp.protocol === 'stdio') {
            let env = {};
            if (mcp.envTemplate && plan) {
                env = { ...(mcp.envTemplate[plan] || {}) };
            } else if (mcp.env) {
                env = { ...mcp.env };
            }
            if (mcp.requiresAuth && apiKey) {
                env.Z_AI_API_KEY = apiKey;
            }
            config.mcpServers[mcp.id] = {
                type: 'stdio',
                command: mcp.command,
                args: mcp.args,
                env
            };
        } else if (mcp.protocol === 'sse' || mcp.protocol === 'streamable-http') {
            let url = '';
            if (mcp.urlTemplate && plan) {
                url = mcp.urlTemplate[plan];
            } else if (mcp.url) {
                url = mcp.url;
            }
            config.mcpServers[mcp.id] = {
                type: mcp.protocol,
                url: url,
                headers: {
                    ...(mcp.headers || {}),
                    ...(apiKey && mcp.requiresAuth ? { 'Authorization': `Bearer ${apiKey}` } : {})
                }
            };
        }

        this.saveConfig(config);
    }

    uninstallMCP(mcpId) {
        const config = this.getConfig();
        if (config.mcpServers && config.mcpServers[mcpId]) {
            delete config.mcpServers[mcpId];
            this.saveConfig(config);
        }
    }

    getInstalledMCPs() {
        const config = this.getConfig();
        if (!config.mcpServers) return [];
        return Object.keys(config.mcpServers);
    }

    getMCPStatus(mcpServices) {
        const status = new Map();
        for (const mcp of mcpServices) {
            status.set(mcp.id, this.isMCPInstalled(mcp.id));
        }
        return status;
    }

    getOtherMCPs(builtinIds) {
        const config = this.getConfig();
        if (!config.mcpServers) return [];
        return Object.keys(config.mcpServers).filter(id => !builtinIds.includes(id));
    }

    getAllMCPServers() {
        const config = this.getConfig();
        return config.mcpServers || {};
    }
}

export const geminiCliManager = GeminiCliManager.getInstance();
