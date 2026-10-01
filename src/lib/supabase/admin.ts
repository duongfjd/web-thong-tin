import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { ENV } from '../env'

export function createAdminClient() {
  if (!ENV.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  return createSupabaseClient(
    ENV.NEXT_PUBLIC_SUPABASE_URL,
    ENV.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  )
}
