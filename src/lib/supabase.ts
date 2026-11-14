import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY – check your .env.local file'
  )
}

// "Recordarme": with it, the session survives closing the browser (localStorage);
// without it, it lives only in this tab's sessionStorage. Defaults to remembering.
const REMEMBER_KEY = 'traineros:remember'

function store(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function remembers() {
  return store('local')?.getItem(REMEMBER_KEY) !== 'false'
}

/** Call before signing in, so the new session goes to the chosen storage. */
export function setRememberSession(remember: boolean) {
  try {
    store('local')?.setItem(REMEMBER_KEY, String(remember))
  } catch {
    // Private mode without storage: the session simply is not kept
  }
}

const sessionStorageAdapter = {
  getItem: (key: string) => store('local')?.getItem(key) ?? store('session')?.getItem(key) ?? null,
  setItem: (key: string, value: string) => {
    const [keep, drop] = remembers() ? (['local', 'session'] as const) : (['session', 'local'] as const)
    try {
      store(keep)?.setItem(key, value)
      store(drop)?.removeItem(key)
    } catch {
      // Full or blocked storage: the session lasts until the page reloads
    }
  },
  removeItem: (key: string) => {
    store('local')?.removeItem(key)
    store('session')?.removeItem(key)
  },
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { storage: sessionStorageAdapter },
})

// ─── Type Helper Shortcuts ──────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
