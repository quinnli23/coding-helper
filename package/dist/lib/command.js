import { Command as Commander } from 'commander';
import { i18n } from './i18n.js';
import { configManager } from './config.js';
import { wizard } from './wizard.js';
import { profileManager } from './profile-manager.js';
import { getProviderById } from './providers.js';
import { SUPPORTED_TOOLS } from './tool-manager.js';
import { langCommand, authCommand, doctorCommand, configCommand } from '../commands/index.js';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
export class Command {
    program;
    constructor() {
        // Load language from config
        const lang = configManager.getLang();
        i18n.loadFromConfig(lang);
        this.program = new Commander();
        this.setupProgram();
    }
    getVersion() {
        try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const packagePath = join(__dirname, '../../package.json');
            const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
            return packageJson.version;
        }
        catch {
            return '1.0.0';
        }
    }
    setupProgram() {
        this.program
            .name('chelper')
            .description(i18n.t('cli.title'))
            .version(this.getVersion(), '-v, --version', i18n.t('commands.version'))
            .helpOption('-h, --help', i18n.t('commands.help'));
        // Init command - interactive wizard
        this.program
            .command('init')
            .description(i18n.t('commands.init'))
            .action(async () => {
            await this.handleInitCommand();
        });
        // Lang command - language management
        const langCmd = this.program
            .command('lang')
            .description(i18n.t('commands.lang'));
        langCmd
            .command('show')
            .description(i18n.t('lang.show_usage'))
            .action(async () => {
            await langCommand(['show']);
        });
        langCmd
            .command('set <locale>')
            .description(i18n.t('lang.set_usage'))
            .action(async (locale) => {
            await langCommand(['set', locale]);
        });
        // Auth command - API key management
        const authCmd = this.program
            .command('auth')
            .description(i18n.t('commands.auth'));
        authCmd
            .argument('[service]', 'Service type: glm_coding_plan_global or glm_coding_plan_china')
            .argument('[token]', 'API token')
            .action(async (service, token) => {
            const args = [];
            if (service)
                args.push(service);
            if (token)
                args.push(token);
            await authCommand(args);
        });
        authCmd
            .command('revoke')
            .description('Revoke saved API key')
            .action(async () => {
            await authCommand(['revoke']);
        });
        authCmd
            .command('reload <tool>')
            .description('Reload plan configuration to the specified tool (e.g., claude)')
            .action(async (tool) => {
            await authCommand(['reload', tool]);
        });
        // Doctor command - health check
        this.program
            .command('doctor')
            .description(i18n.t('commands.doctor'))
            .option('--json', 'Output as JSON')
            .action(async (opts) => {
            await doctorCommand(opts);
        });
        // Profile command - configuration profiles
        const profileCmd = this.program
            .command('profile')
            .description('管理配置模板 (保存/加载/切换多套 Provider 配置)');
        profileCmd
            .command('list')
            .alias('ls')
            .description('列出所有已保存的配置模板')
            .action(() => {
            const profiles = profileManager.listProfiles();
            const active = profileManager.getActiveProfile();
            if (profiles.length === 0) {
                console.log(chalk.gray('  暂无保存的配置模板'));
                console.log(chalk.gray('  使用 chelper profile save <名称> 保存当前配置'));
                return;
            }
            console.log(chalk.cyan.bold('\n  配置模板列表:\n'));
            for (const name of profiles) {
                const isActive = name === active;
                const config = profileManager.loadProfile(name);
                const providerId = config?.provider_id || config?.plan;
                const tag = providerId ? ` (${providerId})` : '';
                const marker = isActive ? chalk.green(' ← 当前') : '';
                console.log(`  ${isActive ? chalk.green('●') : '○'} ${chalk.white(name)}${chalk.gray(tag)}${marker}`);
            }
            console.log('');
        });
        profileCmd
            .command('save <name>')
            .description('保存当前配置为模板')
            .action((name) => {
            const currentConfig = configManager.getConfig();
            profileManager.saveProfile(name, currentConfig);
            profileManager.setActiveProfile(name);
            console.log(chalk.green(`\n  ✓ 配置已保存为模板: ${name}`));
        });
        profileCmd
            .command('use <name>')
            .description('切换到指定配置模板')
            .action((name) => {
            if (!profileManager.profileExists(name)) {
                console.log(chalk.red(`\n  ✗ 模板 "${name}" 不存在`));
                return;
            }
            const profileConfig = profileManager.loadProfile(name);
            if (!profileConfig) {
                console.log(chalk.red(`\n  ✗ 无法加载模板 "${name}"`));
                return;
            }
            // 应用 profile 配置到 chelper
            if (profileConfig.provider_id) configManager.setProviderId(profileConfig.provider_id);
            if (profileConfig.api_key) configManager.setApiKey(profileConfig.api_key);
            if (profileConfig.provider_base_url) configManager.setProviderBaseUrl(profileConfig.provider_base_url);
            if (profileConfig.provider_selected_model) configManager.setProviderModel(profileConfig.provider_selected_model);
            if (profileConfig.plan) configManager.setPlan(profileConfig.plan);
            if (profileConfig.lang) configManager.setLang(profileConfig.lang);
            profileManager.setActiveProfile(name);
            const providerId = profileConfig.provider_id || profileConfig.plan;
            console.log(chalk.green(`\n  ✓ 已切换到模板: ${name}`));
            if (providerId) {
                const p = getProviderById(providerId);
                console.log(chalk.gray(`    Provider: ${p ? p.name : providerId}`));
            }
        });
        profileCmd
            .command('delete <name>')
            .alias('rm')
            .description('删除配置模板')
            .action((name) => {
            if (profileManager.deleteProfile(name)) {
                console.log(chalk.green(`\n  ✓ 已删除模板: ${name}`));
            } else {
                console.log(chalk.red(`\n  ✗ 模板 "${name}" 不存在`));
            }
        });
        // Config command - non-interactive configuration
        const cfgCmd = this.program
            .command('config')
            .description('非交互式配置 (适合脚本/CI)');
        cfgCmd
            .command('set')
            .description('设置配置项')
            .option('--provider <id>', 'Provider ID (如 deepseek, openai)')
            .option('--api-key <key>', 'API Key')
            .option('--base-url <url>', 'API Base URL')
            .option('--model <name>', '模型名称')
            .option('--tool <name>', '目标工具名 (如 opencode, aider)')
            .action(async (opts) => {
            if (opts.provider) {
                configManager.setProviderId(opts.provider);
                console.log(chalk.green(`  ✓ Provider: ${opts.provider}`));
            }
            if (opts.apiKey) {
                configManager.setApiKey(opts.apiKey);
                console.log(chalk.green(`  ✓ API Key: ${opts.apiKey.slice(0, 4)}****`));
            }
            if (opts.baseUrl) {
                configManager.setProviderBaseUrl(opts.baseUrl);
                console.log(chalk.green(`  ✓ Base URL: ${opts.baseUrl}`));
            }
            if (opts.model) {
                configManager.setProviderModel(opts.model);
                console.log(chalk.green(`  ✓ Model: ${opts.model}`));
            }
            // 如果指定了 tool，自动应用配置到工具
            if (opts.tool && (opts.provider || opts.apiKey)) {
                if (!SUPPORTED_TOOLS[opts.tool]) {
                    console.error(chalk.red(`  ✗ 未知工具: ${opts.tool}`));
                    return;
                }
                const { toolManager: tm } = await import('./tool-manager.js');
                const providerId = opts.provider || configManager.getProviderId();
                const providerDef = getProviderById(providerId);
                if (providerDef) {
                    const userConfig = {
                        apiKey: opts.apiKey || configManager.getApiKey(),
                        baseURL: opts.baseUrl || providerDef.baseURL,
                        selectedModel: opts.model || providerDef.defaultModel,
                        customModelName: opts.model || providerDef.defaultModel,
                        models: opts.model ? { [opts.model]: { name: opts.model } } : providerDef.models
                    };
                    tm.loadProviderConfig(opts.tool, providerId, userConfig);
                    console.log(chalk.green(`  ✓ 配置已应用到 ${SUPPORTED_TOOLS[opts.tool].displayName}`));
                }
            }
        });
        cfgCmd
            .command('show')
            .description('显示当前配置')
            .action(() => {
            const cfg = configManager.getConfig();
            console.log(chalk.cyan.bold('\n  当前 chelper 配置:\n'));
            if (cfg.provider_id || cfg.plan) {
                const providerId = cfg.provider_id || cfg.plan;
                const p = getProviderById(providerId);
                console.log(`  Provider:  ${p ? p.name : providerId}`);
            }
            if (cfg.api_key) console.log(`  API Key:   ${cfg.api_key.slice(0, 4)}****`);
            if (cfg.provider_base_url) console.log(`  Base URL:  ${cfg.provider_base_url}`);
            if (cfg.provider_selected_model) console.log(`  Model:     ${cfg.provider_selected_model}`);
            console.log(`  Language:  ${cfg.lang || 'en_US'}`);
            const activeProfile = profileManager.getActiveProfile();
            if (activeProfile) console.log(`  Profile:   ${activeProfile}`);
            console.log('');
        });
        // MCP subcommand
        const mcpCmd = this.program
            .command('mcp')
            .description('MCP 服务管理');
        mcpCmd
            .command('install <tool> <mcp-id>')
            .description('安装 MCP 服务到指定工具')
            .option('--api-key <key>', 'MCP 服务所需的 API Key')
            .action(async (tool, mcpId, opts) => {
            const { mcpManager: mm } = await import('./mcp-manager.js');
            const presets = mm.getPresetServices();
            const mcp = presets.find(m => m.id === mcpId);
            if (!mcp) {
                console.error(chalk.red(`  ✗ 未找到 MCP 服务: ${mcpId}`));
                return;
            }
            if (opts.apiKey) mcp.env = { ...(mcp.env || {}), ...JSON.parse(opts.apiKey) };
            mm.installMCP(tool, mcp, configManager.getApiKey(), configManager.getPlan());
            console.log(chalk.green(`  ✓ ${mcp.name} 已安装到 ${tool}`));
        });
        mcpCmd
            .command('list <tool>')
            .description('列出工具已安装的 MCP 服务')
            .action(async (tool) => {
            const { mcpManager: mm } = await import('./mcp-manager.js');
            const installed = mm.getInstalledMCPs(tool);
            if (installed.length === 0) {
                console.log(chalk.gray('  暂无已安装的 MCP 服务'));
                return;
            }
            for (const id of installed) {
                console.log(`  ${chalk.green('●')} ${id}`);
            }
        });
        // Config command - tool configuration
        const enterCmd = this.program
            .command('enter [option]')
            .description(i18n.t('commands.enter'));
        // config 子命令
        enterCmd
            .action(async (option) => {
            // 如果没有参数，显示主菜单
            if (!option) {
                await wizard.showMainMenu();
                return;
            }
            // 根据参数执行对应操作
            switch (option) {
                case 'lang':
                case 'language':
                    await wizard.configLanguage();
                    break;
                case 'plan':
                    await wizard.configPlan();
                    break;
                case 'apikey':
                case 'api-key':
                    await wizard.configApiKey();
                    break;
                default: {
                    // 尝试作为工具名处理
                    const args = [option];
                    await configCommand(args);
                    break;
                }
            }
        });
        this.program.action(async () => {
            if (configManager.isFirstRun()) {
                console.log(chalk.cyan(i18n.t('messages.first_run')));
                await wizard.runFirstTimeSetup();
            }
            else {
                await wizard.showMainMenu();
            }
        });
        // Custom help
        this.program.configureHelp({
            sortSubcommands: true,
            subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
        });
        // Add examples to help
        this.program.addHelpText('after', `
${chalk.bold(i18n.t('cli.examples'))}:
  ${chalk.gray('$ chelper                    # Interactive main menu')}
  ${chalk.gray('$ chelper init               # Run first-time setup wizard')}
  ${chalk.gray('$ chelper enter              # Interactive main menu')}
  ${chalk.gray('$ chelper enter lang         # Interactive language configuration')}
  ${chalk.gray('$ chelper enter plan         # Interactive plan configuration')}
  ${chalk.gray('$ chelper enter apikey       # Interactive API key configuration')}
  ${chalk.gray('$ chelper enter claude-code  # Interactive Configure Claude Code tool')}
  ${chalk.gray('$ chelper lang show          # Show current language')}
  ${chalk.gray('$ chelper lang set zh_CN')}
  ${chalk.gray('$ chelper auth               # Interactive auth setup')}
  ${chalk.gray('$ chelper auth glm_coding_plan_global <token>      # Set API key for global plan')}
  ${chalk.gray('$ chelper auth glm_coding_plan_china <token>       # Set API key for china plan')}
  ${chalk.gray('$ chelper auth revoke')}
  ${chalk.gray('$ chelper auth reload claude # Reload plan config to Claude Code')}
  ${chalk.gray('$ chelper doctor             # Health check')}
`);
    }
    async handleInitCommand() {
        await wizard.runFirstTimeSetup();
    }
    async execute(args) {
        try {
            await this.program.parseAsync(args, { from: 'user' });
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(chalk.red(i18n.t('cli.error_general')), error.message);
            }
            process.exit(1);
        }
    }
    getProgram() {
        return this.program;
    }
}
