import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toast } from './Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-dismisses after the configured delay', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Erro ao salvar" onDismiss={onDismiss} autoDismissMs={6000} />)

    vi.advanceTimersByTime(6000)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('still auto-dismisses on time when the parent re-renders with a new onDismiss reference', () => {
    // Regression test: App.tsx used to pass a fresh inline arrow function as
    // onDismiss on every render. Since App re-renders on nearly every
    // keystroke, the effect kept tearing down and restarting its timer,
    // so the toast never actually auto-dismissed. A stable callback (or an
    // effect that doesn't depend on onDismiss) must let the timer survive
    // unrelated re-renders.
    const onDismiss = vi.fn()
    const { rerender } = render(
      <Toast message="Erro ao salvar" onDismiss={onDismiss} autoDismissMs={6000} />,
    )

    // Simulate unrelated re-renders (e.g. cursor position updates) passing a
    // brand-new function reference each time, well within the dismiss delay.
    for (let i = 0; i < 10; i += 1) {
      vi.advanceTimersByTime(500)
      rerender(<Toast message="Erro ao salvar" onDismiss={() => onDismiss()} autoDismissMs={6000} />)
    }

    // Total elapsed time now exceeds the 6s delay from the initial mount.
    vi.advanceTimersByTime(1000)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
