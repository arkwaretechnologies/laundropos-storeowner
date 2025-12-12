import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://huwqsicrwqhxfinhpxsg.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d3FzaWNyd3FoeGZpbmhweHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDcwODksImV4cCI6MjA3NTUyMzA4OX0.fO3h-jBOSI4hFDMFUfvXY_hR7aoOP_uJnWCaplkxpOk'

// JWT Secret for server-side token verification
export const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET

// Regular client for normal operations with session expiry configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Session expiry is handled by Supabase server, but we ensure proper refresh
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
})

// Admin client for password updates (requires service role key)
// Note: You need to add your service role key to .env.local
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d3FzaWNyd3FoeGZpbmhweHNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0NzA4OSwiZXhwIjoyMDc1NTIzMDg5fQ.TgjYYhDI94NCfEp70F80xySFL3667B9ISX6Uo01O1HM'

// Debug logging
console.log('Service role key exists:', !!supabaseServiceKey)
console.log('Service role key length:', supabaseServiceKey?.length || 0)
console.log('JWT secret configured:', !!supabaseJwtSecret)

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})


