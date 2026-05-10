import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

const CONFIG_DIR = join(homedir(), '.aider');
const CONFIG_FILE = join(CONFIG_DIR, 'aider.conf.yml');

export class AiderManager {
    static instance;
    configPath;

    constructor() {
        this.configPath = CONFIG_FILE;
    }

    static getInstance() {
        if (!AiderManager.instance) {
            AiderManager.instance = new AiderManager();
        }
        return AiderManager.instance;
    }

    ensureConfigDir() {
        if (!existsSync(CONFIG_DIR)) {
            mkdirSync(CONFIG_DIR, { recursive: true });
        }
    }

    parseYAML(content) {
        const result = {};
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const match = trimmed.match(/^(\w+):\s*(.*)$/);
            if (match) {
                const key = match[1];
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                result[key] = value;
            }
        }
        return result;
    }

    toYAML(config) {
        const lines = ['# Aider configuration - managed by chelper'];
        for (const [key, value] of Object.entries(config)) {
            if (value === null || value === undefined) continue;
            if (typeof value === 'boolean') {
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
            // 优先读取 ~/.aider/aider.conf.yml，回退到项目根目录的 .aider.conf.yml
            if (existsSync(CONFIG_FILE)) {
                const content = readFileSync(CONFIG_FILE, 'utf-8');
                return this.parseYAML(content);
            }
        } catch (error) {
            logger.logError('AiderManager.getConfig', error);
        }
        return {};
    }

    saveConfig(config) {
        try {
            this.ensureConfigDir();
            writeFileSync(CONFIG_FILE, this.toYAML(config), 'utf-8');
        } catch (error) {
            throw new Error(`Failed to save Aider config: ${error}`);
        }
    }

    detectCurrentConfig() {
        try {
            const config = this.getConfig();
            const apiKey = process.env.OPENAI_API_KEY || config['api-key'] || null;
            const model = config.model || null;

            // 尝试通过 model 前缀推断 provider
            if (config['openai-api-base']) {
                const baseUrl = config['openai-api-base'];
                if (baseUrl.includes('z.ai')) {
                    return { providerId: 'glm_coding_plan_global', apiKey, modelName: model };
                }
                if (baseUrl.includes('bigmodel.cn')) {
                    return { providerId: 'glm_coding_plan_china', apiKey, modelName: model };
                }
            }

            // 通过环境变量推断
            const envBase = process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL;
            if (envBase) {
                if (envBase.includes('z.ai')) {
                    return { providerId: 'glm_coding_plan_global', apiKey, modelName: model };
                }
                if (envBase.includes('bigmodel.cn')) {
                    return { providerId: 'glm_coding_plan_china', apiKey, modelName: model };
                }
            }

            if (apiKey || model) {
                return { providerId: null, apiKey, modelName: model };
            }

            return { providerId: null, apiKey: null, modelName: null };
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
            'api-key': apiKey,
            'openai-api-base': baseUrl,
            model: 'glm-4-plus'
        });
    }

    unloadGLMConfig() {
        const currentConfig = this.getConfig();
        delete currentConfig['api-key'];
        delete currentConfig['openai-api-base'];
        delete currentConfig.model;
        this.saveConfig(currentConfig);
    }

    loadProviderConfig(providerId, providerDef, userConfig) {
        const currentConfig = this.getConfig();
        const baseURL = userConfig.baseURL || providerDef.baseURL;
        const modelName = userConfig.selectedModel || userConfig.customModelName || providerDef.defaultModel;

        const newConfig = {
            ...currentConfig,
            'openai-api-base': baseURL,
            model: modelName
        };

        if (userConfig.apiKey) {
            newConfig['api-key'] = userConfig.apiKey;
        }

        this.saveConfig(newConfig);
    }

    unloadProviderConfig(providerId) {
        this.unloadGLMConfig();
    }

    // Aider 不原生支持 MCP，提供 stub 方法以兼容接口
    isMCPInstalled(mcpId) { return false; }
    installMCP(mcp, apiKey, plan) {
        logger.logError('AiderManager.installMCP', new Error('Aider does not support MCP servers'));
    }
    uninstallMCP(mcpId) {}
    getInstalledMCPs() { return []; }
    getMCPStatus(mcpServices) {
        const status = new Map();
        for (const mcp of mcpServices) {
            status.set(mcp.id, false);
        }
        return status;
    }
    getOtherMCPs(builtinIds) { return []; }
    getAllMCPServers() { return {}; }
}

export const aiderManager = AiderManager.getInstance();
