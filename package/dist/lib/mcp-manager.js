import { toolManager } from './tool-manager.js';
import { claudeCodeManager } from './claude-code-manager.js';
import { openCodeManager } from './opencode-manager.js';
import { crushManager } from './crush-manager.js';
import { factoryDroidManager } from './factory-droid-manager.js';
import { aiderManager } from './aider-manager.js';
import { gooseManager } from './goose-manager.js';
import { geminiCliManager } from './gemini-cli-manager.js';
import { codexCliManager } from './codex-cli-manager.js';
// GLM Coding Plan预置的MCP服务
export const PRESET_MCP_SERVICES = [
    // ─── GLM 专属 MCP 服务 ────────────────────────────────────────
    {
        id: 'zai-mcp-server',
        name: 'Vision MCP',
        type: 'builtin',
        providerRequired: 'glm',
        protocol: 'stdio',
        requiresAuth: true,
        description: 'Vision MCP Local Server',
        command: 'npx',
        args: ['-y', '@z_ai/mcp-server'],
        envTemplate: {
            glm_coding_plan_global: {
                Z_AI_MODE: 'ZAI'
            },
            glm_coding_plan_china: {
                Z_AI_MODE: 'ZHIPU'
            }
        }
    },
    {
        id: 'web-search-prime',
        name: 'Web Search MCP',
        type: 'builtin',
        providerRequired: 'glm',
        protocol: 'streamable-http',
        requiresAuth: true,
        description: 'Web Search Prime MCP Server',
        urlTemplate: {
            glm_coding_plan_global: 'https://api.z.ai/api/mcp/web_search_prime/mcp',
            glm_coding_plan_china: 'https://open.bigmodel.cn/api/mcp/web_search_prime/mcp'
        }
    },
    {
        id: 'web-reader',
        name: 'Web Reader MCP',
        type: 'builtin',
        providerRequired: 'glm',
        protocol: 'streamable-http',
        requiresAuth: true,
        description: 'Web URL Reader MCP Server',
        urlTemplate: {
            glm_coding_plan_global: 'https://api.z.ai/api/mcp/web_reader/mcp',
            glm_coding_plan_china: 'https://open.bigmodel.cn/api/mcp/web_reader/mcp'
        }
    },
    {
        id: 'zread',
        name: 'ZRead MCP',
        type: 'builtin',
        providerRequired: 'glm',
        protocol: 'streamable-http',
        requiresAuth: true,
        description: 'ZRead Github MCP Server',
        urlTemplate: {
            glm_coding_plan_global: 'https://api.z.ai/api/mcp/zread/mcp',
            glm_coding_plan_china: 'https://open.bigmodel.cn/api/mcp/zread/mcp'
        }
    },
    // ─── 通用 MCP 服务 ────────────────────────────────────────────
    {
        id: 'mcp-filesystem',
        name: 'Filesystem MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: '文件系统读写操作',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        customizable: true,
        customizeHint: '启动后可修改 args 中的目录路径'
    },
    {
        id: 'mcp-fetch',
        name: 'Fetch MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: '网页内容抓取与读取',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-fetch']
    },
    {
        id: 'mcp-github',
        name: 'GitHub MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        requiresApiKey: true,
        apiKeyEnvName: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        apiKeyHint: 'GitHub Personal Access Token',
        description: 'GitHub 仓库/PR/Issue 操作',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github']
    },
    {
        id: 'mcp-memory',
        name: 'Memory MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: '持久化知识图谱记忆存储',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory']
    },
    {
        id: 'mcp-sequential-thinking',
        name: 'Sequential Thinking MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: '动态推理与思维链',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sequential-thinking']
    },
    {
        id: 'mcp-brave-search',
        name: 'Brave Search MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        requiresApiKey: true,
        apiKeyEnvName: 'BRAVE_API_KEY',
        apiKeyHint: 'Brave Search API Key',
        description: 'Brave 搜索引擎集成',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search']
    },
    {
        id: 'mcp-sqlite',
        name: 'SQLite MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: 'SQLite 数据库读写操作',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', '/tmp/mcp.db'],
        customizable: true,
        customizeHint: '启动后可修改 --db-path 指定数据库文件'
    },
    {
        id: 'mcp-puppeteer',
        name: 'Puppeteer MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: '浏览器自动化 (截图/导航/交互)',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-puppeteer']
    },
    {
        id: 'mcp-everything',
        name: 'Everything MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: 'MCP 功能测试工具',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-everything']
    },
    // ─── 热门社区 MCP 服务 ─────────────────────────────────────────
    {
        id: 'mcp-context7',
        name: 'Context7 MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: '获取最新库文档和 API 示例 (Upstash)',
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp@latest']
    },
    {
        id: 'mcp-playwright',
        name: 'Playwright MCP',
        type: 'builtin',
        protocol: 'stdio',
        requiresAuth: false,
        description: '浏览器自动化 (Microsoft 官方)',
        command: 'npx',
        args: ['-y', '@playwright/mcp@latest']
    },
    {
        id: 'mcp-tavily',
        name: 'Tavily MCP',
        type: 'builtin',
        protocol: 'streamable-http',
        requiresAuth: false,
        requiresApiKey: true,
        apiKeyInUrl: true,
        apiKeyHint: 'Tavily API Key',
        description: 'Web 搜索/抓取/爬虫 (Tavily)',
        url: 'https://mcp.tavily.com/mcp/',
        urlWithKey: true
    }
];
export class MCPManager {
    static instance;
    constructor() { }
    static getInstance() {
        if (!MCPManager.instance) {
            MCPManager.instance = new MCPManager();
        }
        return MCPManager.instance;
    }
    getPresetServices() {
        return [...PRESET_MCP_SERVICES];
    }
    isMCPInstalled(toolName, mcpId) {
        try {
            // Claude Code 使用专门的管理器
            if (toolName === 'claude-code') {
                return claudeCodeManager.isMCPInstalled(mcpId);
            }
            // OpenCode 使用专门的管理器
            if (toolName === 'opencode') {
                return openCodeManager.isMCPInstalled(mcpId);
            }
            // Crush 使用专门的管理器
            if (toolName === 'crush') {
                return crushManager.isMCPInstalled(mcpId);
            }
            // Factory Droid 使用专门的管理器
            if (toolName === 'factory-droid') {
                return factoryDroidManager.isMCPInstalled(mcpId);
            }
            // Aider 使用专门的管理器
            if (toolName === 'aider') {
                return aiderManager.isMCPInstalled(mcpId);
            }
            // Goose 使用专门的管理器
            if (toolName === 'goose') {
                return gooseManager.isMCPInstalled(mcpId);
            }
            // Gemini CLI 使用专门的管理器
            if (toolName === 'gemini-cli') {
                return geminiCliManager.isMCPInstalled(mcpId);
            }
            // Codex CLI 使用专门的管理器
            if (toolName === 'codex-cli') {
                return codexCliManager.isMCPInstalled(mcpId);
            }
            const config = toolManager.getToolConfig(toolName);
            if (!config || !config.mcpServers) {
                return false;
            }
            return mcpId in config.mcpServers;
        }
        catch {
            return false;
        }
    }
    installMCP(toolName, mcp, apiKey, plan) {
        try {
            // Claude Code 使用专门的管理器
            if (toolName === 'claude-code') {
                claudeCodeManager.installMCP(mcp, apiKey, plan);
                return;
            }
            // OpenCode 使用专门的管理器
            if (toolName === 'opencode') {
                openCodeManager.installMCP(mcp, apiKey, plan);
                return;
            }
            // Crush 使用专门的管理器
            if (toolName === 'crush') {
                crushManager.installMCP(mcp, apiKey, plan);
                return;
            }
            // Factory Droid 使用专门的管理器
            if (toolName === 'factory-droid') {
                factoryDroidManager.installMCP(mcp, apiKey, plan);
                return;
            }
            // Aider 使用专门的管理器
            if (toolName === 'aider') {
                aiderManager.installMCP(mcp, apiKey, plan);
                return;
            }
            // Goose 使用专门的管理器
            if (toolName === 'goose') {
                gooseManager.installMCP(mcp, apiKey, plan);
                return;
            }
            // Gemini CLI 使用专门的管理器
            if (toolName === 'gemini-cli') {
                geminiCliManager.installMCP(mcp, apiKey, plan);
                return;
            }
            // Codex CLI 使用专门的管理器
            if (toolName === 'codex-cli') {
                codexCliManager.installMCP(mcp, apiKey, plan);
                return;
            }
            const config = toolManager.getToolConfig(toolName) || {};
            if (!config.mcpServers) {
                config.mcpServers = {};
            }
            // 根据协议类型配置不同的结构
            if (mcp.protocol === 'stdio') {
                // 确定环境变量
                let env = {};
                // 如果有 envTemplate，根据 plan 选择环境变量
                if (mcp.envTemplate && plan) {
                    env = { ...(mcp.envTemplate[plan] || {}) };
                }
                else if (mcp.env) {
                    // 使用固定的环境变量
                    env = { ...mcp.env };
                }
                // 如果需要认证，添加 API Key
                if (mcp.requiresAuth && apiKey) {
                    env.Z_AI_API_KEY = apiKey;
                }
                config.mcpServers[mcp.id] = {
                    type: 'stdio',
                    command: mcp.command,
                    args: mcp.args,
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
                    throw new Error(`MCP ${mcp.name} requires a URL but none was provided.`);
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
            toolManager.updateToolConfig(toolName, config);
        }
        catch (error) {
            throw new Error(`Failed to install MCP ${mcp.name}: ${error}`);
        }
    }
    uninstallMCP(toolName, mcpId) {
        try {
            // Claude Code 使用专门的管理器
            if (toolName === 'claude-code') {
                claudeCodeManager.uninstallMCP(mcpId);
                return;
            }
            // OpenCode 使用专门的管理器
            if (toolName === 'opencode') {
                openCodeManager.uninstallMCP(mcpId);
                return;
            }
            // Crush 使用专门的管理器
            if (toolName === 'crush') {
                crushManager.uninstallMCP(mcpId);
                return;
            }
            // Factory Droid 使用专门的管理器
            if (toolName === 'factory-droid') {
                factoryDroidManager.uninstallMCP(mcpId);
                return;
            }
            // Aider 使用专门的管理器
            if (toolName === 'aider') {
                aiderManager.uninstallMCP(mcpId);
                return;
            }
            // Goose 使用专门的管理器
            if (toolName === 'goose') {
                gooseManager.uninstallMCP(mcpId);
                return;
            }
            // Gemini CLI 使用专门的管理器
            if (toolName === 'gemini-cli') {
                geminiCliManager.uninstallMCP(mcpId);
                return;
            }
            // Codex CLI 使用专门的管理器
            if (toolName === 'codex-cli') {
                codexCliManager.uninstallMCP(mcpId);
                return;
            }
            const config = toolManager.getToolConfig(toolName);
            if (!config || !config.mcpServers) {
                return;
            }
            delete config.mcpServers[mcpId];
            toolManager.updateToolConfig(toolName, config);
        }
        catch (error) {
            throw new Error(`Failed to uninstall MCP ${mcpId}: ${error}`);
        }
    }
    getInstalledMCPs(toolName) {
        try {
            // Claude Code 使用专门的管理器
            if (toolName === 'claude-code') {
                return claudeCodeManager.getInstalledMCPs();
            }
            // OpenCode 使用专门的管理器
            if (toolName === 'opencode') {
                return openCodeManager.getInstalledMCPs();
            }
            // Crush 使用专门的管理器
            if (toolName === 'crush') {
                return crushManager.getInstalledMCPs();
            }
            // Factory Droid 使用专门的管理器
            if (toolName === 'factory-droid') {
                return factoryDroidManager.getInstalledMCPs();
            }
            // Aider 使用专门的管理器
            if (toolName === 'aider') {
                return aiderManager.getInstalledMCPs();
            }
            // Goose 使用专门的管理器
            if (toolName === 'goose') {
                return gooseManager.getInstalledMCPs();
            }
            // Gemini CLI 使用专门的管理器
            if (toolName === 'gemini-cli') {
                return geminiCliManager.getInstalledMCPs();
            }
            // Codex CLI 使用专门的管理器
            if (toolName === 'codex-cli') {
                return codexCliManager.getInstalledMCPs();
            }
            const config = toolManager.getToolConfig(toolName);
            if (!config || !config.mcpServers) {
                return [];
            }
            return Object.keys(config.mcpServers);
        }
        catch {
            return [];
        }
    }
    getMCPStatus(toolName) {
        // Claude Code 使用专门的管理器
        if (toolName === 'claude-code') {
            return claudeCodeManager.getMCPStatus(PRESET_MCP_SERVICES);
        }
        // OpenCode 使用专门的管理器
        if (toolName === 'opencode') {
            return openCodeManager.getMCPStatus(PRESET_MCP_SERVICES);
        }
        // Crush 使用专门的管理器
        if (toolName === 'crush') {
            return crushManager.getMCPStatus(PRESET_MCP_SERVICES);
        }
        // Factory Droid 使用专门的管理器
        if (toolName === 'factory-droid') {
            return factoryDroidManager.getMCPStatus(PRESET_MCP_SERVICES);
        }
        // Aider 使用专门的管理器
        if (toolName === 'aider') {
            return aiderManager.getMCPStatus(PRESET_MCP_SERVICES);
        }
        // Goose 使用专门的管理器
        if (toolName === 'goose') {
            return gooseManager.getMCPStatus(PRESET_MCP_SERVICES);
        }
        // Gemini CLI 使用专门的管理器
        if (toolName === 'gemini-cli') {
            return geminiCliManager.getMCPStatus(PRESET_MCP_SERVICES);
        }
        // Codex CLI 使用专门的管理器
        if (toolName === 'codex-cli') {
            return codexCliManager.getMCPStatus(PRESET_MCP_SERVICES);
        }
        const status = new Map();
        for (const mcp of PRESET_MCP_SERVICES) {
            status.set(mcp.id, this.isMCPInstalled(toolName, mcp.id));
        }
        return status;
    }
}
export const mcpManager = MCPManager.getInstance();
