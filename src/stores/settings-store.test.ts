import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from './settings-store'

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Reset Zustand state and localStorage
    useSettingsStore.getState().setEditorFontSize('medium')
  })

  it('has a default editor font size of medium', () => {
    expect(useSettingsStore.getState().editorFontSize).toBe('medium')
  })

  it('updates editor font size when setEditorFontSize is called', () => {
    useSettingsStore.getState().setEditorFontSize('large')
    expect(useSettingsStore.getState().editorFontSize).toBe('large')

    useSettingsStore.getState().setEditorFontSize('small')
    expect(useSettingsStore.getState().editorFontSize).toBe('small')

    useSettingsStore.getState().setEditorFontSize('medium')
    expect(useSettingsStore.getState().editorFontSize).toBe('medium')
  })

  it('persists editor font size to localStorage', () => {
    useSettingsStore.getState().setEditorFontSize('large')
    const stored = localStorage.getItem('md-project-manager:settings')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).state.editorFontSize).toBe('large')
  })
})
