#!/bin/bash
# chelper 安装脚本 - 在目标服务器上运行
# 用法: bash install-chelper.sh
# 前提: 需要 Node.js >= 18

set -e

INSTALL_DIR="$HOME/coding-helper-local/package"
BIN_DIR="$HOME/.local/bin"

echo "======================================"
echo "  chelper v0.1.1 安装程序"
echo "  AI Coding Tool Helper (多服务商增强版)"
echo "======================================"
echo ""

# 检查 Node.js
if ! command -v node &>/dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js >= 18"
    echo "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    echo "  CentOS/RHEL:   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash && sudo yum install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "错误: Node.js 版本过低 ($NODE_VERSION)，需要 >= 18"
    exit 1
fi
echo "✓ Node.js $(node -v)"

# 创建目录
mkdir -p "$INSTALL_DIR" "$BIN_DIR"

# 解压（假设 tar.gz 在同目录下）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/chelper-v0.1.1-portable.tar.gz" ]; then
    echo "正在解压 chelper..."
    tar xzf "$SCRIPT_DIR/chelper-v0.1.1-portable.tar.gz" -C "$INSTALL_DIR"
    echo "✓ 文件已解压到 $INSTALL_DIR"
elif [ -f "$INSTALL_DIR/dist/cli.js" ]; then
    echo "✓ 检测到已有安装文件"
else
    echo "错误: 未找到 chelper-v0.1.1-portable.tar.gz"
    echo "请将压缩包放在脚本同目录下: $SCRIPT_DIR/"
    exit 1
fi

# 安装依赖
echo "正在安装依赖..."
cd "$INSTALL_DIR"
npm install --omit=dev --silent 2>/dev/null
echo "✓ 依赖安装完成"

# 创建 wrapper 脚本
cat > "$BIN_DIR/chelper" << 'WRAPPER'
#!/bin/bash
SCRIPT_DIR="$HOME/coding-helper-local/package"
exec node "$SCRIPT_DIR/dist/cli.js" "$@"
WRAPPER
chmod +x "$BIN_DIR/chelper"

# 确保 bin 目录在 PATH 中
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    SHELL_RC="$HOME/.bashrc"
    if [ -n "$ZSH_VERSION" ]; then
        SHELL_RC="$HOME/.zshrc"
    fi
    echo "" >> "$SHELL_RC"
    echo "# chelper" >> "$SHELL_RC"
    echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_RC"
    echo "已添加 $BIN_DIR 到 PATH (写入 $SHELL_RC)"
fi

echo ""
echo "======================================"
echo "  安装完成!"
echo "======================================"
echo ""
echo "支持的 AI 服务商:"
echo "  智谱 GLM (Global/China)"
echo "  OpenAI / Anthropic / DeepSeek / Google Gemini"
echo "  硅基流动 / 通义千问 / 月之暗面 (Kimi)"
echo "  百川智能 / 零一万物 / MiniMax / 讯飞星火 / 智谱AI"
echo "  火山引擎 (豆包) / 小米 MiMo / 龙猫 (LongCat)"
echo "  腾讯混元 / 百度千帆"
echo "  LM Studio / Ollama / vLLM / 自定义 API"
echo ""
echo "使用方法:"
echo "  chelper              # 交互式主菜单"
echo "  chelper init         # 首次设置向导"
echo "  chelper doctor       # 健康检查"
echo ""
echo "如 PATH 未生效，请运行: source ~/.bashrc (或 ~/.zshrc)"
