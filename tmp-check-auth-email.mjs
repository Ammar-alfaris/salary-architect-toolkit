import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Missing env')

const supabase = createClient(url, key)
const stamp = Date.now()
const email = `qa-auth-${stamp}@totalreward.app`
const password = 'TmpPass123!'

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://totalreward.app/auth?confirmed=1',
    data: { full_name: 'QA Email Check', org_name: 'QA Email Check Org' },
  },
})

console.log(JSON.stringify({ email, hasSession: Boolean(data?.session), error: error?.message ?? null }))
