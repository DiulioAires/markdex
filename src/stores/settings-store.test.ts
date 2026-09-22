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
    const stored = localStorage.getItem('markdex:settings')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).state.editorFontSize).toBe('large')
  })

  it('stores session restoration, startup project and recent visibility preferences', () => {
    useSettingsStore.getState().setRestoreLastSession(true)
    useSettingsStore.getState().setStartupProject('last')
    useSettingsStore.getState().setShowRecentFiles(false)

    expect(useSettingsStore.getState().restoreLastSession).toBe(true)
    expect(useSettingsStore.getState().startupProject).toBe('last')
    expect(useSettingsStore.getState().showRecentFiles).toBe(false)
  })
})
