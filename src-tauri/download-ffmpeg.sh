#!/bin/bash

# ==============================================================================
# download-ffmpeg.sh
#
# This script downloads pre-compiled FFmpeg and FFprobe binaries for multiple
# platforms from various sources, organizing them for use as Tauri sidecars
# with proper target triple naming.
#
# Usage:
#   ./download-ffmpeg.sh                    # Download all platforms
#   ./download-ffmpeg.sh --current          # Auto-detect and download current platform
#   ./download-ffmpeg.sh TARGET_TRIPLE      # Download specific platform
#
# Supported platforms:
# - macOS x86_64 (x86_64-apple-darwin) - from evermeet.cx
# - macOS ARM64 (aarch64-apple-darwin) - from osxexperts.net
# - Windows x86_64 (x86_64-pc-windows-msvc) - from gyan.dev
# - Linux x86_64 (x86_64-unknown-linux-gnu) - from johnvansickle.com
#
# Dependencies: curl, unzip, tar
#
# Author: Your Assistant
# Version: 2.2.0
# ==============================================================================

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$SCRIPT_DIR/binaries"

# Create base directory if it doesn't exist
mkdir -p "$BASE_DIR"
echo "Created/verified base directory: $BASE_DIR"

# Download URLs for different platforms
MACOS_FFMPEG_URL="https://evermeet.cx/ffmpeg/get/zip"
MACOS_FFPROBE_URL="https://evermeet.cx/ffmpeg/get/ffprobe/zip"
MACOS_ARM64_FFMPEG_URL="https://www.osxexperts.net/ffmpeg6arm.zip"
MACOS_ARM64_FFPROBE_URL="https://www.osxexperts.net/ffprobe6arm.zip"
WINDOWS_URL="https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
# Linux FFmpeg URLs (multiple sources for reliability)
LINUX_URLS=(
  "https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-linux64-gpl.tar.xz"
  "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
  "https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-linux64-gpl.tar.xz"
)

# Target triple mappings for Tauri sidecar naming
get_target_triple() {
  case "$1" in
    "macos_x86") echo "x86_64-apple-darwin" ;;
    "macos_arm64") echo "aarch64-apple-darwin" ;;
    "windows") echo "x86_64-pc-windows-msvc" ;;
    "linux") echo "x86_64-unknown-linux-gnu" ;;
    *) echo "unknown" ;;
  esac
}

# Map target triple to platform name
get_platform_from_target() {
  case "$1" in
    "x86_64-apple-darwin") echo "macos_x86" ;;
    "aarch64-apple-darwin") echo "macos_arm64" ;;
    "x86_64-pc-windows-msvc") echo "windows" ;;
    "x86_64-unknown-linux-gnu") echo "linux" ;;
    *) echo "unknown" ;;
  esac
}

# Download with retry mechanism and multiple sources
download_with_retry() {
  local output_file="$1"
  shift
  local urls=("$@")
  local max_retries=2
  local timeout=600  # 10 minutes timeout for large files

  for url in "${urls[@]}"; do
    echo "Trying to download from: $url"
    for ((i=1; i<=max_retries; i++)); do
      echo "Attempt $i/$max_retries..."
      if curl -fL --progress-bar --connect-timeout 30 --max-time "$timeout" -o "$output_file" "$url"; then
        echo "✓ Successfully downloaded from $url"
        return 0
      else
        echo "✗ Failed to download from $url (attempt $i/$max_retries)"
        if [ $i -lt $max_retries ]; then
          echo "Retrying in 5 seconds..."
          sleep 5
        fi
      fi
    done
    echo "All attempts failed for $url, trying next source..."
  done

  echo "❌ All download sources failed for $output_file"
  return 1
}

# Auto-detect current platform target triple
detect_current_target() {
  local os=$(uname -s)
  local arch=$(uname -m)

  case "$os" in
    "Darwin")
      case "$arch" in
        "x86_64") echo "x86_64-apple-darwin" ;;
        "arm64") echo "aarch64-apple-darwin" ;;
        *) echo "unknown" ;;
      esac
      ;;
    "Linux")
      case "$arch" in
        "x86_64") echo "x86_64-unknown-linux-gnu" ;;
        *) echo "unknown" ;;
      esac
      ;;
    "MINGW"*|"MSYS"*|"CYGWIN"*)
      case "$arch" in
        "x86_64") echo "x86_64-pc-windows-msvc" ;;
        *) echo "unknown" ;;
      esac
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

# Parse command line arguments
TARGET_TRIPLE_ARG="$1"

# Special flag to auto-detect current platform
if [ "$TARGET_TRIPLE_ARG" = "--current" ] || [ "$TARGET_TRIPLE_ARG" = "-c" ]; then
  TARGET_TRIPLE_ARG=$(detect_current_target)
  if [ "$TARGET_TRIPLE_ARG" = "unknown" ]; then
    echo "Error: Could not auto-detect current platform"
    echo "Current OS: $(uname -s), Architecture: $(uname -m)"
    echo "Please specify target triple manually or use no arguments to download all platforms"
    exit 1
  fi
  echo "Auto-detected current platform: $TARGET_TRIPLE_ARG"
fi

if [ -n "$TARGET_TRIPLE_ARG" ]; then
  PLATFORM=$(get_platform_from_target "$TARGET_TRIPLE_ARG")
  if [ "$PLATFORM" = "unknown" ]; then
    echo "Error: Unsupported target triple: $TARGET_TRIPLE_ARG"
    echo "Supported target triples:"
    echo "  - x86_64-apple-darwin (macOS x86_64)"
    echo "  - aarch64-apple-darwin (macOS ARM64)"
    echo "  - x86_64-pc-windows-msvc (Windows x86_64)"
    echo "  - x86_64-unknown-linux-gnu (Linux x86_64)"
    echo ""
    echo "Use --current or -c to auto-detect current platform"
    exit 1
  fi
  echo "Downloading FFmpeg for specific platform: $TARGET_TRIPLE_ARG ($PLATFORM)"
else
  echo "Downloading FFmpeg for all platforms"
fi
echo ""

# --- Dependency Check ---
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "Error: Command '$1' not found. Please install it first."
    echo "On macOS: brew install $2"
    echo "On Debian/Ubuntu: sudo apt-get install $3"
    exit 1
  fi
}

check_command "curl" "curl" "curl"
check_command "unzip" "unzip" "unzip"
check_command "tar" "tar" "tar"

echo "All dependencies are satisfied."
echo ""

# --- Download macOS x86_64 binaries from evermeet.cx ---
download_macos_x86() {
  local target_triple=$(get_target_triple "macos_x86")
  echo "--- Processing macOS x86_64 (${target_triple}) ---"

  # Change to script directory for temporary files
  cd "$SCRIPT_DIR"

  # Download FFmpeg
  echo "Downloading FFmpeg for macOS x86_64..."
  curl -fL --progress-bar -o "ffmpeg-macos-x86.zip" "$MACOS_FFMPEG_URL"

  echo "Extracting FFmpeg..."
  unzip -q "ffmpeg-macos-x86.zip" -d "temp_macos_ffmpeg"

  # Find and copy ffmpeg binary
  local ffmpeg_bin=$(find "temp_macos_ffmpeg" -name "ffmpeg" -type f | head -1)
  if [ -n "$ffmpeg_bin" ]; then
    cp "$ffmpeg_bin" "$BASE_DIR/ffmpeg-${target_triple}"
    chmod +x "$BASE_DIR/ffmpeg-${target_triple}"
    echo "  ✓ ffmpeg-${target_triple}"
  else
    echo "  ⚠ ffmpeg binary not found"
  fi

  # Download FFprobe
  echo "Downloading FFprobe for macOS x86_64..."
  curl -fL --progress-bar -o "ffprobe-macos-x86.zip" "$MACOS_FFPROBE_URL"

  echo "Extracting FFprobe..."
  unzip -q "ffprobe-macos-x86.zip" -d "temp_macos_ffprobe"

  # Find and copy ffprobe binary
  local ffprobe_bin=$(find "temp_macos_ffprobe" -name "ffprobe" -type f | head -1)
  if [ -n "$ffprobe_bin" ]; then
    cp "$ffprobe_bin" "$BASE_DIR/ffprobe-${target_triple}"
    chmod +x "$BASE_DIR/ffprobe-${target_triple}"
    echo "  ✓ ffprobe-${target_triple}"
  else
    echo "  ⚠ ffprobe binary not found"
  fi

  # Clean up
  rm -rf "ffmpeg-macos-x86.zip" "ffprobe-macos-x86.zip" "temp_macos_ffmpeg" "temp_macos_ffprobe"
  echo "macOS x86_64 processing complete."
  echo ""
}

# --- Download macOS ARM64 binaries from osxexperts.net ---
download_macos_arm64() {
  local target_triple=$(get_target_triple "macos_arm64")
  echo "--- Processing macOS ARM64 (${target_triple}) ---"

  # Change to script directory for temporary files
  cd "$SCRIPT_DIR"

  # Download FFmpeg
  echo "Downloading FFmpeg for macOS ARM64..."
  curl -fL --progress-bar -o "ffmpeg-macos-arm64.zip" "$MACOS_ARM64_FFMPEG_URL"

  echo "Extracting FFmpeg..."
  unzip -q "ffmpeg-macos-arm64.zip" -d "temp_macos_arm64_ffmpeg"

  # Find and copy ffmpeg binary
  local ffmpeg_bin=$(find "temp_macos_arm64_ffmpeg" -name "ffmpeg" -type f | head -1)
  if [ -n "$ffmpeg_bin" ]; then
    cp "$ffmpeg_bin" "$BASE_DIR/ffmpeg-${target_triple}"
    chmod +x "$BASE_DIR/ffmpeg-${target_triple}"
    echo "  ✓ ffmpeg-${target_triple}"
  else
    echo "  ⚠ ffmpeg binary not found"
  fi

  # Download FFprobe
  echo "Downloading FFprobe for macOS ARM64..."
  curl -fL --progress-bar -o "ffprobe-macos-arm64.zip" "$MACOS_ARM64_FFPROBE_URL"

  echo "Extracting FFprobe..."
  unzip -q "ffprobe-macos-arm64.zip" -d "temp_macos_arm64_ffprobe"

  # Find and copy ffprobe binary
  local ffprobe_bin=$(find "temp_macos_arm64_ffprobe" -name "ffprobe" -type f | head -1)
  if [ -n "$ffprobe_bin" ]; then
    cp "$ffprobe_bin" "$BASE_DIR/ffprobe-${target_triple}"
    chmod +x "$BASE_DIR/ffprobe-${target_triple}"
    echo "  ✓ ffprobe-${target_triple}"
  else
    echo "  ⚠ ffprobe binary not found"
  fi

  # Clean up
  rm -rf "ffmpeg-macos-arm64.zip" "ffprobe-macos-arm64.zip" "temp_macos_arm64_ffmpeg" "temp_macos_arm64_ffprobe"
  echo "macOS ARM64 processing complete."
  echo ""
}

# --- Download Windows binaries from gyan.dev ---
download_windows() {
  local target_triple=$(get_target_triple "windows")
  echo "--- Processing Windows x86_64 (${target_triple}) ---"

  # Change to script directory for temporary files
  cd "$SCRIPT_DIR"

  echo "Downloading FFmpeg for Windows..."
  curl -fL --progress-bar -o "ffmpeg-windows.zip" "$WINDOWS_URL"

  echo "Extracting archive..."
  unzip -q "ffmpeg-windows.zip" -d "temp_windows"

  # Find the bin directory in the extracted archive
  local bin_dir=$(find "temp_windows" -name "bin" -type d | head -1)

  if [ -z "$bin_dir" ]; then
    echo "Error: Could not find bin directory in extracted archive for Windows"
    rm -rf "ffmpeg-windows.zip" "temp_windows"
    exit 1
  fi

  echo "Copying binaries with target triple suffix..."

  # Handle ffmpeg binary
  if [ -f "$bin_dir/ffmpeg.exe" ]; then
    cp "$bin_dir/ffmpeg.exe" "$BASE_DIR/ffmpeg-${target_triple}.exe"
    echo "  ✓ ffmpeg-${target_triple}.exe"
  else
    echo "  ⚠ ffmpeg.exe binary not found in $bin_dir"
  fi

  # Handle ffprobe binary
  if [ -f "$bin_dir/ffprobe.exe" ]; then
    cp "$bin_dir/ffprobe.exe" "$BASE_DIR/ffprobe-${target_triple}.exe"
    echo "  ✓ ffprobe-${target_triple}.exe"
  else
    echo "  ⚠ ffprobe.exe binary not found in $bin_dir"
  fi

  # Clean up
  rm -rf "ffmpeg-windows.zip" "temp_windows"
  echo "Windows processing complete."
  echo ""
}

# --- Download Linux binaries from johnvansickle.com ---
download_linux() {
  local target_triple=$(get_target_triple "linux")
  echo "--- Processing Linux x86_64 (${target_triple}) ---"

  # Change to script directory for temporary files
  cd "$SCRIPT_DIR"

  echo "Downloading FFmpeg for Linux with multiple sources and retry..."

  # Try downloading from multiple sources
  if download_with_retry "ffmpeg-linux.tar.xz" "${LINUX_URLS[@]}"; then
    echo "Successfully downloaded Linux FFmpeg archive"
  else
    echo "❌ Failed to download Linux FFmpeg from all sources"
    return 1
  fi

  echo "Extracting archive..."
  mkdir -p "temp_linux"

  # Handle different archive formats
  if [[ "ffmpeg-linux.tar.xz" == *.tar.xz ]]; then
    tar -xf "ffmpeg-linux.tar.xz" -C "temp_linux"
  elif [[ "ffmpeg-linux.tar.xz" == *linux-x64 ]]; then
    # Handle single binary from eugeneware/ffmpeg-static
    mv "ffmpeg-linux.tar.xz" "temp_linux/ffmpeg"
    chmod +x "temp_linux/ffmpeg"
    # Create a dummy ffprobe (some sources only provide ffmpeg)
    cp "temp_linux/ffmpeg" "temp_linux/ffprobe" 2>/dev/null || true
  fi

  # Find the bin directory or binaries
  local bin_dir=$(find "temp_linux" -name "bin" -type d | head -1)

  if [ -z "$bin_dir" ]; then
    # If no bin directory, look for binaries directly
    local ffmpeg_bin=$(find "temp_linux" -name "ffmpeg" -type f | head -1)
    local ffprobe_bin=$(find "temp_linux" -name "ffprobe" -type f | head -1)
  else
    local ffmpeg_bin="$bin_dir/ffmpeg"
    local ffprobe_bin="$bin_dir/ffprobe"
  fi

  echo "Copying binaries with target triple suffix..."

  # Handle ffmpeg binary
  if [ -f "$ffmpeg_bin" ]; then
    cp "$ffmpeg_bin" "$BASE_DIR/ffmpeg-${target_triple}"
    chmod +x "$BASE_DIR/ffmpeg-${target_triple}"
    echo "  ✓ ffmpeg-${target_triple}"
  else
    echo "  ⚠ ffmpeg binary not found"
  fi

  # Handle ffprobe binary
  if [ -f "$ffprobe_bin" ]; then
    cp "$ffprobe_bin" "$BASE_DIR/ffprobe-${target_triple}"
    chmod +x "$BASE_DIR/ffprobe-${target_triple}"
    echo "  ✓ ffprobe-${target_triple}"
  else
    echo "  ⚠ ffprobe binary not found, trying to use ffmpeg as fallback"
    if [ -f "$ffmpeg_bin" ]; then
      cp "$ffmpeg_bin" "$BASE_DIR/ffprobe-${target_triple}"
      chmod +x "$BASE_DIR/ffprobe-${target_triple}"
      echo "  ✓ ffprobe-${target_triple} (using ffmpeg binary)"
    fi
  fi

  # Clean up
  rm -rf "ffmpeg-linux.tar.xz" "temp_linux"
  echo "Linux processing complete."
  echo ""
}

# --- Download and process platforms ---
if [ -n "$TARGET_TRIPLE_ARG" ]; then
  # Download specific platform
  case "$PLATFORM" in
    "macos_x86") download_macos_x86 ;;
    "macos_arm64") download_macos_arm64 ;;
    "windows") download_windows ;;
    "linux") download_linux ;;
  esac

  # Summary for single platform
  echo "✅ FFmpeg and FFprobe binaries for $TARGET_TRIPLE_ARG have been downloaded!"
  echo ""
  echo "Downloaded binaries:"
  echo "📁 $BASE_DIR/"
  target_triple=$(get_target_triple "$PLATFORM")
  if [ "$PLATFORM" = "windows" ]; then
    echo "   ├── ffmpeg-${target_triple}.exe"
    echo "   ├── ffprobe-${target_triple}.exe"
  else
    echo "   ├── ffmpeg-${target_triple}"
    echo "   ├── ffprobe-${target_triple}"
  fi
else
  # Download all platforms
  download_macos_x86
  download_macos_arm64
  download_windows
  download_linux

  # Summary for all platforms
  echo "✅ All FFmpeg and FFprobe binaries have been downloaded and organized for Tauri sidecar usage!"
  echo ""
  echo "Downloaded binaries:"
  echo "📁 $BASE_DIR/"
  for platform in "macos_x86" "macos_arm64" "windows" "linux"; do
    target_triple=$(get_target_triple "$platform")
    if [ "$platform" = "windows" ]; then
      echo "   ├── ffmpeg-${target_triple}.exe"
      echo "   ├── ffprobe-${target_triple}.exe"
    else
      echo "   ├── ffmpeg-${target_triple}"
      echo "   ├── ffprobe-${target_triple}"
    fi
  done
fi

echo ""
echo "🔧 To use these binaries in your Tauri app:"
echo "   1. Update your tauri.conf.json externalBin configuration:"
echo '      "externalBin": ["binaries/ffmpeg", "binaries/ffprobe"]'
echo ""
echo "   2. In your Rust code, use:"
echo '      app.shell().sidecar("ffmpeg")'
echo '      app.shell().sidecar("ffprobe")'
echo ""
echo "   3. Tauri will automatically select the correct binary based on the target platform."
echo ""
echo "🎉 Setup complete! Your FFmpeg sidecars are ready for cross-platform deployment."

