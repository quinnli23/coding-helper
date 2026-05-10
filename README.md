# @z_ai/coding-helper (chelper)

> 基于 [zai-org/zai-coding-plugins](https://github.com/zai-org/zai-coding-plugins) 二次开发 — 统一管理 AI 编码工具的 CLI 助手

一个命令配置所有编码工具的 Provider、API Key、MCP 服务。支持 8 种主流编码工具、23 个 AI 服务商。

## 支持的编码工具

| 工具 | 配置路径 | MCP | 安装命令 |
|------|---------|:---:|---------|
| Claude Code | `~/.claude/settings.json` | ✓ | `npm i -g @anthropic-ai/claude-code` |
| OpenCode | `~/.config/opencode/opencode.json` | ✓ | `npm i -g opencode-ai` |
| Crush | `~/.config/crush/crush.json` | ✓ | `npm i -g @charmland/crush` |
| Factory Droid | `~/.factory/config.json` | ✓ | `curl -fsSL https://app.factory.ai/cli \| sh` |
| Aider | `~/.aider/aider.conf.yml` | — | `pip install aider-chat` |
| Goose | `~/.config/goose/config.yaml` | ✓ | `curl -fsSL https://github.com/block/goose/releases/download/latest/install.sh \| sh` |
| Gemini CLI | `~/.gemini/settings.json` | ✓ | `npm i -g @google/gemini-cli` |
| Codex CLI | `~/.codex/config.toml` | ✓ | `npm i -g @openai/codex` |

## 支持的 AI 服务商

GLM (Global/China)、OpenAI、Anthropic (Claude)、DeepSeek、Google Gemini、硅基流动、通义千问、月之暗面 (Kimi)、百川智能、零一万物、MiniMax (海螺AI)、讯飞星火、智谱AI (ChatGLM)、火山引擎 (豆包)、小米 MiMo、龙猫 (LongCat)、腾讯混元、百度千帆、LM Studio (本地)、Ollama (本地)、vLLM (本地)、自定义 OpenAI-Compatible API

## 功能特性

- **交互式向导** — 首次启动自动引导完成全部配置
- **多服务商支持** — 23 个 AI 服务商一键切换
- **工具统一管理** — 自动检测、安装、配置 8 种编码工具
- **MCP 服务管理** — 安装/卸载 MCP 服务到任意支持的工具
- **OpenCode Skills** — 从 GitHub URL 安装/卸载 Skills
- **配置模板 (Profile)** — 保存多套 Provider 配置快速切换
- **健康检查 (Doctor)** — 全面诊断系统/工具/网络状态，支持 `--json` 输出
- **配置安全** — 原子写入 + 自动备份（每次变更前自动备份最近 3 份）
- **非交互式 CLI** — `config set` 子命令支持脚本/CI 场景
- **多语言** — 中英文双语界面

## 快速开始

### 前置条件

Node.js >= 18

### 安装方式

**方式一：npx 直接运行（推荐）**

```bash
npx @z_ai/coding-helper
```

**方式二：全局安装**

```bash
npm install -g @z_ai/coding-helper
chelper
```

**方式三：离线安装（服务器/内网环境）**

```bash
# 上传 chelper-v*.tar.gz 和 install-chelper.sh 到目标服务器
bash install-chelper.sh
```

### 首次使用

启动后进入交互式向导，按 `↑↓` 选择、`Enter` 确认：

1. 选择界面语言（中文/English）
2. 选择 AI 服务商
3. 输入 API Key
4. 选择要配置的编码工具（自动检测已安装状态）
5. 自动安装缺失的工具（可选）
6. 加载 Provider 配置到工具
7. 管理 MCP 服务（可选）

## 命令参考

### 基础命令

```bash
chelper                  # 交互式主菜单
chelper init             # 首次设置向导
chelper -v               # 查看版本
chelper --help           # 帮助信息
```

### 健康检查

```bash
chelper doctor           # 全面诊断
chelper doctor --json    # JSON 输出（适合 CI）
```

### 语言管理

```bash
chelper lang show        # 查看当前语言
chelper lang set zh_CN   # 切换为中文
chelper lang set en_US   # 切换为英文
```

### API Key 管理

```bash
chelper auth                                # 交互式设置
chelper auth glm_coding_plan_global <token> # Global 套餐 Key
chelper auth glm_coding_plan_china <token>  # China 套餐 Key
chelper auth revoke                         # 撤销已保存的 Key
chelper auth reload claude                  # 重新加载配置到 Claude Code
```

### 配置模板

```bash
chelper profile list              # 列出所有模板
chelper profile save <名称>       # 保存当前配置为模板
chelper profile use <名称>        # 切换到指定模板
chelper profile delete <名称>     # 删除模板
```

### 非交互式配置（脚本/CI）

```bash
chelper config set --provider deepseek --api-key sk-xxx
chelper config set --provider openai --base-url https://api.openai.com/v1 --model gpt-4
chelper config set --provider deepseek --tool opencode    # 同时应用到工具
chelper config show                                            # 查看当前配置
```

### MCP 服务管理

```bash
chelper mcp install <工具名> <mcp-id>   # 安装 MCP 服务
chelper mcp list <工具名>               # 列出已安装的 MCP
```

### 快捷入口

```bash
chelper enter                # 交互式主菜单
chelper enter lang           # 配置语言
chelper enter plan           # 配置套餐
chelper enter apikey         # 配置 API Key
chelper enter claude-code    # 配置 Claude Code
chelper enter opencode       # 配置 OpenCode
```

## 配置文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 主配置 | `~/.chelper/config.yaml` | Provider、API Key、语言等 |
| 配置备份 | `~/.chelper/backups/` | 自动保留最近 3 份 |
| 工具备份 | `~/.chelper/tool-backups/<工具>/` | 变更前自动备份 |
| 配置模板 | `~/.chelper/profiles/<名称>.yaml` | 保存的 Profile |

主配置示例 (`~/.chelper/config.yaml`)：

```yaml
lang: zh_CN
provider_id: deepseek
api_key: sk-xxxx
provider_base_url: https://api.deepseek.com/v1
provider_selected_model: deepseek-chat
```

## 发布流程

```bash
# npm 发布
cd package
npm pack                          # 生成 z_ai-coding-helper-<version>.tgz
npm publish --access public       # 发布到 npm

# 离线安装包
cd package
npm install --omit=dev
tar czf ../chelper-v<version>-portable.tar.gz .
```

## 与上游的区别

本项目基于 [zai-org/zai-coding-plugins](https://github.com/zai-org/zai-coding-plugins) 二次开发，主要增强：

- 新增 6 种编码工具支持（Aider、Goose、Crush、Factory Droid、Gemini CLI、Codex CLI）
- 新增 15+ AI 服务商支持（OpenAI、Anthropic、DeepSeek、Google Gemini 等）
- 新增配置模板 (Profile) 管理
- 新增健康检查 (Doctor) 命令
- 新增非交互式 CLI 子命令（`config set`、`mcp install`）
- 新增配置安全机制（原子写入 + 自动备份）
- 新增 OpenCode Skills 管理功能
- 新增编码工具安装功能

## 目录结构

```
coding-helper-local/
├── LICENSE                         # Apache 2.0
├── README.md
├── install-chelper.sh              # 离线安装脚本
└── package/
    ├── package.json
    ├── README.md
    ├── dist/
    │   ├── cli.js                  # 入口
    │   ├── commands/               # 命令实现
    │   │   ├── auth.js
    │   │   ├── config.js
    │   │   ├── doctor.js
    │   │   ├── index.js
    │   │   └── lang.js
    │   ├── lib/                    # 核心模块
    │   │   ├── command.js          #   Commander 注册
    │   │   ├── wizard.js           #   交互式向导
    │   │   ├── config.js           #   配置管理
    │   │   ├── config-backup.js    #   配置备份
    │   │   ├── providers.js        #   Provider 注册表
    │   │   ├── tool-manager.js     #   工具管理器
    │   │   ├── mcp-manager.js      #   MCP 服务管理
    │   │   ├── profile-manager.js  #   配置模板管理
    │   │   ├── *-manager.js        #   各工具适配器
    │   │   ├── i18n.js             #   国际化
    │   │   └── api-validator.js    #   API Key 验证
    │   └── utils/
    │       ├── logger.js
    │       └── string-width.js
    └── zai-coding-plugins/         # Z.ai 官方插件
```

## License

[Apache License 2.0](LICENSE) — 基于 [zai-org/zai-coding-plugins](https://github.com/zai-org/zai-coding-plugins)（Apache 2.0）
