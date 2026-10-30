import { execSync } from 'node:child_process'
import { defineConfig, devices } from '@playwright/test'

// Runs only against the local Supabase stack: never against a shared project.
const status = Object.fromEntries(
  execSync('npx supabase status -o env', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .split(/\r?\n/)
    .filter(line => line.includes('='))
    .map(line => {
      const i = line.indexOf('=')
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')]
    })
)

process.env.E2E_SUPABASE_URL = status.API_URL
process.env.E2E_SUPABASE_ANON_KEY = status.ANON_KEY
process.env.E2E_MAIL_URL = status.INBUCKET_URL ?? status.MAILPIT_URL

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5174',
    ...devices['Pixel 7'],
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort --host localhost',
    url: 'http://localhost:5174',
    env: {
      VITE_SUPABASE_URL: status.API_URL,
      VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
    },
  },
})
