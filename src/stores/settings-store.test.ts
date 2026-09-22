import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from './settings-store'

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Reset Zustand state and localStorage
    useSettingsStore.getState().setEditorFontSize('medium')
    useSettingsStore.getState().setSessionStartupMode('ask')
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

  it('stores session startup mode, startup project and recent visibility preferences', () => {
    useSettingsStore.getState().setSessionStartupMode('restore')
    useSettingsStore.getState().setStartupProject('last')
    useSettingsStore.getState().setShowRecentFiles(false)

    expect(useSettingsStore.getState().sessionStartupMode).toBe('restore')
    expect(useSettingsStore.getState().startupProject).toBe('last')
    expect(useSettingsStore.getState().showRecentFiles).toBe(false)
  })

  it('migrates the old automatic-restore preference when it was enabled', async () => {
    localStorage.setItem('markdex:settings', JSON.stringify({ version: 0, state: { restoreLastSession: true } }))

    await useSettingsStore.persist.rehydrate()

    expect(useSettingsStore.getState().sessionStartupMode).toBe('restore')
  })

  it('migrates the old disabled-restore preference to ask on startup', async () => {
    localStorage.setItem('markdex:settings', JSON.stringify({ version: 0, state: { restoreLastSession: false } }))

    await useSettingsStore.persist.rehydrate()

    expect(useSettingsStore.getState().sessionStartupMode).toBe('ask')
  })
})
