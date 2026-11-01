-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Attempt limit for the public student access form
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS private.access_attempts (
  key TEXT PRIMARY KEY,
  attempts INT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_access_attempts_window
  ON private.access_attempts(window_started_at);

-- Counts one attempt and says whether it is still within the limit. Atomic, so
-- concurrent requests cannot slip past it. Old rows are cleared along the way.
CREATE OR REPLACE FUNCTION public.register_access_attempt(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_attempts INT;
BEGIN
  DELETE FROM private.access_attempts
  WHERE window_started_at < NOW() - INTERVAL '1 day';

  INSERT INTO private.access_attempts AS a (key, attempts, window_started_at)
  VALUES (p_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
  SET attempts = CASE
        WHEN a.window_started_at < NOW() - make_interval(secs => p_window_seconds) THEN 1
        ELSE a.attempts + 1
      END,
      window_started_at = CASE
        WHEN a.window_started_at < NOW() - make_interval(secs => p_window_seconds) THEN NOW()
        ELSE a.window_started_at
      END
  RETURNING attempts INTO v_attempts;

  RETURN v_attempts <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.register_access_attempt(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_access_attempt(TEXT, INT, INT) TO service_role;
