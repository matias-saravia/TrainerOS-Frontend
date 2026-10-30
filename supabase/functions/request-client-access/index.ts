// Sends the login link to a student, only if that email was loaded by the
// trainer behind the slug. Always answers the same way, in the same time, so
// the public form cannot be used to find out who trains with whom.
import { createClient } from 'npm:@supabase/supabase-js@2.112.4'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const APP_URL = Deno.env.get('APP_URL') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_URL,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendLinkIfInvited(slug: string, email: string) {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: trainer } = await admin
    .from('profiles')
    .select('id')
    .eq('slug', slug)
    .eq('role', 'trainer')
    .maybeSingle()
  if (!trainer) return

  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('trainer_id', trainer.id)
    .eq('email', email)
    .maybeSingle()
  if (!client) return

  const { error } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${APP_URL}/t/${slug}` },
  })
  if (error) console.error('Could not send login link:', error.message)
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let slug: string
  let email: string
  try {
    const body = await req.json()
    slug = String(body.slug ?? '').trim().toLowerCase()
    email = String(body.email ?? '').trim().toLowerCase()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid_input' }, 400)
  }

  EdgeRuntime.waitUntil(
    sendLinkIfInvited(slug, email).catch(err => console.error('Access request failed:', err)),
  )

  return json({ ok: true })
})
