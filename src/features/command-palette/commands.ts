export interface CommandItem {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  run: () => void
}

export function filterCommands(query: string, items: CommandItem[]): CommandItem[] {
  if (query === '') {
    return items
  }

  const normalizedQuery = query.toLowerCase()
  return items.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
}
