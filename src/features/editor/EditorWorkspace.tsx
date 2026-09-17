import { TabBar } from '../tabs/TabBar'
import { MarkdownEditor } from './MarkdownEditor'
import { MarkdownPreview } from '../preview/MarkdownPreview'
import { ViewModeSwitch } from './ViewModeSwitch'
import { useWorkspaceStore } from '../../stores/workspace-store'
import type { DocumentTab } from '../../types/project'

export interface EditorWorkspaceProps {
  tabs: DocumentTab[]
  activeTab: DocumentTab | null
  activeTabPath: string | null
}

export function EditorWorkspace({ tabs, activeTab, activeTabPath }: EditorWorkspaceProps) {
  const activateTab = useWorkspaceStore((state) => state.activateTab)
  const closeTab = useWorkspaceStore((state) => state.closeTab)
  const updateBuffer = useWorkspaceStore((state) => state.updateBuffer)
  const updateCursor = useWorkspaceStore((state) => state.updateCursor)
  const viewMode = useWorkspaceStore((state) => state.viewMode)
  const setViewMode = useWorkspaceStore((state) => state.setViewMode)

  if (tabs.length === 0) {
    return <p className="workspace-placeholder">Selecione um arquivo para começar a editar.</p>
  }

  const showEditor = activeTab && (viewMode === 'editor' || viewMode === 'split')
  const showPreview = activeTab && (viewMode === 'preview' || viewMode === 'split')

  return (
    <div className="editor-workspace">
      <TabBar
        tabs={tabs}
        activeTabPath={activeTabPath}
        onActivateTab={activateTab}
        onCloseTab={closeTab}
      />
      <ViewModeSwitch viewMode={viewMode} onChange={setViewMode} />
      <div className="editor-workspace__body" data-view-mode={viewMode}>
        {showEditor ? (
          <div className="editor-workspace__pane editor-workspace__pane--editor">
            <MarkdownEditor
              key={activeTab.path}
              tab={activeTab}
              onChangeContent={updateBuffer}
              onChangeCursor={updateCursor}
            />
          </div>
        ) : null}
        {showPreview ? (
          <div className="editor-workspace__pane editor-workspace__pane--preview">
            <MarkdownPreview content={activeTab.content} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
