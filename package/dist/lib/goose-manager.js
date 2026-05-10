import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

const CONFIG_DIR = join(homedir(), '.config', 'goose');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

export class GooseManager {
    static instance;
    configPath;

    constructor() {
        this.configPath = CONFIG_FILE;
    }

    static getInstance() {
        if (!GooseManager.instance) {
            GooseManager.instance = new GooseManager();
        }
        return GooseManager.instance;
    }

    ensureConfigDir() {
        if (!existsSync(CONFIG_DIR)) {
            mkdirSync(CONFIG_DIR, { recursive: true });
        }
    }

    parseYAML(content) {
        const result = {};
        let currentExtName = null;
        let currentExtProps = {};
        let inExtensions = false;

        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // 检测 extensions: 块（顶层，无缩进）
            if (/^extensions:/.test(trimmed)) {
                inExtensions = true;
                result.extensions = {};
                continue;
            }

            // 顶层键值对（非 extensions 块内）
            const topMatch = trimmed.match(/^([A-Z_]+):\s*(.*)$/);
            if (topMatch && !inExtensions) {
                const key = topMatch[1];
                let value = topMatch[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                result[key] = value;
                continue;
            }

            // extensions 块内的处理
            if (inExtensions) {
                // 新的扩展条目（2空格缩进的名称:）
                const extMatch = trimmed.match(/^(\w[\w-]*):\s*$/);
                if (extMatch) {
                    // 保存上一个扩展
                    if (currentExtName) {
                        result.extensions[currentExtName] = currentExtProps;
                    }
                    currentExtName = extMatch[1];
                    currentExtProps = {};
                    continue;
                }

                // 扩展属性（4空格缩进的 key: value）
                if (currentExtName) {
                    const propMatch = trimmed.match(/^(\w+):\s*(.*)$/);
                    if (propMatch) {
                        let propVal = propMatch[2].trim();
                        if (propVal.startsWith('"') && propVal.endsWith('"')) propVal = propVal.slice(1, -1);
                        else if (propVal.startsWith("'") && propVal.endsWith("'")) propVal = propVal.slice(1, -1);
                        if (propVal === 'true') propVal = true;
                        else if (propVal === 'false') propVal = false;
                        else if (propVal.startsWith('[')) {
                            try { propVal = JSON.parse(propVal.replace(/'/g, '"')); } catch { /* keep as string */ }
                        }
                        currentExtProps[propMatch[1]] = propVal;
                    }
                }

                // 检查是否离开了 extensions 块（非缩进行，且不是属性）
                if (!trimmed.startsWith(' ') && !trimmed.match(/^\w+:/)) {
                    inExtensions = false;
                    if (currentExtName) {
                        result.extensions[currentExtName] = currentExtProps;
                        currentExtName = null;
                        currentExtProps = {};
                    }
                }
            }
        }

        // 保存最后一个扩展
        if (currentExtName) {
            result.extensions[currentExtName] = currentExtProps;
        }

        return result;
    }

    toYAML(config) {
        const lines = ['# Goose configuration - managed by chelper'];

        for (const [key, value] of Object.entries(config)) {
            if (value === null || value === undefined) continue;

            if (key === 'extensions' && typeof value === 'object' && !Array.isArray(value)) {
                lines.push('extensions:');
                for (const [extName, extConfig] of Object.entries(value)) {
                    lines.push(`  ${extName}:`);
                    if (typeof extConfig === 'object') {
                        for (const [prop, propVal] of Object.entries(extConfig)) {
                            if (propVal === null || propVal === undefined) continue;
                            if (Array.isArray(propVal)) {
                                lines.push(`    ${prop}: ${JSON.stringify(propVal)}`);
                            } else if (typeof propVal === 'boolean') {
                                lines.push(`    ${prop}: ${propVal}`);
                            } else if (typeof propVal === 'string' && (propVal.includes(' ') || propVal.includes(':'))) {
                                lines.push(`    ${prop}: "${propVal}"`);
                            } else {
                                lines.push(`    ${prop}: ${propVal}`);
                            }
                        }
                    }
                }
            } else if (typeof value === 'boolean') {
                lines.push(`${key}: ${value}`);
            } else if (typeof value === 'string' && (value.includes(' ') || value.includes(':') || value.includes('#'))) {
                lines.push(`${key}: "${value}"`);
            } else {
                lines.push(`${key}: ${value}`);
            }
        }
        return lines.join('\n') + '\n';
    }

    getConfig() {
        try {
            if (existsSync(CONFIG_FILE)) {
                const content = readFileSync(CONFIG_FILE, 'utf-8');
                return this.parseYAML(content);
            }
        } catch (error) {
            logger.logError('GooseManager.getConfig', error);
        }
        return {};
    }

    saveConfig(config) {
        try {
            this.ensureConfigDir();
            writeFileSync(CONFIG_FILE, this.toYAML(config), 'utf-8');
        } catch (error) {
            throw new Error(`Failed to save Goose config: ${error}`);
        }
    }

    detectCurrentConfig() {
        try {
            const config = this.getConfig();
            const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || null;
            const model = config.GOOSE_MODEL || process.env.GOOSE_MODEL || null;
            const provider = config.GOOSE_PROVIDER || process.env.GOOSE_PROVIDER || null;
            const host = config.OPENAI_HOST || process.env.OPENAI_HOST || null;

            if (host) {
                if (host.includes('z.ai')) {
                    return { providerId: 'glm_coding_plan_global', apiKey, modelName: model };
                }
                if (host.includes('bigmodel.cn')) {
                    return { providerId: 'glm_coding_plan_china', apiKey, modelName: model };
                }
            }

            if (apiKey || model || provider) {
                return { providerId: provider, apiKey, modelName: model };
            }

            return { providerId: null, apiKey: null, modelName: null };
        } catch {
            return { providerId: null, apiKey: null, modelName: null };
        }
    }

    loadGLMConfig(plan, apiKey) {
        const baseURL = plan === 'glm_coding_plan_global'
            ? 'https://open.zai.chat/v1'
            : 'https://open.bigmodel.cn/api/paas/v4';
        const currentConfig = this.getConfig();
        this.saveConfig({
            ...currentConfig,
            GOOSE_PROVIDER: 'openai',
            GOOSE_MODEL: 'glm-4-plus',
            OPENAI_HOST: baseURL,
            OPENAI_API_KEY: apiKey
        });
    }

    unloadGLMConfig() {
        const currentConfig = this.getConfig();
        delete currentConfig.GOOSE_PROVIDER;
        delete currentConfig.GOOSE_MODEL;
        delete currentConfig.OPENAI_HOST;
        delete currentConfig.OPENAI_API_KEY;
        this.saveConfig(currentConfig);
    }

    loadProviderConfig(providerId, providerDef, userConfig) {
        const currentConfig = this.getConfig();
        const baseURL = userConfig.baseURL || providerDef.baseURL;
        const modelName = userConfig.selectedModel || userConfig.customModelName || providerDef.defaultModel;

        this.saveConfig({
            ...currentConfig,
            GOOSE_PROVIDER: 'openai',
            GOOSE_MODEL: modelName,
            OPENAI_HOST: baseURL,
            ...(userConfig.apiKey ? { OPENAI_API_KEY: userConfig.apiKey } : {})
        });
    }

    unloadProviderConfig(providerId) {
        this.unloadGLMConfig();
    }

    isMCPInstalled(mcpId) {
        try {
            const config = this.getConfig();
            const extensions = config.extensions || {};
            return mcpId in extensions;
        } catch {
            return false;
        }
    }

    installMCP(mcp, apiKey, plan) {
        try {
            const config = this.getConfig();
            if (!config.extensions) {
                config.extensions = {};
            }

            let extConfig = {
                name: mcp.name || mcp.id,
                enabled: true,
                timeout: 300
            };

            if (mcp.protocol === 'stdio') {
                extConfig.type = 'stdio';
                extConfig.cmd = mcp.command || 'npx';
                extConfig.args = mcp.args || [];

                let envs = {};
                if (mcp.envTemplate && plan) {
                    envs = { ...(mcp.envTemplate[plan] || {}) };
                } else if (mcp.env) {
                    envs = { ...mcp.env };
                }
                if (mcp.requiresAuth && apiKey) {
                    envs.Z_AI_API_KEY = apiKey;
                }
                if (mcp.requiresApiKey && mcp.apiKeyEnvName && mcp.env) {
                    envs = { ...envs, ...mcp.env };
                }
                if (Object.keys(envs).length > 0) {
                    extConfig.envs = envs;
                }
            } else {
                extConfig.type = 'streamable_http';
                if (mcp.urlTemplate && plan) {
                    extConfig.url = mcp.urlTemplate[plan];
                } else if (mcp.url) {
                    extConfig.url = mcp.url;
                }
            }

            config.extensions[mcp.id] = extConfig;
            this.saveConfig(config);
        } catch (error) {
            throw new Error(`Failed to install MCP ${mcp.name}: ${error}`);
        }
    }

    uninstallMCP(mcpId) {
        try {
            const config = this.getConfig();
            if (config.extensions) {
                delete config.extensions[mcpId];
            }
            this.saveConfig(config);
        } catch (error) {
            throw new Error(`Failed to uninstall MCP ${mcpId}: ${error}`);
        }
    }

    getInstalledMCPs() {
        try {
            const config = this.getConfig();
            return Object.keys(config.extensions || {});
        } catch {
            return [];
        }
    }

    getMCPStatus(mcpServices) {
        const status = new Map();
        for (const mcp of mcpServices) {
            status.set(mcp.id, this.isMCPInstalled(mcp.id));
        }
        return status;
    }

    getOtherMCPs(builtinIds) {
        try {
            const config = this.getConfig();
            const extensions = config.extensions || {};
            const result = [];
            for (const [id, extConfig] of Object.entries(extensions)) {
                if (!builtinIds.includes(id)) {
                    result.push({ id, config: extConfig });
                }
            }
            return result;
        } catch {
            return [];
        }
    }

    getAllMCPServers() {
        try {
            const config = this.getConfig();
            return config.extensions || {};
        } catch {
            return {};
        }
    }
}

export const gooseManager = GooseManager.getInstance();
