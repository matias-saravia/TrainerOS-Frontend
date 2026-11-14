// Student access through the trainer's link. Step one takes the email and says
// what comes next: create a password (first visit), type it (it exists), or check
// the inbox. Step two creates the password on the first visit.
//
// Whoever knows the email and the link can create the first password: that is the
// chosen trade-off, so it is only allowed for accounts that belong to this trainer
// alone, and the trainer can clear it from the panel. Any other account (a
// trainer's, or a student shared with another trainer) proves itself with its
// own password or with the email link.
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

const MIN_PASSWORD = 8
// bcrypt ignores anything past 72 bytes
const MAX_PASSWORD = 72

type Eligibility =
  | { kind: 'not_found' }
  | { kind: 'own'; userId: string }
  | { kind: 'shared' }

// Decides whether this email is a student of this trainer alone (its first
// password can be created here) or an account that has to prove itself.
async function eligibility(admin: SupabaseClient, slug: string, email: string): Promise<Eligibility> {
  const { data: trainer } = await admin
    .from('profiles')
    .select('id')
    .eq('slug', slug)
    .eq('role', 'trainer')
    .maybeSingle()
  if (!trainer) return { kind: 'not_found' }

  const { data: client } = await admin
    .from('clients')
    .select('id, user_id')
    .eq('trainer_id', trainer.id)
    .eq('email', email)
    .maybeSingle()
  if (!client) return { kind: 'not_found' }

  const { count: otherTrainers, error: countError } = await admin
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .neq('trainer_id', trainer.id)
    .or(client.user_id ? `user_id.eq.${client.user_id},email.eq."${email}"` : `email.eq."${email}"`)
  if (countError) throw countError
  if (otherTrainers !== 0) return { kind: 'shared' }

  if (client.user_id) {
    // The email of a linked client can be edited: it must still be that account's
    const { data: linked, error: linkedError } = await admin.auth.admin.getUserById(client.user_id)
    if (linkedError) throw linkedError
    return linked.user.email?.toLowerCase() === email ? { kind: 'own', userId: client.user_id } : { kind: 'shared' }
  }

  // A brand new account is linked right away, so the password step finds it.
  // If the email already exists, it is someone else's account.
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (createError) {
    if (createError.code === 'email_exists') return { kind: 'shared' }
    throw createError
  }
  const { error: linkError } = await admin
    .from('clients')
    .update({ user_id: created.user.id })
    .eq('id', client.id)
    .is('user_id', null)
  if (linkError) throw linkError
  return { kind: 'own', userId: created.user.id }
}

async function hasPassword(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.rpc('client_access_password_state', { p_email: email })
  if (error) throw error
  return Boolean(data?.[0]?.has_password)
}

// Step one: what the student sees after typing the email
async function checkEmail(admin: SupabaseClient, appUrl: string, slug: string, email: string) {
  const access = await eligibility(admin, slug, email)
  if (access.kind === 'not_found') return { status: 'not_found' }

  if (await hasPassword(admin, email)) return { status: 'password' }
  if (access.kind === 'own') return { status: 'create_password' }

  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/t/${slug}` },
  })
  if (otpError) throw otpError
  return { status: 'email_sent' }
}

// Step two, first visit only: saves the password the student chose
async function createPassword(admin: SupabaseClient, slug: string, email: string, password: string) {
  const access = await eligibility(admin, slug, email)
  if (access.kind === 'not_found') return { status: 'not_found' }
  if (access.kind !== 'own') return { error: 'not_allowed' }
  // Someone created it in the meantime: it has to be typed, not replaced
  if (await hasPassword(admin, email)) return { status: 'password' }

  const { error } = await admin.auth.admin.updateUserById(access.userId, { password })
  if (error) throw error
  return { status: 'ok' }
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
  let action: string
  let password: string
  try {
    const body = await req.json()
    slug = String(body.slug ?? '').trim().toLowerCase()
    email = String(body.email ?? '').trim().toLowerCase()
    action = String(body.action ?? 'check')
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  if (action !== 'check' && action !== 'create_password') return json({ error: 'invalid_input' }, 400)
  if (action === 'create_password' && (password.length < MIN_PASSWORD || new TextEncoder().encode(password).length > MAX_PASSWORD)) {
    return json({ error: 'invalid_password' }, 400)
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

    if (action === 'create_password') {
      const result = await createPassword(admin, slug, email, password)
      return json(result, 'error' in result ? 403 : 200)
    }
    return json(await checkEmail(admin, appUrl, slug, email))
  } catch (err) {
    console.error('Access request failed:', err)
    return json({ error: 'access_failed' }, 500)
  }
})
