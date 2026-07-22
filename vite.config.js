import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import generateTranscript from './api/generate-transcript.js'

const host = process.env.TAURI_DEV_HOST
const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM || process.env.TAURI_DEV_HOST)

const localApi = () => ({
  name: 'local-api-functions',
  configureServer(server) {
    const env = loadEnv('development', process.cwd(), '')
    Object.assign(process.env, env)
    server.middlewares.use('/api/generate-transcript', async (req, res) => {
      let body = ''
      for await (const chunk of req) body += chunk
      try { req.body = body ? JSON.parse(body) : {} } catch { req.body = {} }
      res.status = (code) => { res.statusCode = code; return res }
      res.json = (payload) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(payload)) }
      await generateTranscript(req, res)
    })
  },
})

export default defineConfig({
  plugins: [react(), ...(isTauri ? [] : [localApi()])],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: false,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
})
