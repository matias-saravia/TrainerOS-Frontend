-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Finance: each trainer's daily ledger
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.finance_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  fecha DATE NOT NULL,
  concepto TEXT NOT NULL CHECK (length(trim(concepto)) > 0),
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  -- A ledger keeps its history: movements are voided with a reason, never deleted
  anulado_at TIMESTAMPTZ,
  anulado_motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (anulado_at IS NULL OR length(trim(coalesce(anulado_motivo, ''))) > 0)
);

-- Also covers a database where an earlier draft of this script already ran
ALTER TABLE public.finance_movements DROP COLUMN IF EXISTS categoria;

CREATE INDEX IF NOT EXISTS idx_finance_trainer_fecha
  ON public.finance_movements(trainer_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_finance_client
  ON public.finance_movements(client_id);

DROP TRIGGER IF EXISTS finance_movements_updated_at ON public.finance_movements;
CREATE TRIGGER finance_movements_updated_at
  BEFORE UPDATE ON public.finance_movements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.finance_movements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.finance_movements FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.finance_movements TO authenticated;
GRANT ALL ON public.finance_movements TO service_role;

DROP POLICY IF EXISTS finance_trainer_select ON public.finance_movements;
CREATE POLICY finance_trainer_select ON public.finance_movements
  FOR SELECT TO authenticated
  USING (trainer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS finance_trainer_insert ON public.finance_movements;
CREATE POLICY finance_trainer_insert ON public.finance_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    trainer_id = (SELECT auth.uid())
    AND (SELECT private.is_trainer())
    AND (client_id IS NULL OR private.owns_client(client_id))
  );

DROP POLICY IF EXISTS finance_trainer_update ON public.finance_movements;
CREATE POLICY finance_trainer_update ON public.finance_movements
  FOR UPDATE TO authenticated
  USING (trainer_id = (SELECT auth.uid()))
  WITH CHECK (
    trainer_id = (SELECT auth.uid())
    AND (client_id IS NULL OR private.owns_client(client_id))
  );

-- Totals are added up here so the summary stays right however many movements exist.
-- SECURITY INVOKER: RLS limits it to the caller's own movements.
DROP FUNCTION IF EXISTS public.finance_year_summary(INT);
CREATE FUNCTION public.finance_year_summary(p_year INT)
RETURNS TABLE (mes INT, tipo TEXT, total NUMERIC, movimientos BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT
    extract(month FROM m.fecha)::INT,
    m.tipo,
    sum(m.monto),
    count(*)
  FROM public.finance_movements m
  WHERE m.fecha >= make_date(p_year, 1, 1)
    AND m.fecha < make_date(p_year + 1, 1, 1)
    AND m.anulado_at IS NULL
  GROUP BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.finance_year_summary(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_year_summary(INT) TO authenticated;
