import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

const CONFIG_DIR = join(homedir(), '.codex');
const CONFIG_FILE = join(CONFIG_DIR, 'config.toml');

export class CodexCliManager {
    static instance;

    constructor() {
        this.configPath = CONFIG_FILE;
    }

    static getInstance() {
        if (!CodexCliManager.instance) {
            CodexCliManager.instance = new CodexCliManager();
        }
        return CodexCliManager.instance;
    }

    ensureConfigDir() {
        if (!existsSync(CONFIG_DIR)) {
            mkdirSync(CONFIG_DIR, { recursive: true });
        }
    }

    // ─── 简易 TOML 解析器 ────────────────────────────────────

    parseTOML(content) {
        const result = {};
        let currentSection = null;

        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // [section.subsection]
            const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                const parts = currentSection.split('.');
                let obj = result;
                for (const part of parts) {
                    if (!obj[part]) obj[part] = {};
                    obj = obj[part];
                }
                continue;
            }

            // key = "value" 或 key = value
            const kvMatch = trimmed.match(/^(\w[\w.-]*)\s*=\s*(.+)$/);
            if (kvMatch) {
                const key = kvMatch[1];
                let value = kvMatch[2].trim();

                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                } else if (value === 'true') {
                    value = true;
                } else if (value === 'false') {
                    value = false;
                } else if (/^\d+$/.test(value)) {
                    value = parseInt(value, 10);
                } else if (/^\d+\.\d+$/.test(value)) {
                    value = parseFloat(value);
                }

                if (currentSection) {
                    const parts = currentSection.split('.');
                    let obj = result;
                    for (const part of parts) {
                        if (!obj[part]) obj[part] = {};
                        obj = obj[part];
                    }
                    obj[key] = value;
                } else {
                    result[key] = value;
                }
            }
        }
        return result;
    }

    toTOML(config) {
        const lines = [];
        const topLevel = {};
        const sections = {};

        for (const [key, value] of Object.entries(config)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                sections[key] = value;
            } else if (value !== undefined && value !== null) {
                topLevel[key] = value;
            }
        }

        for (const [key, value] of Object.entries(topLevel)) {
            lines.push(`${key} = ${this.formatTOMLValue(value)}`);
        }

        for (const [section, value] of Object.entries(sections)) {
            if (lines.length > 0) lines.push('');
            this.flattenSection(section, value, lines);
        }

        return lines.join('\n') + '\n';
    }

    flattenSection(path, obj, lines) {
        const subSections = {};
        const flatKeys = {};

        for (const [key, value] of Object.entries(obj)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                subSections[key] = value;
            } else if (value !== undefined && value !== null) {
                flatKeys[key] = value;
            }
        }

        if (Object.keys(flatKeys).length > 0) {
            lines.push(`[${path}]`);
            for (const [key, value] of Object.entries(flatKeys)) {
                lines.push(`${key} = ${this.formatTOMLValue(value)}`);
            }
        }

        for (const [key, value] of Object.entries(subSections)) {
            this.flattenSection(`${path}.${key}`, value, lines);
        }
    }

    formatTOMLValue(value) {
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'string') {
            if (value.includes('"') || value.includes('\n')) {
                return `'${value}'`;
            }
            return `"${value}"`;
        }
        if (Array.isArray(value)) {
            return `[${value.map(v => this.formatTOMLValue(v)).join(', ')}]`;
        }
        return String(value);
    }

    // ─── 配置读写 ─────────────────────────────────────────────

    getConfig() {
        try {
            if (existsSync(CONFIG_FILE)) {
                const content = readFileSync(CONFIG_FILE, 'utf-8');
                return this.parseTOML(content);
            }
        } catch (error) {
            logger.logError('CodexCliManager.getConfig', error);
        }
        return {};
    }

    saveConfig(config) {
        try {
            this.ensureConfigDir();
            writeFileSync(CONFIG_FILE, this.toTOML(config), 'utf-8');
        } catch (error) {
            throw new Error(`Failed to save Codex CLI config: ${error}`);
        }
    }

    detectCurrentConfig() {
        try {
            const config = this.getConfig();
            const model = config.model || null;
            const modelProvider = config.model_provider || null;
            const apiKey = process.env.OPENAI_API_KEY || null;

            // 检查自定义 model_providers
            if (modelProvider && config.model_providers && config.model_providers[modelProvider]) {
                const provider = config.model_providers[modelProvider];
                return {
                    providerId: null,
                    apiKey,
                    modelName: model,
                    customProvider: provider.name || modelProvider,
                    baseURL: provider.base_url || null
                };
            }

            return { providerId: null, apiKey, modelName: model };
        } catch {
            return { providerId: null, apiKey: null, modelName: null };
        }
    }

    loadGLMConfig(plan, apiKey) {
        const baseUrl = plan === 'glm_coding_plan_global'
            ? 'https://open.zai.chat/v1'
            : 'https://open.bigmodel.cn/api/paas/v4';
        const currentConfig = this.getConfig();

        this.saveConfig({
            ...currentConfig,
            model: 'glm-4-plus',
            model_provider: 'glm',
            model_providers: {
                ...(currentConfig.model_providers || {}),
                glm: {
                    name: 'GLM Coding Plan',
                    base_url: baseUrl,
                    env_key: 'OPENAI_API_KEY'
                }
            }
        });

        console.log(`\n  Note: Set environment variable for GLM:`);
        console.log(`    export OPENAI_API_KEY=${apiKey}`);
    }

    unloadGLMConfig() {
        const currentConfig = this.getConfig();
        delete currentConfig.model;
        if (currentConfig.model_provider === 'glm') {
            delete currentConfig.model_provider;
        }
        if (currentConfig.model_providers && currentConfig.model_providers.glm) {
            delete currentConfig.model_providers.glm;
        }
        this.saveConfig(currentConfig);
    }

    loadProviderConfig(providerId, providerDef, userConfig) {
        const currentConfig = this.getConfig();
        const modelName = userConfig.selectedModel || userConfig.customModelName || providerDef.defaultModel;
        const baseURL = userConfig.baseURL || providerDef.baseURL;
        const providerKey = `chelper_${providerId}`;

        this.saveConfig({
            ...currentConfig,
            model: modelName,
            model_provider: providerKey,
            model_providers: {
                ...(currentConfig.model_providers || {}),
                [providerKey]: {
                    name: providerDef.name,
                    base_url: baseURL,
                    env_key: 'OPENAI_API_KEY'
                }
            }
        });

        if (userConfig.apiKey) {
            console.log(`\n  Note: Set environment variable for ${providerDef.name}:`);
            console.log(`    export OPENAI_API_KEY=${userConfig.apiKey}`);
        }
    }

    unloadProviderConfig(providerId) {
        const currentConfig = this.getConfig();
        const providerKey = `chelper_${providerId}`;
        if (currentConfig.model_provider === providerKey) {
            delete currentConfig.model_provider;
        }
        if (currentConfig.model_providers && currentConfig.model_providers[providerKey]) {
            delete currentConfig.model_providers[providerKey];
        }
        this.saveConfig(currentConfig);
    }

    // ─── MCP 管理 ─────────────────────────────────────────────

    isMCPInstalled(mcpId) {
        const config = this.getConfig();
        return !!(config.mcp_servers && config.mcp_servers[mcpId]);
    }

    installMCP(mcp, apiKey, plan) {
        const config = this.getConfig();
        if (!config.mcp_servers) {
            config.mcp_servers = {};
        }

        if (mcp.protocol === 'stdio') {
            let envVars = [];
            if (mcp.requiresApiKey && mcp.apiKeyEnvName) {
                envVars.push(mcp.apiKeyEnvName);
            }
            if (mcp.requiresAuth && apiKey) {
                envVars.push('Z_AI_API_KEY');
            }

            config.mcp_servers[mcp.id] = {
                command: mcp.command,
                args: mcp.args
            };
            if (envVars.length > 0) {
                config.mcp_servers[mcp.id].env_vars = envVars;
            }
        } else if (mcp.protocol === 'sse' || mcp.protocol === 'streamable-http') {
            let url = '';
            if (mcp.urlTemplate && plan) {
                url = mcp.urlTemplate[plan];
            } else if (mcp.url) {
                url = mcp.url;
            }
            config.mcp_servers[mcp.id] = { url };
            if (apiKey && mcp.requiresAuth) {
                config.mcp_servers[mcp.id].http_headers = {
                    'Authorization': `Bearer ${apiKey}`
                };
            }
        }

        this.saveConfig(config);
    }

    uninstallMCP(mcpId) {
        const config = this.getConfig();
        if (config.mcp_servers && config.mcp_servers[mcpId]) {
            delete config.mcp_servers[mcpId];
            this.saveConfig(config);
        }
    }

    getInstalledMCPs() {
        const config = this.getConfig();
        if (!config.mcp_servers) return [];
        return Object.keys(config.mcp_servers);
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
        if (!config.mcp_servers) return [];
        return Object.keys(config.mcp_servers).filter(id => !builtinIds.includes(id));
    }

    getAllMCPServers() {
        const config = this.getConfig();
        return config.mcp_servers || {};
    }
}

export const codexCliManager = CodexCliManager.getInstance();
