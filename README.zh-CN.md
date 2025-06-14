# 视频信息提取器 (Video Metadata Inspector)

一个基于 Tauri + React 的桌面应用，用于快速查看视频文件的元数据和缩略图。本应用内置了 FFmpeg 二进制文件作为 sidecar，支持跨平台视频处理。

[English Documentation](README.md)

![Preview](./imgs/preview.png)

## 功能特性

- 📁 支持拖放或选择视频文件
- 🖼️ 自动提取并显示视频缩略图
- 📊 提取视频元数据（分辨率、帧率、时长、码率等）
- 🎯 使用漂亮的卡片式布局展示视频信息
- 🔄 支持重试处理失败的视频文件
- 🗑️ 支持删除已加载的视频

## 使用方法

1. 启动应用
2. 拖放视频文件到应用窗口，或点击主区域选择文件
3. 应用将自动处理视频并显示元数据和缩略图
4. 如果处理失败，可以点击重试按钮重新处理
5. 点击删除按钮可以从界面上移除视频

## 修复应用损坏

我没有 Apple 开发者账号，所以请按照以下命令修复应用：

```shell
xattr -cr /Applications/Video\ Inspector.app
```

## 技术栈

### 前端

- **React**
- **TypeScript**
- **Tailwind CSS**
- **Vite**

### 后端

- **Rust**
- **Tauri**
- **FFmpeg**

## 安装与运行

### 前置条件

- [Node.js](https://nodejs.org/) (v18+)
- [PNPM](https://pnpm.io/) (v10+)
- [Rust](https://www.rust-lang.org/) (最新稳定版)
- [Cargo](https://doc.rust-lang.org/cargo/) (随 Rust 一起安装)

### 快速开始

```bash
# 克隆仓库
git clone <repository-url>
cd video-inspector

# 安装前端依赖
pnpm install

# 下载所有平台的 FFmpeg 二进制文件（推荐用于开发）
pnpm prepare-ffmpeg
# 或者使用
pnpm download-ffmpeg

# 下载当前平台的 FFmpeg 二进制文件（推荐用于 CI/CD）
pnpm prepare-ffmpeg:current

# Windows 用户（如果上面的命令不工作）
pnpm prepare-ffmpeg:current:win
```

`pnpm prepare-ffmpeg` 命令会自动下载所有支持平台（macOS x86_64、macOS ARM64、Windows x86_64、Linux x86_64）的 FFmpeg 和 FFprobe 二进制文件，并为 Tauri sidecar 使用进行组织。

对于 CI/CD 环境，你可以使用 `pnpm prepare-ffmpeg:current` 来自动检测并下载当前平台的二进制文件，这样更快更高效。在 Windows 上，如果遇到问题，请使用 `pnpm prepare-ffmpeg:current:win`。

### 手动安装 FFmpeg（可选）

如果你更喜欢使用系统安装的 FFmpeg 而不是内置的二进制文件：

```bash
# 安装 FFmpeg (macOS)
brew install ffmpeg

# 安装 FFmpeg (Ubuntu/Debian)
sudo apt update && sudo apt install ffmpeg

# 安装 FFmpeg (Windows)
# 请参考 FFmpeg 官方文档
```

### 开发模式

```bash
# 启动开发服务器
pnpm tauri dev
```

### 构建应用

```bash
# 构建生产版本
pnpm tauri build
```
