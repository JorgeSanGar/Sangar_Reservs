-- =====================================================
-- MIGRACIÓN: Crear índice GiST optimizado
-- =====================================================
-- Propósito: Crear índice GiST compuesto con constraint de exclusión
-- Dependencia: Requiere btree_gist instalado
-- =====================================================

-- Verificar que btree_gist esté instalado antes de proceder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'btree_gist'
  ) THEN
    RAISE EXCEPTION 'La extensión btree_gist no está instalada. Ejecute primero la migración 20250828145000_enable_btree_gist.sql';
  END IF;
END $$;

-- Limpiar índices y constraints existentes
DROP INDEX IF EXISTS public.idx_booking_resources_gist;
DROP INDEX IF EXISTS public.idx_booking_resources_timespan_gist;
DROP INDEX IF EXISTS public.idx_booking_resources_resource_id_btree;
ALTER TABLE public.booking_resources DROP CONSTRAINT IF EXISTS br_no_overlap;
ALTER TABLE public.booking_resources DROP CONSTRAINT IF EXISTS booking_no_overlap_per_resource;

-- =====================================================
-- ÍNDICE PRINCIPAL: GiST compuesto (resource_id, timespan)
-- =====================================================
-- Este índice permite consultas eficientes del tipo:
-- WHERE resource_id = ? AND timespan && tstzrange(...)

CREATE INDEX idx_booking_resources_gist
  ON public.booking_resources
  USING GIST (resource_id, timespan)
  WHERE timespan IS NOT NULL;

-- =====================================================
-- ÍNDICES DE RESPALDO
-- =====================================================

-- Índice para consultas solo por timespan
CREATE INDEX idx_booking_resources_timespan_only
  ON public.booking_resources
  USING GIST (timespan)
  WHERE timespan IS NOT NULL;

-- Índice B-tree para consultas por booking_id
CREATE INDEX IF NOT EXISTS idx_booking_resources_booking_id
  ON public.booking_resources
  USING BTREE (booking_id);

-- =====================================================
-- CONSTRAINT DE EXCLUSIÓN
-- =====================================================
-- Previene reservas solapadas del mismo recurso a nivel de BD

ALTER TABLE public.booking_resources
ADD CONSTRAINT booking_no_overlap_per_resource
EXCLUDE USING GIST (
  resource_id WITH =,
  timespan WITH &&
)
WHERE (timespan IS NOT NULL);

-- =====================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice para consultas de bookings por organización y tiempo
CREATE INDEX IF NOT EXISTS idx_bookings_org_time_range
  ON public.bookings
  USING BTREE (org_id, start_time, end_time)
  WHERE deleted_at IS NULL;

-- Índice para recursos activos por organización
CREATE INDEX IF NOT EXISTS idx_resources_org_active
  ON public.resources
  USING BTREE (org_id, is_active)
  WHERE is_active = true;

-- =====================================================
-- DOCUMENTACIÓN Y COMENTARIOS
-- =====================================================

COMMENT ON INDEX public.idx_booking_resources_gist IS 
'Índice GiST compuesto para consultas eficientes: resource_id = ? AND timespan && tstzrange(...)';

COMMENT ON INDEX public.idx_booking_resources_timespan_only IS 
'Índice GiST para consultas de solapamiento temporal sin filtro de recurso';

COMMENT ON CONSTRAINT booking_no_overlap_per_resource ON public.booking_resources IS 
'Constraint EXCLUDE que previene reservas solapadas del mismo recurso usando GiST';

-- =====================================================
-- FUNCIÓN DE VERIFICACIÓN FINAL
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_gist_setup_complete()
RETURNS TABLE(
  component TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar extensión btree_gist
  RETURN QUERY SELECT 
    'btree_gist_extension'::TEXT,
    CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'btree_gist')
         THEN 'INSTALADO' ELSE 'FALTANTE' END::TEXT,
    'Extensión necesaria para índices GiST con UUID'::TEXT;
  
  -- Verificar índice principal
  RETURN QUERY SELECT 
    'gist_composite_index'::TEXT,
    CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_booking_resources_gist')
         THEN 'CREADO' ELSE 'FALTANTE' END::TEXT,
    'Índice GiST compuesto (resource_id, timespan)'::TEXT;
  
  -- Verificar constraint de exclusión
  RETURN QUERY SELECT 
    'exclusion_constraint'::TEXT,
    CASE WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'booking_no_overlap_per_resource')
         THEN 'ACTIVO' ELSE 'INACTIVO' END::TEXT,
    'Constraint EXCLUDE para prevenir solapamientos'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_gist_setup_complete() TO authenticated;