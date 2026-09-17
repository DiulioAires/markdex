import CodeMirror, { type ViewUpdate } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import type { DocumentTab } from '../../types/project'

const extensions = [markdown()]

export interface MarkdownEditorProps {
  tab: DocumentTab
  onChangeContent: (path: string, content: string) => void
  onChangeCursor: (path: string, cursor: { line: number; column: number }) => void
}

export function MarkdownEditor({ tab, onChangeContent, onChangeCursor }: MarkdownEditorProps) {
  function handleUpdate(viewUpdate: ViewUpdate) {
    if (!viewUpdate.selectionSet && !viewUpdate.docChanged) return

    const head = viewUpdate.state.selection.main.head
    const line = viewUpdate.state.doc.lineAt(head)
    onChangeCursor(tab.path, { line: line.number, column: head - line.from + 1 })
  }

  return (
    <CodeMirror
      value={tab.content}
      height="100%"
      theme="dark"
      extensions={extensions}
      aria-label={`Editor de ${tab.name}`}
      onChange={(value) => onChangeContent(tab.path, value)}
      onUpdate={handleUpdate}
    />
  )
}
