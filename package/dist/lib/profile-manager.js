import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, copyFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as yaml from 'js-yaml';
import { logger } from '../utils/logger.js';

const PROFILES_DIR = join(homedir(), '.chelper', 'profiles');

export class ProfileManager {
    static instance;

    constructor() {}

    static getInstance() {
        if (!ProfileManager.instance) {
            ProfileManager.instance = new ProfileManager();
        }
        return ProfileManager.instance;
    }

    ensureDir() {
        if (!existsSync(PROFILES_DIR)) {
            mkdirSync(PROFILES_DIR, { recursive: true });
        }
    }

    getProfilePath(name) {
        return join(PROFILES_DIR, `${name}.yaml`);
    }

    listProfiles() {
        this.ensureDir();
        try {
            return readdirSync(PROFILES_DIR)
                .filter(f => f.endsWith('.yaml'))
                .map(f => f.replace('.yaml', ''));
        } catch {
            return [];
        }
    }

    profileExists(name) {
        return existsSync(this.getProfilePath(name));
    }

    saveProfile(name, config) {
        this.ensureDir();
        const profileData = {
            savedAt: new Date().toISOString(),
            config: {
                provider_id: config.provider_id || config.plan || null,
                plan: config.plan || null,
                api_key: config.api_key || null,
                provider_base_url: config.provider_base_url || null,
                provider_selected_model: config.provider_selected_model || null,
                lang: config.lang || 'zh_CN'
            }
        };
        writeFileSync(this.getProfilePath(name), yaml.dump(profileData), 'utf-8');
    }

    loadProfile(name) {
        if (!this.profileExists(name)) return null;
        try {
            const content = readFileSync(this.getProfilePath(name), 'utf-8');
            const data = yaml.load(content);
            return data?.config || null;
        } catch (error) {
            logger.logError('ProfileManager.loadProfile', error);
            return null;
        }
    }

    deleteProfile(name) {
        const path = this.getProfilePath(name);
        if (existsSync(path)) {
            rmSync(path);
            return true;
        }
        return false;
    }

    getActiveProfile() {
        try {
            const configPath = join(homedir(), '.chelper', 'config.yaml');
            if (existsSync(configPath)) {
                const content = readFileSync(configPath, 'utf-8');
                const config = yaml.load(content);
                return config?.active_profile || null;
            }
        } catch {}
        return null;
    }

    setActiveProfile(name) {
        try {
            const configPath = join(homedir(), '.chelper', 'config.yaml');
            let config = {};
            if (existsSync(configPath)) {
                config = yaml.load(readFileSync(configPath, 'utf-8')) || {};
            }
            config.active_profile = name || null;
            writeFileSync(configPath, yaml.dump(config), 'utf-8');
        } catch (error) {
            logger.logError('ProfileManager.setActiveProfile', error);
        }
    }
}

export const profileManager = ProfileManager.getInstance();
