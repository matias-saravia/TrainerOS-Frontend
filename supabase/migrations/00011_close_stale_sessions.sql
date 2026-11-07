-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — A session left open on an earlier day does not carry over
-- ═══════════════════════════════════════════════════════════════════════

-- Starting a routine used to resume any open session of it, even from last
-- week. Now an open session from an earlier day is closed as it was left,
-- or removed if no set was logged, and a new one starts for today.
CREATE OR REPLACE FUNCTION public.start_workout_session(
  p_routine_id UUID,
  p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_client_id UUID;
  v_trainer_id UUID;
  v_nombre TEXT;
  v_session_id UUID;
BEGIN
  SELECT c.id, c.trainer_id, r.nombre INTO v_client_id, v_trainer_id, v_nombre
  FROM public.client_routines cr
  JOIN public.clients c ON c.id = cr.client_id
  JOIN public.routines r ON r.id = cr.routine_id
  WHERE cr.routine_id = p_routine_id AND c.user_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'routine_not_assigned' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.workout_sessions ws
  WHERE ws.client_id = v_client_id
    AND ws.routine_id = p_routine_id
    AND ws.status = 'in-progress'
    AND ws.fecha < p_fecha
    AND NOT EXISTS (
      SELECT 1 FROM public.session_exercises se
      WHERE se.session_id = ws.id AND se.sets_completados > 0
    );

  UPDATE public.workout_sessions
  SET status = 'completed', completed_at = NOW()
  WHERE client_id = v_client_id
    AND routine_id = p_routine_id
    AND status = 'in-progress'
    AND fecha < p_fecha;

  INSERT INTO public.workout_sessions
    (client_id, routine_id, trainer_id, nombre, fecha, status, started_at)
  VALUES
    (v_client_id, p_routine_id, v_trainer_id, v_nombre, p_fecha, 'in-progress', NOW())
  ON CONFLICT (client_id, routine_id) WHERE status = 'in-progress' DO NOTHING
  RETURNING id INTO v_session_id;

  IF v_session_id IS NULL THEN
    SELECT id INTO v_session_id
    FROM public.workout_sessions
    WHERE client_id = v_client_id AND routine_id = p_routine_id AND status = 'in-progress';
    RETURN v_session_id;
  END IF;

  INSERT INTO public.session_exercises
    (session_id, exercise_id, order_index, categoria, series, reps, descanso, notes)
  SELECT
    v_session_id,
    rbe.exercise_id,
    row_number() OVER (ORDER BY b.order_index, rbe.order_index) - 1,
    NULL,
    rbe.sets,
    rbe.reps,
    coalesce(rbe.rest_seconds, 90),
    rbe.notes
  FROM public.routine_blocks b
  JOIN public.routine_block_exercises rbe ON rbe.block_id = b.id
  WHERE b.routine_id = p_routine_id;

  RETURN v_session_id;
END;
$$;
