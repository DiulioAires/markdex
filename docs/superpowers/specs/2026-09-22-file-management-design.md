# File and folder management design

## Goal

Allow users to create, rename, and delete Markdown files and folders directly
from the Markdex Explorer. The existing project-root authorization remains the
security boundary, and the Explorer continues to refresh in the background
without replacing visible content with a loading skeleton.

## Scope and decisions

- Create files with `.md` or `.mdx` extensions.
- Create folders at the project root or inside a selected folder.
- Rename Markdown files, Markdown directories, and folders.
- Delete files and folders.
- Deleting a non-empty folder is blocked; the user must delete its contents
  first. Every delete action requires confirmation.
- File names and folder names are single path components. They cannot contain
  path separators, `..`, absolute-path prefixes, or empty names.
- Existing open tabs are updated after a file rename and closed after a file or
  containing folder is deleted.

## Backend architecture

`src-tauri/src/commands/files.rs` will expose four commands through
`src-tauri/src/lib.rs`:

- `create_markdown_file(root_path, parent_path, name)`
- `create_project_directory(root_path, parent_path, name)`
- `rename_project_entry(root_path, entry_path, new_name)`
- `delete_project_entry(root_path, entry_path)`

The commands use the already-authorized `Dir` handle. New path helpers will
validate relative paths without requiring the target to exist, reject traversal
and absolute paths, and ensure the resolved parent/entry remains inside the
authorized root. File creation rejects non-Markdown extensions and existing
targets. Directory creation rejects existing targets. Rename rejects a missing
source, an invalid destination name, and an existing destination. Delete rejects
non-empty directories and reports a stable error for UI display.

Rust unit tests will cover valid operations, traversal attempts, non-Markdown
files, duplicate targets, missing sources, and non-empty directory deletion.

## Frontend architecture

`NativeApi` receives typed methods for the four commands. The project
controller exposes matching callbacks that:

1. set a mutation status and clear stale errors;
2. invoke the native operation;
3. update tabs for rename/delete;
4. refresh the affected project tree using the existing background-refresh path;
5. surface errors through the existing toast state.

The workspace store gains path-aware tab operations for renaming a tab and
closing all tabs under a deleted path. Content, cursor position, dirty state,
and external-conflict state are preserved across a rename.

## Explorer interaction

The project header gets a `+` action that offers “Novo arquivo” and “Nova
pasta” at the project root. Files and folders expose a context menu with:

- “Novo arquivo” and “Nova pasta” for folders;
- “Renomear”;
- “Apagar”.

The menu closes after an action or outside click. Name entry uses a focused
dialog/input with validation feedback. Delete uses a confirmation dialog and
does not optimistically remove the item; the tree changes only after the
backend confirms success.

## Data flow and error handling

The backend is the source of truth. Successful mutations trigger a background
tree refresh, so the current tree remains visible while the updated tree is
loaded. Failed mutations leave the tree and tabs unchanged and show the native
error message in the existing toast.

Renaming an open file updates its tab path and file metadata. Deleting an open
file closes that tab. Deleting a folder closes every tab whose path is below
that folder. A failed rename or delete never changes tab state.

## Verification

- Rust command tests for authorization, path validation, creation, rename,
  deletion, duplicate targets, and non-empty folders.
- Native API tests for invoke payloads.
- Controller tests for successful mutations, tab effects, tree refresh, and
  error preservation.
- Explorer tests for create/context-menu/rename/delete interactions and
  confirmation behavior.
- Full frontend test suite, `npm run build`, and Rust tests before release.
