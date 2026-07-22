const DB_NAME = 'cliptext-offline'
const STORE = 'transcripts'
const DB_VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function run(storeMode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, storeMode)
    const store = tx.objectStore(STORE)
    const request = fn(store)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    tx.oncomplete = () => db.close()
  }))
}

export async function cacheTranscripts(items) {
  if (!items?.length) return
  await Promise.all(items.map((item) => run('readwrite', (store) => store.put(item))))
}

export async function cacheTranscript(item) {
  if (!item?.id) return
  await run('readwrite', (store) => store.put(item))
}

export async function getCachedTranscripts() {
  return run('readonly', (store) => store.getAll())
}
