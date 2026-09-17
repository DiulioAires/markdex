import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WelcomeView } from './WelcomeView'

describe('WelcomeView', () => {
  it('shows the product name, value proposition and keyboard hint', () => {
    render(<WelcomeView onOpenProject={() => {}} isOpening={false} />)

    expect(screen.getByText('MD Project Manager')).toBeInTheDocument()
    expect(
      screen.getByText(/abra uma pasta local para navegar, editar e visualizar/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/ctrl\s*\+\s*o/i)).toBeInTheDocument()
  })

  it('calls onOpenProject exactly once when the button is pressed', async () => {
    const user = userEvent.setup()
    const onOpenProject = vi.fn()
    render(<WelcomeView onOpenProject={onOpenProject} isOpening={false} />)

    await user.click(screen.getByRole('button', { name: /abrir projeto/i }))

    expect(onOpenProject).toHaveBeenCalledTimes(1)
  })

  it('shows a disabled loading label while isOpening is true', () => {
    render(<WelcomeView onOpenProject={() => {}} isOpening={true} />)

    const button = screen.getByRole('button', { name: /abrindo projeto/i })
    expect(button).toBeDisabled()
  })
})
