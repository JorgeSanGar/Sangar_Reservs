-- =====================================================
-- PASO 0: Asegurar que la tabla public.bookings existe
-- =====================================================
-- Esta sección se añade para garantizar que la tabla 'bookings' esté presente
-- antes de que cualquier otra operación en esta migración intente referenciarla.
-- El 'IF NOT EXISTS' previene errores si la tabla ya fue creada por otro medio.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- Asegura que gen_random_uuid() esté disponible

-- Crear tabla orgs si no existe (requerida por bookings)
CREATE TABLE IF NOT EXISTS public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Crear tabla resources si no existe (requerida por booking_resources)
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Crear tabla bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  start_time  timestamptz NOT NULL,
  end_time    timestamptz NOT NULL,
  visit_mode  text NOT NULL DEFAULT 'wait' CHECK (visit_mode IN ('wait','dropoff')),
  status      text NOT NULL DEFAULT 'scheduled',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz,
  deleted_at  timestamptz,
  CONSTRAINT bookings_end_after_start CHECK (end_time > start_time)
);

-- Crear tabla booking_resources si no existe
CREATE TABLE IF NOT EXISTS public.booking_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  timespan tstzrange,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices útiles para la tabla bookings
CREATE INDEX IF NOT EXISTS idx_bookings_org_start ON public.bookings (org_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_org_end   ON public.bookings (org_id, end_time);

-- =====================================================
-- PASO 1: Habilitar extensiones necesarias
-- =====================================================

-- Crear esquema para extensiones si no existe (buena práctica en Supabase)
CREATE SCHEMA IF NOT EXISTS extensions;

-- Habilitar btree_gist para índices GiST sobre tipos B-tree (UUID, integers, etc.)
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- Verificar que pgcrypto esté disponible (necesario para gen_random_uuid)
-- Ya se incluyó arriba, pero se mantiene aquí por si se ejecuta de forma independiente
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =====================================================
-- PASO 2: Limpiar índices y constraints existentes
-- =====================================================

-- Remover constraint de exclusión si existe (para recrearlo correctamente)
ALTER TABLE public.booking_resources DROP CONSTRAINT IF EXISTS br_no_overlap;
ALTER TABLE public.booking_resources DROP CONSTRAINT IF EXISTS booking_no_overlap_per_resource;

-- Remover índices existentes para recrearlos optimizados
DROP INDEX IF EXISTS public.idx_booking_resources_gist;
DROP INDEX IF EXISTS public.idx_booking_resources_timespan_only;
DROP INDEX IF EXISTS public.idx_booking_resources_resource_id_btree;
DROP INDEX IF EXISTS public.idx_booking_resources_booking_id;

-- =====================================================
-- PASO 3: Crear índices optimizados
-- =====================================================

-- Índice compuesto GiST principal para consultas de disponibilidad
-- Este índice soporta eficientemente: resource_id = ? AND timespan && ?
CREATE INDEX idx_booking_resources_gist
  ON public.booking_resources
  USING GIST (resource_id, timespan)
  WHERE timespan IS NOT NULL;

-- Índice adicional para consultas solo por timespan (backup)
CREATE INDEX idx_booking_resources_timespan_only
  ON public.booking_resources
  USING GIST (timespan)
  WHERE timespan IS NOT NULL;

-- Índice B-tree para consultas rápidas por booking_id
CREATE INDEX IF NOT EXISTS idx_booking_resources_booking_id
  ON public.booking_resources
  USING BTREE (booking_id);

-- =====================================================
-- PASO 4: Constraint de exclusión para prevenir solapamientos
-- =====================================================

-- Constraint que previene reservas solapadas del mismo recurso
-- Esto garantiza integridad a nivel de base de datos
ALTER TABLE public.booking_resources
ADD CONSTRAINT booking_no_overlap_per_resource
EXCLUDE USING GIST (
  resource_id WITH =,
  timespan WITH &&
)
WHERE (timespan IS NOT NULL);

-- =====================================================
-- PASO 5: Optimizaciones adicionales
-- =====================================================

-- Índice para consultas de recursos por organización
CREATE INDEX IF NOT EXISTS idx_resources_org_active
  ON public.resources
  USING BTREE (org_id, is_active)
  WHERE is_active = true;

-- =====================================================
-- PASO 6: Función de utilidad para testing
-- =====================================================

-- Función para probar el rendimiento del índice
CREATE OR REPLACE FUNCTION public.test_gist_index_performance(
  p_resource_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS TABLE(
  plan_info TEXT,
  execution_time_ms NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_line TEXT;
BEGIN
  -- Capturar tiempo de inicio
  v_start_time := clock_timestamp();
  
  -- Obtener plan de ejecución usando EXECUTE
  v_plan := '';
  FOR v_line IN
    EXECUTE $q$
      EXPLAIN (FORMAT TEXT)
      SELECT 1
      FROM public.booking_resources br
      WHERE br.resource_id = $1
        AND br.timespan && tstzrange($2, $3, '[)')
    $q$ USING p_resource_id, p_start_time, p_end_time
  LOOP
    v_plan := v_plan || v_line || E'\n';
  END LOOP;

  -- Ejecutar consulta de prueba (sin EXPLAIN)
  PERFORM 1
  FROM public.booking_resources br
  WHERE br.resource_id = p_resource_id
    AND br.timespan && tstzrange(p_start_time, p_end_time, '[)');
  
  -- Capturar tiempo de fin
  v_end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    v_plan,
    EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
END;
$$;

-- Otorgar permisos para testing
GRANT EXECUTE ON FUNCTION public.test_gist_index_performance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
-- PASO 7: Comentarios y documentación
-- =====================================================

-- Documentar el propósito de cada índice
COMMENT ON INDEX public.idx_booking_resources_gist IS 
'Índice compuesto GiST para consultas eficientes de disponibilidad por recurso y rango temporal';

COMMENT ON INDEX public.idx_booking_resources_timespan_only IS 
'Índice GiST para consultas de solapamiento temporal sin filtro de recurso';

COMMENT ON CONSTRAINT booking_no_overlap_per_resource ON public.booking_resources IS 
'Previene reservas solapadas del mismo recurso usando exclusión GiST';