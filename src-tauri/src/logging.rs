use tracing_subscriber::{
    fmt::{self, time::LocalTime},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter, Layer,
};
use tracing_appender::{non_blocking, rolling};
use std::path::PathBuf;
use std::sync::OnceLock;

// Global guard to keep the non-blocking writer alive
static _GUARD: OnceLock<tracing_appender::non_blocking::WorkerGuard> = OnceLock::new();

/// Initialize the logging system for the video inspector application
///
/// This sets up both console and file logging with appropriate formatting and filtering.
/// File logs are stored in the application data directory with daily rotation.
pub fn init_logging() -> Result<(), Box<dyn std::error::Error>> {
    // Create time formatter for logs
    let timer = LocalTime::new(time::format_description::parse(
        "[year]-[month]-[day] [hour]:[minute]:[second].[subsecond digits:3]",
    )?);

    // Configure environment filters
    // Console: Default to INFO level, but allow override via RUST_LOG environment variable
    let console_env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,video_inspector=debug"));

    // File: More detailed logging (DEBUG level) - commented out
    let _file_env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("debug,video_inspector=debug"));

    // Get application data directory for log files
    let log_dir = get_log_directory()?;

    // Ensure log directory exists
    std::fs::create_dir_all(&log_dir)?;

    // Create file appender with daily rotation (commented out for now)
    let file_appender = rolling::daily(&log_dir, "video-inspector.log");
    let (_non_blocking_appender, guard) = non_blocking(file_appender);

    // Store the guard globally to keep the non-blocking writer alive
    if _GUARD.set(guard).is_err() {
        tracing::warn!("Failed to set global guard - logging may not work properly");
    }

    // Create console logging layer
    let console_layer = fmt::layer()
        .with_timer(timer.clone())
        .with_target(false) // Less verbose for console
        .with_thread_ids(false)
        .with_thread_names(false)
        .with_file(false)
        .with_line_number(false)
        .with_ansi(true) // ANSI colors for console
        .with_filter(console_env_filter);

    // Create file logging layer (commented out to disable file logging)
    // let file_layer = fmt::layer()
    //     .with_timer(timer)
    //     .with_target(true) // More verbose for file
    //     .with_thread_ids(true)
    //     .with_thread_names(true)
    //     .with_file(true)
    //     .with_line_number(true)
    //     .with_ansi(false) // No ANSI colors for file
    //     .with_writer(non_blocking_appender)
    //     .with_filter(file_env_filter);

    // Initialize the global subscriber with console output only (file logging commented out)
    tracing_subscriber::registry()
        .with(console_layer)
        // .with(file_layer)  // Commented out to disable file logging
        .init();

    tracing::info!("Logging system initialized with console output only");

    Ok(())
}

/// Get the directory where log files should be stored
///
/// Uses the application data directory specific to the platform
fn get_log_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_data_dir = dirs::data_dir()
        .ok_or("Failed to get application data directory")?;

    let log_dir = app_data_dir
        .join("com.arc.video-inspector")
        .join("logs");

    Ok(log_dir)
}

