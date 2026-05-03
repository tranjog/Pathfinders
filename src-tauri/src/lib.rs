#[cfg(target_os = "macos")]
mod macos_location;

#[tauri::command]
async fn fetch_overpass(query: String) -> Result<String, String> {
  // overpass-api.de rejects requests with an empty/generic User-Agent
  // (returns HTTP 406 since their rate-limiting rules tightened).
  // Identify ourselves with the app name, version and repository URL.
  const USER_AGENT: &str = concat!(
    "Pathfinders/",
    env!("CARGO_PKG_VERSION"),
    " (+https://github.com/tranjog/pathfinders)"
  );

  static CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
  let client = CLIENT.get_or_init(|| {
    reqwest::Client::builder()
      .user_agent(USER_AGENT)
      .build()
      .expect("failed to build reqwest client")
  });

  let response = client
    .post("https://overpass-api.de/api/interpreter")
    .header(reqwest::header::ACCEPT, "application/json")
    .header(reqwest::header::REFERER, "https://github.com/tranjog/pathfinders")
    .form(&[("data", query.as_str())])
    .send()
    .await
    .map_err(|e| e.to_string())?;

  if !response.status().is_success() {
    return Err(format!("Overpass API error: {}", response.status()));
  }

  response.text().await.map_err(|e| e.to_string())
}

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
  let builder = builder.invoke_handler(tauri::generate_handler![
    macos_location::get_macos_location,
    fetch_overpass
  ]);

  #[cfg(not(target_os = "macos"))]
  let builder = builder.invoke_handler(tauri::generate_handler![fetch_overpass]);

  builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
