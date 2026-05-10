import chalk from 'chalk';
import ora from 'ora';
import { configManager } from '../lib/config.js';
import { toolManager, SUPPORTED_TOOLS } from '../lib/tool-manager.js';
import { mcpManager } from '../lib/mcp-manager.js';
import { openCodeSkillsManager } from '../lib/opencode-skills-manager.js';
import { i18n } from '../lib/i18n.js';
import { getProviderById } from '../lib/providers.js';
import { execSync } from 'child_process';
import { existsSync, readFileSync, lstatSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
export async function doctorCommand(options = {}) {
    const jsonOutput = options.json || false;
    const results = [];
    const spinner = ora('正在运行健康检查...').start();

    // ─── 1. 基础环境 ─────────────────────────────────────────
    spinner.text = '检查基础环境...';

    // Node.js 版本
    const nodeVersion = process.version;
    results.push({
        category: '基础环境',
        name: 'Node.js',
        passed: true,
        detail: nodeVersion
    });

    // Git
    const gitInstalled = toolManager.isGitInstalled();
    results.push({
        category: '基础环境',
        name: 'Git',
        passed: gitInstalled,
        detail: gitInstalled ? execSync('git --version', { stdio: 'pipe' }).toString().trim() : '未安装'
    });

    // PATH
    const pathEnv = process.env.PATH || '';
    results.push({
        category: '基础环境',
        name: 'PATH',
        passed: pathEnv.length > 0,
        detail: pathEnv.length > 0 ? `${pathEnv.split(':').length} 个路径` : 'PATH 为空'
    });

    // ─── 2. Provider 配置 ────────────────────────────────────
    spinner.text = '检查 Provider 配置...';
    const cfg = configManager.getConfig();
    const providerId = cfg.provider_id || cfg.plan || null;
    const apiKey = cfg.api_key || null;

    if (!providerId) {
        results.push({
            category: 'Provider',
            name: 'AI Provider',
            passed: false,
            detail: '未配置 Provider，运行 chelper 进入配置向导'
        });
    } else {
        const provider = getProviderById(providerId);
        results.push({
            category: 'Provider',
            name: 'AI Provider',
            passed: true,
            detail: provider ? provider.name : providerId
        });

        // API Key
        if (provider && provider.requiresApiKey && !apiKey) {
            results.push({
                category: 'Provider',
                name: 'API Key',
                passed: false,
                detail: 'Provider 需要 API Key 但未配置'
            });
        } else if (apiKey) {
            results.push({
                category: 'Provider',
                name: 'API Key',
                passed: true,
                detail: `已配置 (${apiKey.slice(0, 4)}****)`
            });
        }

        // 网络连通性
        if (provider && provider.baseURL) {
            spinner.text = `测试 ${provider.name} 连通性...`;
            const reachable = await testConnectivity(provider.baseURL);
            results.push({
                category: 'Provider',
                name: `${provider.name} 连通性`,
                passed: reachable,
                detail: reachable ? `${provider.baseURL} 可达` : `${provider.baseURL} 无法连接`
            });
        }
    }

    // ─── 3. 编码工具状态 ──────────────────────────────────────
    spinner.text = '检查编码工具...';
    for (const [toolName, toolDef] of Object.entries(SUPPORTED_TOOLS)) {
        const isInstalled = toolManager.isToolInstalled(toolName);
        let detail = '';
        if (isInstalled) {
            try {
                const version = execSync(`${toolDef.command} --version 2>/dev/null || ${toolDef.command} version 2>/dev/null`, {
                    stdio: 'pipe', timeout: 5000
                }).toString().trim().split('\n')[0];
                detail = version || '已安装';
            } catch {
                detail = '已安装';
            }
        } else {
            detail = `未安装 (${toolDef.installCommand.split(' ').slice(0, 3).join(' ')}...)`;
        }

        // 检查工具配置文件是否存在
        const configExists = existsSync(toolDef.configPath);
        const configStatus = !isInstalled ? '' : configExists ? '，配置文件存在' : '，配置文件缺失';

        results.push({
            category: '编码工具',
            name: toolDef.displayName,
            passed: isInstalled,
            detail: detail + configStatus
        });

        // 如果工具已安装，检查配置是否与 chelper 一致
        if (isInstalled && providerId && toolManager.isProviderCompatible(providerId, toolName)) {
            const compat = true;
            results.push({
                category: '编码工具',
                name: `  ${toolDef.displayName} 兼容性`,
                passed: compat,
                detail: `${getProviderById(providerId)?.name || providerId} ↔ ${toolDef.displayName}`
            });
        }
    }

    // ─── 4. MCP 服务状态 ─────────────────────────────────────
    spinner.text = '检查 MCP 服务...';
    const installedTools = toolManager.getInstalledTools();
    for (const toolName of installedTools) {
        const installedMCPs = mcpManager.getInstalledMCPs(toolName);
        const displayName = SUPPORTED_TOOLS[toolName]?.displayName || toolName;
        if (installedMCPs.length > 0) {
            results.push({
                category: 'MCP 服务',
                name: `${displayName} MCP`,
                passed: true,
                detail: `已安装 ${installedMCPs.length} 个: ${installedMCPs.join(', ')}`
            });
        }
    }

    // ─── 5. OpenCode Skills 完整性 ───────────────────────────
    spinner.text = '检查 OpenCode Skills...';
    const skills = openCodeSkillsManager.listSkills();
    const brokenSkills = skills.filter(s => !s.exists);
    if (skills.length > 0) {
        results.push({
            category: 'Skills',
            name: 'OpenCode Skills',
            passed: brokenSkills.length === 0,
            detail: brokenSkills.length === 0
                ? `${skills.length} 个 Skills 全部正常`
                : `${brokenSkills.length} 个文件缺失: ${brokenSkills.map(s => s.name).join(', ')}`
        });
    }

    // 检查 skills 目录 symlink 完整性
    const skillsLinkDir = openCodeSkillsManager.getSkillsLinkDir();
    if (existsSync(skillsLinkDir)) {
        const entries = readdirSync(skillsLinkDir, { withFileTypes: true });
        const brokenLinks = entries.filter(e => {
            if (e.isSymbolicLink?.()) {
                const linkPath = join(skillsLinkDir, e.name);
                try {
                    lstatSync(linkPath);
                    return !existsSync(linkPath);
                } catch {
                    return true;
                }
            }
            return false;
        });
        if (brokenLinks.length > 0) {
            results.push({
                category: 'Skills',
                name: 'Skills 符号链接',
                passed: false,
                detail: `${brokenLinks.length} 个断裂链接: ${brokenLinks.map(l => l.name).join(', ')}`
            });
        }
    }

    spinner.stop();

    // ─── 输出结果 ─────────────────────────────────────────────
    if (jsonOutput) {
        console.log(JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2));
        return;
    }

    console.log(chalk.cyan.bold('\n╔══════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║       chelper 健康检查报告           ║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════╝'));
    console.log('');

    let allPassed = true;
    let currentCategory = '';

    for (const result of results) {
        if (result.category !== currentCategory) {
            currentCategory = result.category;
            console.log(chalk.bold.white(`\n  [ ${currentCategory} ]`));
        }

        const icon = result.passed ? chalk.green('  ✓') : chalk.red('  ✗');
        const name = result.passed ? chalk.white(result.name) : chalk.yellow(result.name);
        console.log(`${icon} ${name}`);

        if (result.detail) {
            const detailColor = result.passed ? chalk.gray : chalk.yellow;
            console.log(`    ${detailColor(result.detail)}`);
        }

        if (!result.passed) allPassed = false;
    }

    console.log('');
    if (allPassed) {
        console.log(chalk.green.bold('  ✅ 所有检查通过！系统运行正常'));
    } else {
        const failCount = results.filter(r => !r.passed).length;
        console.log(chalk.yellow.bold(`  ⚠️  ${failCount} 项检查未通过`));
        console.log(chalk.gray('\n  修复建议:'));
        console.log(chalk.gray('    • 运行 chelper init 进行初始配置'));
        console.log(chalk.gray('    • 运行 chelper enter <tool> 配置具体工具'));
        console.log(chalk.gray('    • 运行 chelper enter 安装缺失的编码工具'));
    }
    console.log('');
}

async function testConnectivity(baseUrl) {
    try {
        const url = new URL(baseUrl);
        const httpModule = url.protocol === 'https:' ? await import('https') : await import('http');
        return new Promise((resolve) => {
            const req = httpModule.get(`${url.protocol}//${url.host}`, { timeout: 5000 }, (res) => {
                resolve(res.statusCode !== undefined);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
        });
    } catch {
        return false;
    }
}
