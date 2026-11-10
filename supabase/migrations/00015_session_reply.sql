-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — The trainer answers the comment a student left on a session
-- ═══════════════════════════════════════════════════════════════════════

-- Trainers cannot update sessions directly (student progress is written only
-- through functions), so the reply goes through one too.
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS respuesta TEXT;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS respuesta_at TIMESTAMPTZ;

ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_respuesta_length;
ALTER TABLE public.workout_sessions ADD CONSTRAINT workout_sessions_respuesta_length
  CHECK (respuesta IS NULL OR char_length(respuesta) <= 500);

-- Saves or edits the reply; an empty text removes it.
CREATE OR REPLACE FUNCTION public.reply_to_session(p_session_id UUID, p_respuesta TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_respuesta TEXT := NULLIF(trim(p_respuesta), '');
BEGIN
  UPDATE public.workout_sessions
  SET respuesta = v_respuesta,
      respuesta_at = CASE WHEN v_respuesta IS NULL THEN NULL ELSE NOW() END
  WHERE id = p_session_id
    AND trainer_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_available' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_session(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_session(UUID, TEXT) TO authenticated;
