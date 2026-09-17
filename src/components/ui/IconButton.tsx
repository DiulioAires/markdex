import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name for assistive technology. Also used as the tooltip when `title` is omitted. */
  label: string
  icon: ReactNode
  active?: boolean
}

export function IconButton({
  label,
  icon,
  active = false,
  title,
  className,
  type = 'button',
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={label}
      title={title ?? label}
      data-active={active || undefined}
      className={['icon-button', active ? 'icon-button--active' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true" className="icon-button__glyph">
        {icon}
      </span>
    </button>
  )
}
