import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import terminalLink from 'terminal-link';
import { configManager } from './config.js';
import { toolManager, SUPPORTED_TOOLS } from './tool-manager.js';
import { backupToolConfig } from './config-backup.js';
import { mcpManager } from './mcp-manager.js';
import { claudeCodeManager } from './claude-code-manager.js';
import { openCodeManager } from './opencode-manager.js';
import { crushManager } from './crush-manager.js';
import { factoryDroidManager } from './factory-droid-manager.js';
import { aiderManager } from './aider-manager.js';
import { gooseManager } from './goose-manager.js';
import { geminiCliManager } from './gemini-cli-manager.js';
import { codexCliManager } from './codex-cli-manager.js';
import { pluginMarketplaceManager } from './plugin-marketplace-manager.js';
import { profileManager } from './profile-manager.js';
import { openCodeSkillsManager } from './opencode-skills-manager.js';
import { i18n } from './i18n.js';
import { createBorderLine, createContentLine } from '../utils/string-width.js';
import { execSync } from 'child_process';
import { validateApiKey } from './api-validator.js';
import { PROVIDERS, getProviderGroups, getProviderById, getLocalProviders } from './providers.js';
import { logger } from '../utils/logger.js';
export class Wizard {
    static instance;
    BOX_WIDTH = 63; // Default box width for UI elements
    constructor() { }
    static getInstance() {
        if (!Wizard.instance) {
            Wizard.instance = new Wizard();
        }
        return Wizard.instance;
    }
    /**
     * Create a simple box with title using double-line border style
     */
    createBox(title) {
        console.log(chalk.cyan.bold('\n' + createBorderLine('╔', '╗', '═', this.BOX_WIDTH)));
        console.log(chalk.cyan.bold(createContentLine(title, '║', '║', this.BOX_WIDTH, 'center')));
        console.log(chalk.cyan.bold(createBorderLine('╚', '╝', '═', this.BOX_WIDTH)));
        console.log('');
    }
    /**
     * Display operation hints
     */
    showOperationHints() {
        const hints = [
            chalk.gray(i18n.t('wizard.hint_navigate')),
            chalk.gray(i18n.t('wizard.hint_confirm'))
        ];
        console.log(chalk.gray('💡 ') + hints.join(chalk.gray(' | ')) + '\n');
    }
    /**
     * Prompt wrapper that shows operation hints
     */
    async promptWithHints(questions) {
        this.showOperationHints();
        return inquirer.prompt(questions);
    }
    printBanner() {
        const BANNER_WIDTH = 65;
        const subtitle = i18n.t('wizard.banner_subtitle');
        const subtitleLine = createContentLine(subtitle, '║', '║', BANNER_WIDTH, 'center');
        const emptyLine = createContentLine('', '║', '║', BANNER_WIDTH, 'center');
        const titleLine = createContentLine('Coding Helper v0.1.1', '║', '║', BANNER_WIDTH, 'center');
        const asciiLines = [
            ' ▄▀▀ ▄▀▄ █▀▄ █ █▄ █ ▄▀    █▄█ ██▀ █   █▀▄ ██▀ █▀▄ ',
            ' ▀▄▄ ▀▄▀ █▄▀ █ █ ▀█ ▀▄█   █ █ █▄▄ █▄▄ █▀  █▄▄ █▀▄ '
        ].map(line => createContentLine(line, '║', '║', BANNER_WIDTH, 'center'));
        const bannerLines = [
            createBorderLine('╔', '╗', '═', BANNER_WIDTH),
            emptyLine,
            ...asciiLines,
            emptyLine,
            titleLine,
            subtitleLine,
            createBorderLine('╚', '╝', '═', BANNER_WIDTH)
        ];
        console.log(chalk.cyan.bold('\n' + bannerLines.join('\n')));
    }
    resetScreen() {
        console.clear();
        this.printBanner();
    }
    async runFirstTimeSetup() {
        // 清屏并显示欢迎信息
        this.resetScreen();
        console.log(chalk.cyan.bold('\n' + i18n.t('wizard.welcome')));
        console.log(chalk.gray(i18n.t('wizard.privacy_note') + '\n'));
        // Step 1: Select language
        await this.configLanguage();
        // Step 2: Select provider
        await this.configProvider();
        // Step 3 is handled inside configProvider (configApiKey for GLM, configProviderSettings for others)
        // Step 4: Select and configure tool
        await this.selectAndConfigureTool();
    }
    async configLanguage() {
        while (true) {
            this.resetScreen();
            this.createBox(i18n.t('wizard.select_language'));
            const currentLanguage = i18n.getLocale();
            const { language } = await this.promptWithHints([
                {
                    type: 'list',
                    name: 'language',
                    message: '✨ ' + i18n.t('wizard.select_language'),
                    choices: [
                        { name: '[EN] English' + (currentLanguage === 'en_US' ? chalk.green(' ✓ (' + i18n.t('wizard.current_active') + ')') : ''), value: 'en_US' },
                        { name: '[CN] 中文' + (currentLanguage === 'zh_CN' ? chalk.green(' ✓ (' + i18n.t('wizard.current_active') + ')') : ''), value: 'zh_CN' },
                        new inquirer.Separator(),
                        { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' },
                        { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' }
                    ],
                    pageSize: 15,
                    default: 'zh_CN'
                }
            ]);
            if (language === 'exit') {
                console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
                process.exit(0);
            }
            else if (language === 'back') {
                return;
            }
            configManager.setLang(language);
            i18n.setLocale(language);
            return;
        }
    }
    async configProvider() {
        while (true) {
            this.resetScreen();
            this.createBox(i18n.t('wizard.select_provider'));
            const currentConfig = configManager.getConfig();
            const currentProvider = currentConfig.provider_id;
            const choices = [];
            const groups = getProviderGroups();
            for (const group of groups) {
                choices.push(new inquirer.Separator(`  --- ${group.label} ---`));
                for (const p of group.providers) {
                    const isCurrent = currentProvider === p.id;
                    choices.push({
                        name: `${p.name}${isCurrent ? chalk.green(' ✓ (' + i18n.t('wizard.current_active') + ')') : ''}${p.category === 'local' ? chalk.gray(' [本地]') : ''}`,
                        value: p.id
                    });
                }
            }
            choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { provider } = await this.promptWithHints([{ type: 'list', name: 'provider', message: '🌐 ' + i18n.t('wizard.select_provider'), choices, pageSize: 20 }]);
            if (provider === 'exit') { console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message'))); process.exit(0); }
            else if (provider === 'back') { return; }
            // 保存选中的 provider
            configManager.updateConfig({ provider_id: provider });
            // 向后兼容：GLM plans 也保存 plan 字段
            if (provider.startsWith('glm_coding_plan')) {
                configManager.setPlan(provider);
                await this.configApiKey();
            } else {
                await this.configProviderSettings(provider);
            }
        }
    }
    async configProviderSettings(providerId) {
        const provider = getProviderById(providerId);
        if (!provider) return;
        const userConfig = {};
        // 步骤1: API Key（如果需要）
        if (provider.requiresApiKey) {
            this.resetScreen();
            this.createBox(`${provider.name} - API Key`);
            if (provider.apiKeyUrl) {
                const clickableUrl = terminalLink(provider.apiKeyUrl, provider.apiKeyUrl, { fallback: () => provider.apiKeyUrl });
                console.log(chalk.blue('💡 ' + i18n.t('wizard.api_key_get_hint', { url: clickableUrl })));
                console.log('');
            }
            const { apiKey } = await inquirer.prompt([{
                type: 'password', name: 'apiKey', mask: '●',
                message: i18n.t('wizard.input_your_api_key'),
                validate: (input) => input && input.trim().length > 0 ? true : '[!] ' + i18n.t('wizard.api_key_required')
            }]);
            userConfig.apiKey = apiKey.trim();
            configManager.updateConfig({ api_key: apiKey.trim() });
        }
        // 步骤2: Base URL（如果可自定义）
        if (provider.customizableBaseURL) {
            const { baseURL } = await inquirer.prompt([{
                type: 'input', name: 'baseURL',
                message: 'API Base URL:',
                default: provider.baseURL
            }]);
            userConfig.baseURL = baseURL;
            configManager.updateConfig({ provider_base_url: baseURL });
        }
        // 步骤3: 模型名称（如果可自定义模型列表）
        if (provider.customizableModels) {
            const { customModel } = await inquirer.prompt([{
                type: 'input', name: 'customModel',
                message: i18n.t('wizard.input_model_name') || '模型名称 (Model Name):',
                default: provider.defaultModel || 'default'
            }]);
            userConfig.models = { [customModel]: { name: customModel } };
            userConfig.customModelName = customModel;
            configManager.updateConfig({ provider_selected_model: customModel });
        } else if (Object.keys(provider.models).length > 1) {
            // 多个预定义模型，让用户选择
            const modelChoices = Object.entries(provider.models).map(([id, m]) => ({
                name: m.name + (id === provider.defaultModel ? chalk.green(' [默认]') : ''),
                value: id
            }));
            const { modelId } = await inquirer.prompt([{
                type: 'list', name: 'modelId',
                message: i18n.t('wizard.select_model') || '选择模型:',
                choices: modelChoices,
                pageSize: 15
            }]);
            userConfig.selectedModel = modelId;
            configManager.updateConfig({ provider_selected_model: modelId });
        }
        // 保存配置并继续到工具选择
        const spinner = ora({ text: i18n.t('wizard.saving_provider_config') || '正在保存配置...', spinner: 'star2' }).start();
        await new Promise(resolve => setTimeout(resolve, 500));
        spinner.succeed(chalk.green(`${provider.name} 配置已保存`));
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.selectAndConfigureTool();
    }
    async configApiKey() {
        while (true) {
            this.resetScreen();
            this.createBox(i18n.t('wizard.config_api_key'));
            const currentConfig = configManager.getConfig();
            if (currentConfig.api_key) {
                console.log(chalk.gray('  ' + i18n.t('wizard.config_api_key') + ' ') + chalk.gray(i18n.t('wizard.api_key_set') + ' (' + currentConfig.api_key.slice(0, 4) + '****)'));
                console.log('');
            }
            // 根据当前套餐显示 API Key 获取链接
            if (currentConfig.plan) {
                const apiKeyUrl = currentConfig.plan === 'glm_coding_plan_global'
                    ? 'https://z.ai/manage-apikey/apikey-list'
                    : 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys';
                const clickableUrl = terminalLink(apiKeyUrl, apiKeyUrl, { fallback: () => apiKeyUrl });
                console.log(chalk.blue('💡 ' + i18n.t('wizard.api_key_get_hint', { url: clickableUrl })));
                console.log('');
            }
            const { action } = await this.promptWithHints([
                {
                    type: 'list',
                    name: 'action',
                    message: i18n.t('wizard.select_action'),
                    choices: [
                        { name: '>   ' + (currentConfig.api_key ? i18n.t("wizard.update_api_key") : i18n.t('wizard.input_api_key')), value: 'input' },
                        new inquirer.Separator(),
                        { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' },
                        { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' }
                    ],
                    pageSize: 15
                }
            ]);
            if (action === 'exit') {
                console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
                process.exit(0);
            }
            else if (action === 'back') {
                return;
            }
            else if (action === 'input') {
                this.resetScreen();
                this.createBox(i18n.t('wizard.config_api_key'));
                // 根据当前套餐显示 API Key 获取链接
                if (currentConfig.plan) {
                    const apiKeyUrl = currentConfig.plan === 'glm_coding_plan_global'
                        ? 'https://z.ai/manage-apikey/apikey-list'
                        : 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys';
                    const clickableUrl = terminalLink(apiKeyUrl, apiKeyUrl, { fallback: () => apiKeyUrl });
                    console.log(chalk.blue('💡 ' + i18n.t('wizard.api_key_get_hint', { url: clickableUrl })));
                    console.log('');
                }
                const { apiKey } = await inquirer.prompt([
                    {
                        type: 'password',
                        name: 'apiKey',
                        mask: '●',
                        message: i18n.t('wizard.input_your_api_key'),
                        validate: (input) => {
                            if (!input || input.trim().length === 0) {
                                return '[!] ' + i18n.t('wizard.api_key_required');
                            }
                            return true;
                        }
                    }
                ]);
                // Validate API Key
                const spinner = ora({
                    text: i18n.t('wizard.validating_api_key'),
                    spinner: 'star2'
                }).start();
                const validationResult = await validateApiKey(apiKey.trim(), currentConfig.plan);
                await new Promise(resolve => setTimeout(resolve, 800));
                if (!validationResult.valid) {
                    if (validationResult.error === 'invalid_api_key') {
                        spinner.fail(chalk.red(i18n.t('wizard.api_key_invalid')));
                    }
                    else {
                        spinner.fail(chalk.red(i18n.t('wizard.api_key_network_error')));
                    }
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    continue; // Return to action menu
                }
                configManager.setApiKey(apiKey.trim());
                spinner.succeed("✅ " + i18n.t('wizard.set_success'));
                await new Promise(resolve => setTimeout(resolve, 600));
                await this.selectAndConfigureTool();
            }
        }
    }
    async selectAndConfigureTool() {
        while (true) {
            this.resetScreen();
            this.createBox(i18n.t('wizard.select_tool'));
            const supportedTools = toolManager.getSupportedTools();
            const toolChoices = supportedTools.map(tool => ({
                name: `>  ${tool.displayName}`,
                value: tool.name
            }));
            toolChoices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { selectedTool } = await this.promptWithHints([
                {
                    type: 'list',
                    name: 'selectedTool',
                    message: i18n.t('wizard.select_tool'),
                    pageSize: 15,
                    choices: toolChoices
                }
            ]);
            if (selectedTool === 'exit') {
                console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
                process.exit(0);
            }
            else if (selectedTool === 'back') {
                return;
            }
            await this.configureTool(selectedTool);
        }
    }
    async configureTool(toolName) {
        // 检查工具是否安装
        if (!toolManager.isToolInstalled(toolName)) {
            console.log(chalk.yellow(`\n${i18n.t('wizard.tool_not_installed', { tool: SUPPORTED_TOOLS[toolName].displayName })}`));
            const { shouldInstall } = await this.promptWithHints([
                {
                    type: 'confirm',
                    name: 'shouldInstall',
                    message: i18n.t('wizard.install_tool_confirm'),
                    default: true
                }
            ]);
            if (shouldInstall) {
                try {
                    await toolManager.installTool(toolName);
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
                catch (error) {
                    logger.logError('Wizard.configureTool', error);
                    console.error(chalk.red(i18n.t('install.install_failed_detail')));
                    if (error.message) {
                        console.error(chalk.gray(error.message));
                    }
                    await new Promise(resolve => setTimeout(resolve, 600));
                    // 询问是否跳过安装
                    const { skipInstall } = await this.promptWithHints([
                        {
                            type: 'list',
                            name: 'skipInstall',
                            message: i18n.t('install.skip_install_confirm'),
                            choices: [
                                { name: i18n.t('install.skip_install_yes'), value: true },
                                { name: i18n.t('install.skip_install_no'), value: false }
                            ],
                            pageSize: 15
                        }
                    ]);
                    if (!skipInstall) {
                        return;
                    }
                }
            }
            else {
                console.log(chalk.yellow(i18n.t('wizard.install_skipped')));
                return;
            }
        }
        // 进入工具管理菜单
        await this.showToolMenu(toolName);
    }
    async showMainMenu() {
        const cfg = configManager.getConfig();
        i18n.loadFromConfig(cfg.lang);
        while (true) {
            this.resetScreen();
            const currentCfg = configManager.getConfig();
            this.createBox(i18n.t('wizard.main_menu_title'));
            // 显示当前配置状态
            // console.log(chalk.gray(i18n.t('wizard.current_config_status')));
            console.log(chalk.gray('  Provider: ') + (() => {
                const providerId = currentCfg.provider_id || currentCfg.plan;
                if (providerId) {
                    const p = getProviderById(providerId);
                    return p ? chalk.green(p.name) : chalk.green(providerId);
                }
                return chalk.red(i18n.t('wizard.not_set'));
            })());
            console.log(chalk.gray('  ' + i18n.t('wizard.config_api_key') + ': ') + (currentCfg.api_key ? chalk.gray(i18n.t('wizard.api_key_set') + ' (' + currentCfg.api_key.slice(0, 4) + '****)') : chalk.red(i18n.t('wizard.not_set'))));
            console.log('');
            const choices = [
                { name: '>   ' + i18n.t('wizard.menu_config_language'), value: 'lang' },
                { name: '>   ' + i18n.t('wizard.menu_select_plan'), value: 'provider' },
                { name: '>   ' + i18n.t('wizard.menu_config_api_key'), value: 'apikey' },
                { name: '>   ' + i18n.t('wizard.menu_config_tool'), value: 'tool' },
                { name: '>   ' + chalk.magenta('配置模板管理 (Profile)'), value: 'profile' },
                { name: '>   ' + chalk.magenta('安装编码工具'), value: 'install_tools' },
                new inquirer.Separator(),
                { name: 'x   ' + i18n.t('wizard.menu_exit'), value: 'exit' }
            ];
            const { action } = await this.promptWithHints([
                {
                    type: 'list',
                    name: 'action',
                    message: i18n.t('wizard.select_operation'),
                    choices,
                    pageSize: 15
                }
            ]);
            if (action === 'exit') {
                console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
                process.exit(0);
            }
            else if (action === 'lang') {
                await this.configLanguage();
            }
            else if (action === 'provider') {
                await this.configProvider();
            }
            else if (action === 'apikey') {
                await this.configApiKey();
            }
            else if (action === 'tool') {
                await this.selectAndConfigureTool();
            }
            else if (action === 'install_tools') {
                await this.showInstallToolsMenu();
            }
            else if (action === 'profile') {
                await this.showProfileMenu();
            }
        }
    }
    async showProfileMenu() {
        while (true) {
            this.resetScreen();
            this.createBox('配置模板管理 (Profile)');
            const profiles = profileManager.listProfiles();
            const activeProfile = profileManager.getActiveProfile();
            const currentConfig = configManager.getConfig();

            // 显示当前活跃 profile
            if (activeProfile) {
                console.log(chalk.green(`  当前模板: ${activeProfile}`));
            } else {
                console.log(chalk.gray('  当前未使用任何模板'));
            }
            console.log('');

            const choices = [];
            // 保存当前配置
            choices.push({ name: '>   ' + chalk.green.bold('保存当前配置为新模板'), value: 'save' });

            if (profiles.length > 0) {
                choices.push(new inquirer.Separator(chalk.yellow.bold('已保存的模板:')));
                for (const name of profiles) {
                    const isActive = name === activeProfile;
                    const profileConfig = profileManager.loadProfile(name);
                    const providerId = profileConfig?.provider_id || profileConfig?.plan;
                    const providerName = providerId ? (() => { const p = getProviderById(providerId); return p ? p.name : providerId; })() : '未设置';
                    const marker = isActive ? chalk.green(' ← 当前') : '';
                    choices.push({
                        name: `  ${isActive ? '●' : '○'} ${chalk.white(name)} ${chalk.gray(`(${providerName})`)}${marker}`,
                        value: `profile:${name}`
                    });
                }
            }

            choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { action } = await this.promptWithHints([{
                type: 'list', name: 'action',
                message: '选择操作:',
                choices,
                pageSize: 15
            }]);

            if (action === 'exit') { console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message'))); process.exit(0); }
            else if (action === 'back') { return; }
            else if (action === 'save') {
                const { profileName } = await inquirer.prompt([{
                    type: 'input', name: 'profileName',
                    message: '输入模板名称:',
                    validate: (input) => input && input.trim().length > 0 && /^[\w-]+$/.test(input.trim()) ? true : '请输入有效的名称（字母、数字、下划线、横线）'
                }]);
                profileManager.saveProfile(profileName.trim(), currentConfig);
                console.log(chalk.green(`\n  ✓ 配置已保存为模板: ${profileName.trim()}`));
                await new Promise(r => setTimeout(r, 1000));
            }
            else if (action.startsWith('profile:')) {
                const name = action.replace('profile:', '');
                const profileConfig = profileManager.loadProfile(name);
                if (!profileConfig) continue;

                this.resetScreen();
                this.createBox(`模板: ${name}`);
                const providerId = profileConfig.provider_id || profileConfig.plan;
                if (providerId) {
                    const p = getProviderById(providerId);
                    console.log(chalk.gray('  Provider: ') + chalk.white(p ? p.name : providerId));
                }
                if (profileConfig.provider_selected_model) {
                    console.log(chalk.gray('  Model: ') + chalk.white(profileConfig.provider_selected_model));
                }
                if (profileConfig.api_key) {
                    console.log(chalk.gray('  API Key: ') + chalk.gray(`(${profileConfig.api_key.slice(0, 4)}****)`));
                }
                console.log('');

                const actions = [];
                if (name !== activeProfile) {
                    actions.push({ name: '>   切换到此模板', value: 'use' });
                }
                actions.push({ name: '*   ' + chalk.red('删除此模板'), value: 'delete' });
                actions.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' });

                const { detailAction } = await this.promptWithHints([{
                    type: 'list', name: 'detailAction',
                    message: '选择操作:',
                    pageSize: 15,
                    choices: actions
                }]);

                if (detailAction === 'use') {
                    if (profileConfig.provider_id) configManager.setProviderId(profileConfig.provider_id);
                    if (profileConfig.api_key) configManager.setApiKey(profileConfig.api_key);
                    if (profileConfig.provider_base_url) configManager.setProviderBaseUrl(profileConfig.provider_base_url);
                    if (profileConfig.provider_selected_model) configManager.setProviderModel(profileConfig.provider_selected_model);
                    if (profileConfig.plan) configManager.setPlan(profileConfig.plan);
                    profileManager.setActiveProfile(name);
                    console.log(chalk.green(`\n  ✓ 已切换到模板: ${name}`));
                    await new Promise(r => setTimeout(r, 1000));
                } else if (detailAction === 'delete') {
                    profileManager.deleteProfile(name);
                    if (name === activeProfile) profileManager.setActiveProfile(null);
                    console.log(chalk.green(`\n  ✓ 已删除模板: ${name}`));
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
    }
    async showInstallToolsMenu() {
        while (true) {
            this.resetScreen();
            this.createBox('安装编码工具');
            const supportedTools = toolManager.getSupportedTools();
            const choices = [];
            for (const tool of supportedTools) {
                const isInstalled = toolManager.isToolInstalled(tool.name);
                const status = isInstalled ? chalk.green(' [已安装]') : chalk.gray(' [未安装]');
                choices.push({
                    name: `  ${tool.displayName}${status}`,
                    value: tool.name,
                    disabled: isInstalled
                });
            }
            choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { selectedTool } = await this.promptWithHints([{
                type: 'list',
                name: 'selectedTool',
                message: '选择要安装的工具:',
                choices,
                pageSize: 15
            }]);
            if (selectedTool === 'exit') { console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message'))); process.exit(0); }
            else if (selectedTool === 'back') { return; }
            else {
                const tool = SUPPORTED_TOOLS[selectedTool];
                console.log(chalk.cyan(`\n  ${tool.displayName}`));
                console.log(chalk.gray(`  安装命令: ${tool.installCommand}`));
                console.log('');
                const { confirmInstall } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirmInstall',
                    message: `确认安装 ${tool.displayName}?`,
                    default: true
                }]);
                if (confirmInstall) {
                    try {
                        await toolManager.installTool(selectedTool);
                        await new Promise(r => setTimeout(r, 600));
                    } catch (error) {
                        logger.logError('Wizard.showInstallToolsMenu', error);
                        console.error(chalk.red('安装失败: ' + (error.message || error)));
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }
        }
    }
    async showToolMenu(toolName) {
        while (true) {
            this.resetScreen();
            const title = `${SUPPORTED_TOOLS[toolName].displayName} ${i18n.t('wizard.menu_title')}`;
            this.createBox(title);
            if (toolName === 'claude-code' || toolName === 'opencode' || toolName === 'crush' || toolName === 'factory-droid' || toolName === 'aider' || toolName === 'goose' || toolName === 'gemini-cli' || toolName === 'codex-cli') {
                console.log(chalk.yellow.bold(i18n.t('wizard.global_config_warning', { tool: SUPPORTED_TOOLS[toolName].displayName })));
                console.log('');
                if (toolName === 'factory-droid') {
                    console.log(chalk.yellow('ℹ️  ' + i18n.t('wizard.factory_droid_login_hint')));
                    console.log('');
                }
            }
            let actionText = '';
            const chelperConfig = configManager.getConfig();
            const chelperProviderId = chelperConfig.provider_id || chelperConfig.plan || null;
            // 根据工具类型获取当前配置
            const detectedConfig = toolName === 'opencode'
                ? openCodeManager.detectCurrentConfig()
                : toolName === 'crush'
                    ? crushManager.detectCurrentConfig()
                    : toolName === 'factory-droid'
                        ? factoryDroidManager.detectCurrentConfig()
                        : toolName === 'aider'
                            ? aiderManager.detectCurrentConfig()
                            : toolName === 'goose'
                                ? gooseManager.detectCurrentConfig()
                                : toolName === 'gemini-cli'
                                    ? geminiCliManager.detectCurrentConfig()
                                    : toolName === 'codex-cli'
                                        ? codexCliManager.detectCurrentConfig()
                                        : claudeCodeManager.detectCurrentConfig();
            // Normalize: support old { plan } format and new { providerId } format
            const detectedProviderId = detectedConfig.providerId || detectedConfig.plan || null;
            const detectedApiKey = detectedConfig.apiKey || null;
            const detectedModelName = detectedConfig.modelName || null;
            // 显示 chelper 配置
            console.log(chalk.cyan.bold(i18n.t('wizard.chelper_config_title') + ':'));
            if (chelperProviderId) {
                const provider = getProviderById(chelperProviderId);
                const displayName = provider ? provider.name : chelperProviderId;
                console.log(chalk.gray('  AI Provider: ') + chalk.green(displayName));
            } else {
                console.log(chalk.gray('  AI Provider: ') + chalk.red(i18n.t('wizard.not_set')));
            }
            if (chelperConfig.api_key) {
                console.log(chalk.gray('  ' + i18n.t('wizard.config_api_key') + ': ') + chalk.gray(i18n.t('wizard.api_key_set') + ' (' + chelperConfig.api_key.slice(0, 4) + '****)'));
            } else {
                console.log(chalk.gray('  ' + i18n.t('wizard.config_api_key') + ': ') + chalk.red(i18n.t('wizard.not_set')));
            }
            console.log('');
            // 显示工具当前配置
            console.log(chalk.yellow.bold(SUPPORTED_TOOLS[toolName].displayName + ' ' + i18n.t('wizard.config_title') + ':'));
            if (detectedProviderId) {
                const provider = getProviderById(detectedProviderId);
                const displayName = provider ? provider.name : detectedProviderId;
                console.log(chalk.gray('  AI Provider: ') + chalk.green(displayName));
                if (detectedModelName) {
                    console.log(chalk.gray('  Model: ') + chalk.green(detectedModelName));
                }
            } else {
                console.log(chalk.gray('  AI Provider: ') + chalk.red(i18n.t('wizard.not_set')));
            }
            if (detectedApiKey) {
                console.log(chalk.gray('  ' + i18n.t('wizard.config_api_key') + ': ') + chalk.gray(i18n.t('wizard.api_key_set') + ' (' + detectedApiKey.slice(0, 4) + '****)'));
            } else {
                console.log(chalk.gray('  ' + i18n.t('wizard.config_api_key') + ': ') + chalk.red(i18n.t('wizard.not_set')));
            }
            console.log('');
            // 兼容性检查
            const isCompatible = !chelperProviderId || toolManager.isProviderCompatible(chelperProviderId, toolName);
            const configMatches = detectedProviderId === chelperProviderId && detectedApiKey === chelperConfig.api_key;
            const chelperProvider = chelperProviderId ? getProviderById(chelperProviderId) : null;
            const chelperProviderName = chelperProvider ? chelperProvider.name : (chelperProviderId || '');
            if (!isCompatible) {
                console.log(chalk.red('  ✖  ' + `Provider '${chelperProviderName}' 与 ${SUPPORTED_TOOLS[toolName].displayName} 不兼容`));
                actionText = `${chelperProviderName} 不支持 ${SUPPORTED_TOOLS[toolName].displayName}`;
            } else if (detectedProviderId && configMatches) {
                console.log(chalk.green('  ✅ ' + i18n.t('wizard.config_synced')));
                actionText = `配置刷新 - (更新 ${SUPPORTED_TOOLS[toolName].displayName} 的 ${chelperProviderName} 配置)`;
            } else if (detectedProviderId) {
                console.log(chalk.yellow('  ⚠️  ' + i18n.t('wizard.config_out_of_sync')));
                actionText = `配置装载 - (将 ${chelperProviderName} 配置应用到 ${SUPPORTED_TOOLS[toolName].displayName})`;
            } else {
                console.log(chalk.blue('  ℹ️  ' + i18n.t('wizard.config_not_loaded', { 'tool': SUPPORTED_TOOLS[toolName].displayName })));
                actionText = `配置装载 - (将 ${chelperProviderName} 配置应用到 ${SUPPORTED_TOOLS[toolName].displayName})`;
            }
            console.log('');
            const choices = [];
            if (isCompatible) {
                choices.push({ name: '>   ' + actionText, value: 'load_provider' });
            }
            if (detectedProviderId && detectedApiKey) {
                const detectedProvider = getProviderById(detectedProviderId);
                const detectedProviderName = detectedProvider ? detectedProvider.name : detectedProviderId;
                choices.push({ name: '>   ' + `配置卸载 - (从 ${SUPPORTED_TOOLS[toolName].displayName} 中移除 ${detectedProviderName} 配置)`, value: 'unload_provider' });
            }
            choices.push({ name: '>   ' + i18n.t('wizard.action_mcp_config'), value: 'mcp_config' });
            if (toolName === 'opencode') {
                choices.push({ name: '>   ' + chalk.cyan('Skills 配置管理'), value: 'skills_config' });
            }
            if (toolName === 'claude-code') {
                choices.push({ name: '>   ' + i18n.t('wizard.action_plugin_marketplace'), value: 'plugin_marketplace' });
            }
            if (detectedProviderId && isCompatible) {
                choices.push({ name: '>   ' + i18n.t('wizard.start_tool', { 'tool': SUPPORTED_TOOLS[toolName].displayName, 'shell': SUPPORTED_TOOLS[toolName].command }), value: 'start_tool', disabled: toolName === 'opencode' && process.platform === 'win32' });
            }
            choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { action } = await this.promptWithHints([
                {
                    type: 'list',
                    name: 'action',
                    message: i18n.t('wizard.select_action'),
                    loop: false,
                    pageSize: 15,
                    choices
                }
            ]);
            if (action === 'exit') {
                console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
                process.exit(0);
            }
            else if (action === 'back') {
                return;
            }
            else if (action === 'load_provider') {
                // 配置预览
                const provider = getProviderById(chelperProviderId);
                if (provider) {
                    console.log(chalk.cyan('\n  配置变更预览:'));
                    if (detectedProviderId && detectedProviderId !== chelperProviderId) {
                        const oldProvider = getProviderById(detectedProviderId);
                        console.log(chalk.yellow(`    Provider: ${oldProvider ? oldProvider.name : detectedProviderId} → ${provider.name}`));
                    } else {
                        console.log(chalk.green(`    Provider: ${provider.name}`));
                    }
                    const selectedModel = chelperConfig.provider_selected_model || provider.defaultModel;
                    if (detectedModelName && detectedModelName !== selectedModel) {
                        console.log(chalk.yellow(`    Model: ${detectedModelName} → ${selectedModel}`));
                    } else {
                        console.log(chalk.green(`    Model: ${selectedModel}`));
                    }
                    console.log('');
                }
                const { confirmLoad } = await inquirer.prompt([{
                    type: 'confirm', name: 'confirmLoad',
                    message: '确认应用配置？',
                    default: true
                }]);
                if (!confirmLoad) continue;

                // 备份工具配置
                const toolDef = SUPPORTED_TOOLS[toolName];
                if (toolDef?.configPath) {
                    backupToolConfig(toolName, toolDef.configPath);
                }

                if (chelperProviderId && chelperProviderId.startsWith('glm_coding_plan')) {
                    await this.loadGLMConfig(toolName);
                } else if (chelperProviderId) {
                    await this.loadProviderConfig(toolName, chelperProviderId);
                }
            }
            else if (action === 'unload_provider') {
                const providerToUnload = detectedProviderId || chelperProviderId;
                if (providerToUnload) {
                    if (providerToUnload.startsWith('glm_coding_plan')) {
                        await this.unloadGLMConfig(toolName);
                    } else {
                        await this.unloadProviderConfig(toolName, providerToUnload);
                    }
                }
            }
            else if (action === 'mcp_config') {
                await this.showMCPMenu(toolName);
            }
            else if (action === 'skills_config') {
                await this.showSkillsMenu();
            }
            else if (action === 'plugin_marketplace') {
                await this.showPluginMarketplace();
            }
            else if (action === 'start_tool') {
                await this.startTool(toolName);
            }
        }
    }
    async startTool(toolName) {
        const tool = SUPPORTED_TOOLS[toolName];
        if (!tool) {
            throw new Error(`Unknown tool: ${toolName}`);
        }
        // 特殊处理 factory-droid：检查并设置 FACTORY_API_KEY 环境变量
        if (toolName === 'factory-droid' && !process.env.FACTORY_API_KEY) {
            let setEnvCommand;
            if (process.platform === 'win32') {
                // Windows: 检测是否是 PowerShell
                const isPowerShell = process.env.PSModulePath !== undefined;
                if (isPowerShell) {
                    setEnvCommand = '$env:FACTORY_API_KEY="fk-demo"';
                }
                else {
                    setEnvCommand = 'set FACTORY_API_KEY=fk-demo';
                }
            }
            else {
                // macOS/Linux
                setEnvCommand = 'export FACTORY_API_KEY=fk-demo';
            }
            console.log(chalk.gray('$ ') + chalk.white(setEnvCommand));
            // 设置当前进程的环境变量
            process.env.FACTORY_API_KEY = 'fk-demo';
        }
        console.log(chalk.gray('$ ') + chalk.white(tool.command));
        const spinner = ora({
            text: i18n.t('wizard.starting_tool'),
            spinner: 'star2'
        }).start();
        try {
            if (toolName === 'factory-droid' && !toolManager.isToolInstalled(toolName)) {
                // 工具未安装时，执行命令前刷新 PATH，确保新安装的命令能被识别
                if (process.platform === 'win32') {
                    // Windows: 刷新 PATH 环境变量
                    // PowerShell 和 CMD 需要重新读取注册表中的 PATH
                    const isPowerShell = process.env.PSModulePath !== undefined;
                    if (isPowerShell) {
                        // PowerShell: 刷新环境变量
                        execSync(`$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); ${tool.command}`, {
                            stdio: 'inherit',
                            shell: 'powershell.exe'
                        });
                    }
                    else {
                        // CMD: 直接执行，CMD 每次都会重新读取 PATH
                        execSync(tool.command, { stdio: 'inherit', shell: 'cmd.exe' });
                    }
                }
                else {
                    // macOS/Linux: source shell 配置文件刷新 PATH
                    const shell = process.env.SHELL || '/bin/bash';
                    const rcFile = shell.includes('zsh') ? '~/.zshrc' : '~/.bashrc';
                    execSync(`source ${rcFile} 2>/dev/null || true; ${tool.command}`, {
                        stdio: 'inherit',
                        shell
                    });
                }
            }
            else {
                // 工具已安装，直接执行
                execSync(tool.command, { stdio: 'inherit' });
            }
            spinner.succeed(i18n.t('wizard.tool_started'));
        }
        catch (error) {
            logger.logError('Wizard.startTool', error);
            spinner.fail(i18n.t('wizard.tool_start_failed'));
            throw error;
        }
    }
    async loadGLMConfig(toolName) {
        const spinner = ora({
            text: i18n.t('wizard.loading_glm_config'),
            spinner: 'star2'
        }).start();
        try {
            const config = configManager.getConfig();
            if (!config.plan || !config.api_key) {
                spinner.fail(i18n.t('wizard.missing_config'));
                await new Promise(resolve => setTimeout(resolve, 800));
                return;
            }
            toolManager.loadGLMConfig(toolName, config.plan, config.api_key);
            await new Promise(resolve => setTimeout(resolve, 800));
            spinner.succeed(chalk.green(i18n.t('wizard.glm_config_loaded', { tool: SUPPORTED_TOOLS[toolName].displayName })));
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        catch (error) {
            logger.logError('Wizard.loadGLMConfig', error);
            spinner.fail(i18n.t('wizard.glm_config_failed'));
            await new Promise(resolve => setTimeout(resolve, 800));
            console.error(error);
        }
    }
    async unloadGLMConfig(toolName) {
        // 确认卸载操作
        const { confirm } = await this.promptWithHints([
            {
                type: 'confirm',
                name: 'confirm',
                message: i18n.t('wizard.confirm_unload_glm', { tool: SUPPORTED_TOOLS[toolName].displayName }),
                default: false
            }
        ]);
        if (!confirm) {
            return;
        }
        const spinner = ora({
            text: i18n.t('wizard.unloading_glm_config'),
            spinner: 'star2'
        }).start();
        try {
            // 添加短暂延迟，让动画效果更流畅
            await new Promise(resolve => setTimeout(resolve, 300));
            if (toolName === 'claude-code') {
                claudeCodeManager.unloadGLMConfig();
            }
            else if (toolName === 'opencode') {
                openCodeManager.unloadGLMConfig();
            }
            else if (toolName === 'crush') {
                crushManager.unloadGLMConfig();
            }
            else if (toolName === 'factory-droid') {
                factoryDroidManager.unloadGLMConfig();
            }
            else {
                spinner.fail(i18n.t('wizard.tool_not_supported'));
                await new Promise(resolve => setTimeout(resolve, 800));
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            spinner.succeed(chalk.green(i18n.t('wizard.glm_config_unloaded')));
            await new Promise(resolve => setTimeout(resolve, 800));
        }
        catch (error) {
            logger.logError('Wizard.unloadGLMConfig', error);
            spinner.fail(i18n.t('wizard.glm_config_unload_failed'));
            await new Promise(resolve => setTimeout(resolve, 800));
            console.error(error);
        }
    }
    async loadProviderConfig(toolName, providerId) {
        const provider = getProviderById(providerId);
        if (!provider) {
            console.log(chalk.red(`Unknown provider: ${providerId}`));
            return;
        }
        const spinner = ora({ text: `正在配置 ${provider.name}...`, spinner: 'star2' }).start();
        try {
            const currentConfig = configManager.getConfig();
            // Build models map from persisted selected model
            const selectedModel = currentConfig.provider_selected_model;
            let models = {};
            if (selectedModel) {
                models = { [selectedModel]: { name: selectedModel } };
            } else if (provider.models) {
                for (const [modelId, modelInfo] of Object.entries(provider.models)) {
                    models[modelId] = { name: modelInfo.name || modelId };
                }
            }
            const userConfig = {
                apiKey: currentConfig.api_key,
                baseURL: currentConfig.provider_base_url || provider.baseURL,
                models: models,
                customModelName: selectedModel || provider.defaultModel,
                selectedModel: selectedModel || provider.defaultModel
            };
            toolManager.loadProviderConfig(toolName, providerId, userConfig);
            await new Promise(resolve => setTimeout(resolve, 800));
            spinner.succeed(chalk.green(`${provider.name} 配置已加载到 ${SUPPORTED_TOOLS[toolName].displayName}`));
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            logger.logError('Wizard.loadProviderConfig', error);
            spinner.fail(`配置 ${provider.name} 失败`);
            await new Promise(resolve => setTimeout(resolve, 800));
            console.error(error);
        }
    }
    async unloadProviderConfig(toolName, providerId) {
        const provider = getProviderById(providerId);
        if (!provider) return;
        const { confirm } = await this.promptWithHints([{
            type: 'confirm', name: 'confirm',
            message: `确认要卸载 ${SUPPORTED_TOOLS[toolName].displayName} 中的 ${provider.name} 配置吗？`,
            default: false
        }]);
        if (!confirm) return;
        const spinner = ora({ text: `正在卸载 ${provider.name} 配置...`, spinner: 'star2' }).start();
        try {
            toolManager.unloadProviderConfig(toolName, providerId);
            await new Promise(resolve => setTimeout(resolve, 500));
            spinner.succeed(chalk.green(`${provider.name} 配置已卸载`));
            await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
            logger.logError('Wizard.unloadProviderConfig', error);
            spinner.fail(`卸载 ${provider.name} 配置失败`);
            await new Promise(resolve => setTimeout(resolve, 800));
            console.error(error);
        }
    }
    async showSkillsMenu() {
        while (true) {
            this.resetScreen();
            this.createBox('OpenCode Skills 管理');
            const skills = openCodeSkillsManager.listSkills();
            console.log(chalk.gray(`  已安装 ${skills.length} 个 Skills`));
            console.log('');
            const choices = [];
            // 安装新 skill
            choices.push({ name: '>   ' + chalk.green.bold('从 GitHub 安装新 Skill'), value: 'install_new' });
            if (skills.length > 0) {
                choices.push(new inquirer.Separator(chalk.yellow.bold('已安装的 Skills:')));
                for (const skill of skills) {
                    const status = skill.exists ? chalk.green('[+]') : chalk.red('[!]');
                    const sourceTag = skill.source ? chalk.gray(` (${skill.source})`) : '';
                    const desc = skill.description ? chalk.gray(` — ${skill.description.substring(0, 60)}${skill.description.length > 60 ? '...' : ''}`) : '';
                    choices.push({
                        name: `  ${status} ${chalk.white(skill.name)}${sourceTag}${desc}`,
                        value: `skill:${skill.name}`
                    });
                }
            }
            choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { selected } = await this.promptWithHints([{
                type: 'list', name: 'selected',
                message: '选择操作:',
                choices,
                pageSize: 20
            }]);
            if (selected === 'exit') { console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message'))); process.exit(0); }
            else if (selected === 'back') { return; }
            else if (selected === 'install_new') { await this.installSkill(); }
            else if (selected.startsWith('skill:')) {
                const skillName = selected.replace('skill:', '');
                await this.showSkillDetail(skillName);
            }
        }
    }
    async installSkill() {
        this.resetScreen();
        this.createBox('安装新 Skill');
        console.log(chalk.gray('  从 GitHub 仓库安装 Skill（仓库需包含 SKILL.md 或 skills/ 目录）'));
        console.log('');
        const { repoUrl } = await inquirer.prompt([{
            type: 'input',
            name: 'repoUrl',
            message: '请输入 GitHub 仓库 URL:',
            validate: (input) => input.includes('github.com') ? true : '请输入有效的 GitHub URL'
        }]);
        const spinner = ora({ text: '正在克隆仓库并安装...', spinner: 'star2' }).start();
        try {
            const installed = openCodeSkillsManager.installFromGithub(repoUrl);
            await new Promise(r => setTimeout(r, 500));
            spinner.succeed(chalk.green(`安装成功! 已安装 ${installed.length} 个 Skill: ${installed.join(', ')}`));
            await new Promise(r => setTimeout(r, 1200));
        } catch (error) {
            spinner.fail(chalk.red('安装失败: ' + error.message));
            logger.logError('Wizard.installSkill', error);
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    async showSkillDetail(skillName) {
        const skills = openCodeSkillsManager.listSkills();
        const skill = skills.find(s => s.name === skillName);
        if (!skill) return;
        this.resetScreen();
        this.createBox(skill.name);
        console.log(chalk.gray('  名称: ') + chalk.white(skill.name));
        if (skill.description) {
            const shortDesc = skill.description.length > 200 ? skill.description.substring(0, 200) + '...' : skill.description;
            console.log(chalk.gray('  描述: ') + chalk.white(shortDesc));
        }
        if (skill.source) console.log(chalk.gray('  来源: ') + chalk.white(skill.source));
        if (skill.sourceUrl) console.log(chalk.gray('  URL:  ') + chalk.white(skill.sourceUrl));
        if (skill.installedAt) console.log(chalk.gray('  安装: ') + chalk.white(skill.installedAt.substring(0, 10)));
        const exists = skill.exists ? chalk.green('已安装') : chalk.red('文件缺失');
        console.log(chalk.gray('  状态: ') + exists);
        const choices = [
            { name: '*   ' + chalk.red('卸载此 Skill'), value: 'uninstall' },
            new inquirer.Separator(),
            { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' },
            { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' }
        ];
        const { action } = await this.promptWithHints([{ type: 'list', name: 'action', message: '选择操作:', pageSize: 15, choices }]);
        if (action === 'exit') { console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message'))); process.exit(0); }
        else if (action === 'uninstall') {
            const spinner = ora({ text: '正在卸载...', spinner: 'star2' }).start();
            try {
                openCodeSkillsManager.uninstallSkill(skillName);
                await new Promise(r => setTimeout(r, 500));
                spinner.succeed(chalk.green(`已卸载 Skill: ${skillName}`));
                await new Promise(r => setTimeout(r, 1000));
            } catch (error) {
                spinner.fail(chalk.red('卸载失败: ' + error.message));
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }
    async showMCPMenu(toolName) {
        while (true) {
            this.resetScreen();
            const allServices = mcpManager.getPresetServices();
            const config = configManager.getConfig();
            const currentProvider = config.provider_id || config.plan || null;
            const isGLM = currentProvider && currentProvider.startsWith('glm_coding_plan');
            // 过滤：GLM 专属 MCP 只在 GLM provider 下显示，通用 MCP 始终显示
            const presetServices = allServices.filter(mcp => {
                if (mcp.providerRequired === 'glm') return isGLM;
                return true;
            });
            const mcpStatus = mcpManager.getMCPStatus(toolName);
            const title = `${i18n.t('wizard.mcp_menu_title')}`;
            this.createBox(title);
            // 检查是否有任何 GLM 套餐 MCP 已安装
            const glmServices = presetServices.filter(mcp => mcp.providerRequired === 'glm');
            const hasInstalledPresetMCP = glmServices.length > 0 && glmServices.some(mcp => mcpStatus.get(mcp.id));
            // 如果没有安装任何 GLM 套餐 MCP，显示提示信息
            if (isGLM && !hasInstalledPresetMCP) {
                console.log(chalk.blue('ℹ️  ' + i18n.t('wizard.no_preset_mcp_installed')));
                console.log('');
            }
            // 内置 MCP 服务
            const choices = [];
            // 如果是 GLM 且没有安装任何 GLM 套餐 MCP，添加一键安装选项
            if (isGLM && !hasInstalledPresetMCP) {
                choices.push({
                    name: '>   ' + chalk.green.bold(i18n.t('wizard.action_install_all_mcp')),
                    value: 'install_all'
                });
                choices.push(new inquirer.Separator());
            }
            // GLM 专属 MCP 服务
            if (isGLM && glmServices.length > 0) {
                choices.push({
                    name: chalk.yellow.bold(`✨ ${i18n.t('wizard.builtin_mcp_services')}:`),
                    value: 'builtin_header',
                    disabled: true
                });
                const glmChoices = glmServices.map(mcp => ({
                    name: `  ${mcpStatus.get(mcp.id) ? '[+]' : '[ ]'} ${mcp.name} ${chalk.gray('(' + mcp.protocol + ')')} - ${chalk.gray(mcp.description)}`,
                    value: `builtin:${mcp.id}`
                }));
                choices.push(...glmChoices);
                choices.push(new inquirer.Separator());
            }
            // 通用 MCP 服务
            const generalServices = presetServices.filter(mcp => !mcp.providerRequired);
            if (generalServices.length > 0) {
                choices.push({
                    name: chalk.cyan.bold(`🔧 通用 MCP 服务:`),
                    value: 'general_header',
                    disabled: true
                });
                const generalChoices = generalServices.map(mcp => ({
                    name: `  ${mcpStatus.get(mcp.id) ? '[+]' : '[ ]'} ${mcp.name} ${chalk.gray('(' + mcp.protocol + ')')} - ${chalk.gray(mcp.description)}`,
                    value: `builtin:${mcp.id}`
                }));
                choices.push(...generalChoices);
            }
            // 如果是支持 MCP 管理的工具，显示其他 MCP 服务
            if (toolName === 'claude-code' || toolName === 'opencode' || toolName === 'crush' || toolName === 'factory-droid' || toolName === 'goose' || toolName === 'gemini-cli' || toolName === 'codex-cli') {
                const builtinIds = presetServices.map(mcp => mcp.id);
                const otherMCPs = toolName === 'opencode'
                    ? openCodeManager.getOtherMCPs(builtinIds)
                    : toolName === 'crush'
                        ? crushManager.getOtherMCPs(builtinIds)
                        : toolName === 'factory-droid'
                            ? factoryDroidManager.getOtherMCPs(builtinIds)
                            : toolName === 'goose'
                                ? gooseManager.getOtherMCPs(builtinIds)
                                : toolName === 'gemini-cli'
                                    ? geminiCliManager.getOtherMCPs(builtinIds)
                                    : toolName === 'codex-cli'
                                        ? codexCliManager.getOtherMCPs(builtinIds)
                                        : claudeCodeManager.getOtherMCPs(builtinIds);
                if (otherMCPs.length > 0) {
                    // 添加空行分隔
                    choices.push(new inquirer.Separator());
                    // 添加其他 MCP 服务标题
                    choices.push({
                        name: chalk.yellow.bold(`* ${i18n.t('wizard.other_mcp_services')}:`),
                        value: 'other_header',
                        disabled: true
                    });
                    const otherChoices = otherMCPs.map(({ id, config }) => ({
                        name: `  - ${id} ${chalk.gray('(' + config.type + ')')} ${chalk.blue('[' + i18n.t('wizard.other_mcp') + ']')}`,
                        value: `other:${id}`
                    }));
                    choices.push(...otherChoices);
                }
            }
            choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { selectedMCP } = await this.promptWithHints([
                {
                    type: 'list',
                    name: 'selectedMCP',
                    message: i18n.t('wizard.select_mcp'),
                    choices,
                    pageSize: 15
                }
            ]);
            if (selectedMCP === 'exit') {
                console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
                process.exit(0);
            }
            else if (selectedMCP === 'back') {
                return;
            }
            else if (selectedMCP === 'install_all') {
                await this.installAllPresetMCPs(toolName);
            }
            else if (selectedMCP.startsWith('builtin:')) {
                const mcpId = selectedMCP.replace('builtin:', '');
                await this.showMCPDetail(toolName, mcpId);
            }
            else if (selectedMCP.startsWith('other:')) {
                const mcpId = selectedMCP.replace('other:', '');
                await this.showOtherMCPDetail(toolName, mcpId);
            }
        }
    }
    async showPluginMarketplace() {
        const MARKETPLACE_NAME = 'zai-coding-plugins';
        const GITHUB_URL = 'https://github.com/zai-org/zai-coding-plugins';
        // Check if marketplace is installed
        let isInstalled = pluginMarketplaceManager.isMarketplaceInstalled(MARKETPLACE_NAME);
        if (!isInstalled) {
            this.resetScreen();
            this.createBox(i18n.t('wizard.plugin_marketplace_title'));
            console.log(chalk.yellow('⚠️  ' + i18n.t('wizard.plugin_marketplace_not_installed')));
            console.log('');
            const bundledPluginsDir = pluginMarketplaceManager.getBundledPluginsDir();
            console.log(chalk.gray('$ ') + chalk.white(`claude plugin marketplace add "${bundledPluginsDir}"`));
            const spinner = ora({
                text: i18n.t('wizard.plugin_marketplace_installing'),
                spinner: 'star2'
            }).start();
            try {
                const success = pluginMarketplaceManager.installMarketplace(bundledPluginsDir);
                await new Promise(resolve => setTimeout(resolve, 800));
                if (success) {
                    // Re-check installation status
                    isInstalled = pluginMarketplaceManager.isMarketplaceInstalled(MARKETPLACE_NAME);
                    if (isInstalled) {
                        spinner.succeed(chalk.green(i18n.t('wizard.plugin_marketplace_installed')));
                    }
                    else {
                        spinner.fail(chalk.red(i18n.t('wizard.plugin_marketplace_install_failed')));
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        return;
                    }
                }
                else {
                    spinner.fail(chalk.red(i18n.t('wizard.plugin_marketplace_install_failed')));
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    return;
                }
            }
            catch (error) {
                logger.logError('Wizard.showPluginMarketplace', error);
                spinner.fail(chalk.red(i18n.t('wizard.plugin_marketplace_install_failed')));
                await new Promise(resolve => setTimeout(resolve, 1500));
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 800));
        }
        // Get marketplace info and config
        const marketplaceInfo = pluginMarketplaceManager.getMarketplaceInfo(MARKETPLACE_NAME);
        if (!marketplaceInfo) {
            console.log(chalk.red('Failed to get marketplace info'));
            await new Promise(resolve => setTimeout(resolve, 1500));
            return;
        }
        const marketplaceConfig = pluginMarketplaceManager.readMarketplaceConfig(marketplaceInfo.installLocation);
        if (!marketplaceConfig) {
            console.log(chalk.red('Failed to read marketplace config'));
            await new Promise(resolve => setTimeout(resolve, 1500));
            return;
        }
        // Show marketplace page with plugins
        while (true) {
            this.resetScreen();
            this.createBox(i18n.t('wizard.plugin_marketplace_title'));
            // Show GitHub link
            const clickableUrl = terminalLink(GITHUB_URL, GITHUB_URL, { fallback: () => GITHUB_URL });
            console.log(chalk.blue('🔗 GitHub: ' + clickableUrl));
            console.log('');
            // Get plugins status
            const pluginsStatus = pluginMarketplaceManager.getPluginsStatus(MARKETPLACE_NAME, marketplaceConfig.plugins);
            // Display plugin list header
            console.log(chalk.yellow.bold('📦 ' + i18n.t('wizard.plugin_list_title') + ':'));
            console.log('');
            // Build plugin choices
            const choices = [];
            for (const plugin of pluginsStatus) {
                // Use text labels with different colors for status
                let statusLabel;
                if (!plugin.isInstalled) {
                    statusLabel = chalk.gray('[' + i18n.t('wizard.plugin_status_not_installed') + ']');
                }
                else if (plugin.isEnabled) {
                    statusLabel = chalk.green('[' + i18n.t('wizard.plugin_status_enabled') + ']');
                }
                else {
                    statusLabel = chalk.yellow('[' + i18n.t('wizard.plugin_status_disabled') + ']');
                }
                choices.push({
                    name: `  ${statusLabel} ${chalk.white.bold(plugin.name)} ${chalk.cyan('[' + plugin.category + ']')} - ${chalk.gray(plugin.description)}`,
                    value: plugin.fullName
                });
            }
            choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { selectedPlugin } = await this.promptWithHints([
                {
                    type: 'list',
                    name: 'selectedPlugin',
                    message: i18n.t('wizard.select_plugin'),
                    choices,
                    pageSize: 15
                }
            ]);
            if (selectedPlugin === 'exit') {
                console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
                process.exit(0);
            }
            else if (selectedPlugin === 'back') {
                return;
            }
            else {
                // Find the plugin status
                const plugin = pluginsStatus.find(p => p.fullName === selectedPlugin);
                if (plugin) {
                    await this.showPluginDetail(plugin, MARKETPLACE_NAME);
                }
            }
        }
    }
    async showPluginDetail(plugin, marketplaceName) {
        while (true) {
            this.resetScreen();
            this.createBox(i18n.t('wizard.plugin_detail_title') + ': ' + plugin.name);
            // Show plugin info
            console.log(chalk.gray('  ' + i18n.t('wizard.plugin_name') + ': ') + chalk.white.bold(plugin.name));
            console.log(chalk.gray('  ' + i18n.t('wizard.plugin_category') + ': ') + chalk.cyan(plugin.category));
            console.log(chalk.gray('  ' + i18n.t('wizard.plugin_description') + ': ') + chalk.white(plugin.description));
            console.log('');
            // Show status with text labels
            const installedStatus = plugin.isInstalled
                ? chalk.green('[' + i18n.t('wizard.plugin_status_installed') + ']')
                : chalk.gray('[' + i18n.t('wizard.plugin_status_not_installed') + ']');
            console.log(chalk.gray('  ' + i18n.t('wizard.mcp_status') + ': ') + installedStatus);
            if (plugin.isInstalled) {
                const enabledStatus = plugin.isEnabled
                    ? chalk.green('[' + i18n.t('wizard.plugin_status_enabled') + ']')
                    : chalk.yellow('[' + i18n.t('wizard.plugin_status_disabled') + ']');
                console.log(chalk.gray('  ' + i18n.t('wizard.plugin_enable_status') + ': ') + enabledStatus);
            }
            console.log('');
            // Build action choices based on status
            const choices = [];
            if (!plugin.isInstalled) {
                choices.push({ name: '>   ' + i18n.t('wizard.plugin_action_install'), value: 'install' });
            }
            else {
                if (plugin.isEnabled) {
                    choices.push({ name: '>   ' + i18n.t('wizard.plugin_action_disable'), value: 'disable' });
                }
                else {
                    choices.push({ name: '>   ' + i18n.t('wizard.plugin_action_enable'), value: 'enable' });
                }
                // choices.push({ name: '>   ' + i18n.t('wizard.plugin_action_update'), value: 'update' });
                choices.push({ name: '*   ' + i18n.t('wizard.plugin_action_uninstall'), value: 'uninstall' });
            }
            choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
            const { action } = await this.promptWithHints([
                {
                    type: 'list',
                    name: 'action',
                    message: i18n.t('wizard.select_action'),
                    pageSize: 15,
                    choices
                }
            ]);            if (action === 'exit') {
                console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
                process.exit(0);
            }
            else if (action === 'back') {
                return;
            }
            // Execute plugin action
            let spinner;
            let success = false;
            switch (action) {
                case 'install':
                    console.log(chalk.gray('$ ') + chalk.white(`claude plugin install ${plugin.fullName}`));
                    spinner = ora({
                        text: i18n.t('wizard.plugin_installing'),
                        spinner: 'star2'
                    }).start();
                    success = pluginMarketplaceManager.installPlugin(plugin.fullName);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    if (success) {
                        spinner.succeed(chalk.green(i18n.t('wizard.plugin_install_success')));
                        plugin.isInstalled = true;
                        // Plugin is enabled by default after installation
                        plugin.isEnabled = pluginMarketplaceManager.isPluginEnabled(plugin.name, plugin.fullName.split('@')[1]);
                    }
                    else {
                        spinner.fail(chalk.red(i18n.t('wizard.plugin_install_failed')));
                    }
                    break;
                case 'uninstall':
                    console.log(chalk.gray('$ ') + chalk.white(`claude plugin uninstall ${plugin.fullName}`));
                    spinner = ora({
                        text: i18n.t('wizard.plugin_uninstalling'),
                        spinner: 'star2'
                    }).start();
                    success = pluginMarketplaceManager.uninstallPlugin(plugin.fullName);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    if (success) {
                        spinner.succeed(chalk.green(i18n.t('wizard.plugin_uninstall_success')));
                        plugin.isInstalled = false;
                        plugin.isEnabled = false;
                    }
                    else {
                        spinner.fail(chalk.red(i18n.t('wizard.plugin_uninstall_failed')));
                    }
                    break;
                case 'enable':
                    console.log(chalk.gray('$ ') + chalk.white(`claude plugin enable ${plugin.fullName}`));
                    spinner = ora({
                        text: i18n.t('wizard.plugin_enabling'),
                        spinner: 'star2'
                    }).start();
                    success = pluginMarketplaceManager.enablePlugin(plugin.fullName);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    if (success) {
                        spinner.succeed(chalk.green(i18n.t('wizard.plugin_enable_success')));
                        plugin.isEnabled = true;
                    }
                    else {
                        spinner.fail(chalk.red(i18n.t('wizard.plugin_enable_failed')));
                    }
                    break;
                case 'disable':
                    console.log(chalk.gray('$ ') + chalk.white(`claude plugin disable ${plugin.fullName}`));
                    spinner = ora({
                        text: i18n.t('wizard.plugin_disabling'),
                        spinner: 'star2'
                    }).start();
                    success = pluginMarketplaceManager.disablePlugin(plugin.fullName);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    if (success) {
                        spinner.succeed(chalk.green(i18n.t('wizard.plugin_disable_success')));
                        plugin.isEnabled = false;
                    }
                    else {
                        spinner.fail(chalk.red(i18n.t('wizard.plugin_disable_failed')));
                    }
                    break;
                case 'update':
                    console.log(chalk.gray('$ ') + chalk.white(`claude plugin update ${plugin.fullName}`));
                    spinner = ora({
                        text: i18n.t('wizard.plugin_updating'),
                        spinner: 'star2'
                    }).start();
                    success = pluginMarketplaceManager.updatePlugin(plugin.fullName);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    if (success) {
                        spinner.succeed(chalk.green(i18n.t('wizard.plugin_update_success')));
                    }
                    else {
                        spinner.fail(chalk.red(i18n.t('wizard.plugin_update_failed')));
                    }
                    break;
            }
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }
    async showMCPDetail(toolName, mcpId) {
        const mcp = mcpManager.getPresetServices().find(m => m.id === mcpId);
        if (!mcp)
            return;
        this.resetScreen();
        const isInstalled = mcpManager.isMCPInstalled(toolName, mcpId);
        const title = `${mcp.name}`;
        this.createBox(title);
        console.log(chalk.gray('  ' + i18n.t('wizard.mcp_protocol') + ': ') + chalk.white(mcp.protocol));
        console.log(chalk.gray('  ' + i18n.t('wizard.mcp_type') + ': ') + chalk.white(mcp.type));
        // 显示套餐类型（如果该 MCP 支持多套餐）
        const config = configManager.getConfig();
        let planName = null;
        // 对于 Vision MCP (stdio 协议且有 envTemplate)，根据已安装的环境变量判断
        if (mcp.protocol === 'stdio' && mcp.envTemplate && isInstalled) {
            // 读取已安装的 MCP 配置
            if (toolName === 'claude-code') {
                const allServers = claudeCodeManager.getAllMCPServers();
                const installedConfig = allServers[mcp.id];
                if (installedConfig && installedConfig.env) {
                    const zaiMode = installedConfig.env.Z_AI_MODE;
                    // 根据 Z_AI_MODE 判断套餐类型
                    if (zaiMode === 'ZAI') {
                        planName = i18n.t('wizard.plan_global');
                    }
                    else {
                        // 'ZHIPU' 或无值都认为是中国版
                        planName = i18n.t('wizard.plan_china');
                    }
                }
            }
            else if (toolName === 'opencode') {
                const allServers = openCodeManager.getAllMCPServers();
                const installedConfig = allServers[mcp.id];
                if (installedConfig && installedConfig.environment) {
                    const zaiMode = installedConfig.environment.Z_AI_MODE;
                    // 根据 Z_AI_MODE 判断套餐类型
                    if (zaiMode === 'ZAI') {
                        planName = i18n.t('wizard.plan_global');
                    }
                    else {
                        // 'ZHIPU' 或无值都认为是中国版
                        planName = i18n.t('wizard.plan_china');
                    }
                }
            }
            else if (toolName === 'crush') {
                const allServers = crushManager.getAllMCPServers();
                const installedConfig = allServers[mcp.id];
                if (installedConfig && installedConfig.env) {
                    const zaiMode = installedConfig.env.Z_AI_MODE;
                    // 根据 Z_AI_MODE 判断套餐类型
                    if (zaiMode === 'ZAI') {
                        planName = i18n.t('wizard.plan_global');
                    }
                    else {
                        // 'ZHIPU' 或无值都认为是中国版
                        planName = i18n.t('wizard.plan_china');
                    }
                }
            }
            else if (toolName === 'factory-droid') {
                const allServers = factoryDroidManager.getAllMCPServers();
                const installedConfig = allServers[mcp.id];
                if (installedConfig && installedConfig.env) {
                    const zaiMode = installedConfig.env.Z_AI_MODE;
                    // 根据 Z_AI_MODE 判断套餐类型
                    if (zaiMode === 'ZAI') {
                        planName = i18n.t('wizard.plan_global');
                    }
                    else {
                        // 'ZHIPU' 或无值都认为是中国版
                        planName = i18n.t('wizard.plan_china');
                    }
                }
            }
        }
        // 对于基于 URL 的 MCP (urlTemplate)，根据当前配置判断
        if (!planName && mcp.urlTemplate) {
            const currentPlan = config.plan || 'glm_coding_plan_china';
            planName = currentPlan === 'glm_coding_plan_global'
                ? i18n.t('wizard.plan_global')
                : i18n.t('wizard.plan_china');
        }
        // 对于未安装的 Vision MCP，根据当前配置显示将要使用的套餐类型
        if (!planName && mcp.envTemplate && !isInstalled) {
            const currentPlan = config.plan || 'glm_coding_plan_china';
            planName = currentPlan === 'glm_coding_plan_global'
                ? i18n.t('wizard.plan_global')
                : i18n.t('wizard.plan_china');
        }
        // 显示套餐类型
        if (planName) {
            console.log(chalk.gray('  ' + i18n.t('wizard.mcp_plan_type') + ': ') + chalk.green(planName));
        }
        console.log(chalk.gray('  ' + i18n.t('wizard.mcp_description') + ': ') + chalk.white(mcp.description));
        // 显示 URL 信息
        if (mcp.protocol === 'sse' || mcp.protocol === 'streamable-http') {
            if (mcp.urlTemplate) {
                const currentPlan = config.plan || 'glm_coding_plan_china';
                const currentUrl = mcp.urlTemplate[currentPlan];
                console.log(chalk.gray('  URL (' + currentPlan + '): ') + chalk.white(currentUrl));
            }
            else if (mcp.url) {
                console.log(chalk.gray('  URL: ') + chalk.white(mcp.url));
            }
        }
        const statusIcon = isInstalled ? '[+]' : '[ ]';
        const statusText = isInstalled ? chalk.green(i18n.t('wizard.installed')) : chalk.gray(i18n.t('wizard.not_installed'));
        console.log(chalk.gray('  ' + statusIcon + ' ' + i18n.t('wizard.mcp_status') + ': ') + statusText);
        const choices = [];
        if (!isInstalled) {
            choices.push({ name: '>   ' + i18n.t('wizard.action_install'), value: 'install' });
        }
        else {
            choices.push({ name: '*   ' + i18n.t('wizard.action_uninstall'), value: 'uninstall' });
        }
        choices.push(new inquirer.Separator(), { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' }, { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' });
        const { action } = await this.promptWithHints([
            {
                type: 'list',
                name: 'action',
                message: i18n.t('wizard.select_action'),
                pageSize: 15,
                choices
            }
        ]);
        if (action === 'exit') {
            console.log(chalk.green('\n👋 ' + i18n.t('wizard.goodbye_message')));
            process.exit(0);
        }
        else if (action === 'back') {
            return;
        }
        if (action === 'install') {
            const spinner = ora({
                text: i18n.t('wizard.installing_mcp'),
                spinner: 'star2'
            }).start();
            try {
                const config = configManager.getConfig();
                // 通用 MCP：如果需要额外 API Key（如 GitHub Token），先收集
                if (mcp.requiresApiKey && mcp.apiKeyEnvName) {
                    spinner.stop();
                    const { mcpApiKey } = await inquirer.prompt([{
                        type: 'password',
                        name: 'mcpApiKey',
                        message: `请输入 ${mcp.apiKeyHint || mcp.apiKeyEnvName}:`,
                        mask: '*'
                    }]);
                    if (mcpApiKey) {
                        mcp.env = { [mcp.apiKeyEnvName]: mcpApiKey };
                    }
                    spinner.start();
                }
                // Tavily 等 URL 拼 Key 模式
                if (mcp.requiresApiKey && mcp.urlWithKey) {
                    spinner.stop();
                    const { mcpApiKey } = await inquirer.prompt([{
                        type: 'password',
                        name: 'mcpApiKey',
                        message: `请输入 ${mcp.apiKeyHint || 'API Key'}:`,
                        mask: '*'
                    }]);
                    if (mcpApiKey) {
                        mcp.url = mcp.url + '?tavilyApiKey=' + mcpApiKey;
                    }
                    spinner.start();
                }
                mcpManager.installMCP(toolName, mcp, config.api_key, config.plan);
                await new Promise(resolve => setTimeout(resolve, 800));
                spinner.succeed(chalk.green(i18n.t('wizard.mcp_installed')));
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            catch (error) {
                logger.logError('Wizard.showMCPDetail.install', error);
                spinner.fail(i18n.t('wizard.mcp_install_failed'));
                await new Promise(resolve => setTimeout(resolve, 800));
                console.error(error);
            }
        }
        else if (action === 'uninstall') {
            const spinner = ora({
                text: i18n.t('wizard.uninstalling_mcp'),
                spinner: 'star2'
            }).start();
            try {
                mcpManager.uninstallMCP(toolName, mcpId);
                await new Promise(resolve => setTimeout(resolve, 800));
                spinner.succeed(chalk.green(i18n.t('wizard.mcp_uninstalled')));
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            catch (error) {
                logger.logError('Wizard.showMCPDetail.uninstall', error);
                spinner.fail(i18n.t('wizard.mcp_uninstall_failed'));
                await new Promise(resolve => setTimeout(resolve, 800));
                console.error(error);
            }
        }
    }
    async showOtherMCPDetail(toolName, mcpId) {
        if (toolName !== 'claude-code' && toolName !== 'opencode' && toolName !== 'crush' && toolName !== 'factory-droid' && toolName !== 'goose' && toolName !== 'gemini-cli' && toolName !== 'codex-cli')
            return;
        const allServers = toolName === 'opencode'
            ? openCodeManager.getAllMCPServers()
            : toolName === 'crush'
                ? crushManager.getAllMCPServers()
                : toolName === 'factory-droid'
                    ? factoryDroidManager.getAllMCPServers()
                    : toolName === 'goose'
                        ? gooseManager.getAllMCPServers()
                        : toolName === 'gemini-cli'
                            ? geminiCliManager.getAllMCPServers()
                            : toolName === 'codex-cli'
                                ? codexCliManager.getAllMCPServers()
                                : claudeCodeManager.getAllMCPServers();
        const mcpConfig = allServers[mcpId];
        if (!mcpConfig)
            return;
        this.resetScreen();
        const title = `${mcpId}`;
        this.createBox(title);
        console.log(chalk.gray('  ' + i18n.t('wizard.mcp_protocol') + ': ') + chalk.white(mcpConfig.type));
        if (mcpConfig.type === 'stdio' || mcpConfig.type === 'local') {
            // Claude Code 使用 command (string), OpenCode 使用 command (array)
            const command = Array.isArray(mcpConfig.command)
                ? mcpConfig.command.join(' ')
                : mcpConfig.command || 'N/A';
            console.log(chalk.gray('  Command: ') + chalk.white(command));
            if (mcpConfig.args && mcpConfig.args.length > 0) {
                console.log(chalk.gray('  Args: ') + chalk.white(mcpConfig.args.join(' ')));
            }
        }
        else if (mcpConfig.type === 'sse' || mcpConfig.type === 'http' || mcpConfig.type === 'remote') {
            console.log(chalk.gray('  URL: ') + chalk.white(mcpConfig.url || 'N/A'));
        }
        console.log(chalk.blue('\n  [i] ' + i18n.t('wizard.other_mcp_info')));
        console.log('');
        const choices = [
            { name: '*   ' + i18n.t('wizard.action_uninstall'), value: 'uninstall' },
            new inquirer.Separator(),
            { name: '<-  ' + i18n.t('wizard.nav_return'), value: 'back' },
            { name: 'x   ' + i18n.t('wizard.nav_exit'), value: 'exit' }
        ];
        const { action } = await this.promptWithHints([
            {
                type: 'list',
                name: 'action',
                message: i18n.t('wizard.select_action'),
                pageSize: 15,
                choices
            }
        ]);
        if (action === 'exit') {
            console.log(chalk.green('\n' + i18n.t('wizard.goodbye_message')));
            process.exit(0);
        }
        else if (action === 'back') {
            return;
        }
        if (action === 'uninstall') {
            const { confirm } = await this.promptWithHints([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: i18n.t('wizard.confirm_uninstall_other_mcp'),
                    default: false
                }
            ]);
            if (confirm) {
                const spinner = ora(i18n.t('wizard.uninstalling_mcp')).start();
                try {
                    if (toolName === 'opencode') {
                        openCodeManager.uninstallMCP(mcpId);
                    }
                    else if (toolName === 'crush') {
                        crushManager.uninstallMCP(mcpId);
                    }
                    else if (toolName === 'factory-droid') {
                        factoryDroidManager.uninstallMCP(mcpId);
                    }
                    else if (toolName === 'goose') {
                        gooseManager.uninstallMCP(mcpId);
                    }
                    else if (toolName === 'gemini-cli') {
                        geminiCliManager.uninstallMCP(mcpId);
                    }
                    else if (toolName === 'codex-cli') {
                        codexCliManager.uninstallMCP(mcpId);
                    }
                    else {
                        claudeCodeManager.uninstallMCP(mcpId);
                    }
                    spinner.succeed(i18n.t('wizard.mcp_uninstalled'));
                }
                catch (error) {
                    logger.logError('Wizard.showOtherMCPDetail.uninstall', error);
                    spinner.fail(i18n.t('wizard.mcp_uninstall_failed'));
                    console.error(error);
                }
            }
        }
    }
    async installAllPresetMCPs(toolName) {
        const config = configManager.getConfig();
        if (!config.plan || !config.api_key) {
            console.log(chalk.red('\n[!] ' + i18n.t('wizard.missing_config')));
            await new Promise(resolve => setTimeout(resolve, 1500));
            return;
        }
        const presetServices = mcpManager.getPresetServices();
        // 显示将要安装的服务列表
        this.resetScreen();
        this.createBox(i18n.t('wizard.action_install_all_mcp'));
        console.log(chalk.yellow(i18n.t('wizard.install_all_mcp_confirm')));
        console.log('');
        presetServices.forEach(mcp => {
            console.log(chalk.gray('  • ') + chalk.white(mcp.name) + chalk.gray(` (${mcp.protocol}) - ${mcp.description}`));
        });
        console.log('');
        const { confirm } = await this.promptWithHints([
            {
                type: 'confirm',
                name: 'confirm',
                message: i18n.t('wizard.select_action'),
                default: true
            }
        ]);
        if (!confirm) {
            return;
        }
        const spinner = ora({
            text: i18n.t('wizard.installing_all_mcp'),
            spinner: 'star2'
        }).start();
        let successCount = 0;
        let failCount = 0;
        const errors = [];
        for (const mcp of presetServices) {
            try {
                spinner.text = i18n.t('wizard.installing_all_mcp') + ` [${successCount + failCount + 1}/${presetServices.length}] ${mcp.name}`;
                mcpManager.installMCP(toolName, mcp, config.api_key, config.plan);
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            catch (error) {
                logger.logError('Wizard.installAllPresetMCPs', error);
                failCount++;
                errors.push(`${mcp.name}: ${error}`);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        if (failCount === 0) {
            spinner.succeed(chalk.green(i18n.t('wizard.all_mcp_installed') + ` (${successCount}/${presetServices.length})`));
        }
        else {
            spinner.warn(chalk.yellow(i18n.t('wizard.all_mcp_install_failed') + ` (${successCount}/${presetServices.length})`));
            if (errors.length > 0) {
                console.log(chalk.red('\n[!] ' + i18n.t('wizard.mcp_install_failed') + ':'));
                errors.forEach(err => console.log(chalk.gray('  • ') + chalk.red(err)));
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}
export const wizard = Wizard.getInstance();
