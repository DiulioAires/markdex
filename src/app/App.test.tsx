import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('shows the product name and the open-project action', () => {
    render(<App />)
    expect(screen.getByText('MD Project Manager')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /abrir projeto/i })).toBeInTheDocument()
  })
})
