-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Undo the last set, for a set marked by mistake
-- ═══════════════════════════════════════════════════════════════════════

-- Only while the session is open. A set logged without weight left no
-- history entry, so an entry is removed only when there are more entries
-- than sets left.
CREATE OR REPLACE FUNCTION public.undo_workout_set(p_session_exercise_id UUID)
RETURNS public.session_exercises
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_row public.session_exercises%ROWTYPE;
  v_entries INT;
BEGIN
  SELECT se.* INTO v_row
  FROM public.session_exercises se
  JOIN public.workout_sessions ws ON ws.id = se.session_id
  JOIN public.clients c ON c.id = ws.client_id
  WHERE se.id = p_session_exercise_id
    AND c.user_id = (SELECT auth.uid())
    AND ws.status = 'in-progress'
  FOR UPDATE OF se;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_exercise_not_available' USING ERRCODE = '42501';
  END IF;

  IF v_row.sets_completados = 0 THEN
    RETURN v_row;
  END IF;

  SELECT count(*) INTO v_entries
  FROM public.weight_entries
  WHERE session_id = v_row.session_id AND exercise_id = v_row.exercise_id;

  IF v_entries > v_row.sets_completados - 1 THEN
    DELETE FROM public.weight_entries
    WHERE id = (
      SELECT id FROM public.weight_entries
      WHERE session_id = v_row.session_id AND exercise_id = v_row.exercise_id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    );
  END IF;

  UPDATE public.session_exercises se
  SET sets_completados = se.sets_completados - 1,
      peso_registrado = coalesce(
        (SELECT w.kg FROM public.weight_entries w
         WHERE w.session_id = se.session_id AND w.exercise_id = se.exercise_id
         ORDER BY w.created_at DESC, w.id DESC
         LIMIT 1),
        se.peso_registrado
      )
  WHERE se.id = p_session_exercise_id
  RETURNING se.* INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.undo_workout_set(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_workout_set(UUID) TO authenticated;
