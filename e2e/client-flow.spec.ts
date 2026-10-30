import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const supabaseUrl = () => process.env.E2E_SUPABASE_URL ?? ''
const anonKey = () => process.env.E2E_SUPABASE_ANON_KEY ?? ''
const mailUrl = () => process.env.E2E_MAIL_URL ?? ''

/** Minimal Supabase client over HTTP, signed in as the given user. */
async function signIn(request: APIRequestContext, email: string, password: string) {
  const headers = { apikey: anonKey(), 'Content-Type': 'application/json' }
  const auth = await (
    await request.post(`${supabaseUrl()}/auth/v1/token?grant_type=password`, { headers, data: { email, password } })
  ).json()
  const authed = {
    ...headers,
    Authorization: `Bearer ${auth.access_token}`,
    Prefer: 'return=representation',
  }

  return {
    userId: auth.user.id as string,
    select: async (path: string) =>
      (await request.get(`${supabaseUrl()}/rest/v1/${path}`, { headers: authed })).json(),
    insert: async (table: string, data: unknown) =>
      (await request.post(`${supabaseUrl()}/rest/v1/${table}`, { headers: authed, data })).json(),
    rpc: async (fn: string, data: unknown) =>
      (await request.post(`${supabaseUrl()}/rest/v1/rpc/${fn}`, { headers: authed, data })).json(),
  }
}

async function findLoginLink(page: Page, email: string): Promise<string> {
  let link = ''
  await expect(async () => {
    const search = await (await page.request.get(`${mailUrl()}/api/v1/search?query=to:"${email}"`)).json()
    expect(search.messages.length).toBeGreaterThan(0)
    const message = await (await page.request.get(`${mailUrl()}/api/v1/message/${search.messages[0].ID}`)).json()
    link = (message.HTML || message.Text).match(/https?:[^"\s)]+verify[^"\s)]+/)[0].replace(/&amp;/g, '&')
  }).toPass({ timeout: 15_000 })
  return link
}

test('a trainer invites a student, and their progress is saved', async ({ page }) => {
  const run = Date.now().toString(36)
  const trainerEmail = `e2e.trainer.${run}@example.test`
  const studentEmail = `e2e.student.${run}@example.test`
  const password = `e2e-${crypto.randomUUID()}`

  // ── The trainer signs up and gets a public link ──
  await page.goto('/login')
  await page.getByRole('button', { name: 'Registrar Entrenador' }).first().click()
  await page.getByLabel('Nombre', { exact: true }).fill('Ana')
  await page.getByLabel('Apellido').fill(run)
  await page.getByLabel('Correo Electrónico').fill(trainerEmail)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Confirmar Contraseña').fill(password)
  await page.getByRole('button', { name: 'Crear Cuenta de Entrenador' }).click()
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  await expect(page.getByText(`/t/ana-${run}`)).toBeVisible()

  // ── The trainer loads a student and assigns a routine ──
  const trainer = await signIn(page.request, trainerEmail, password)
  const [exercise] = await trainer.select('exercises?select=id&limit=1')
  const [client] = await trainer.insert('clients', {
    trainer_id: trainer.userId,
    nombre: 'Beto',
    apellido: 'Paz',
    email: studentEmail,
  })
  const routineId = await trainer.rpc('save_routine', {
    p_routine_id: null,
    p_nombre: 'Empuje',
    p_descripcion: null,
    p_blocks: [{ label: 'A', type: 'single', exercises: [{ exercise_id: exercise.id, sets: 2, reps: '10' }] }],
  })
  await trainer.insert('client_routines', { client_id: client.id, routine_id: routineId })

  // ── The old link style shows nothing without a session ──
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.clear())
  await page.goto(`/alumno/${client.id}`)
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Beto')).toHaveCount(0)

  // ── The student asks for access from the trainer's link ──
  await page.goto(`/t/ana-${run}`)
  await page.getByLabel('Correo Electrónico').fill(studentEmail)
  await page.getByRole('button', { name: 'Enviarme el link' }).click()
  await expect(page.getByText('te enviamos un link')).toBeVisible()

  await page.goto(await findLoginLink(page, studentEmail))
  await expect(page).toHaveURL(/\/alumno$/)
  await expect(page.getByRole('heading', { name: 'Beto' })).toBeVisible()

  // ── A student cannot enter the trainer panel ──
  await page.goto('/admin/clientes')
  await expect(page).toHaveURL(/\/alumno$/)

  // ── The progress survives a reload ──
  await page.getByRole('button', { name: 'Entrenar rutina Empuje' }).click()
  await expect(page).toHaveURL(/\/alumno\/sesion\//)
  await page.getByLabel('Peso en kilogramos').fill('62.5')
  await page.getByLabel('Marcar serie como completada').click()
  await expect(page.getByText('1/2', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText('1/2', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Peso en kilogramos')).toHaveValue('62.5')

  // ── Finishing the session is visible to the trainer ──
  await page.getByRole('button', { name: 'Finalizar sesión' }).click()
  await expect(page).toHaveURL(/\/alumno$/)

  expect(await trainer.select('workout_sessions?select=status')).toEqual([{ status: 'completed' }])
  expect(await trainer.select('weight_entries?select=kg')).toEqual([{ kg: 62.5 }])
})
