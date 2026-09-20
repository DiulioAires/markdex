import CodeMirror, { type ViewUpdate } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { useSettingsStore } from '../../stores/settings-store'
import type { DocumentTab } from '../../types/project'

const extensions = [markdown()]

export interface MarkdownEditorProps {
  tab: DocumentTab
  onChangeContent: (path: string, content: string) => void
  onChangeCursor: (path: string, cursor: { line: number; column: number }) => void
}

export function MarkdownEditor({ tab, onChangeContent, onChangeCursor }: MarkdownEditorProps) {
  const editorFontSize = useSettingsStore((state) => state.editorFontSize)

  function handleUpdate(viewUpdate: ViewUpdate) {
    if (!viewUpdate.selectionSet && !viewUpdate.docChanged) return

    const head = viewUpdate.state.selection.main.head
    const line = viewUpdate.state.doc.lineAt(head)
    onChangeCursor(tab.path, { line: line.number, column: head - line.from + 1 })
  }

  return (
    <div className={`markdown-editor markdown-editor--${editorFontSize}`}>
      <CodeMirror
        value={tab.content}
        height="100%"
        theme="dark"
        extensions={extensions}
        aria-label={`Editor de ${tab.name}`}
        onChange={(value) => onChangeContent(tab.path, value)}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
