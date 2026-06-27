import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

/** Whether Supabase is configured (falls back to demo mode if not) */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)
