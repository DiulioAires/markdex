import { describe, expect, it, vi } from 'vitest'
import { filterCommands, type CommandItem } from './commands'

function makeItems(): CommandItem[] {
  return [
    { id: '1', label: 'Abrir projeto', run: vi.fn() },
    { id: '2', label: 'Salvar arquivo', run: vi.fn() },
    { id: '3', label: 'Fechar aba', run: vi.fn() },
  ]
}

describe('filterCommands', () => {
  it('returns all items, in their given order, for an empty query', () => {
    const items = makeItems()

    expect(filterCommands('', items)).toEqual(items)
  })

  it('filters by a case-insensitive substring match of the label', () => {
    const items = makeItems()

    expect(filterCommands('salvar', items)).toEqual([items[1]])
    expect(filterCommands('SALVAR', items)).toEqual([items[1]])
    expect(filterCommands('Arq', items)).toEqual([items[1]])
  })

  it('returns an empty array when nothing matches', () => {
    const items = makeItems()

    expect(filterCommands('inexistente', items)).toEqual([])
  })
})
