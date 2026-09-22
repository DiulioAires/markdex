use notify::{
    event::{CreateKind, EventKind, ModifyKind, RemoveKind},
    recommended_watcher, RecommendedWatcher, RecursiveMode, Watcher,
};
use serde::Serialize;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{mpsc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};

const FILES_CHANGED_EVENT: &str = "project-files-changed";
const QUIET_PERIOD: Duration = Duration::from_millis(500);
const MAX_BATCH_PERIOD: Duration = Duration::from_secs(2);
const IGNORED_DIRECTORY_NAMES: &[&str] = &[
    ".git",
    "node_modules",
    "dist",
    "build",
    "target",
    ".next",
    "coverage",
    "vendor",
];

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectChange {
    root_path: String,
    tree_changed: bool,
    files_changed: bool,
}

#[derive(Default)]
pub struct ProjectWatchers {
    watchers: Mutex<HashMap<PathBuf, RecommendedWatcher>>,
}

impl ProjectWatchers {
    pub fn watch(&self, app: AppHandle, root: PathBuf) -> Result<(), String> {
        let mut watchers = self
            .watchers
            .lock()
            .map_err(|_| "Project watcher state is unavailable".to_owned())?;
        if watchers.contains_key(&root) {
            return Ok(());
        }

        let (sender, receiver) = mpsc::channel();
        let mut watcher = recommended_watcher(move |event| {
            let _ = sender.send(event);
        })
        .map_err(|error| format!("Failed to monitor project changes: {error}"))?;

        watcher
            .watch(&root, RecursiveMode::Recursive)
            .map_err(|error| format!("Failed to monitor project changes: {error}"))?;

        let root_for_thread = root.clone();
        thread::spawn(move || {
            process_events(receiver, app, root_for_thread);
        });
        watchers.insert(root, watcher);
        Ok(())
    }

    pub fn unwatch(&self, root: &Path) {
        if let Ok(mut watchers) = self.watchers.lock() {
            watchers.remove(root);
        }
    }
}

fn process_events(
    receiver: mpsc::Receiver<notify::Result<notify::Event>>,
    app: AppHandle,
    root: PathBuf,
) {
    while let Ok(event) = receiver.recv() {
        let Some(mut change) = event.ok().and_then(|event| event_impact(&root, &event)) else {
            continue;
        };

        let batch_started = Instant::now();
        let mut last_relevant_event = batch_started;

        loop {
            let quiet_remaining = QUIET_PERIOD.saturating_sub(last_relevant_event.elapsed());
            let max_remaining = MAX_BATCH_PERIOD.saturating_sub(batch_started.elapsed());
            let wait = quiet_remaining.min(max_remaining);
            if wait.is_zero() {
                break;
            }

            match receiver.recv_timeout(wait) {
                Ok(Ok(event)) => {
                    if let Some(impact) = event_impact(&root, &event) {
                        change.tree_changed |= impact.tree_changed;
                        change.files_changed |= impact.files_changed;
                        last_relevant_event = Instant::now();
                    }
                }
                Ok(_) => {}
                Err(mpsc::RecvTimeoutError::Timeout) => break,
                Err(mpsc::RecvTimeoutError::Disconnected) => return,
            }
        }

        let _ = app.emit(FILES_CHANGED_EVENT, change);
    }
}

fn event_impact(root: &Path, event: &notify::Event) -> Option<ProjectChange> {
    let is_folder_create_or_remove = matches!(
        event.kind,
        EventKind::Create(CreateKind::Folder) | EventKind::Remove(RemoveKind::Folder)
    );
    let is_structure_change = matches!(
        event.kind,
        EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(ModifyKind::Name(_))
    );
    let mut has_markdown_file = false;
    let mut has_relevant_path = false;

    for path in &event.paths {
        let Ok(relative_path) = path.strip_prefix(root) else {
            continue;
        };
        if relative_path.components().any(|component| {
            IGNORED_DIRECTORY_NAMES
                .iter()
                .any(|ignored| component.as_os_str() == *ignored)
        }) {
            continue;
        }

        let is_markdown = is_markdown_path(path);
        let is_directory = path.is_dir() || is_folder_create_or_remove;
        has_markdown_file |= is_markdown;
        has_relevant_path |= is_markdown || is_directory;
    }

    if !has_relevant_path {
        return None;
    }

    let tree_changed = is_structure_change && has_relevant_path;
    let files_changed = has_markdown_file
        && matches!(
            event.kind,
            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
        );
    if !tree_changed && !files_changed {
        return None;
    }

    Some(ProjectChange {
        root_path: root.to_string_lossy().into_owned(),
        tree_changed,
        files_changed,
    })
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| matches!(extension.to_ascii_lowercase().as_str(), "md" | "mdx"))
}
