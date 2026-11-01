-- Finance ledger tests. Run with: npx supabase test db
BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.com', NOW(), '{"role":"trainer","nombre":"Ana","apellido":"Paz"}'),
  ('b0000000-0000-0000-0000-000000000001', 'beto@test.com', NOW(), '{"role":"trainer","nombre":"Beto","apellido":"Paz"}'),
  ('a0000000-0000-0000-0000-000000000002', 'alu@test.com', NOW(), '{}');
INSERT INTO public.clients (id, trainer_id, user_id, nombre, email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Alu', 'alu@test.com'),
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', NULL, 'Otro', 'otro@test.com');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

INSERT INTO public.finance_movements (id, trainer_id, client_id, tipo, fecha, concepto, monto) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'entrada', '2026-03-10', 'Cuota', 1000),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', NULL, 'salida', '2026-03-15', 'Alquiler', 400),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', NULL, 'entrada', '2026-04-01', 'Error', 999);

SELECT is((SELECT count(*)::int FROM public.finance_movements), 3, 'the trainer sees their movements');

SELECT throws_ok(
  $$INSERT INTO public.finance_movements (trainer_id, tipo, fecha, concepto, monto)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'entrada', '2026-03-10', 'x', 0)$$,
  '23514', NULL, 'an amount must be positive'
);
SELECT throws_ok(
  $$INSERT INTO public.finance_movements (trainer_id, client_id, tipo, fecha, concepto, monto)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'entrada', '2026-03-10', 'x', 1)$$,
  '42501', NULL, 'cannot link another trainer''s student'
);
SELECT throws_ok(
  $$UPDATE public.finance_movements SET anulado_at = NOW() WHERE id = 'f0000000-0000-0000-0000-000000000003'$$,
  '23514', NULL, 'voiding requires a reason'
);
SELECT throws_ok(
  $$DELETE FROM public.finance_movements$$,
  '42501', NULL, 'movements cannot be deleted'
);

UPDATE public.finance_movements SET anulado_at = NOW(), anulado_motivo = 'Mal cargado'
WHERE id = 'f0000000-0000-0000-0000-000000000003';

SELECT is(
  (SELECT sum(total)::numeric FROM public.finance_year_summary(2026) WHERE mes = 3 AND tipo = 'entrada'),
  1000::numeric, 'the summary adds up each month'
);
SELECT is(
  (SELECT count(*)::int FROM public.finance_year_summary(2026) WHERE mes = 4),
  0, 'voided movements are left out of the summary'
);
SELECT is((SELECT count(*)::int FROM public.finance_year_summary(2025)), 0, 'other years are left out');

-- Another trainer
SELECT set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.finance_movements), 0, 'another trainer sees nothing');
SELECT is((SELECT count(*)::int FROM public.finance_year_summary(2026)), 0, 'another trainer gets an empty summary');

-- The student
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.finance_movements), 0, 'a student sees nothing, not even their own payments');

SELECT * FROM finish();
ROLLBACK;
