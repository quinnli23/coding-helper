# @z_ai/coding-helper (chelper)

> 统一管理 AI 编码工具的 CLI 助手 — 一个命令配置所有编码工具的 Provider、API Key、MCP 服务

## 支持的编码工具

| 工具 | 配置格式 | MCP 支持 | 安装命令 |
|------|---------|---------|---------|
| Claude Code | `~/.claude/settings.json` | ✓ | `npm i -g @anthropic-ai/claude-code` |
| OpenCode | `~/.config/opencode/opencode.json` | ✓ | `npm i -g opencode-ai` |
| Crush | `~/.config/crush/crush.json` | ✓ | `npm i -g @charmland/crush` |
| Factory Droid | `~/.factory/config.json` | ✓ | `curl -fsSL https://app.factory.ai/cli \| sh` |
| Aider | `~/.aider/aider.conf.yml` | ✗ | `pip install aider-chat` |
| Goose | `~/.config/goose/config.yaml` | ✓ | `curl -fsSL https://github.com/block/goose/releases/download/latest/install.sh \| sh` |
| Gemini CLI | `~/.gemini/settings.json` | ✓ | `npm i -g @google/gemini-cli` |
| Codex CLI | `~/.codex/config.toml` | ✓ | `npm i -g @openai/codex` |

## 支持的 AI Provider

GLM Coding Plan (Global/China)、OpenAI、Anthropic、DeepSeek、Google Gemini、硅基流动、通义千问、月之暗面 (Kimi)、百川智能、零一万物、MiniMax、讯飞星火、火山引擎 (豆包)、小米 MiMo、龙猫 (LongCat)、腾讯混元、百度千帆、LM Studio、Ollama、vLLM、自定义 API

## 功能特性

- **交互式向导** — 首次启动自动引导配置
- **多 Provider 支持** — 30+ AI 服务商一键切换
- **工具统一管理** — 检测、安装、配置 8 种编码工具
- **MCP 服务管理** — 安装/卸载 MCP 服务到任意工具
- **OpenCode Skills** — 从 GitHub 安装/卸载 Skills
- **配置模板 (Profile)** — 保存多套配置快速切换
- **健康检查 (Doctor)** — 全面诊断系统配置状态
- **配置安全** — 原子写入 + 自动备份（保留最近 3 份）
- **非交互式 CLI** — 支持脚本/CI 场景
- **多语言** — 中英文双语界面

## 快速开始

### 前置条件

Node.js >= 18

### 安装

#### 方式一：npx 直接运行（无需安装）

```bash
npx @z_ai/coding-helper
```

#### 方式二：全局安装

```bash
npm install -g @z_ai/coding-helper
chelper
```

#### 方式三：离线安装（服务器环境）

```bash
# 上传 chelper-v0.1.1-portable.tar.gz 和 install-chelper.sh 到目标服务器
bash install-chelper.sh
```

### 首次使用

启动后进入交互式向导，按 ↑↓ 选择、Enter 确认：

1. 选择界面语言
2. 选择 AI 服务商（Provider）
3. 输入 API Key
4. 选择要配置的编码工具
5. 自动安装缺失的工具（可选）
6. 加载 Provider 配置到工具
7. 管理 MCP 服务（可选）

## 命令参考

```bash
# 交互式主菜单
chelper

# 首次设置向导
chelper init

# 健康检查
chelper doctor
chelper doctor --json              # JSON 输出（适合 CI）

# 语言管理
chelper lang show                  # 查看当前语言
chelper lang set zh_CN             # 切换为中文

# API Key 管理
chelper auth                       # 交互式设置
chelper auth glm_coding_plan_global <token>   # 直接设置 Global 套餐 Key
chelper auth glm_coding_plan_china <token>    # 直接设置 China 套餐 Key
chelper auth revoke                # 撤销已保存的 Key
chelper auth reload claude         # 重新加载配置到 Claude Code

# 配置模板管理
chelper profile list               # 列出所有模板
chelper profile save <名称>        # 保存当前配置为模板
chelper profile use <名称>         # 切换到指定模板
chelper profile delete <名称>      # 删除模板

# 非交互式配置（适合脚本/CI）
chelper config set --provider deepseek --api-key sk-xxx
chelper config set --provider openai --base-url https://api.openai.com/v1 --model gpt-4
chelper config set --provider deepseek --tool opencode   # 自动应用配置到工具
chelper config show                # 查看当前配置

# MCP 服务管理
chelper mcp install <工具名> <mcp-id>    # 安装 MCP 服务
chelper mcp list <工具名>                # 列出已安装的 MCP

# 快捷入口
chelper enter                      # 交互式主菜单
chelper enter lang                 # 配置语言
chelper enter plan                 # 配置套餐
chelper enter apikey               # 配置 API Key
chelper enter claude-code          # 配置 Claude Code
chelper enter opencode             # 配置 OpenCode

# 版本与帮助
chelper -v
chelper --help
```

## 配置文件

### chelper 配置

存储位置：`~/.chelper/config.yaml`

```yaml
lang: zh_CN
provider_id: deepseek
api_key: sk-xxxx
provider_base_url: https://api.deepseek.com/v1
provider_selected_model: deepseek-chat
```

### 配置备份

- chelper 配置备份：`~/.chelper/backups/`（自动保留最近 3 份）
- 工具配置备份：`~/.chelper/tool-backups/<工具名>/`（配置变更前自动备份）
- 配置模板：`~/.chelper/profiles/<名称>.yaml`

## 发布流程

### 打包

```bash
cd /path/to/coding-helper-local/package

# 生成 tarball
npm pack
# 输出: z_ai-coding-helper-0.1.1.tgz

# 生成便携版 tarball（含 node_modules）
tar czf ../chelper-v0.1.1-portable.tar.gz .
```

### 发布到 npm

```bash
# 确认已登录
npm whoami

# 发布（首次发布需要 --access public）
npm publish --access public

# 发布预览版
npm publish --tag beta
```

### 离线安装包构建

```bash
cd /path/to/coding-helper-local

# 1. 确保 package/ 下有完整的 node_modules
cd package && npm install --omit=dev && cd ..

# 2. 打包
cd package && tar czf ../chelper-v0.1.1-portable.tar.gz . && cd ..

# 3. 验证
bash install-chelper.sh
```

## 目录结构

```
coding-helper-local/
├── chelper-v0.1.1-portable.tar.gz   # 便携版安装包
├── install-chelper.sh               # 离线安装脚本
└── package/
    ├── package.json                 # npm 包配置
    ├── README.md                    # 本文件
    └── dist/
        ├── cli.js                   # 入口文件
        ├── commands/
        │   ├── index.js
        │   ├── lang.js
        │   ├── auth.js
        │   ├── doctor.js
        │   └── config.js
        ├── lib/
        │   ├── command.js           # Commander 注册
        │   ├── wizard.js            # 交互式向导
        │   ├── config.js            # 配置管理
        │   ├── config-backup.js     # 配置备份
        │   ├── providers.js         # Provider 注册表
        │   ├── tool-manager.js      # 工具管理器
        │   ├── mcp-manager.js       # MCP 服务管理
        │   ├── profile-manager.js   # 配置模板管理
        │   ├── claude-code-manager.js
        │   ├── opencode-manager.js
        │   ├── crush-manager.js
        │   ├── factory-droid-manager.js
        │   ├── aider-manager.js
        │   ├── goose-manager.js
        │   ├── gemini-cli-manager.js
        │   ├── codex-cli-manager.js
        │   ├── opencode-skills-manager.js
        │   ├── plugin-marketplace-manager.js
        │   ├── i18n.js              # 国际化
        │   └── api-validator.js     # API Key 验证
        └── utils/
            ├── logger.js
            └── string-width.js
```

## License

MIT
