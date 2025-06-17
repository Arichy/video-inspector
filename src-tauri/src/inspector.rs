use base64::{engine::general_purpose, Engine};
use std::{fs, time::Instant};
use tauri_plugin_shell::ShellExt;
use thiserror::Error;
use sha2::{Sha256, Digest};

use crate::get_app_handle;

#[derive(serde::Serialize, Clone)]
pub struct VideoMetadata {
    file_path: String,
    resolution: String,
    frame_rate: String,
    duration: String,
    bit_rate: String,
    file_size: String,
    file_hash: String,
    thumbnails_base64: Vec<String>, // Store base64 encoding of 4 thumbnails
}

#[derive(Error, Debug)]
pub enum Error {
    #[error("Failed to execute ffmpeg: {0}")]
    FfmpegError(String),
    #[error("Failed to parse ffmpeg output: {0}")]
    ParseError(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Shell error: {0}")]
    ShellError(#[from] tauri_plugin_shell::Error),
}

#[tauri::command]
pub async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    let start_time = Instant::now();

    tracing::info!(
        video_path = %path,
        event = "processing_start",
        "Starting video metadata extraction"
    );

    let result = extract_video_metadata_async(&path).await;

    let total_duration = start_time.elapsed().as_millis() as u64;

    match &result {
        Ok(_) => {
            tracing::info!(
                video_path = %path,
                event = "processing_success",
                duration_ms = total_duration,
                "Video metadata extraction completed successfully"
            );
        }
        Err(e) => {
            tracing::error!(
                video_path = %path,
                event = "processing_error",
                error = %e,
                duration_ms = total_duration,
                "Video metadata extraction failed"
            );
        }
    }

    result.map_err(|e| e.to_string())
}

/// Extract video metadata using ffmpeg sidecar
async fn extract_video_metadata_async(path: &str) -> Result<VideoMetadata, Error> {
    let app_handle = get_app_handle()
        .ok_or_else(|| Error::FfmpegError("App handle not available".to_string()))?;

    // Get metadata using ffprobe (part of ffmpeg)
    let metadata = get_video_info_with_ffprobe(app_handle, path).await?;

    // Calculate file size and hash
    let file_size = get_file_size(path)?;
    let file_hash = calculate_file_hash(path)?;

    // Generate 4 thumbnails
    let thumbnails_base64 = generate_thumbnails_with_ffmpeg(app_handle, path, &metadata).await?;

    Ok(VideoMetadata {
        file_path: path.to_string(),
        resolution: format!("{}x{}", metadata.width, metadata.height),
        frame_rate: format!("{:.2}", metadata.frame_rate),
        duration: format!("{:.2}s", metadata.duration),
        bit_rate: format!("{:.2} kbps", metadata.bit_rate / 1024.0),
        file_size,
        file_hash,
        thumbnails_base64,
    })
}

#[derive(Debug)]
struct VideoInfo {
    width: u32,
    height: u32,
    duration: f64,
    frame_rate: f64,
    bit_rate: f64,
}

/// Get video information using ffprobe sidecar
async fn get_video_info_with_ffprobe(
    app_handle: &tauri::AppHandle,
    path: &str,
) -> Result<VideoInfo, Error> {
    tracing::debug!(video_path = %path, "Getting video info with ffprobe");

    let shell = app_handle.shell();

    // Use ffprobe to get video metadata in JSON format
    let output = shell
        .sidecar("ffprobe")?
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            "-select_streams", "v:0",
            path
        ])
        .output()
        .await
        .map_err(|e| Error::FfmpegError(format!("Failed to execute ffprobe: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(Error::FfmpegError(format!(
            "ffprobe failed: {}",
            stderr
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    tracing::debug!(
        video_path = %path,
        ffprobe_output = %stdout,
        "FFprobe JSON output"
    );

    // Parse the JSON output
    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| Error::ParseError(format!("Failed to parse ffprobe JSON: {}", e)))?;

    // Extract video stream information
    let streams = json["streams"].as_array()
        .ok_or_else(|| Error::ParseError("No streams found in ffprobe output".to_string()))?;

    let video_stream = streams.iter()
        .find(|stream| stream["codec_type"].as_str() == Some("video"))
        .ok_or_else(|| Error::ParseError("No video stream found".to_string()))?;

    // Extract metadata
    let width = video_stream["width"].as_u64()
        .ok_or_else(|| Error::ParseError("Width not found".to_string()))? as u32;

    let height = video_stream["height"].as_u64()
        .ok_or_else(|| Error::ParseError("Height not found".to_string()))? as u32;

    // Parse frame rate (can be a fraction like "30/1")
    let frame_rate_str = video_stream["r_frame_rate"].as_str()
        .ok_or_else(|| Error::ParseError("Frame rate not found".to_string()))?;
    let frame_rate = parse_fraction(frame_rate_str)?;

    // Parse duration from format section
    let format = &json["format"];
    let duration_str = format["duration"].as_str()
        .ok_or_else(|| Error::ParseError("Duration not found".to_string()))?;
    let duration: f64 = duration_str.parse()
        .map_err(|_| Error::ParseError("Invalid duration format".to_string()))?;

    // Parse bit rate
    let bit_rate_str = format["bit_rate"].as_str().unwrap_or("0");
    let bit_rate: f64 = bit_rate_str.parse().unwrap_or(0.0);

    tracing::debug!(
        video_path = %path,
        width = width,
        height = height,
        duration = duration,
        frame_rate = frame_rate,
        bit_rate = bit_rate,
        "Successfully extracted video metadata"
    );

    Ok(VideoInfo {
        width,
        height,
        duration,
        frame_rate,
        bit_rate,
    })
}

/// Generate 4 thumbnails using ffmpeg sidecar
async fn generate_thumbnails_with_ffmpeg(
    app_handle: &tauri::AppHandle,
    path: &str,
    video_info: &VideoInfo,
) -> Result<Vec<String>, Error> {
    tracing::debug!(video_path = %path, "Generating 4 thumbnails with ffmpeg");

    let temp_dir = std::env::temp_dir();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();

    // Ensure temp directory exists
    std::fs::create_dir_all(&temp_dir)?;

    let shell = app_handle.shell();
    let mut thumbnails_base64 = Vec::new();

    // Calculate 4 time points evenly distributed across the video duration
    let duration = video_info.duration;
    let time_points = [
        duration * 0.1,  // 10% into the video
        duration * 0.3,  // 30% into the video
        duration * 0.6,  // 60% into the video
        duration * 0.9,  // 90% into the video
    ];

    for (i, time_point) in time_points.iter().enumerate() {
        let temp_image_path = temp_dir.join(format!(
            "thumbnail_{}_{}.png",
            timestamp, i
        ));

        // Generate thumbnail at specific time point - optimized for speed
        let output = shell
            .sidecar("ffmpeg")?
            .args([
                "-ss", &format!("{:.2}", time_point),
                "-i", path,
                "-vframes", "1",
                "-vf", "scale=480:270:force_original_aspect_ratio=decrease", // Smaller size for thumbnails
                "-q:v", "2",
                "-f", "image2",
                "-y",
                temp_image_path.to_str().unwrap(),
            ])
            .output()
            .await
            .map_err(|e| Error::FfmpegError(format!("Failed to execute ffmpeg: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let _ = fs::remove_file(&temp_image_path);
            return Err(Error::FfmpegError(format!(
                "ffmpeg thumbnail generation failed at time {:.2}s: {}",
                time_point, stderr
            )));
        }

        // Read the generated image file and convert to base64
        let image_data = fs::read(&temp_image_path)?;
        let thumbnail_base64 = general_purpose::STANDARD.encode(&image_data);
        thumbnails_base64.push(format!("data:image/png;base64,{}", thumbnail_base64));

        // Clean up temporary file
        let _ = fs::remove_file(&temp_image_path);
    }

    tracing::debug!(
        video_path = %path,
        thumbnails_count = thumbnails_base64.len(),
        "Successfully generated thumbnails"
    );

    Ok(thumbnails_base64)
}

/// Parse a fraction string like "30/1" to a float
fn parse_fraction(fraction_str: &str) -> Result<f64, Error> {
    let parts: Vec<&str> = fraction_str.split('/').collect();
    if parts.len() != 2 {
        return Err(Error::ParseError(format!(
            "Invalid fraction format: {}",
            fraction_str
        )));
    }

    let numerator: f64 = parts[0]
        .parse()
        .map_err(|_| Error::ParseError(format!("Invalid numerator: {}", parts[0])))?;
    let denominator: f64 = parts[1]
        .parse()
        .map_err(|_| Error::ParseError(format!("Invalid denominator: {}", parts[1])))?;

    if denominator == 0.0 {
        return Err(Error::ParseError(
            "Division by zero in fraction".to_string(),
        ));
    }

    Ok(numerator / denominator)
}

/// Get file size in human readable format
fn get_file_size(path: &str) -> Result<String, Error> {
    let metadata = fs::metadata(path)?;
    let size_bytes = metadata.len();

    if size_bytes < 1024 {
        Ok(format!("{} B", size_bytes))
    } else if size_bytes < 1024 * 1024 {
        Ok(format!("{:.2} KB", size_bytes as f64 / 1024.0))
    } else if size_bytes < 1024 * 1024 * 1024 {
        Ok(format!("{:.2} MB", size_bytes as f64 / (1024.0 * 1024.0)))
    } else {
        Ok(format!("{:.2} GB", size_bytes as f64 / (1024.0 * 1024.0 * 1024.0)))
    }
}

/// Calculate SHA256 hash of the file
fn calculate_file_hash(path: &str) -> Result<String, Error> {
    let file_data = fs::read(path)?;
    let mut hasher = Sha256::new();
    hasher.update(&file_data);
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}
