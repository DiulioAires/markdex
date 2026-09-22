import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export async function findUpdate(): Promise<Update | null> {
  try {
    return await check()
  } catch {
    return null
  }
}

export async function installUpdate(update: Update): Promise<void> {
  await update.downloadAndInstall()
  await relaunch()
}
