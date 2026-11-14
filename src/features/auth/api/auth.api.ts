import { setRememberSession, supabase } from '../../../lib/supabase'
import type { Tables } from '../../../lib/supabase'

export type ProfileRow = Tables<'profiles'>

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  email: string
  password: string
  nombre: string
  apellido: string
}

export async function signInWithEmail({ email, password }: SignInCredentials) {
  // The trainer login has no "Recordarme": it always keeps the session
  setRememberSession(true)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) throw error
  return data
}

export async function signUpWithEmail({ email, password, nombre, apellido }: SignUpCredentials) {
  const cleanEmail = email.trim().toLowerCase()
  const cleanNombre = nombre.trim()
  const cleanApellido = apellido.trim()

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        nombre: cleanNombre,
        apellido: cleanApellido,
        role: 'trainer',
      },
    },
  })

  if (error) throw error

  // The profile is created by the on_auth_user_created database trigger
  return data
}

/** Off until Google is set up in Supabase: an unset provider would land the user on an error page. */
export const googleSignInEnabled = import.meta.env.VITE_GOOGLE_SIGN_IN === 'true'

/**
 * Sends the trainer to Google. A new Google account becomes a trainer (see the
 * on_auth_user_created trigger); an existing account with that email is linked.
 */
export async function signInWithGoogle() {
  setRememberSession(true)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function getTrainerPublic(slug: string) {
  const { data, error } = await supabase.rpc('get_trainer_public', { p_slug: slug })
  if (error) throw error
  return data?.[0] ?? null
}

export type ClientAccessStatus = 'create_password' | 'password' | 'email_sent' | 'not_found' | 'rate_limited'

const isRateLimited = (error: unknown) => (error as { context?: Response }).context?.status === 429

/** Step one of the student access: says what comes after the email. */
export async function requestClientAccess(slug: string, email: string): Promise<ClientAccessStatus> {
  const { data, error } = await supabase.functions.invoke('request-client-access', {
    body: { slug, email: email.trim().toLowerCase() },
  })
  if (error) {
    if (isRateLimited(error)) return 'rate_limited'
    throw error
  }
  return data.status
}

/** Signs a student in with their password, keeping the session only if asked to. */
export async function signInClient(email: string, password: string, remember: boolean) {
  setRememberSession(remember)
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw error
}

/**
 * First visit: saves the password the student chose and signs them in.
 * Returns 'password' if someone created it in the meantime, so it has to be typed.
 */
export async function createClientPassword(
  slug: string,
  email: string,
  password: string,
  remember: boolean,
): Promise<'ok' | 'password' | 'not_found' | 'rate_limited'> {
  const { data, error } = await supabase.functions.invoke('request-client-access', {
    body: { slug, email: email.trim().toLowerCase(), action: 'create_password', password },
  })
  if (error) {
    if (isRateLimited(error)) return 'rate_limited'
    throw error
  }
  if (data.status !== 'ok') return data.status

  await signInClient(email, password, remember)
  return 'ok'
}

export async function claimClientAccess(slug: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_client_access', { p_slug: slug })
  if (error) throw error
  return data
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/restablecer-contrasena`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUserProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('Could not fetch user profile:', error)
    return null
  }
  return data
}
