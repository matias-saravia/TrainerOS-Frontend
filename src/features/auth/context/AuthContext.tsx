import React, { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  getCurrentUserProfile,
  type SignInCredentials,
  type SignUpCredentials,
  type ProfileRow,
} from '../api/auth.api'
import { AuthContext } from './auth-context-base'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const loadProfile = async (userId: string) => {
    try {
      const p = await getCurrentUserProfile(userId)
      setProfile(p)
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  useEffect(() => {
    // Fires once on load with the stored session, then on every auth change.
    // Supabase calls can deadlock if awaited inside this callback, so the
    // profile is loaded after it returns.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          queryClient.clear()
        }
        setSession(newSession)
        setUser(newSession?.user ?? null)
        if (event === 'TOKEN_REFRESHED') return

        setTimeout(async () => {
          if (newSession?.user) {
            await loadProfile(newSession.user.id)
          } else {
            setProfile(null)
          }
          setLoading(false)
        }, 0)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  const handleSignIn = async (credentials: SignInCredentials) => {
    setLoading(true)
    try {
      const data = await signInWithEmail(credentials)
      setUser(data.user)
      setSession(data.session)
      if (data.user) {
        await loadProfile(data.user.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (credentials: SignUpCredentials) => {
    setLoading(true)
    try {
      const data = await signUpWithEmail(credentials)
      const requiresConfirmation = !data.session
      if (data.user && data.session) {
        setUser(data.user)
        setSession(data.session)
        await loadProfile(data.user.id)
      }
      return { requiresConfirmation }
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOutUser()
      queryClient.clear()
      setUser(null)
      setSession(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
