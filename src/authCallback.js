import { supabase } from './supabase'

export async function handleAuthCallback(url) {
  if (!url?.includes('auth/callback')) return false

  const normalized = url.replace(/^cliptext:\/\//, 'https://local/')
  const parsed = new URL(normalized)
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
  const params = new URLSearchParams(hash || parsed.search)

  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  const code = params.get('code')

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) throw error
    return true
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return true
  }

  return false
}

export function setupDesktopAuthListener(onSignedIn) {
  return import('@tauri-apps/plugin-deep-link').then(({ onOpenUrl, getCurrent }) => {
    const handle = async (urls) => {
      for (const url of urls) {
        try {
          if (await handleAuthCallback(url)) onSignedIn?.()
        } catch (error) {
          console.error('Auth callback failed:', error)
        }
      }
    }
    getCurrent().then((urls) => urls && handle(urls))
    return onOpenUrl(handle)
  })
}
