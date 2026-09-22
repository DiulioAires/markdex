import { ArrowDownAZ, ArrowUpAZ, FileText, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import type { FileNode, ProjectEntry } from '../../types/project'
import { getRecentFiles } from './recent-files'
import { filterAndSortFiles, flattenMarkdownFiles, type FileSortKey, type SortDirection } from './file-catalog'

export interface ProjectHomeProps {
  project: ProjectEntry
  onOpenFile: (file: FileNode) => void
  onRefresh: () => void
}

export function ProjectHome({ project, onOpenFile, onRefresh }: ProjectHomeProps) {
  const showRecentFiles = useSettingsStore((state) => state.showRecentFiles)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<FileSortKey>('name')
  const [direction, setDirection] = useState<SortDirection>('asc')
  const files = useMemo(() => flattenMarkdownFiles(project.tree), [project.tree])
  const catalog = useMemo(() => filterAndSortFiles(files, query, sortKey, direction), [files, query, sortKey, direction])
  const recentFiles = showRecentFiles ? getRecentFiles(project.info.rootPath) : []

  return (
    <section className="project-home" aria-label={`Visão inicial de ${project.info.name}`}>
      {showRecentFiles ? (
        <section className="project-home__section">
          <div className="project-home__section-heading">
            <h2><FileText size={16} aria-hidden="true" />Editados recentemente</h2>
            <span>{recentFiles.length}</span>
          </div>
          {recentFiles.length > 0 ? <div className="project-home__recent-list">
            {recentFiles.map((file) => <button key={file.path} type="button" className="project-home__file" aria-label={`Abrir ${file.name}`} onClick={() => onOpenFile({ ...file, kind: 'file', modifiedAt: null })}><span className="project-home__file-name" data-name={file.name} aria-hidden="true" /><small data-path={file.relativePath} aria-hidden="true" /></button>)}
          </div> : <p className="project-home__empty">Arquivos salvos após edição aparecerão aqui.</p>}
        </section>
      ) : null}
      <section className="project-home__section">
        <div className="project-home__section-heading">
          <h2><FileText size={16} aria-hidden="true" />Todos os arquivos Markdown</h2>
          <span>{catalog.length}</span>
        </div>
        <div className="project-home__controls">
          <label className="project-home__search"><Search size={14} aria-hidden="true" /><input type="search" aria-label="Filtrar arquivos Markdown" placeholder="Filtrar por nome ou caminho" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select aria-label="Ordenar arquivos" value={sortKey} onChange={(event) => setSortKey(event.target.value as FileSortKey)}><option value="name">Nome</option><option value="modifiedAt">Data</option><option value="path">Caminho</option></select>
          <button type="button" className="icon-button" aria-label={direction === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'} title={direction === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'} onClick={() => setDirection((current) => current === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}</button>
        </div>
        {project.isLoadingTree ? (
          <div className="project-home__loading" role="status">
            <span
              className="project-home__progress-track"
              role="progressbar"
              aria-label={`Carregando arquivos Markdown de ${project.info.name}`}
            >
              <span className="project-home__progress-bar" />
            </span>
            <span>Carregando arquivos de {project.info.name}…</span>
          </div>
        ) : project.treeError ? (
          <div className="project-home__scan-error" role="alert">
            <p>{project.treeError}</p>
            <button type="button" className="settings-panel__button" onClick={onRefresh}>Tentar novamente</button>
          </div>
        ) : catalog.length > 0 ? (
          <div className="project-home__file-list">{catalog.map((file) => <button key={file.path} type="button" className="project-home__file" aria-label={`Abrir ${file.name}`} onClick={() => onOpenFile(file)}><span className="project-home__file-name" data-name={file.name} aria-hidden="true" /><small data-path={file.relativePath} aria-hidden="true" /></button>)}</div>
        ) : <p className="project-home__empty">Nenhum arquivo corresponde ao filtro.</p>}
      </section>
    </section>
  )
}
