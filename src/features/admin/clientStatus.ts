import type { Database } from '../../types/database.types'

type ClientStatus = Database['public']['Enums']['client_status']

export const CLIENT_STATUS: Record<ClientStatus, { label: string; tone: string }> = {
  aldia:     { label: 'Al día',       tone: 'status--ok' },
  vence:     { label: 'Vence pronto', tone: 'status--warn' },
  pendiente: { label: 'Pendiente',    tone: 'status--bad' },
}

export const PLAN_LABELS: Record<Database['public']['Enums']['plan_tier'], string> = {
  basico:        'Básico',
  estandar:      'Estándar',
  premium:       'Premium',
  personalizado: 'Personalizado',
}
