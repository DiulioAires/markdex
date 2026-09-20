import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { filterCommands, type CommandItem } from './commands'

export interface CommandPaletteProps {
  items: CommandItem[]
  onClose: () => void
}

export function CommandPalette({ items, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredItems = useMemo(() => filterCommands(query, items), [query, items])
  const enabledIndices = useMemo(
    () =>
      filteredItems.reduce<number[]>((indices, item, index) => {
        if (!item.disabled) {
          indices.push(index)
        }
        return indices
      }, []),
    [filteredItems],
  )

  useEffect(() => {
    setSelectedIndex(-1)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function moveSelection(direction: 1 | -1) {
    if (enabledIndices.length === 0) {
      return
    }

    const currentPosition = enabledIndices.indexOf(selectedIndex)
    const nextPosition =
      currentPosition === -1
        ? 0
        : (currentPosition + direction + enabledIndices.length) % enabledIndices.length

    setSelectedIndex(enabledIndices[nextPosition])
  }

  function runItem(item: CommandItem | undefined) {
    if (!item || item.disabled) {
      return
    }

    item.run()
    onClose()
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveSelection(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveSelection(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runItem(filteredItems[selectedIndex])
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="command-palette__input"
          placeholder="Digite um comando..."
          aria-label="Comando"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        {filteredItems.length === 0 ? (
          <p className="command-palette__empty">Nenhum comando encontrado.</p>
        ) : (
          <ul className="command-palette__list">
            {filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex
              const className = [
                'command-palette__item',
                isSelected ? 'command-palette__item--selected' : '',
                item.disabled ? 'command-palette__item--disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={className}
                    disabled={item.disabled}
                    aria-current={isSelected}
                    onClick={() => runItem(item)}
                  >
                    <span className="command-palette__label">{item.label}</span>
                    {item.shortcut ? (
                      <kbd className="command-palette__shortcut">{item.shortcut}</kbd>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
