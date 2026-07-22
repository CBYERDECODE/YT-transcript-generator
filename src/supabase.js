import { createClient } from '@supabase/supabase-js'

// Fallbacks keep the public design preview runnable before a Supabase project is connected.
// Real credentials from .env.local replace these automatically in development and Vercel.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://preview-placeholder.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'preview-placeholder-anon-key'
export const supabase = createClient(url, anonKey)
