# Video Metadata Inspector

A desktop application built with Tauri + React for quickly viewing video file metadata and thumbnails. **FFmpeg is required for video processing, so please install it before using the application.**

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
- FFmpeg

### Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install FFmpeg (macOS)
brew install ffmpeg

# Install FFmpeg (Ubuntu/Debian)
# sudo apt update && sudo apt install ffmpeg

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
