import { supabase } from '../../../lib/supabase'
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

/** Signs the student in when the email allows it; otherwise says what happened instead. */
export async function requestClientAccess(
  slug: string,
  email: string,
): Promise<'ok' | 'email_sent' | 'not_found' | 'rate_limited'> {
  const { data, error } = await supabase.functions.invoke('request-client-access', {
    body: { slug, email: email.trim().toLowerCase() },
  })
  if (error) {
    if ((error as { context?: Response }).context?.status === 429) return 'rate_limited'
    throw error
  }

  if (data.status === 'ok') {
    const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
    if (otpError) throw otpError
  }
  return data.status
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
