/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** 'true' once the Google provider is set up in Supabase */
  readonly VITE_GOOGLE_SIGN_IN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
