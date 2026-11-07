// Sessions and weights store their day as a plain local YYYY-MM-DD.

/** The device's local day as YYYY-MM-DD, the format sessions are stored with. */
export function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

/** A YYYY-MM-DD as a Date at noon, so no time zone moves it to another day. */
export function fromKey(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

/** Lowercase without accents, to compare day names like "miércoles". */
export function plainText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
