interface LogoProps {
  size?: number
  withName?: boolean
}

/** The T: an athlete hanging from the bar at the top of a chin-up. */
export default function Logo({ size = 28, withName = true }: LogoProps) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <circle cx="16" cy="4.6" r="3.4" />
        <rect x="1" y="9" width="30" height="3.4" rx="0.6" />
        <path d="M7.2 12.4h3.5c.5 2.3 2 3.3 5.3 3.3s4.8-1 5.3-3.3h3.5c-.5 3.6-2.5 5.8-5.3 6.6L18.6 31h-5.2L12.5 19c-2.8-.8-4.8-3-5.3-6.6z" />
      </svg>
      {withName && <span className="logo__name">TrainerOS</span>}
    </span>
  )
}
