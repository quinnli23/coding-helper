import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, lstatSync, unlinkSync, symlinkSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';

const SKILLS_DIR = join(homedir(), '.agents', 'skills');
const SKILLS_LINK_DIR = join(homedir(), '.config', 'opencode', 'skills');
const LOCK_FILE = join(homedir(), '.agents', '.skill-lock.json');

export class OpenCodeSkillsManager {
    static instance;

    constructor() {}

    static getInstance() {
        if (!OpenCodeSkillsManager.instance) {
            OpenCodeSkillsManager.instance = new OpenCodeSkillsManager();
        }
        return OpenCodeSkillsManager.instance;
    }

    getSkillsDir() { return SKILLS_DIR; }
    getSkillsLinkDir() { return SKILLS_LINK_DIR; }
    getLockFilePath() { return LOCK_FILE; }

    ensureDirs() {
        if (!existsSync(SKILLS_DIR)) mkdirSync(SKILLS_DIR, { recursive: true });
        if (!existsSync(SKILLS_LINK_DIR)) mkdirSync(SKILLS_LINK_DIR, { recursive: true });
        if (!existsSync(dirname(LOCK_FILE))) mkdirSync(dirname(LOCK_FILE), { recursive: true });
    }

    readLockFile() {
        try {
            if (existsSync(LOCK_FILE)) {
                return JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
            }
        } catch (error) {
            logger.logError('OpenCodeSkillsManager.readLockFile', error);
        }
        return { version: 3, skills: {} };
    }

    writeLockFile(lock) {
        this.ensureDirs();
        writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2), 'utf-8');
    }

    parseSkillMeta(skillDir) {
        const skillFile = join(skillDir, 'SKILL.md');
        if (!existsSync(skillFile)) return { name: '', description: '' };

        try {
            const content = readFileSync(skillFile, 'utf-8');
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (!match) return { name: '', description: '' };

            const frontmatter = match[1];
            const nameMatch = frontmatter.match(/^name:\s*["']?(.+?)["']?\s*$/m);
            const descMatch = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m);

            return {
                name: nameMatch ? nameMatch[1].trim() : '',
                description: descMatch ? descMatch[1].trim() : ''
            };
        } catch {
            return { name: '', description: '' };
        }
    }

    listSkills() {
        const lock = this.readLockFile();
        const result = [];

        // 从 lock 文件获取来源信息
        for (const [name, info] of Object.entries(lock.skills || {})) {
            const skillDir = join(SKILLS_DIR, name);
            const meta = existsSync(skillDir) ? this.parseSkillMeta(skillDir) : { name, description: '' };
            result.push({
                name,
                description: meta.description || info.skillPath || '',
                source: info.source || '',
                sourceUrl: info.sourceUrl || '',
                sourceType: info.sourceType || '',
                installedAt: info.installedAt || '',
                exists: existsSync(skillDir)
            });
        }

        // 扫描目录找未注册的 skills
        if (existsSync(SKILLS_DIR)) {
            const dirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);

            for (const dirName of dirs) {
                if (!result.find(s => s.name === dirName)) {
                    const skillDir = join(SKILLS_DIR, dirName);
                    const meta = this.parseSkillMeta(skillDir);
                    result.push({
                        name: dirName,
                        description: meta.description || '',
                        source: '',
                        sourceUrl: '',
                        sourceType: '',
                        installedAt: '',
                        exists: true
                    });
                }
            }
        }

        // 扫描链接目录找仅在 ~/.config/opencode/skills/ 中的 skills
        if (existsSync(SKILLS_LINK_DIR)) {
            const linkEntries = readdirSync(SKILLS_LINK_DIR, { withFileTypes: true })
                .filter(d => d.isDirectory() || d.isSymbolicLink?.())
                .map(d => d.name);

            for (const dirName of linkEntries) {
                if (!result.find(s => s.name === dirName)) {
                    const skillDir = join(SKILLS_LINK_DIR, dirName);
                    if (existsSync(join(skillDir, 'SKILL.md'))) {
                        const meta = this.parseSkillMeta(skillDir);
                        result.push({
                            name: dirName,
                            description: meta.description || '',
                            source: '',
                            sourceUrl: '',
                            sourceType: '',
                            installedAt: '',
                            exists: true
                        });
                    }
                }
            }
        }

        return result;
    }

    installFromGithub(url) {
        this.ensureDirs();

        // 解析 GitHub repo 名
        const repoMatch = url.match(/github\.com[/:]([^/]+\/[^/]+)/);
        if (!repoMatch) {
            throw new Error('无效的 GitHub URL，格式应为 https://github.com/owner/repo');
        }
        const repoName = repoMatch[1].replace(/\.git$/, '');

        // git clone 到临时目录
        const tmpDir = join(homedir(), '.agents', '.tmp-skill-install');
        if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
        mkdirSync(tmpDir, { recursive: true });

        const cloneDir = join(tmpDir, 'repo');
        execSync(`git clone --depth 1 ${url} ${cloneDir}`, { stdio: 'pipe' });

        // 扫描 repo 中的 skills: skills/*/SKILL.md 或根目录 SKILL.md
        const installedSkills = [];

        // 模式1: repo/skills/skill-name/SKILL.md
        const skillsSubdir = join(cloneDir, 'skills');
        if (existsSync(skillsSubdir)) {
            const subdirs = readdirSync(skillsSubdir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);

            for (const sub of subdirs) {
                if (existsSync(join(skillsSubdir, sub, 'SKILL.md'))) {
                    installedSkills.push(this.installSingleSkill(
                        join(skillsSubdir, sub), sub, repoName, url
                    ));
                }
            }
        }

        // 模式2: repo/SKILL.md (根目录)
        if (installedSkills.length === 0 && existsSync(join(cloneDir, 'SKILL.md'))) {
            const meta = this.parseSkillMeta(cloneDir);
            const name = meta.name || repoName.split('/')[1];
            installedSkills.push(this.installSingleSkill(
                cloneDir, name, repoName, url
            ));
        }

        // 清理临时目录
        rmSync(tmpDir, { recursive: true });

        if (installedSkills.length === 0) {
            throw new Error('未在仓库中找到 SKILL.md 文件');
        }

        return installedSkills;
    }

    installSingleSkill(sourceDir, skillName, repoName, repoUrl) {
        const targetDir = join(SKILLS_DIR, skillName);
        const linkPath = join(SKILLS_LINK_DIR, skillName);

        // 复制到中央目录
        if (existsSync(targetDir)) rmSync(targetDir, { recursive: true });
        cpSync(sourceDir, targetDir, { recursive: true });

        // 创建符号链接
        if (lstatSync(linkPath, {}).isSymbolicLink?.() || existsSync(linkPath)) {
            unlinkSync(linkPath);
        }
        symlinkSync(targetDir, linkPath);

        // 更新 lock 文件
        const lock = this.readLockFile();
        const now = new Date().toISOString();
        lock.skills[skillName] = {
            source: repoName,
            sourceType: 'github',
            sourceUrl: repoUrl,
            skillPath: `skills/${skillName}/SKILL.md`,
            installedAt: now,
            updatedAt: now
        };
        this.writeLockFile(lock);

        return skillName;
    }

    uninstallSkill(name) {
        const linkPath = join(SKILLS_LINK_DIR, name);
        const targetDir = join(SKILLS_DIR, name);

        // 删除符号链接
        if (existsSync(linkPath)) {
            try { unlinkSync(linkPath); } catch { rmSync(linkPath, { recursive: true }); }
        }

        // 删除实际目录
        if (existsSync(targetDir)) {
            rmSync(targetDir, { recursive: true });
        }

        // 更新 lock
        const lock = this.readLockFile();
        delete lock.skills[name];
        this.writeLockFile(lock);
    }
}

export const openCodeSkillsManager = OpenCodeSkillsManager.getInstance();
