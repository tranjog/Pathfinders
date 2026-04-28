#[cfg(target_os = "macos")]
mod macos_location;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_geolocation::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    });

  #[cfg(target_os = "macos")]
  let builder = builder.invoke_handler(tauri::generate_handler![macos_location::get_macos_location]);

  builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
