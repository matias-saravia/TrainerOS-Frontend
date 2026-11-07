import { expect, test, type APIRequestContext } from '@playwright/test'

const supabaseUrl = () => process.env.E2E_SUPABASE_URL ?? ''
const anonKey = () => process.env.E2E_SUPABASE_ANON_KEY ?? ''

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
    update: async (path: string, data: unknown) =>
      (await request.patch(`${supabaseUrl()}/rest/v1/${path}`, { headers: authed, data })).json(),
    rpc: async (fn: string, data: unknown) =>
      (await request.post(`${supabaseUrl()}/rest/v1/rpc/${fn}`, { headers: authed, data })).json(),
  }
}

const askAccess = async (request: APIRequestContext, slug: string, email: string) =>
  (
    await request.post(`${supabaseUrl()}/functions/v1/request-client-access`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${anonKey()}` },
      data: { slug, email },
    })
  ).json()

test('the landing leads a trainer to sign up', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Crear mi cuenta gratis' }).first().click()
  await expect(page).toHaveURL(/modo=registro/)
  await expect(page.getByLabel('Confirmar Contraseña')).toBeVisible()
})

test('the payment status chosen in the form reaches the list', async ({ page }) => {
  const run = Date.now().toString(36)
  const password = `e2e-${crypto.randomUUID()}`
  await page.goto('/login?modo=registro')
  await page.getByLabel('Nombre', { exact: true }).fill('Pago')
  await page.getByLabel('Apellido').fill(run)
  await page.getByLabel('Correo Electrónico').fill(`e2e.pago.${run}@example.test`)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Confirmar Contraseña').fill(password)
  await page.getByRole('button', { name: 'Crear Cuenta de Entrenador' }).click()
  await expect(page).toHaveURL(/admin.dashboard/)

  await page.goto('/admin/clientes/nuevo')
  await page.getByLabel('Nombre completo').fill('Debe Plata')
  await page.getByLabel('Correo *').fill(`e2e.debe.${run}@example.test`)
  await page.getByRole('radio', { name: 'Pendiente' }).check({ force: true })
  await page.getByRole('button', { name: 'Guardar alumno' }).click()
  await page.getByRole('tab', { name: 'Pendientes' }).click()
  await expect(page.getByRole('row', { name: /Debe Plata/ })).toContainText('Pendiente')

  await page.getByRole('row', { name: /Debe Plata/ }).getByRole('cell', { name: 'Debe Plata' }).click()
  await expect(page.getByRole('heading', { name: 'Debe Plata' })).toBeVisible()
  await page.getByRole('button', { name: 'Editar a Debe' }).click()
  await expect(page.getByRole('radio', { name: 'Pendiente' })).toBeChecked()
  await page.getByRole('radio', { name: 'Al día' }).check({ force: true })
  await page.getByRole('button', { name: 'Guardar Cambios' }).click()
  await page.getByRole('tab', { name: 'Al día' }).click()
  await expect(page.getByRole('row', { name: /Debe Plata/ })).toContainText('Al día')
})

test('the trainer sets the program week and the student sees it', async ({ page }) => {
  const run = Date.now().toString(36)
  const password = `e2e-${crypto.randomUUID()}`
  await page.goto('/login?modo=registro')
  await page.getByLabel('Nombre', { exact: true }).fill('Semana')
  await page.getByLabel('Apellido').fill(run)
  await page.getByLabel('Correo Electrónico').fill(`e2e.semana.${run}@example.test`)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Confirmar Contraseña').fill(password)
  await page.getByRole('button', { name: 'Crear Cuenta de Entrenador' }).click()
  await expect(page).toHaveURL(/admin.dashboard/)

  await page.goto('/admin/clientes/nuevo')
  await page.getByLabel('Nombre completo').fill('Vera Paso')
  await page.getByLabel('Correo *').fill(`e2e.vera.${run}@example.test`)
  await page.getByLabel('Semana actual').fill('9')
  await page.getByLabel('Total de semanas').fill('8')
  await page.getByRole('button', { name: 'Guardar alumno' }).click()
  await expect(page.getByText('La semana no puede ser mayor que el total (8).')).toBeVisible()

  await page.getByLabel('Semana actual').fill('3')
  await page.getByRole('button', { name: 'Guardar alumno' }).click()
  await expect(page.getByRole('row', { name: /Vera Paso/ })).toContainText('3/8')

  await page.getByRole('button', { name: 'Ver como alumno a Vera' }).click()
  await expect(page.getByLabel('Semana 3 de 8')).toBeVisible()
})

test('repeated attempts with one email are stopped', async ({ page }) => {
  const email = `e2e.intentos.${Date.now().toString(36)}@example.test`
  for (let i = 0; i < 10; i++) {
    expect(await askAccess(page.request, 'no-existe', email)).toEqual({ status: 'not_found' })
  }
  expect(await askAccess(page.request, 'no-existe', email)).toEqual({ error: 'rate_limited' })
})

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

  // ── The trainer previews the student area without saving anything ──
  await page.goto(`/t/ana-${run}`)
  await page.getByRole('link', { name: 'Ver como alumno' }).click()
  await page.getByRole('link', { name: 'Beto Paz' }).click()
  await expect(page.getByRole('heading', { name: 'Beto' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrenar rutina Empuje' }).click()
  await expect(page.getByRole('heading', { name: 'Empuje' })).toBeVisible()
  await expect(page.getByLabel('Peso en kilogramos')).toBeDisabled()
  await page.getByRole('button', { name: 'Volver al inicio' }).click()
  await expect(page).toHaveURL(new RegExp(`/vista-alumno/${client.id}$`))
  expect(await trainer.select('workout_sessions?select=id')).toEqual([])

  // ── The old link style shows nothing without a session ──
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.clear())
  await page.goto(`/alumno/${client.id}`)
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Beto')).toHaveCount(0)

  // ── An email the trainer did not load gets nowhere ──
  expect(await askAccess(page.request, `ana-${run}`, `nadie.${run}@example.test`)).toEqual({ status: 'not_found' })

  // ── A trainer's account never gets in with just an email, even if loaded as a student ──
  await trainer.insert('clients', { trainer_id: trainer.userId, nombre: 'Yo', apellido: 'Misma', email: trainerEmail })
  expect(await askAccess(page.request, `ana-${run}`, trainerEmail)).toEqual({ status: 'email_sent' })

  // ── The student enters from the trainer's link with just their email ──
  await page.goto(`/t/ana-${run}`)
  await page.getByLabel('Correo Electrónico').fill(studentEmail)
  await page.getByRole('button', { name: 'Ver mis rutinas' }).click()
  await expect(page).toHaveURL(/\/alumno$/)
  await expect(page.getByRole('heading', { name: 'Beto' })).toBeVisible()

  // ── A student cannot enter the trainer panel ──
  await page.goto('/admin/clientes')
  await expect(page).toHaveURL(/\/alumno$/)
  await page.goto(`/vista-alumno/${client.id}`)
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
  await expect(page.getByText('Te falta 1 ejercicio.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Esfuerzo 7 de 10' }).click()
  await page.getByRole('button', { name: 'Guardar y finalizar' }).click()
  await expect(page).toHaveURL(/\/alumno$/)

  expect(await trainer.select('workout_sessions?select=status,esfuerzo')).toEqual([{ status: 'completed', esfuerzo: 7 }])
  expect(await trainer.select('weight_entries?select=kg')).toEqual([{ kg: 62.5 }])

  // ── Pointing a linked student at someone else's email does not hand over that account ──
  await trainer.update(`clients?email=eq.${trainerEmail}`, { email: `libre.${run}@example.test` })
  await trainer.update(`clients?id=eq.${client.id}`, { email: `victima.${run}@example.test` })
  expect(await askAccess(page.request, `ana-${run}`, `victima.${run}@example.test`)).toEqual({ status: 'email_sent' })
  await trainer.update(`clients?id=eq.${client.id}`, { email: studentEmail })

  // ── Another trainer loading the same email cannot sign in as this student ──
  const otherEmail = `e2e.other.${run}@example.test`
  await page.request.post(`${supabaseUrl()}/auth/v1/signup`, {
    headers: { apikey: anonKey() },
    data: { email: otherEmail, password, data: { role: 'trainer', nombre: 'Otra', apellido: run } },
  })
  const other = await signIn(page.request, otherEmail, password)
  await other.insert('clients', { trainer_id: other.userId, nombre: 'Beto', apellido: 'Paz', email: studentEmail })
  const [{ slug: otherSlug }] = await other.select('profiles?select=slug')
  expect(await askAccess(page.request, otherSlug, studentEmail)).toEqual({ status: 'email_sent' })
})
