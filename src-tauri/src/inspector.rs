use base64::{engine::general_purpose, Engine};
use ffmpeg_next::{self as ffmpeg};
use std::{fs, sync::Arc, time::Instant};
use tauri_plugin_shell::ShellExt;
use thiserror::Error;

use crate::get_app_handle;

#[derive(serde::Serialize, Clone)]
pub struct VideoMetadata {
    file_path: String,
    resolution: String,
    frame_rate: String,
    duration: String,
    bit_rate: String,
    thumbnail_base64: String, // Store base64 encoding of the first frame
}

#[derive(Error, Debug)]
pub enum Error {
    #[error("Failed to spawn blocking: {0}")]
    SpawnBlockingError(tauri::Error),
    #[error("Failed to parse video: {0}")]
    MetadataError(ffmpeg::Error),
}

#[tauri::command]
pub async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    let start_time = Instant::now();

    tracing::info!(
        video_path = %path,
        event = "processing_start",
        "Starting video metadata extraction"
    );

    let path = Arc::new(path);
    let path_clone = Arc::clone(&path);

    let result = tauri::async_runtime::spawn_blocking(move || {
        tracing::debug!(
            video_path = %path_clone,
            "Initializing FFmpeg"
        );

        ffmpeg::init().expect("Failed to initialize FFmpeg");

        match ffmpeg::format::input(&*path_clone) {
            Ok(ictx) => {
                tracing::debug!(
                    video_path = %path_clone,
                    "Successfully opened video file with FFmpeg"
                );

                let input_stream =
                    ictx.streams()
                        .best(ffmpeg::media::Type::Video)
                        .ok_or_else(|| {
                            tracing::error!(
                                video_path = %path_clone,
                                "No video stream found in file"
                            );
                            ffmpeg::Error::StreamNotFound
                        })?;

                let duration_sec = ictx.duration() as f64 / ffmpeg::ffi::AV_TIME_BASE as f64;

                // get metadata
                let bit_rate = ictx.bit_rate() as f64 / 1024.0;
                let frame_rate = input_stream.avg_frame_rate();
                let context_decoder =
                    ffmpeg::codec::context::Context::from_parameters(input_stream.parameters())?;

                let decoder = context_decoder.decoder().video()?;
                let width = decoder.width();
                let height = decoder.height();

                tracing::debug!(
                    video_path = %path_clone,
                    width = width,
                    height = height,
                    duration_sec = duration_sec,
                    bit_rate_kbps = bit_rate,
                    frame_rate = format!("{:.2}", frame_rate.0 as f64 / frame_rate.1 as f64),
                    "Extracted video metadata"
                );

                let temp_dir = std::env::temp_dir();
                let temp_image_path = temp_dir.join(format!(
                    "thumbnail_{}.png",
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos()
                ));

                let ffmpeg_args = [
                    "-i",
                    &path_clone,
                    "-vframes",
                    "1", // Extract only 1 frame
                    "-f",
                    "image2", // Output as image
                    "-vf",
                    "select=eq(n\\,0)", // Select the first frame
                    "-q:v",
                    "2",  // High quality output
                    "-y", // Overwrite output file
                    temp_image_path.to_str().unwrap(),
                ];

                // Use FFmpeg command directly with Tauri shell plugin
                let ffmpeg_command = "ffmpeg";

                tracing::debug!(
                    video_path = %path_clone,
                    temp_path = %temp_image_path.display(),
                    event = "ffmpeg_start",
                    ffmpeg_command = ffmpeg_command,
                    args = ?ffmpeg_args,
                    "Starting FFmpeg command execution"
                );

                // Ensure temp directory exists
                if let Err(e) = std::fs::create_dir_all(&temp_dir) {
                    tracing::error!(
                        temp_dir = %temp_dir.display(),
                        error = %e,
                        "Failed to create temp directory"
                    );
                    return Err(ffmpeg::Error::InvalidData);
                }

                let ffmpeg_start_time = Instant::now();

                // Execute ffmpeg command to extract the first frame using Tauri shell plugin
                let app_handle = get_app_handle()
                    .ok_or(ffmpeg::Error::InvalidData)?;
                let shell = app_handle.shell();

                let output = tauri::async_runtime::block_on(async move {
                    shell.command(ffmpeg_command).args(ffmpeg_args).output().await
                });

                match output {
                    Ok(result) => {
                        let ffmpeg_duration = ffmpeg_start_time.elapsed().as_millis() as u64;

                        if result.status.success() {
                            tracing::debug!(
                                video_path = %path_clone,
                                event = "ffmpeg_success",
                                duration_ms = ffmpeg_duration,
                                "FFmpeg command completed successfully"
                            );

                            // Read the generated image file and convert to base64
                            match fs::read(&temp_image_path) {
                                Ok(image_data) => {
                                    let thumbnail_base64 =
                                        general_purpose::STANDARD.encode(&image_data);

                                    tracing::debug!(
                                        video_path = %path_clone,
                                        thumbnail_size_bytes = image_data.len(),
                                        temp_path = %temp_image_path.display(),
                                        "Successfully generated and read thumbnail"
                                    );

                                    // Clean up temporary file
                                    let _ = fs::remove_file(&temp_image_path);

                                    Ok(VideoMetadata {
                                        file_path: (*path_clone).clone(),
                                        resolution: format!("{}x{}", width, height),
                                        frame_rate: format!(
                                            "{:.2}",
                                            frame_rate.0 as f64 / frame_rate.1 as f64
                                        ),
                                        duration: format!("{:.2}s", duration_sec),
                                        bit_rate: format!("{:.2} kbps", bit_rate),
                                        thumbnail_base64: format!(
                                            "data:image/png;base64,{}",
                                            thumbnail_base64
                                        ),
                                    })
                                }
                                Err(e) => {
                                    let _ = fs::remove_file(&temp_image_path);
                                    tracing::error!(
                                        video_path = %path_clone,
                                        error = %e,
                                        temp_path = %temp_image_path.display(),
                                        "Failed to read generated thumbnail file"
                                    );
                                    Err(ffmpeg::Error::InvalidData)
                                }
                            }
                        } else {
                            let stderr = String::from_utf8_lossy(&result.stderr);
                            tracing::error!(
                                video_path = %path_clone,
                                event = "ffmpeg_error",
                                stderr = %stderr,
                                duration_ms = ffmpeg_duration,
                                "FFmpeg command failed"
                            );
                            Err(ffmpeg::Error::InvalidData)
                        }
                    }
                    Err(e) => {
                        let ffmpeg_duration = ffmpeg_start_time.elapsed().as_millis() as u64;
                        tracing::error!(
                            video_path = %path_clone,
                            error = %e,
                            duration_ms = ffmpeg_duration,
                            "Failed to execute FFmpeg command"
                        );
                        Err(ffmpeg::Error::InvalidData)
                    }
                }
            }
            Err(e) => {
                tracing::error!(
                    video_path = %path_clone,
                    error = %e,
                    "Failed to open video file with FFmpeg"
                );
                Err(e)
            }
        }
    })
    .await
    .map_err(|e| Error::SpawnBlockingError(e).to_string())?;

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

    result.map_err(|e| Error::MetadataError(e).to_string())
}
