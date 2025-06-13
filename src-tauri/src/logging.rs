use tracing_subscriber::{
    fmt::{self, time::LocalTime},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

/// Initialize the logging system for the video inspector application
///
/// This sets up console-only logging with appropriate formatting and filtering.
/// File logging is temporarily disabled.
pub fn init_logging() -> Result<(), Box<dyn std::error::Error>> {
    // Create time formatter for logs
    let timer = LocalTime::new(time::format_description::parse(
        "[year]-[month]-[day] [hour]:[minute]:[second].[subsecond digits:3]",
    )?);

    // Configure environment filter
    // Default to INFO level, but allow override via RUST_LOG environment variable
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,video_inspector=debug"));

    // Create console logging layer only
    let console_layer = fmt::layer()
        .with_timer(timer)
        .with_target(false) // Less verbose for console
        .with_thread_ids(false)
        .with_thread_names(false)
        .with_file(false)
        .with_line_number(false)
        .with_ansi(true); // ANSI colors for console

    // Initialize the global subscriber with console output only
    tracing_subscriber::registry()
        .with(env_filter)
        .with(console_layer)
        .init();

    tracing::info!("Logging system initialized (console only)");

    Ok(())
}


