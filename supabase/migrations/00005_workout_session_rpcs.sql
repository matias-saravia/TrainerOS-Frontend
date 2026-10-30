-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Workout sessions: the only write path for student progress
-- ═══════════════════════════════════════════════════════════════════════

-- At most one open session per client and routine, even with concurrent starts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_one_open
  ON public.workout_sessions(client_id, routine_id)
  WHERE status = 'in-progress';

-- The routine may change later: a session keeps its own copy of the exercises.
-- p_fecha comes from the device, so a late session lands on the student's day.
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

-- Counts one finished set and records its weight. Ignored once all sets are done.
CREATE OR REPLACE FUNCTION public.log_workout_set(
  p_session_exercise_id UUID,
  p_kg NUMERIC DEFAULT NULL
)
RETURNS public.session_exercises
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_row public.session_exercises%ROWTYPE;
  v_client_id UUID;
  v_fecha DATE;
BEGIN
  IF p_kg IS NOT NULL AND (p_kg < 0 OR p_kg > 999) THEN
    RAISE EXCEPTION 'invalid_weight' USING ERRCODE = '22023';
  END IF;

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

  IF v_row.sets_completados >= v_row.series THEN
    RETURN v_row;
  END IF;

  SELECT client_id, fecha INTO v_client_id, v_fecha
  FROM public.workout_sessions
  WHERE id = v_row.session_id;

  UPDATE public.session_exercises
  SET sets_completados = sets_completados + 1,
      peso_registrado = coalesce(p_kg, peso_registrado)
  WHERE id = p_session_exercise_id
  RETURNING * INTO v_row;

  IF p_kg IS NOT NULL THEN
    INSERT INTO public.weight_entries (client_id, exercise_id, session_id, fecha, kg)
    VALUES (v_client_id, v_row.exercise_id, v_row.session_id, v_fecha, p_kg);
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_workout_session(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.workout_sessions ws
  SET status = 'completed', completed_at = coalesce(ws.completed_at, NOW())
  FROM public.clients c
  WHERE ws.id = p_session_id
    AND c.id = ws.client_id
    AND c.user_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_available' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.start_workout_session(UUID, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_workout_set(UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_workout_session(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_workout_session(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_workout_set(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_workout_session(UUID) TO authenticated;
