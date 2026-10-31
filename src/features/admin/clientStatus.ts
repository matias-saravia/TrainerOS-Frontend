export const CLIENT_STATUS: Record<string, { label: string; tone: string }> = {
  aldia:     { label: 'Al día',       tone: 'status--ok' },
  vence:     { label: 'Vence pronto', tone: 'status--warn' },
  pendiente: { label: 'Pendiente',    tone: 'status--bad' },
}
