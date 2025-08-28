-- Migración para habilitar índice GiST compuesto y restricción EXCLUDE
-- Objetivo: Optimizar consultas de solapamiento de recursos y garantizar integridad de datos

-- 1. Habilitar extensión btree_gist para tipos B-tree en índices GiST
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- 2. Recrear el índice GiST compuesto (eliminar si existe previamente)
DROP INDEX IF EXISTS public.idx_booking_resources_gist;
CREATE INDEX idx_booking_resources_gist
  ON public.booking_resources
  USING GIST (resource_id, timespan);

-- 3. Crear índice adicional para consultas por timespan únicamente (backup)
CREATE INDEX IF NOT EXISTS idx_booking_resources_timespan_gist
  ON public.booking_resources 
  USING GIST (timespan);

-- 4. Añadir restricción EXCLUDE para prevenir solapamientos por recurso
-- Esta restricción garantiza integridad de datos a nivel de BD
ALTER TABLE public.booking_resources 
DROP CONSTRAINT IF EXISTS booking_no_overlap_per_resource;

ALTER TABLE public.booking_resources
ADD CONSTRAINT booking_no_overlap_per_resource
EXCLUDE USING GIST (
  resource_id WITH =,
  timespan WITH &&
) WHERE (timespan IS NOT NULL);

-- 5. Comentarios para documentación
COMMENT ON INDEX public.idx_booking_resources_gist IS 
'Índice GiST compuesto para consultas eficientes de solapamiento por recurso y tiempo';

COMMENT ON CONSTRAINT booking_no_overlap_per_resource ON public.booking_resources IS 
'Previene reservas solapadas para el mismo recurso usando exclusión GiST';

-- 6. Verificación de la instalación (opcional - para logs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    RAISE NOTICE 'btree_gist extension successfully installed';
  ELSE
    RAISE WARNING 'btree_gist extension not found - check installation';
  END IF;
END $$;