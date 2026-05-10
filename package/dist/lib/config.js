import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as yaml from 'js-yaml';
import { logger } from '../utils/logger.js';
const MAX_BACKUPS = 3;
function atomicWrite(filePath, content) {
    const tmpPath = filePath + '.tmp';
    writeFileSync(tmpPath, content, 'utf-8');
    renameSync(tmpPath, filePath);
}
export class ConfigManager {
    static instance;
    configDir;
    configPath;
    config;
    constructor() {
        // chelper 配置文件路径（跨平台支持）
        // - macOS/Linux: ~/.chelper/config.yaml
        // - Windows: %USERPROFILE%\.chelper\config.yaml
        //   (例如: C:\Users\username\.chelper\config.yaml)
        this.configDir = join(homedir(), '.chelper');
        this.configPath = join(this.configDir, 'config.yaml');
        this.config = this.loadConfig();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    ensureConfigDir() {
        if (!existsSync(this.configDir)) {
            mkdirSync(this.configDir, { recursive: true });
        }
    }
    loadConfig() {
        try {
            if (existsSync(this.configPath)) {
                const fileContent = readFileSync(this.configPath, 'utf-8');
                const config = yaml.load(fileContent);
                return config || { lang: 'en_US' };
            }
        }
        catch (error) {
            console.warn('Failed to load config, using defaults:', error);
            logger.logError('ConfigManager.loadConfig', error);
        }
        return { lang: 'en_US' };
    }
    saveConfig(config) {
        try {
            this.ensureConfigDir();
            const configToSave = config || this.config;
            const yamlContent = yaml.dump(configToSave);
            // 备份旧配置
            if (existsSync(this.configPath)) {
                this.createBackup();
            }
            atomicWrite(this.configPath, yamlContent);
            this.config = configToSave;
        }
        catch (error) {
            console.error('Failed to save config:', error);
            logger.logError('ConfigManager.saveConfig', error);
            throw error;
        }
    }
    createBackup() {
        const backupDir = join(this.configDir, 'backups');
        if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = join(backupDir, `config-${timestamp}.yaml`);
        try {
            writeFileSync(backupPath, readFileSync(this.configPath, 'utf-8'), 'utf-8');
            // 清理旧备份，只保留最近 MAX_BACKUPS 份
            const backups = readdirSync(backupDir)
                .filter(f => f.startsWith('config-') && f.endsWith('.yaml'))
                .sort();
            while (backups.length > MAX_BACKUPS) {
                rmSync(join(backupDir, backups.shift()));
            }
        } catch (error) {
            logger.logError('ConfigManager.createBackup', error);
        }
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }
    isFirstRun() {
        return !existsSync(this.configPath);
    }
    getLang() {
        return this.config.lang || 'en_US';
    }
    setLang(lang) {
        this.updateConfig({ lang });
    }
    getPlan() {
        return this.config.plan;
    }
    setPlan(plan) {
        this.updateConfig({ plan });
    }
    getApiKey() {
        return this.config.api_key;
    }
    setApiKey(apiKey) {
        this.updateConfig({ api_key: apiKey });
    }
    revokeApiKey() {
        this.updateConfig({ api_key: undefined });
    }
    getProviderId() {
        return this.config.provider_id || this.config.plan || null;
    }
    setProviderId(id) {
        this.updateConfig({ provider_id: id });
    }
    getProviderBaseUrl() {
        return this.config.provider_base_url || null;
    }
    setProviderBaseUrl(url) {
        this.updateConfig({ provider_base_url: url });
    }
    getProviderModel() {
        return this.config.provider_selected_model || null;
    }
    setProviderModel(model) {
        this.updateConfig({ provider_selected_model: model });
    }
}
export const configManager = ConfigManager.getInstance();
