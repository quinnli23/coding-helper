import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

const MAX_BACKUPS = 3;
const BACKUP_DIR = join(homedir(), '.chelper', 'tool-backups');

export function atomicWrite(filePath, content) {
    const tmpPath = filePath + '.tmp';
    writeFileSync(tmpPath, content, 'utf-8');
    renameSync(tmpPath, filePath);
}

export function backupToolConfig(toolName, configPath) {
    if (!existsSync(configPath)) return;
    try {
        const backupDir = join(BACKUP_DIR, toolName);
        if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = configPath.endsWith('.yaml') || configPath.endsWith('.yml') ? '.yaml' : '.json';
        const backupPath = join(backupDir, `config-${timestamp}${ext}`);

        writeFileSync(backupPath, readFileSync(configPath, 'utf-8'), 'utf-8');

        // 清理旧备份
        const backups = readdirSync(backupDir)
            .filter(f => f.startsWith('config-'))
            .sort();
        while (backups.length > MAX_BACKUPS) {
            rmSync(join(backupDir, backups.shift()));
        }
    } catch (error) {
        logger.logError('backupToolConfig', error);
    }
}

export function getToolConfigBackup(toolName) {
    const backupDir = join(BACKUP_DIR, toolName);
    if (!existsSync(backupDir)) return [];
    try {
        return readdirSync(backupDir)
            .filter(f => f.startsWith('config-'))
            .sort()
            .reverse()
            .slice(0, MAX_BACKUPS)
            .map(f => ({
                filename: f,
                path: join(backupDir, f),
                timestamp: f.replace('config-', '').replace(/\.(yaml|json)$/, '')
            }));
    } catch {
        return [];
    }
}
