import { useEffect, useRef } from 'react'

export interface ToastProps {
  message: string
  onDismiss: () => void
  /** Milliseconds before auto-dismiss. Set to 0 to disable. Defaults to 6000. */
  autoDismissMs?: number
}

export function Toast({ message, onDismiss, autoDismissMs = 6000 }: ToastProps) {
  // Callers (e.g. App) may pass a fresh `onDismiss` function on every render
  // that has nothing to do with the toast itself (App re-renders on nearly
  // every keystroke). Keeping the latest callback in a ref, and leaving it
  // out of the timer effect's dependency array, means unrelated re-renders
  // no longer tear down and restart the auto-dismiss timer.
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (autoDismissMs <= 0) return
    const timer = window.setTimeout(() => onDismissRef.current(), autoDismissMs)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDismiss is read via ref intentionally
  }, [message, autoDismissMs])

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
