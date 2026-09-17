import { TabBar } from '../tabs/TabBar'
import { MarkdownEditor } from './MarkdownEditor'
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

  if (tabs.length === 0) {
    return <p className="workspace-placeholder">Selecione um arquivo para começar a editar.</p>
  }

  return (
    <div className="editor-workspace">
      <TabBar
        tabs={tabs}
        activeTabPath={activeTabPath}
        onActivateTab={activateTab}
        onCloseTab={closeTab}
      />
      <div className="editor-workspace__body">
        {activeTab ? (
          <MarkdownEditor
            key={activeTab.path}
            tab={activeTab}
            onChangeContent={updateBuffer}
            onChangeCursor={updateCursor}
          />
        ) : null}
      </div>
    </div>
  )
}
