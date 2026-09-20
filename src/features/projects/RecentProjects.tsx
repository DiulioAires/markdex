import { useState } from 'react'
import { Clock, Folder, X } from 'lucide-react'
import { getRecentProjects, removeRecentProject, type RecentProject } from './recent-projects'

export interface RecentProjectsProps {
  onOpen: (rootPath: string) => void
}

export function RecentProjects({ onOpen }: RecentProjectsProps) {
  const [projects, setProjects] = useState<RecentProject[]>(() => getRecentProjects())

  if (projects.length === 0) {
    return null
  }

  return (
    <div className="recent-projects">
      <h2 className="recent-projects__heading">
        <Clock size={14} aria-hidden="true" />
        Recentes
      </h2>
      <ul className="recent-projects__list">
        {projects.map((project) => (
          <li
            key={project.rootPath}
            className="recent-projects__item"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(project.rootPath)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen(project.rootPath)
              }
            }}
          >
            <Folder size={16} aria-hidden="true" />
            <span className="recent-projects__name">{project.name}</span>
            <span className="recent-projects__path">{project.rootPath}</span>
            <button
              type="button"
              className="recent-projects__remove"
              aria-label={`Remover ${project.name} dos recentes`}
              onClick={(event) => {
                event.stopPropagation()
                removeRecentProject(project.rootPath)
                setProjects((current) => current.filter((entry) => entry.rootPath !== project.rootPath))
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
