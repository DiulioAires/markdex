use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub name: String,
    pub root_path: String,
}

#[derive(Debug, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum FileNode {
    File {
        name: String,
        path: String,
        relative_path: String,
        modified_at: Option<i64>,
    },
    Directory {
        name: String,
        path: String,
        relative_path: String,
        children: Vec<FileNode>,
    },
}

#[cfg(test)]
mod tests {
    use super::FileNode;
    use serde_json::json;

    #[test]
    fn serializes_file_node_fields_in_camel_case() {
        let node = FileNode::File {
            name: "README.md".to_owned(),
            path: "C:\\project\\README.md".to_owned(),
            relative_path: "README.md".to_owned(),
            modified_at: None,
        };

        assert_eq!(
            serde_json::to_value(node).unwrap(),
            json!({
                "kind": "file",
                "name": "README.md",
                "path": "C:\\project\\README.md",
                "relativePath": "README.md",
                "modifiedAt": null
            })
        );
    }
}
