use base64::{engine::general_purpose, Engine};
use ffmpeg_next::{self as ffmpeg};
use std::{fs, process::Command, sync::Arc};
use thiserror::Error;

#[derive(serde::Serialize, Clone)]
pub struct VideoMetadata {
    file_path: String,
    resolution: String,
    frame_rate: String,
    duration: String,
    bit_rate: String,
    thumbnail_base64: String, // 存储第一帧的 base64 编码
}

#[derive(Error, Debug)]
pub enum Error {
    #[error("Failed to spawn blocking: {0}")]
    SpawnBlockingError(tauri::Error),
    #[error("Failed to parse video: {0}")]
    MetadataError(ffmpeg::Error),
    #[error("Could not create image buffer")]
    ImageBufferError,
}

#[tauri::command]
pub async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    let path = Arc::new(path);
    let path_clone = Arc::clone(&path);

    tauri::async_runtime::spawn_blocking(move || {
        ffmpeg::init().expect("Failed to initialize FFmpeg");

        match ffmpeg::format::input(&*path_clone) {
            Ok(ictx) => {
                let input_stream = ictx
                    .streams()
                    .best(ffmpeg::media::Type::Video)
                    .ok_or(ffmpeg::Error::StreamNotFound)?;

                let duration_sec = ictx.duration() as f64 / ffmpeg::ffi::AV_TIME_BASE as f64;

                // get metadata
                let bit_rate = ictx.bit_rate() as f64 / 1024.0;
                let frame_rate = input_stream.avg_frame_rate();
                let context_decoder =
                    ffmpeg::codec::context::Context::from_parameters(input_stream.parameters())?;

                let decoder = context_decoder.decoder().video()?;
                let width = decoder.width();
                let height = decoder.height();

                let temp_dir = std::env::temp_dir();
                let temp_image_path = temp_dir.join(format!(
                    "thumbnail_{}.png",
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos()
                ));
                // 执行 ffmpeg 命令提取第一帧
                let output = Command::new("ffmpeg")
                    .args([
                        "-i",
                        &path_clone,
                        "-vframes",
                        "1", // 只取1帧
                        "-f",
                        "image2", // 输出为图像
                        "-vf",
                        "select=eq(n\\,0)", // 选择第一帧
                        "-q:v",
                        "2",  // 高质量输出
                        "-y", // 覆盖输出文件
                        temp_image_path.to_str().unwrap(),
                    ])
                    .output();

                match output {
                    Ok(result) => {
                        if result.status.success() {
                            // 读取生成的图片文件并转换为 base64
                            match fs::read(&temp_image_path) {
                                Ok(image_data) => {
                                    let thumbnail_base64 =
                                        general_purpose::STANDARD.encode(&image_data);

                                    println!("{temp_image_path:?}");
                                    // 清理临时文件
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
                                    println!("Failed to read generated thumbnail: {}", e);
                                    Err(ffmpeg::Error::InvalidData)
                                }
                            }
                        } else {
                            let stderr = String::from_utf8_lossy(&result.stderr);
                            println!("FFmpeg command failed: {}", stderr);
                            Err(ffmpeg::Error::InvalidData)
                        }
                    }
                    Err(e) => {
                        println!("Failed to execute ffmpeg command: {}", e);
                        Err(ffmpeg::Error::InvalidData)
                    }
                }
            }
            Err(e) => Err(e),
        }
    })
    .await
    .map_err(|e| Error::SpawnBlockingError(e).to_string())?
    .map_err(|e| Error::MetadataError(e).to_string())
}
