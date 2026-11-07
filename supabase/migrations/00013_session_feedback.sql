-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — The student rates the effort and leaves a comment on finishing
-- ═══════════════════════════════════════════════════════════════════════

-- Effort on the RPE scale: 1 is very easy, 10 is all out. The comment goes in
-- the existing notes column. Both are optional and the trainer reads them.
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS esfuerzo SMALLINT;

ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_esfuerzo_range;
ALTER TABLE public.workout_sessions ADD CONSTRAINT workout_sessions_esfuerzo_range
  CHECK (esfuerzo IS NULL OR esfuerzo BETWEEN 1 AND 10);

ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_notes_length;
ALTER TABLE public.workout_sessions ADD CONSTRAINT workout_sessions_notes_length
  CHECK (notes IS NULL OR char_length(notes) <= 500);

-- The signature changes, so the old one goes first
DROP FUNCTION IF EXISTS public.complete_workout_session(UUID);

CREATE FUNCTION public.complete_workout_session(
  p_session_id UUID,
  p_esfuerzo SMALLINT DEFAULT NULL,
  p_comentario TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.workout_sessions ws
  SET status = 'completed',
      completed_at = coalesce(ws.completed_at, NOW()),
      esfuerzo = coalesce(p_esfuerzo, ws.esfuerzo),
      notes = coalesce(NULLIF(trim(p_comentario), ''), ws.notes)
  FROM public.clients c
  WHERE ws.id = p_session_id
    AND c.id = ws.client_id
    AND c.user_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_available' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_workout_session(UUID, SMALLINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_workout_session(UUID, SMALLINT, TEXT) TO authenticated;
