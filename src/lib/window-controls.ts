import { getCurrentWindow } from '@tauri-apps/api/window'

export async function maximizeWindow(): Promise<void> {
  await getCurrentWindow().maximize()
}

export async function toggleWindowMaximized(): Promise<boolean> {
  const window = getCurrentWindow()
  const maximized = await window.isMaximized()
  if (maximized) {
    await window.unmaximize()
    return false
  }
  await window.maximize()
  return true
}
