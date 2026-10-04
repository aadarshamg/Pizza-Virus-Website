import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase URL or Anon Key. Copy .env.example to .env and fill it in.')
}

// Browser client: sessions live in localStorage and OAuth / password-recovery
// tokens in the URL are picked up automatically (detectSessionInUrl defaults to true).
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
