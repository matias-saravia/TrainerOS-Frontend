/** Public link a trainer shares with their students. */
export function getTrainerLink(slug: string | null | undefined): string {
  return slug ? `${window.location.origin}/t/${slug}` : ''
}
