import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon ? (
        <span className="empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="empty-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
