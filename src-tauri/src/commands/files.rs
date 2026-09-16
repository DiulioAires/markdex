use crate::models::{FileNode, ProjectInfo};
use std::{
    cmp::Ordering,
    fs,
    path::{Path, PathBuf},
};
use tauri_plugin_dialog::DialogExt;

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

#[derive(Debug, Eq, PartialEq)]
enum EntryKind {
    Directory,
    File,
}

struct TreeEntry {
    name: String,
    path: PathBuf,
    kind: EntryKind,
}

#[tauri::command]
pub fn open_project(app: tauri::AppHandle) -> Result<Option<ProjectInfo>, String> {
    let Some(folder) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };

    let selected_path = folder
        .into_path()
        .map_err(|error| format!("Failed to resolve selected folder: {error}"))?;
    let root = canonical_project_root(&selected_path)?;
    let name = root
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Project")
        .to_owned();

    Ok(Some(ProjectInfo {
        name,
        root_path: path_to_string(&root),
    }))
}

#[tauri::command]
pub fn list_markdown_tree(root_path: String) -> Result<Vec<FileNode>, String> {
    let root = canonical_project_root(Path::new(&root_path))?;
    read_markdown_directory(&root, &root)
}

#[tauri::command]
pub fn read_markdown_file(root_path: String, file_path: String) -> Result<String, String> {
    let file = resolve_markdown_path(Path::new(&root_path), Path::new(&file_path))?;
    fs::read_to_string(file).map_err(|error| format!("Failed to read Markdown file: {error}"))
}

#[tauri::command]
pub fn write_markdown_file(
    root_path: String,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let file = resolve_markdown_path(Path::new(&root_path), Path::new(&file_path))?;
    fs::write(file, content).map_err(|error| format!("Failed to write Markdown file: {error}"))
}

pub fn validate_markdown_path(root: &Path, file: &Path) -> Result<(), String> {
    resolve_markdown_path(root, file).map(|_| ())
}

fn resolve_markdown_path(root: &Path, file: &Path) -> Result<PathBuf, String> {
    let canonical_root = canonical_project_root(root)?;
    let canonical_file = file
        .canonicalize()
        .map_err(|error| format!("Failed to resolve file path: {error}"))?;

    if !canonical_file.starts_with(&canonical_root) {
        return Err("Path is outside the open project".to_owned());
    }

    if !canonical_file.is_file() {
        return Err("Path is not a file".to_owned());
    }

    let extension = canonical_file
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_ascii_lowercase);

    if !matches!(extension.as_deref(), Some("md" | "mdx")) {
        return Err("Only .md and .mdx files are allowed".to_owned());
    }

    Ok(canonical_file)
}

fn canonical_project_root(root: &Path) -> Result<PathBuf, String> {
    let canonical_root = root
        .canonicalize()
        .map_err(|error| format!("Failed to resolve project path: {error}"))?;

    if !canonical_root.is_dir() {
        return Err("Project path is not a directory".to_owned());
    }

    Ok(canonical_root)
}

fn read_markdown_directory(root: &Path, directory: &Path) -> Result<Vec<FileNode>, String> {
    let mut entries = Vec::new();

    for entry in fs::read_dir(directory)
        .map_err(|error| format!("Failed to list project directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("Failed to inspect project entry: {error}"))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Failed to inspect project entry type: {error}"))?;

        if file_type.is_symlink() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().into_owned();
        let kind = if file_type.is_dir() {
            if IGNORED_DIRECTORY_NAMES.contains(&name.as_str()) {
                continue;
            }
            EntryKind::Directory
        } else if file_type.is_file() && is_markdown_path(&entry.path()) {
            EntryKind::File
        } else {
            continue;
        };

        let path = entry
            .path()
            .canonicalize()
            .map_err(|error| format!("Failed to resolve project entry: {error}"))?;

        if !path.starts_with(root) {
            continue;
        }

        entries.push(TreeEntry {
            name,
            path,
            kind,
        });
    }

    entries.sort_by(compare_tree_entries);

    entries
        .into_iter()
        .map(|entry| {
            let relative_path = entry
                .path
                .strip_prefix(root)
                .map_err(|_| "Path is outside the open project".to_owned())?;
            let name = entry.name;
            let path = path_to_string(&entry.path);
            let relative_path = path_to_string(relative_path);

            match entry.kind {
                EntryKind::Directory => Ok(FileNode::Directory {
                    name,
                    path,
                    relative_path,
                    children: read_markdown_directory(root, &entry.path)?,
                }),
                EntryKind::File => Ok(FileNode::File {
                    name,
                    path,
                    relative_path,
                }),
            }
        })
        .collect()
}

fn compare_tree_entries(left: &TreeEntry, right: &TreeEntry) -> Ordering {
    let kind_order = match (&left.kind, &right.kind) {
        (EntryKind::Directory, EntryKind::File) => Ordering::Less,
        (EntryKind::File, EntryKind::Directory) => Ordering::Greater,
        _ => Ordering::Equal,
    };

    kind_order.then_with(|| {
        left.name
            .to_lowercase()
            .cmp(&right.name.to_lowercase())
            .then_with(|| left.name.cmp(&right.name))
    })
}

fn is_markdown_path(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(str::to_ascii_lowercase)
            .as_deref(),
        Some("md" | "mdx")
    )
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::FileNode;
    use std::fs;

    #[test]
    fn accepts_markdown_inside_project() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("README.md");
        fs::write(&file, "# Hello").unwrap();
        assert!(validate_markdown_path(dir.path(), &file).is_ok());
    }

    #[test]
    fn rejects_non_markdown_files() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("secret.txt");
        fs::write(&file, "secret").unwrap();
        assert_eq!(
            validate_markdown_path(dir.path(), &file).unwrap_err(),
            "Only .md and .mdx files are allowed"
        );
    }

    #[test]
    fn rejects_files_outside_project() {
        let project = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let file = outside.path().join("README.md");
        fs::write(&file, "# Outside").unwrap();
        assert_eq!(
            validate_markdown_path(project.path(), &file).unwrap_err(),
            "Path is outside the open project"
        );
    }

    #[test]
    fn lists_directories_before_markdown_files_and_ignores_global_directories() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("zeta")).unwrap();
        fs::create_dir(dir.path().join("Alpha")).unwrap();
        fs::create_dir(dir.path().join("node_modules")).unwrap();
        fs::write(dir.path().join("README.md"), "# Hello").unwrap();
        fs::write(dir.path().join("notes.MDX"), "# Notes").unwrap();
        fs::write(dir.path().join("secret.txt"), "secret").unwrap();

        let tree = list_markdown_tree(dir.path().display().to_string()).unwrap();
        let names: Vec<&str> = tree
            .iter()
            .map(|node| match node {
                FileNode::File { name, .. } | FileNode::Directory { name, .. } => name.as_str(),
            })
            .collect();

        assert_eq!(names, ["Alpha", "zeta", "notes.MDX", "README.md"]);
    }

    #[test]
    fn reads_and_writes_a_markdown_file_inside_project() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("README.md");
        fs::write(&file, "# Before").unwrap();
        let root_path = dir.path().display().to_string();
        let file_path = file.display().to_string();

        assert_eq!(
            read_markdown_file(root_path.clone(), file_path.clone()).unwrap(),
            "# Before"
        );
        write_markdown_file(root_path, file_path, "# After".to_owned()).unwrap();
        assert_eq!(fs::read_to_string(file).unwrap(), "# After");
    }
}
