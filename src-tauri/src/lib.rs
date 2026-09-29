use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      let show = MenuItem::with_id(app, "show", "Abrir QuestLogg", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show, &quit])?;
      TrayIconBuilder::new().menu(&menu).on_menu_event(|app, event| match event.id.as_ref() {
        "show" => if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); },
        "quit" => app.exit(0),
        _ => {}
      }).build(app)?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("erro ao iniciar o QuestLogg");
}
