import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) throw new Error('Missing env')

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function getOrCreateUnsubscribeToken(email) {
  const normalizedEmail = email.trim().toLowerCase()
  const { data: existing, error: existingError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing?.token) return existing.token

  const token = crypto.randomUUID()
  const { error: insertError } = await supabase.from('email_unsubscribe_tokens').insert({
    email: normalizedEmail,
    token,
  })
  if (!insertError) return token

  const { data: retryExisting, error: retryError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (retryError) throw retryError
  if (retryExisting?.token) return retryExisting.token
  throw insertError
}

const recipient = 'shosely.brand@gmail.com'
const messageId = `debug-${Date.now()}`
const unsubscribeToken = await getOrCreateUnsubscribeToken(recipient)
const payload = {
  to: recipient,
  from: 'RewardArchitect <noreply@totalreward.app>',
  sender_domain: 'notify.totalreward.app',
  subject: 'Debug send after fix',
  html: '<p>This is a delivery test after fixing the app email queue.</p>',
  text: 'This is a delivery test after fixing the app email queue.',
  message_id: messageId,
  label: 'debug_test',
  purpose: 'transactional',
  idempotency_key: messageId,
  unsubscribe_token: unsubscribeToken,
  queued_at: new Date().toISOString(),
}

const { error: enqErr } = await supabase.rpc('enqueue_email', {
  queue_name: 'transactional_emails',
  payload,
})
if (enqErr) throw enqErr

const { error: logErr } = await supabase.from('email_send_log').insert({
  message_id: messageId,
  template_name: 'debug_test',
  recipient_email: recipient,
  status: 'pending',
})
if (logErr) throw logErr

for (let i = 0; i < 12; i++) {
  const { data, error } = await supabase
    .from('email_send_log')
    .select('message_id, recipient_email, status, error_message, created_at')
    .eq('message_id', messageId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const latest = data?.[0]
  if (latest) {
    console.log(JSON.stringify(latest))
    if (['sent', 'failed', 'dlq', 'suppressed', 'bounced', 'complained'].includes(latest.status)) {
      process.exit(0)
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 5000))
}
