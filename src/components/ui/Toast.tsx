import { useEffect } from 'react'

export interface ToastProps {
  message: string
  onDismiss: () => void
  /** Milliseconds before auto-dismiss. Set to 0 to disable. Defaults to 6000. */
  autoDismissMs?: number
}

export function Toast({ message, onDismiss, autoDismissMs = 6000 }: ToastProps) {
  useEffect(() => {
    if (autoDismissMs <= 0) return
    const timer = window.setTimeout(onDismiss, autoDismissMs)
    return () => window.clearTimeout(timer)
  }, [message, autoDismissMs, onDismiss])

  return (
    <div className="toast" role="alert">
      <span className="toast__message">{message}</span>
      <button
        type="button"
        className="toast__dismiss"
        onClick={onDismiss}
        aria-label="Fechar aviso"
      >
        ×
      </button>
    </div>
  )
}
