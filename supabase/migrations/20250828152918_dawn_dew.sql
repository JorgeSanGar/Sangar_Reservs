-- =====================================================
-- MIGRACIÓN: Sistema de Recomendación de Llegada
-- =====================================================

-- 01) Modalidad de visita en bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS visit_mode TEXT
  CHECK (visit_mode IN ('wait','dropoff'))
  DEFAULT 'wait';

-- 02) Parámetros de llegada en orgs (si no existen)
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS arrival_checkin_min INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS arrival_wait_max_min INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS arrival_early_cap_wait_min INT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS arrival_drop_window_before_min INT NOT NULL DEFAULT 60;

-- 03) Extensión para índices GiST combinados (si no está)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- 04) Índices optimizados para consultas de solapes y tiempos
DROP INDEX IF EXISTS idx_booking_resources_gist;
CREATE INDEX IF NOT EXISTS idx_booking_resources_gist
  ON public.booking_resources USING GIST (resource_id, timespan)
  WHERE timespan IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_org_start
  ON public.bookings (org_id, start_time)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_org_end
  ON public.bookings (org_id, end_time)
  WHERE deleted_at IS NULL;

-- 05) RPC: recomendar llegada
CREATE OR REPLACE FUNCTION public.recommend_arrival(p_booking UUID, p_mode TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  b RECORD;                 -- reserva
  org_settings RECORD;      -- parámetros de llegada org
  md TEXT;                  -- modo efectivo
  ck INTERVAL;              -- check-in previo a start (min)
  mw INTERVAL;              -- espera máxima cliente (min)
  ec INTERVAL;              -- cap de llegada temprana (min)
  dw INTERVAL;              -- ventana antes para dropoff (min)
  prev_end TIMESTAMPTZ;     -- fin del trabajo anterior en mismos recursos
  rec_start TIMESTAMPTZ;    -- llegada recomendada (inicio ventana)
  rec_end   TIMESTAMPTZ;    -- llegada recomendada (fin ventana)
  client_wait INTERVAL;
  idle_gap   INTERVAL;
BEGIN
  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM public.v_membership vm
    JOIN public.bookings bk ON bk.org_id = vm.org_id
    WHERE vm.user_id = auth.uid() AND bk.id = p_booking
  ) THEN
    RETURN json_build_object('status','error','error','forbidden');
  END IF;

  -- 1) Cargar reserva
  SELECT id, org_id, start_time, end_time, visit_mode
  INTO b
  FROM public.bookings
  WHERE id = p_booking AND deleted_at IS NULL;

  IF b.id IS NULL THEN
    RETURN json_build_object('status','error','error','booking_not_found');
  END IF;

  -- 2) Determinar modo
  md := lower(coalesce(p_mode, b.visit_mode, 'wait'));

  -- 3) Parámetros org
  SELECT arrival_checkin_min, arrival_wait_max_min, arrival_early_cap_wait_min, arrival_drop_window_before_min
  INTO org_settings
  FROM public.orgs WHERE id = b.org_id;

  IF org_settings IS NULL THEN
    RETURN json_build_object('status','error','error','org_not_found');
  END IF;

  ck := make_interval(mins => GREATEST(1, org_settings.arrival_checkin_min));
  mw := make_interval(mins => GREATEST(0, org_settings.arrival_wait_max_min));
  ec := make_interval(mins => GREATEST(0, org_settings.arrival_early_cap_wait_min));
  dw := make_interval(mins => GREATEST(0, org_settings.arrival_drop_window_before_min));

  -- 4) Último fin anterior en mismos recursos
  WITH my_res AS (
    SELECT DISTINCT resource_id
    FROM public.booking_resources
    WHERE booking_id = b.id
  )
  SELECT MAX(x.end_time) INTO prev_end
  FROM public.bookings x
  JOIN public.booking_resources xr ON xr.booking_id = x.id
  JOIN my_res r ON r.resource_id = xr.resource_id
  WHERE x.org_id = b.org_id
    AND x.deleted_at IS NULL
    AND x.id <> b.id
    AND x.end_time <= b.start_time;

  -- 5) Lógica de recomendación
  IF md = 'wait' THEN
    -- Queremos que el cliente llegue ANTES o EN prev_end, pero sin esperar > mw ni llegar exageradamente pronto (cap ec),
    -- y nunca más tarde que (start - ck).
    -- Objetivo primario: minimizar idle_gap y limitar client_wait.
    rec_end   := LEAST(COALESCE(prev_end, b.start_time - ck), b.start_time - ck);
    rec_start := GREATEST(rec_end - mw, COALESCE(prev_end - ec, rec_end)); -- cap de llegada temprana
    IF rec_start > rec_end THEN
      rec_start := rec_end; -- colapsa si la ventana se invierte
    END IF;
  ELSE
    -- dropoff: ventana amplia previa (dw), pero cerrando en (start - ck)
    rec_end   := b.start_time - ck;
    rec_start := rec_end - dw;
  END IF;

  client_wait := GREATEST(INTERVAL '0 min', COALESCE(prev_end, rec_end) - rec_start);
  idle_gap    := GREATEST(INTERVAL '0 min', rec_start - COALESCE(prev_end, rec_start));

  RETURN json_build_object(
    'status','ok',
    'mode', md,
    'booking_start', b.start_time,
    'prev_end', prev_end,
    'recommended_start', rec_start,
    'recommended_end', rec_end,
    'checkin_min', EXTRACT(EPOCH FROM ck)::int / 60,
    'client_wait_min', EXTRACT(EPOCH FROM client_wait)::int / 60,
    'idle_gap_min', EXTRACT(EPOCH FROM idle_gap)::int / 60
  );
END;
$$;

-- 06) Permisos
GRANT EXECUTE ON FUNCTION public.recommend_arrival(uuid, text) TO authenticated;

-- 07) Comentarios para documentación
COMMENT ON FUNCTION public.recommend_arrival(uuid, text) IS 
'Recomienda ventana de llegada para una reserva basada en modo (wait/dropoff) y recursos compartidos';

COMMENT ON COLUMN public.bookings.visit_mode IS 
'Modalidad de visita: wait (cliente espera) o dropoff (deja vehículo)';