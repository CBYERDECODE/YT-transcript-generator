import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import { apiUrl, authRedirectTo, GITHUB_RELEASES_URL, isDesktop } from './config'
import { cacheTranscript, cacheTranscripts, getCachedTranscripts } from './offlineCache'
import { setupDesktopAuthListener } from './authCallback'
import { checkForAppUpdates, saveTranscriptToFile } from './desktopSave'
import { ArrowRight, Check, Clock3, Copy, Download, FileText, Globe, History, LogOut, Play, Save, Sparkles, WifiOff, X } from 'lucide-react'
import './styles.css'

const extractVideoId = (value) => {
  const input = value.trim()
  if (/^[\w-]{11}$/.test(input)) return input
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`)
    let id = ''
    // Check youtu.be links
    if (url.hostname.includes('youtu.be')) {
      id = url.pathname.split('/').filter(Boolean)[0] || ''
      // If the id still has query params, remove them (like ?si=...)
      id = id.split('?')[0].split('&')[0]
    }
    // Check youtube.com links with v parameter
    if (!id) {
      id = url.searchParams.get('v') || ''
    }
    // Check youtube.com shorts/embed/live links
    if (!id) {
      const match = url.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/)
      id = match?.[2] || ''
    }
    // Final check that id is 11 characters long
    if (id.length === 11 && /^[\w-]{11}$/.test(id)) {
      return id
    }
    return ''
  } catch { return '' }
}


function AuthModal({ onClose, onSignedIn }) {
  const [mode, setMode] = useState('signup'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('')
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectTo() } })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup' && !result.data.session) return setMessage('Check your email to confirm your account, then sign in.')
    onSignedIn(); onClose()
  }
  return <div className="overlay"><section className="auth-modal"><button className="close" onClick={onClose}><X /></button><div className="mini-logo"><Play fill="currentColor" /></div><p className="eyebrow">YOUR FIRST ONE IS ON US</p><h2>{mode === 'signup' ? 'Create your free account' : 'Welcome back'}</h2><p className="modal-sub">Sign in to unlock today’s complimentary transcript.</p><form onSubmit={submit}><label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength="6" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" /></label>{message && <p className="form-message">{message}</p>}<button className="primary wide" disabled={busy}>{busy ? 'Just a moment…' : mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight /></button></form><p className="switch">{mode === 'signup' ? 'Already have an account?' : 'New to Cliptext?'} <button onClick={()=>setMode(mode==='signup'?'login':'signup')}>{mode === 'signup' ? 'Sign in' : 'Create one'}</button></p></section></div>
}

function App() {
  const [user, setUser] = useState(null), [url, setUrl] = useState(''), [modal, setModal] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null), [history, setHistory] = useState([]), [profile, setProfile] = useState(null), [view, setView] = useState('generate'), [online, setOnline] = useState(navigator.onLine), [offlineOnly, setOfflineOnly] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null))
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync) }
  }, [])
  useEffect(() => {
    if (!isDesktop) return
    checkForAppUpdates()
    let unlisten
    setupDesktopAuthListener(() => supabase.auth.getUser().then(({ data }) => setUser(data.user))).then((fn) => { unlisten = fn })
    return () => unlisten?.()
  }, [])
  useEffect(() => { if (user) loadAccount() }, [user, online])
  async function loadAccount() {
    if (!online) {
      const cached = await getCachedTranscripts()
      cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setHistory(cached.slice(0, 12))
      setOfflineOnly(true)
      return
    }
    setOfflineOnly(false)
    try {
      const [p, h] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('transcripts').select('*').order('created_at', { ascending: false }).limit(12),
      ])
      setProfile(p.data)
      const items = h.data || []
      setHistory(items)
      await cacheTranscripts(items)
    } catch {
      const cached = await getCachedTranscripts()
      cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setHistory(cached.slice(0, 12))
      setOfflineOnly(true)
    }
  }
  async function generate() {
    const videoId = extractVideoId(url); setError('')
    if (!videoId) return setError('Paste a valid YouTube URL, short link, or 11-character video ID.')
    if (!user) return setModal(true)
    if (!online) return setError('You are offline. Connect to the internet to generate a new transcript.')
    setLoading(true); setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(apiUrl('/api/generate-transcript'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ videoId }) })
      const raw = await res.text()
      let data
      try { data = raw ? JSON.parse(raw) : {} } catch { throw new Error('The transcript service returned an invalid response. Please try again.') }
      if (!res.ok) throw new Error(data.error || 'Unable to generate this transcript. Please try again.')
      setResult(data)
      await cacheTranscript(data)
      await loadAccount()
    } catch (e) { setError(e.message || 'Something went wrong. Please try again.') } finally { setLoading(false) }
  }
  async function copy() { await navigator.clipboard.writeText(result.transcript) }
  async function saveFile() {
    try {
      await saveTranscriptToFile({
        title: result.title,
        videoId: result.video_id || result.videoId,
        channel: result.channel,
        transcript: result.transcript,
      })
    } catch (e) { setError(e.message || 'Could not save file.') }
  }
  async function signOut() { await supabase.auth.signOut(); setView('generate'); setResult(null) }
  const handlePaste = (event) => { event.preventDefault(); setUrl(event.clipboardData.getData('text').trim()) }
  const canGenerate = online && !loading
  return <><header><a className="brand" href="#"><span><Play fill="currentColor" /></span>cliptext</a>{!isDesktop && <nav><a href="#how">How it works</a><a href="#pricing">Pricing</a></nav>}<div className="header-actions">{user ? <><button className="avatar" onClick={() => setView(view === 'account' ? 'generate' : 'account')}>{user.email[0].toUpperCase()}</button><button className="icon-button desktop-only-ui" onClick={signOut} title="Sign out"><LogOut /></button></> : <><button className="ghost" onClick={() => setModal(true)}>Log in</button><button className="dark-button" onClick={() => setModal(true)}>Start free <ArrowRight /></button></>}</div></header>
  {!online && <div className="offline-banner"><WifiOff /> You are offline. Saved transcripts are available below; generating requires internet.</div>}
  {offlineOnly && online && user && <div className="offline-banner subtle">Showing cached transcripts — reconnect to sync your library.</div>}
  <main>{view === 'account' ? <section className="account-panel"><p className="eyebrow">YOUR SPACE</p><h1>Account settings</h1><div className="settings-grid"><article><span>Access</span><strong>Unlimited</strong><small>Generate as many transcripts as you need.</small></article><article><span>Plan</span><strong>Free</strong><small>Full access to all features.</small></article><article><span>Signed in as</span><strong className="email">{user.email}</strong><button className="text-button" onClick={signOut}>Sign out</button></article></div><button className="back" onClick={() => setView('generate')}>← Back to generator</button></section> : <><section className="hero"><div className="badge"><Sparkles /> THE FAST WAY TO WATCH WITH YOUR EYES</div><h1>Turn any YouTube video<br/>into <em>words.</em></h1><p>Get clean, accurate transcripts in seconds. Built for curious minds, creators, and people who would rather skim than scrub.</p><div className="generator"><div className="url-box"><span className="youtube"><Play fill="currentColor" /></span><input value={url} onChange={e => setUrl(e.target.value)} onPaste={handlePaste} onKeyDown={e => e.key === 'Enter' && canGenerate && generate()} placeholder="Paste a YouTube link or video ID…" /><button onClick={generate} disabled={!canGenerate}>{loading ? 'Generating…' : <>Get transcript <ArrowRight /></>}</button></div>{error && <p className="error">{error}</p>}<p className="input-help"><Check /> Unlimited access. No limits.</p></div><div className="micro-proof"><span><Clock3 /> Usually ready in under 30 sec</span><span><FileText /> Works with videos, Shorts & live replays</span></div></section>
  {result && <section className="output">
    <div className="output-top">
      <div>
        <p className="eyebrow">TRANSCRIPT READY</p>
        <h2>{result.title || 'Your transcript'}</h2>
        <p>{result.channel || 'YouTube'} · {result.video_id || result.videoId}</p>
      </div>
      <div className="output-actions">
        <button className="copy" onClick={copy}><Copy /> Copy text</button>
        {isDesktop && <button className="copy save" onClick={saveFile}><Save /> Save as .txt</button>}
      </div>
    </div>
    <article className="transcript">{result.transcript}</article>
  </section>}
  {user && <section className="history-section"><div className="section-title"><div><p className="eyebrow">YOUR LIBRARY</p><h2>Recent transcripts{offlineOnly ? ' (cached)' : ''}</h2></div><History /></div>{history.length ? <div className="history-list">{history.map(item => <button key={item.id} onClick={() => setResult(item)}><span className="history-play"><Play fill="currentColor" /></span><span><b>{item.title || item.video_id}</b><small>{new Date(item.created_at).toLocaleDateString()}</small></span><ArrowRight /></button>)}</div> : <p className="empty">{online ? 'Your generated transcripts will be saved here.' : 'No cached transcripts yet. Generate some while online to view them offline.'}</p>}</section>}
  {!isDesktop && <section className="steps" id="how"><p className="eyebrow">STUPIDLY SIMPLE</p><h2>One link. All the context.</h2><div><article><b>01</b><h3>Paste a link</h3><p>Full URLs, Shorts, share links, or just a video ID — all good.</p></article><article><b>02</b><h3>We do the work</h3><p>Our caption engine finds and formats every spoken word.</p></article><article><b>03</b><h3>Make it yours</h3><p>Copy it, save it, or return to it whenever you need.</p></article></div></section>}</>}</main>
  <footer><a className="brand" href="#"><span><Play fill="currentColor" /></span>cliptext</a><p>Built for thoughts that move fast.</p></footer>{modal && <AuthModal onClose={() => setModal(false)} onSignedIn={() => {}} />}</>
}
createRoot(document.getElementById('root')).render(<App />)
