/*
# Migración: Habilitar btree_gist y crear índices GiST optimizados

## Cambios realizados:
1. **Extensiones**: Habilita btree_gist para índices GiST sobre UUID
2. **Índices**: Crea índice compuesto optimizado para consultas de disponibilidad
3. **Constraints**: Implementa exclusión de solapamientos por recurso
4. **Seguridad**: Mantiene políticas RLS existentes

## Rendimiento esperado:
- Consultas de disponibilidad: Index Scan en lugar de Seq Scan
- Prevención de conflictos de reservas a nivel de BD
- Soporte para consultas complejas de rango temporal
*/

-- =====================================================
-- PASO 1: Habilitar extensiones necesarias
-- =====================================================

-- Crear esquema para extensiones si no existe (buena práctica en Supabase)
CREATE SCHEMA IF NOT EXISTS extensions;

-- Habilitar btree_gist para índices GiST sobre tipos B-tree (UUID, integers, etc.)
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- Verificar que pgcrypto esté disponible (necesario para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =====================================================
-- PASO 2: Limpiar índices y constraints existentes
-- =====================================================

-- Remover constraint de exclusión si existe (para recrearlo correctamente)
ALTER TABLE public.booking_resources DROP CONSTRAINT IF EXISTS br_no_overlap;
ALTER TABLE public.booking_resources DROP CONSTRAINT IF EXISTS booking_no_overlap_per_resource;

-- Remover índices existentes para recrearlos optimizados
DROP INDEX IF EXISTS public.idx_booking_resources_gist;
DROP INDEX IF EXISTS public.idx_booking_resources_timespan_gist;
DROP INDEX IF EXISTS public.idx_booking_resources_resource_id_btree;

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

-- Índice para consultas de bookings por organización y tiempo
CREATE INDEX IF NOT EXISTS idx_bookings_org_time_range
  ON public.bookings
  USING BTREE (org_id, start_time, end_time)
  WHERE deleted_at IS NULL;

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
BEGIN
  -- Capturar tiempo de inicio
  v_start_time := clock_timestamp();
  
  -- Ejecutar consulta de prueba
  PERFORM 1
  FROM public.booking_resources br
  WHERE br.resource_id = p_resource_id
    AND br.timespan && tstzrange(p_start_time, p_end_time, '[)');
  
  -- Capturar tiempo de fin
  v_end_time := clock_timestamp();
  
  -- Obtener plan de ejecución
  SELECT string_agg(line, E'\n')
  INTO v_plan
  FROM (
    SELECT unnest(
      regexp_split_to_array(
        (EXPLAIN (FORMAT TEXT, ANALYZE false)
         SELECT 1
         FROM public.booking_resources br
         WHERE br.resource_id = p_resource_id
           AND br.timespan && tstzrange(p_start_time, p_end_time, '[)')
        )::text,
        E'\n'
      )
    ) AS line
  ) t;
  
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