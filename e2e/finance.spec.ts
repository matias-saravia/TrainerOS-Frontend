import { expect, test } from '@playwright/test'

test('a trainer keeps a ledger and sees it summarized by month', async ({ page }) => {
  const run = Date.now().toString(36)
  const password = `e2e-${crypto.randomUUID()}`
  await page.goto('/login?modo=registro')
  await page.getByLabel('Nombre', { exact: true }).fill('Caja')
  await page.getByLabel('Apellido').fill(run)
  await page.getByLabel('Correo Electrónico').fill(`e2e.caja.${run}@example.test`)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Confirmar Contraseña').fill(password)
  await page.getByRole('button', { name: 'Crear Cuenta de Entrenador' }).click()
  await expect(page).toHaveURL(/admin.dashboard/)
  await page.goto('/admin/finanzas')

  const dialog = page.getByRole('dialog')
  const addMovement = async (button: string, monto: string, concepto: string) => {
    await page.getByRole('button', { name: button, exact: true }).first().click()
    await dialog.getByLabel('Monto').fill(monto)
    await dialog.getByLabel('Concepto').fill(concepto)
    await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
    await expect(dialog).toBeHidden()
  }

  // A missing amount is explained, not saved
  await page.getByRole('button', { name: 'Nueva entrada' }).first().click()
  await dialog.getByLabel('Concepto').fill('Sin monto')
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(dialog.getByRole('alert')).toContainText('monto mayor a cero')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()

  await addMovement('Nueva entrada', '50000', 'Cuota de Beto')
  await addMovement('Nueva salida', '20000', 'Alquiler del gimnasio')
  await addMovement('Nueva entrada', '999', 'Cargado por error')

  const strip = page.getByRole('region', { name: /Resumen de/ })
  await expect(strip).toContainText('50.999')
  await expect(strip).toContainText('30.999')

  // The ledger lists them, and voiding keeps the line but drops it from the totals
  await page.getByRole('tab', { name: 'Libro diario' }).click()
  await expect(page.getByText('Cuota de Beto')).toBeVisible()
  await page.getByRole('button', { name: 'Anular Cargado por error' }).click()
  await dialog.getByRole('button', { name: 'Anular movimiento' }).click()
  await expect(dialog.getByRole('alert')).toContainText('por qué')
  await dialog.getByLabel('Motivo').fill('Lo cargué dos veces')
  await dialog.getByRole('button', { name: 'Anular movimiento' }).click()
  await expect(page.getByText('Anulado: Lo cargué dos veces')).toBeVisible()

  // Linking a student only notes who paid: their status does not change
  await page.goto('/admin/clientes/nuevo')
  await page.getByLabel('Nombre completo').fill('Beto Paz')
  await page.getByLabel('Correo *').fill(`e2e.beto.${run}@example.test`)
  await page.getByRole('button', { name: 'Guardar alumno' }).click()
  await expect(page.getByRole('row', { name: /Beto Paz/ })).toContainText('Al día')
  await page.goto('/admin/finanzas?vista=libro')
  await page.getByRole('button', { name: 'Nueva entrada' }).first().click()
  await dialog.getByLabel('Monto').fill('100000')
  await dialog.getByLabel('Alumno (opcional)').selectOption({ label: 'Beto Paz' })
  await dialog.getByLabel('Concepto').fill('4 meses de preparación')
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('row', { name: /4 meses de preparación/ })).toContainText('Beto Paz')
  await page.getByRole('button', { name: 'Anular 4 meses de preparación' }).click()
  await dialog.getByLabel('Motivo').fill('Era una prueba')
  await dialog.getByRole('button', { name: 'Anular movimiento' }).click()
  await expect(dialog).toBeHidden()
  await page.goto('/admin/clientes')
  await expect(page.getByRole('row', { name: /Beto Paz/ })).toContainText('Al día')
  await page.goto('/admin/finanzas?vista=libro')

  await page.getByLabel('Buscar concepto').fill('alquiler')
  await expect(page.getByText('Cuota de Beto')).toHaveCount(0)
  await expect(page.getByText('Alquiler del gimnasio')).toBeVisible()

  await page.getByRole('tab', { name: 'Resumen' }).click()
  await expect(strip).toContainText('30.000')

  // Another month starts empty, and the view survives a reload
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(strip).not.toContainText('50.000')
  await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await page.reload()
  await expect(strip).toContainText('30.000')
})
