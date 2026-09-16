use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub name: String,
    pub root_path: String,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum FileNode {
    File {
        name: String,
        path: String,
        relative_path: String,
    },
    Directory {
        name: String,
        path: String,
        relative_path: String,
        children: Vec<FileNode>,
    },
}
