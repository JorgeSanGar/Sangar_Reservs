/*
  # Habilitar extensión btree_gist y crear índice GiST optimizado

  Este archivo resuelve el problema de creación del índice GiST compuesto
  para optimizar consultas de disponibilidad de recursos con solapamiento de rangos.

  ## Cambios incluidos:
  1. Instalación de extensión btree_gist (requerida para índices GiST con UUID)
  2. Creación de índice GiST compuesto (resource_id, timespan)
  3. Restricción EXCLUDE para prevenir solapamientos por recurso
  4. Índices de respaldo para consultas alternativas

  ## Objetivo:
  - Optimizar consultas: resource_id = ? AND timespan && tstzrange(...)
  - Garantizar integridad: no solapamientos por recurso
  - Mejorar rendimiento de verificación de disponibilidad
*/

-- 1. Habilitar extensión btree_gist (requerida para índices GiST con tipos B-tree)
-- En Supabase, las extensiones suelen ir en el esquema 'extensions'
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- Alternativamente, si ya existe en public:
-- CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Limpiar índices previos que pudieron fallar
DROP INDEX IF EXISTS public.idx_booking_resources_gist;
DROP INDEX IF EXISTS public.idx_booking_resources_timespan_gist;
DROP INDEX IF EXISTS public.idx_booking_resources_resource_id_btree;

-- 3. Crear índice GiST compuesto optimizado (PRINCIPAL)
-- Este índice permite consultas eficientes con resource_id = ? AND timespan && ?
CREATE INDEX idx_booking_resources_gist
  ON public.booking_resources
  USING GIST (resource_id, timespan);

-- 4. Índices de respaldo (por si se prefiere no usar extensiones)
-- Menos óptimo para consultas compuestas, pero válido
CREATE INDEX idx_booking_resources_timespan_gist
  ON public.booking_resources 
  USING GIST (timespan);

CREATE INDEX idx_booking_resources_resource_id_btree
  ON public.booking_resources 
  USING BTREE (resource_id);

-- 5. Restricción EXCLUDE para integridad de datos (CRÍTICO)
-- Previene solapamientos de reservas para el mismo recurso
-- Requiere btree_gist instalada
ALTER TABLE public.booking_resources
DROP CONSTRAINT IF EXISTS booking_no_overlap_per_resource;

ALTER TABLE public.booking_resources
ADD CONSTRAINT booking_no_overlap_per_resource
EXCLUDE USING GIST (
  resource_id WITH =,
  timespan    WITH &&
) WHERE (timespan IS NOT NULL);

-- 6. Comentarios para documentación
COMMENT ON INDEX public.idx_booking_resources_gist IS 
'Índice GiST compuesto para consultas eficientes de disponibilidad por recurso y rango temporal';

COMMENT ON CONSTRAINT booking_no_overlap_per_resource ON public.booking_resources IS 
'Previene reservas solapadas para el mismo recurso usando exclusión GiST';

-- 7. Verificación de la instalación (opcional, para debugging)
-- Verificar que btree_gist está instalada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'btree_gist'
  ) THEN
    RAISE EXCEPTION 'Extension btree_gist is not installed. Please install it first.';
  END IF;
  
  RAISE NOTICE 'btree_gist extension is properly installed';
END $$;