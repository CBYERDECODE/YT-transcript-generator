export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
export const AUTH_REDIRECT_URL = import.meta.env.VITE_AUTH_REDIRECT_URL ?? ''
export const isDesktop = import.meta.env.VITE_APP_TARGET === 'desktop'
export const GITHUB_RELEASES_URL = import.meta.env.VITE_GITHUB_RELEASES_URL ?? 'https://github.com/your-org/cliptext/releases/latest'

export const apiUrl = (path) => `${API_BASE_URL}${path}`

export const authRedirectTo = () => AUTH_REDIRECT_URL || window.location.origin
