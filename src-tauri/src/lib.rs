pub mod commands;
pub mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::files::AuthorizedProjectRoot::default())
        .invoke_handler(tauri::generate_handler![
            commands::files::open_project,
            commands::files::open_project_at,
            commands::files::list_markdown_tree,
            commands::files::read_markdown_file,
            commands::files::write_markdown_file,
            commands::files::create_markdown_file,
            commands::files::create_directory,
            commands::files::rename_entry,
            commands::files::delete_entry,
            commands::files::close_project,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
