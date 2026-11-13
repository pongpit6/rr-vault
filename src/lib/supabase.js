import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://gqiokweedaqaouxqbuml.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_5VzT792cfAYXA1kAlSRqyA_4CO8J_y5'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'rr-vault-auth' },
})
