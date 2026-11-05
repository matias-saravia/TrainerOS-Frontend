// Lets a student in with just their email, if the trainer behind the slug loaded it.
// Whoever knows the email and the link gets in: that is the chosen trade-off, so
// the token is only handed out for accounts that belong to this trainer alone.
// Any other account (a trainer's, or a student shared with another trainer) must
// prove it owns the mailbox, or one trainer could sign in as someone else's user.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.4'

// One address, or several separated by commas. The first is the main one.
const APP_URLS = (Deno.env.get('APP_URL') ?? '')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(Boolean)

function corsHeaders(appUrl: string) {
  return {
    'Access-Control-Allow-Origin': appUrl,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const WINDOW_SECONDS = 15 * 60
const MAX_ATTEMPTS_PER_EMAIL = 10
// Higher: a whole gym can share one connection
const MAX_ATTEMPTS_PER_IP = 30

async function isWithinLimit(admin: SupabaseClient, key: string, limit: number) {
  const { data, error } = await admin.rpc('register_access_attempt', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: WINDOW_SECONDS,
  })
  if (error) throw error
  return data === true
}

async function requestAccess(admin: SupabaseClient, appUrl: string, slug: string, email: string) {
  const { data: trainer } = await admin
    .from('profiles')
    .select('id')
    .eq('slug', slug)
    .eq('role', 'trainer')
    .maybeSingle()
  if (!trainer) return { status: 'not_found' }

  const { data: client } = await admin
    .from('clients')
    .select('id, user_id')
    .eq('trainer_id', trainer.id)
    .eq('email', email)
    .maybeSingle()
  if (!client) return { status: 'not_found' }

  const { count: otherTrainers, error: countError } = await admin
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .neq('trainer_id', trainer.id)
    .or(client.user_id ? `user_id.eq.${client.user_id},email.eq."${email}"` : `email.eq."${email}"`)
  if (countError) throw countError

  // Allowed: the account already linked to this client, or a brand new one.
  // If creating fails because the email exists, it is someone else's account.
  let canEnterDirectly = otherTrainers === 0
  if (canEnterDirectly && client.user_id) {
    // The email of a linked client can be edited: it must still be that account's
    const { data: linked, error: linkedError } = await admin.auth.admin.getUserById(client.user_id)
    if (linkedError) throw linkedError
    canEnterDirectly = linked.user.email?.toLowerCase() === email
  } else if (canEnterDirectly) {
    const { error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (createError && createError.code !== 'email_exists') throw createError
    canEnterDirectly = !createError
  }

  if (canEnterDirectly) {
    const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error) throw error
    return { status: 'ok', token_hash: link.properties.hashed_token }
  }

  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/t/${slug}` },
  })
  if (otpError) throw otpError
  return { status: 'email_sent' }
}

Deno.serve(async req => {
  const origin = req.headers.get('origin') ?? ''
  const appUrl = APP_URLS.includes(origin) ? origin : (APP_URLS[0] ?? '')

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(appUrl), 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(appUrl) })
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

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !/^[^\s@"]+@[^\s@"]+\.[^\s@"]+$/.test(email)) {
    return json({ error: 'invalid_input' }, 400)
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // cf-connecting-ip is set by the platform; x-forwarded-for can be sent by the caller
    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    const withinLimits =
      (await isWithinLimit(admin, `email:${email}`, MAX_ATTEMPTS_PER_EMAIL)) &&
      (!ip || (await isWithinLimit(admin, `ip:${ip}`, MAX_ATTEMPTS_PER_IP)))
    if (!withinLimits) return json({ error: 'rate_limited' }, 429)

    return json(await requestAccess(admin, appUrl, slug, email))
  } catch (err) {
    console.error('Access request failed:', err)
    return json({ error: 'access_failed' }, 500)
  }
})
