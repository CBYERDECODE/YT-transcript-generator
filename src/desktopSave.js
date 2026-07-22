export async function saveTranscriptToFile({ title, videoId, channel, transcript }) {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')

  const safeName = (title || videoId || 'transcript').replace(/[^\w\s-]/g, '').trim().slice(0, 80) || 'transcript'
  const path = await save({
    defaultPath: `${safeName}.txt`,
    filters: [{ name: 'Text', extensions: ['txt'] }],
  })
  if (!path) return false

  const header = [title, channel, videoId].filter(Boolean).join(' · ')
  const body = header ? `${header}\n\n${transcript}` : transcript
  await writeTextFile(path, body)
  return true
}

export async function checkForAppUpdates() {
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (update?.available) await update.downloadAndInstall()
  } catch {
    // Updater may be disabled in dev or before first release
  }
}
