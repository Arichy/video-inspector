# Video Metadata Inspector

A desktop application built with Tauri + React for quickly viewing video file metadata and thumbnails. This application includes FFmpeg binaries as sidecars for cross-platform video processing.

[中文文档](README.zh-CN.md)

![Preview](./imgs/preview.png)

## Features

- 📁 Drag & drop or select video files
- 🖼️ Automatically extract and display video thumbnails
- 📊 Extract video metadata (resolution, frame rate, duration, bit rate, etc.)
- 🎯 Beautiful card layout for displaying video information
- 🔄 Retry functionality for failed video processing
- 🗑️ Delete loaded videos from the interface

## How to Use

1. Launch the application
2. Drag and drop video files into the application window, or click the main area to select files
3. The application will automatically process videos and display metadata and thumbnails
4. If processing fails, click the retry button to attempt reprocessing
5. Click the delete button to remove videos from the interface

## Fix App Broken

I don't have the Apple developer account, so please fix it by following command:

```shell
xattr -cr /Applications/Video\ Inspector.app
```

## Tech Stack

### Frontend

- **React**
- **TypeScript**
- **Tailwind CSS**
- **Vite**

### Backend

- **Rust**
- **Tauri**
- **FFmpeg**

## Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PNPM](https://pnpm.io/) (v10+)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Cargo](https://doc.rust-lang.org/cargo/) (installed with Rust)

### Quick Setup

```bash
# Clone the repository
git clone <repository-url>
cd video-inspector

# Install frontend dependencies
pnpm install

# Download FFmpeg binaries for all platforms (recommended for development)
pnpm prepare-ffmpeg
# or alternatively
pnpm download-ffmpeg

# Download FFmpeg binaries for current platform only
pnpm prepare-ffmpeg:current

# Download FFmpeg binaries for specific target (useful for cross-compilation)
pnpm prepare-ffmpeg:target x86_64-apple-darwin

# For Windows users (if the above doesn't work)
pnpm prepare-ffmpeg:current:win
```

The `pnpm prepare-ffmpeg` command will automatically download FFmpeg and FFprobe binaries for all supported platforms (macOS x86_64, macOS ARM64, Windows x86_64, Linux x86_64) and organize them for Tauri sidecar usage.

For development, you can use:
- `pnpm prepare-ffmpeg:current` to automatically detect and download binaries for the current platform
- `pnpm prepare-ffmpeg:target <TARGET_TRIPLE>` to download binaries for a specific target (useful for cross-compilation)
- On Windows, if you encounter issues, use `pnpm prepare-ffmpeg:current:win` instead

**Note:** The download script includes multiple sources and retry mechanisms for reliability. For Linux, it will try GitHub releases first (faster) before falling back to other sources.

### Manual FFmpeg Installation (Alternative)

If you prefer to use system-installed FFmpeg instead of bundled binaries:

```bash
# Install FFmpeg (macOS)
brew install ffmpeg

# Install FFmpeg (Ubuntu/Debian)
sudo apt update && sudo apt install ffmpeg

# Install FFmpeg (Windows)
# Please refer to the FFmpeg documentation
```

### Development Mode

```bash
# Start the development server
pnpm tauri dev
```

### Building the Application

```bash
# Build for production
pnpm tauri build
```

## Project Structure

```
video-inspector/
├── src/                      # Frontend React code
│   ├── components/           # React components
│   │   └── Video/            # Video component
│   └── ...
├── src-tauri/                # Rust backend code
│   ├── src/
│   │   ├── inspector.rs      # Video processing logic
│   │   └── ...
│   └── ...
└── ...
```
