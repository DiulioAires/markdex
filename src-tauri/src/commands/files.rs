use crate::models::{FileNode, ProjectInfo};
use cap_fs_ext::{FollowSymlinks, OpenOptionsFollowExt};
use cap_std::{
    ambient_authority,
    fs::{Dir, OpenOptions},
};
use std::{
    cmp::Ordering,
    collections::HashMap,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri_plugin_dialog::DialogExt;

/// Maximum directory nesting depth the Markdown tree walk will descend into.
/// This guards against pathological directory structures causing unbounded
/// recursion (and stack exhaustion) on the synchronous Tauri command thread.
/// No realistic project should ever come close to this depth.
const MAX_TREE_DEPTH: usize = 64;

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

#[derive(Default)]
pub struct AuthorizedProjectRoot {
    projects: Mutex<HashMap<PathBuf, AuthorizedProject>>,
}

struct AuthorizedProject {
    path: PathBuf,
    directory: Dir,
}

#[derive(Debug)]
struct AuthorizedProjectAccess {
    canonical_root: PathBuf,
    requested_root: PathBuf,
    directory: Dir,
}

impl AuthorizedProjectRoot {
    fn authorize(&self, root: &Path) -> Result<PathBuf, String> {
        let path = canonical_project_root(root)?;
        let directory = Dir::open_ambient_dir(&path, ambient_authority())
            .map_err(|error| format!("Failed to open project directory: {error}"))?;
        let mut projects = self
            .projects
            .lock()
            .map_err(|_| "Open project state is unavailable".to_owned())?;

        projects.insert(
            path.clone(),
            AuthorizedProject {
                path: path.clone(),
                directory,
            },
        );

        Ok(path)
    }

    fn require(&self, requested_root: &Path) -> Result<AuthorizedProjectAccess, String> {
        let requested_path = canonical_project_root(requested_root)?;
        let projects = self
            .projects
            .lock()
            .map_err(|_| "Open project state is unavailable".to_owned())?;
        let project = projects
            .get(&requested_path)
            .ok_or_else(|| "Requested root does not match the open project".to_owned())?;

        Ok(AuthorizedProjectAccess {
            canonical_root: project.path.clone(),
            requested_root: requested_root.to_owned(),
            directory: project
                .directory
                .try_clone()
                .map_err(|error| format!("Failed to access open project: {error}"))?,
        })
    }

    fn close(&self, root_path: &str) -> Result<(), String> {
        let canonical_root = canonical_project_root(Path::new(root_path))?;
        let mut projects = self
            .projects
            .lock()
            .map_err(|_| "Open project state is unavailable".to_owned())?;
        projects
            .remove(&canonical_root)
            .ok_or_else(|| "Requested root does not match an open project".to_owned())?;
        Ok(())
    }
}

impl AuthorizedProjectAccess {
    fn file_path(&self, file_path: &Path) -> Result<PathBuf, String> {
        let relative_path = file_path
            .strip_prefix(&self.requested_root)
            .map_err(|_| "Path is outside the open project".to_owned())?;

        if relative_path.as_os_str().is_empty()
            || relative_path.components().any(|component| {
                matches!(
                    component,
                    std::path::Component::ParentDir
                        | std::path::Component::RootDir
                        | std::path::Component::Prefix(_)
                )
            })
        {
            return Err("Path is outside the open project".to_owned());
        }

        if !is_markdown_path(relative_path) {
            return Err("Only .md and .mdx files are allowed".to_owned());
        }

        Ok(relative_path.to_owned())
    }
}

#[tauri::command]
pub fn open_project(
    app: tauri::AppHandle,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<Option<ProjectInfo>, String> {
    let Some(folder) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };

    let selected_path = folder
        .into_path()
        .map_err(|error| format!("Failed to resolve selected folder: {error}"))?;
    let root = project_root.authorize(&selected_path)?;
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
pub fn open_project_at(
    root_path: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<ProjectInfo, String> {
    open_project_at_for(project_root.inner(), root_path)
}

fn open_project_at_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
) -> Result<ProjectInfo, String> {
    let root = project_root.authorize(Path::new(&root_path))?;
    let name = root
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Project")
        .to_owned();

    Ok(ProjectInfo {
        name,
        root_path: path_to_string(&root),
    })
}

#[tauri::command]
pub fn list_markdown_tree(
    root_path: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<Vec<FileNode>, String> {
    list_markdown_tree_for(project_root.inner(), root_path)
}

fn list_markdown_tree_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
) -> Result<Vec<FileNode>, String> {
    let project = project_root.require(Path::new(&root_path))?;
    read_markdown_directory(
        &project.canonical_root,
        &project.directory,
        Path::new(""),
        0,
    )
}

#[tauri::command]
pub fn read_markdown_file(
    root_path: String,
    file_path: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<String, String> {
    read_markdown_file_for(project_root.inner(), root_path, file_path)
}

fn read_markdown_file_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
    file_path: String,
) -> Result<String, String> {
    let project = project_root.require(Path::new(&root_path))?;
    let file_path = project.file_path(Path::new(&file_path))?;
    let mut options = OpenOptions::new();
    options.read(true).follow(FollowSymlinks::No);
    let mut file = project
        .directory
        .open_with(file_path, &options)
        .map_err(|error| format!("Failed to read Markdown file: {error}"))?;

    if !file
        .metadata()
        .map_err(|error| format!("Failed to inspect Markdown file: {error}"))?
        .is_file()
    {
        return Err("Path is not a file".to_owned());
    }

    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|error| format!("Failed to read Markdown file: {error}"))?;
    Ok(content)
}

#[tauri::command]
pub fn write_markdown_file(
    root_path: String,
    file_path: String,
    content: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<(), String> {
    write_markdown_file_for(project_root.inner(), root_path, file_path, content)
}

fn write_markdown_file_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let project = project_root.require(Path::new(&root_path))?;
    let file_path = project.file_path(Path::new(&file_path))?;
    let mut options = OpenOptions::new();
    options
        .write(true)
        .truncate(true)
        .follow(FollowSymlinks::No);
    let mut file = project
        .directory
        .open_with(file_path, &options)
        .map_err(|error| format!("Failed to write Markdown file: {error}"))?;

    if !file
        .metadata()
        .map_err(|error| format!("Failed to inspect Markdown file: {error}"))?
        .is_file()
    {
        return Err("Path is not a file".to_owned());
    }

    file.write_all(content.as_bytes())
        .map_err(|error| format!("Failed to write Markdown file: {error}"))
}

#[tauri::command]
pub fn close_project(
    root_path: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<(), String> {
    close_project_for(project_root.inner(), root_path)
}

fn close_project_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
) -> Result<(), String> {
    project_root.close(&root_path)
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

fn read_markdown_directory(
    root: &Path,
    directory: &Dir,
    relative_directory: &Path,
    depth: usize,
) -> Result<Vec<FileNode>, String> {
    // Deep branches are silently truncated rather than surfaced as an error:
    // this is a robustness guard for pathological nesting, not a case users
    // should see fail in the UI.
    if depth >= MAX_TREE_DEPTH {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();

    for entry in directory
        .entries()
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
        } else if file_type.is_file() && is_markdown_path(Path::new(&name)) {
            EntryKind::File
        } else {
            continue;
        };

        let path = relative_directory.join(&name);
        entries.push(TreeEntry { name, path, kind });
    }

    entries.sort_by(compare_tree_entries);

    entries
        .into_iter()
        .map(|entry| {
            let name = entry.name;
            let path = path_to_string(&root.join(&entry.path));
            let relative_path = path_to_string(&entry.path);

            match entry.kind {
                EntryKind::Directory => {
                    let children = read_markdown_directory(
                        root,
                        &directory.open_dir(&name).map_err(|error| {
                            format!("Failed to open project directory: {error}")
                        })?,
                        &entry.path,
                        depth + 1,
                    )?;
                    Ok(FileNode::Directory {
                        name,
                        path,
                        relative_path,
                        children,
                    })
                }
                EntryKind::File => Ok(FileNode::File {
                    name,
                    path,
                    relative_path,
                    modified_at: modified_at_millis(directory, &entry.path),
                }),
            }
        })
        .collect()
}

fn modified_at_millis(directory: &Dir, path: &Path) -> Option<i64> {
    directory
        .metadata(path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as i64)
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
    fn rejects_a_root_that_was_not_authorized_by_open_project() {
        let authorized = tempfile::tempdir().unwrap();
        let requested = tempfile::tempdir().unwrap();
        fs::write(requested.path().join("README.md"), "# Other project").unwrap();
        let project_root = AuthorizedProjectRoot::default();

        project_root.authorize(authorized.path()).unwrap();

        assert_eq!(
            project_root.require(requested.path()).unwrap_err(),
            "Requested root does not match the open project"
        );
    }

    #[test]
    fn authorizes_two_projects_independently() {
        let first = tempfile::tempdir().unwrap();
        let second = tempfile::tempdir().unwrap();
        fs::write(first.path().join("a.md"), "# A").unwrap();
        fs::write(second.path().join("b.md"), "# B").unwrap();
        let project_root = AuthorizedProjectRoot::default();

        project_root.authorize(first.path()).unwrap();
        project_root.authorize(second.path()).unwrap();

        assert_eq!(
            read_markdown_file_for(
                &project_root,
                first.path().display().to_string(),
                first.path().join("a.md").display().to_string(),
            )
            .unwrap(),
            "# A"
        );
        assert_eq!(
            read_markdown_file_for(
                &project_root,
                second.path().display().to_string(),
                second.path().join("b.md").display().to_string(),
            )
            .unwrap(),
            "# B"
        );
    }

    #[test]
    fn close_project_removes_only_that_entry() {
        let first = tempfile::tempdir().unwrap();
        let second = tempfile::tempdir().unwrap();
        let project_root = AuthorizedProjectRoot::default();

        let first_root = project_root.authorize(first.path()).unwrap();
        project_root.authorize(second.path()).unwrap();

        close_project_for(&project_root, first_root.display().to_string()).unwrap();

        assert_eq!(
            project_root.require(first.path()).unwrap_err(),
            "Requested root does not match the open project"
        );
        assert!(project_root.require(second.path()).is_ok());
    }

    #[test]
    fn reading_two_projects_keeps_each_tree_and_file_isolated() {
        let first = tempfile::tempdir().unwrap();
        let second = tempfile::tempdir().unwrap();
        fs::write(first.path().join("first.md"), "# First").unwrap();
        fs::write(second.path().join("second.md"), "# Second").unwrap();
        let project_root = AuthorizedProjectRoot::default();
        project_root.authorize(first.path()).unwrap();
        project_root.authorize(second.path()).unwrap();

        let first_tree = list_markdown_tree_for(&project_root, first.path().display().to_string()).unwrap();
        let second_tree = list_markdown_tree_for(&project_root, second.path().display().to_string()).unwrap();

        assert!(matches!(first_tree.as_slice(), [FileNode::File { name, .. }] if name == "first.md"));
        assert!(matches!(second_tree.as_slice(), [FileNode::File { name, .. }] if name == "second.md"));
        assert_eq!(
            read_markdown_file_for(
                &project_root,
                second.path().display().to_string(),
                second.path().join("second.md").display().to_string(),
            ).unwrap(),
            "# Second"
        );
    }

    #[test]
    fn closing_a_root_that_was_never_authorized_returns_an_error() {
        let dir = tempfile::tempdir().unwrap();
        let project_root = AuthorizedProjectRoot::default();

        let result = close_project_for(&project_root, dir.path().display().to_string());

        assert_eq!(
            result.unwrap_err(),
            "Requested root does not match an open project"
        );
    }

    #[test]
    fn opens_a_project_at_a_known_path_and_returns_its_info() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("README.md"), "# Hello").unwrap();
        let project_root = AuthorizedProjectRoot::default();

        let info = open_project_at_for(&project_root, dir.path().display().to_string()).unwrap();

        let expected_name = dir
            .path()
            .canonicalize()
            .unwrap()
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap()
            .to_owned();
        assert_eq!(info.name, expected_name);
        assert_eq!(
            info.root_path,
            path_to_string(&dir.path().canonicalize().unwrap())
        );
    }

    #[test]
    fn opening_a_project_at_a_missing_path_returns_an_error() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("does-not-exist");
        let project_root = AuthorizedProjectRoot::default();

        let result = open_project_at_for(&project_root, missing.display().to_string());

        assert!(result.is_err());
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

        let project_root = AuthorizedProjectRoot::default();
        project_root.authorize(dir.path()).unwrap();
        let tree = list_markdown_tree_for(&project_root, dir.path().display().to_string()).unwrap();
        let names: Vec<&str> = tree
            .iter()
            .map(|node| match node {
                FileNode::File { name, .. } | FileNode::Directory { name, .. } => name.as_str(),
            })
            .collect();

        assert_eq!(names, ["Alpha", "zeta", "notes.MDX", "README.md"]);
    }

    #[test]
    fn reads_file_modified_time_as_unix_epoch_millis() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("README.md"), "# Hello").unwrap();
        let directory = Dir::open_ambient_dir(dir.path(), ambient_authority()).unwrap();

        assert!(modified_at_millis(&directory, Path::new("README.md")).is_some());
    }

    #[test]
    fn returns_none_when_file_metadata_is_unavailable() {
        let dir = tempfile::tempdir().unwrap();
        let directory = Dir::open_ambient_dir(dir.path(), ambient_authority()).unwrap();

        assert_eq!(modified_at_millis(&directory, Path::new("missing.md")), None);
    }

    #[test]
    fn lists_markdown_files_in_nested_directories_from_the_open_handle() {
        let dir = tempfile::tempdir().unwrap();
        let docs = dir.path().join("docs");
        let guides = docs.join("guides");
        fs::create_dir_all(&guides).unwrap();
        fs::write(guides.join("install.md"), "# Install").unwrap();
        let project_root = AuthorizedProjectRoot::default();
        project_root.authorize(dir.path()).unwrap();

        let tree = list_markdown_tree_for(&project_root, dir.path().display().to_string()).unwrap();

        let FileNode::Directory {
            children: docs_children,
            ..
        } = &tree[0]
        else {
            panic!("expected docs directory");
        };
        let FileNode::Directory {
            children: guides_children,
            ..
        } = &docs_children[0]
        else {
            panic!("expected guides directory");
        };
        assert!(matches!(
            &guides_children[0],
            FileNode::File { relative_path, .. } if relative_path == "docs\\guides\\install.md" || relative_path == "docs/guides/install.md"
        ));
    }

    #[test]
    fn reads_and_writes_a_markdown_file_inside_project() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("README.md");
        fs::write(&file, "# Before").unwrap();
        let root_path = dir.path().display().to_string();
        let file_path = file.display().to_string();
        let project_root = AuthorizedProjectRoot::default();
        project_root.authorize(dir.path()).unwrap();

        assert_eq!(
            read_markdown_file_for(&project_root, root_path.clone(), file_path.clone()).unwrap(),
            "# Before"
        );
        write_markdown_file_for(&project_root, root_path, file_path, "# After".to_owned()).unwrap();
        assert_eq!(fs::read_to_string(file).unwrap(), "# After");
    }

    #[test]
    fn terminates_without_panicking_on_directory_nesting_deeper_than_the_recursion_limit() {
        let dir = tempfile::tempdir().unwrap();
        let mut deepest = dir.path().to_path_buf();
        for i in 0..(MAX_TREE_DEPTH + 20) {
            deepest = deepest.join(format!("level-{i}"));
        }
        fs::create_dir_all(&deepest).unwrap();
        fs::write(deepest.join("bottom.md"), "# Bottom").unwrap();

        let project_root = AuthorizedProjectRoot::default();
        project_root.authorize(dir.path()).unwrap();

        // Must return successfully (not panic, hang, or overflow the stack)
        // even though the directory nesting exceeds MAX_TREE_DEPTH.
        let tree = list_markdown_tree_for(&project_root, dir.path().display().to_string()).unwrap();

        assert!(!tree.is_empty());
    }

    #[test]
    fn creates_markdown_files_and_directories_inside_authorized_project() {
        let dir = tempfile::tempdir().unwrap();
        let project_root = AuthorizedProjectRoot::default();
        project_root.authorize(dir.path()).unwrap();
        let root = dir.path().display().to_string();

        create_directory_for(&project_root, root.clone(), dir.path().join("docs").display().to_string()).unwrap();
        create_markdown_file_for(&project_root, root, dir.path().join("docs/new.md").display().to_string()).unwrap();

        assert!(dir.path().join("docs/new.md").is_file());
    }

    #[test]
    fn rejects_invalid_create_names_and_existing_targets() {
        let dir = tempfile::tempdir().unwrap();
        let project_root = AuthorizedProjectRoot::default();
        project_root.authorize(dir.path()).unwrap();
        let root = dir.path().display().to_string();
        assert!(create_markdown_file_for(&project_root, root.clone(), dir.path().join("bad.txt").display().to_string()).is_err());
        fs::write(dir.path().join("existing.md"), "").unwrap();
        assert!(create_markdown_file_for(&project_root, root, dir.path().join("existing.md").display().to_string()).is_err());
    }

    #[test]
    fn renames_and_deletes_entries_but_blocks_non_empty_directory_delete() {
        let dir = tempfile::tempdir().unwrap();
        let project_root = AuthorizedProjectRoot::default();
        project_root.authorize(dir.path()).unwrap();
        let root = dir.path().display().to_string();
        let old = dir.path().join("old.md");
        fs::write(&old, "# old").unwrap();
        rename_entry_for(&project_root, root.clone(), old.display().to_string(), dir.path().join("new.md").display().to_string()).unwrap();
        assert!(dir.path().join("new.md").is_file());
        delete_entry_for(&project_root, root.clone(), dir.path().join("new.md").display().to_string()).unwrap();
        assert!(!dir.path().join("new.md").exists());

        let folder = dir.path().join("folder");
        fs::create_dir(&folder).unwrap();
        fs::write(folder.join("child.md"), "").unwrap();
        assert!(delete_entry_for(&project_root, root, folder.display().to_string()).is_err());
    }
}

#[tauri::command]
pub fn create_markdown_file(
    root_path: String,
    file_path: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<(), String> {
    create_markdown_file_for(project_root.inner(), root_path, file_path)
}

fn create_markdown_file_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
    file_path: String,
) -> Result<(), String> {
    let project = project_root.require(Path::new(&root_path))?;
    let relative = mutation_path(&project, Path::new(&file_path), true)?;
    if !is_markdown_path(&relative) {
        return Err("Only .md and .mdx files are allowed".to_owned());
    }
    let full = project.canonical_root.join(&relative);
    if full.exists() {
        return Err("An entry already exists at that path".to_owned());
    }
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&full)
        .map_err(|error| format!("Failed to create Markdown file: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn create_directory(
    root_path: String,
    directory_path: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<(), String> {
    create_directory_for(project_root.inner(), root_path, directory_path)
}

fn create_directory_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
    directory_path: String,
) -> Result<(), String> {
    let project = project_root.require(Path::new(&root_path))?;
    let relative = mutation_path(&project, Path::new(&directory_path), false)?;
    let full = project.canonical_root.join(&relative);
    if full.exists() {
        return Err("An entry already exists at that path".to_owned());
    }
    fs::create_dir(&full).map_err(|error| format!("Failed to create folder: {error}"))
}

#[tauri::command]
pub fn rename_entry(
    root_path: String,
    old_path: String,
    new_path: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<(), String> {
    rename_entry_for(project_root.inner(), root_path, old_path, new_path)
}

fn rename_entry_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    let project = project_root.require(Path::new(&root_path))?;
    let old_relative = mutation_path(&project, Path::new(&old_path), false)?;
    let new_relative = mutation_path(&project, Path::new(&new_path), false)?;
    if is_markdown_path(&old_relative) != is_markdown_path(&new_relative) {
        return Err("Markdown files must keep a Markdown extension".to_owned());
    }
    let old_full = project.canonical_root.join(&old_relative);
    let new_full = project.canonical_root.join(&new_relative);
    if !old_full.exists() {
        return Err("Entry does not exist".to_owned());
    }
    if new_full.exists() {
        return Err("An entry already exists at that path".to_owned());
    }
    fs::rename(old_full, new_full).map_err(|error| format!("Failed to rename entry: {error}"))
}

#[tauri::command]
pub fn delete_entry(
    root_path: String,
    entry_path: String,
    project_root: tauri::State<AuthorizedProjectRoot>,
) -> Result<(), String> {
    delete_entry_for(project_root.inner(), root_path, entry_path)
}

fn delete_entry_for(
    project_root: &AuthorizedProjectRoot,
    root_path: String,
    entry_path: String,
) -> Result<(), String> {
    let project = project_root.require(Path::new(&root_path))?;
    let relative = mutation_path(&project, Path::new(&entry_path), false)?;
    let full = project.canonical_root.join(&relative);
    let metadata = fs::symlink_metadata(&full).map_err(|error| format!("Failed to inspect entry: {error}"))?;
    if metadata.is_dir() {
        if fs::read_dir(&full).map_err(|error| format!("Failed to inspect folder: {error}"))?.next().is_some() {
            return Err("Only empty folders can be deleted".to_owned());
        }
        fs::remove_dir(full).map_err(|error| format!("Failed to delete folder: {error}"))
    } else {
        fs::remove_file(full).map_err(|error| format!("Failed to delete file: {error}"))
    }
}

fn mutation_path(project: &AuthorizedProjectAccess, requested: &Path, require_markdown: bool) -> Result<PathBuf, String> {
    let relative = requested
        .strip_prefix(&project.requested_root)
        .map_err(|_| "Path is outside the open project".to_owned())?;
    if relative.as_os_str().is_empty() || relative.components().any(|component| matches!(component, std::path::Component::ParentDir | std::path::Component::RootDir | std::path::Component::Prefix(_))) {
        return Err("Path is outside the open project".to_owned());
    }
    if relative.file_name().and_then(|name| name.to_str()).map_or(true, |name| name.is_empty() || name == "." || name == "..") {
        return Err("Invalid entry name".to_owned());
    }
    if require_markdown && !is_markdown_path(relative) {
        return Err("Only .md and .mdx files are allowed".to_owned());
    }
    let parent = project.canonical_root.join(relative).parent().map(Path::to_path_buf).ok_or_else(|| "Invalid entry path".to_owned())?;
    let canonical_parent = parent.canonicalize().map_err(|error| format!("Failed to resolve parent directory: {error}"))?;
    if !canonical_parent.starts_with(&project.canonical_root) || !canonical_parent.is_dir() {
        return Err("Path is outside the open project".to_owned());
    }
    Ok(relative.to_owned())
}
