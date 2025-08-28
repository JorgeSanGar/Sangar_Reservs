-- =====================================================
-- MIGRACIÓN: Habilitar extensión btree_gist
-- =====================================================
-- Propósito: Instalar btree_gist para permitir índices GiST 
--           sobre tipos B-tree como UUID
-- Autor: DBA PostgreSQL
-- Fecha: 2025-08-28
-- =====================================================

-- Crear esquema para extensiones (buena práctica en Supabase)
CREATE SCHEMA IF NOT EXISTS extensions;

-- Habilitar btree_gist para índices GiST sobre tipos B-tree (UUID, integers, etc.)
-- Esta extensión es CRÍTICA para poder crear índices GiST compuestos con UUID
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- Verificar que pgcrypto esté disponible (necesario para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Función de verificación para confirmar que las extensiones están instaladas
CREATE OR REPLACE FUNCTION public.verify_extensions_installed()
RETURNS TABLE(
  extension_name TEXT,
  installed BOOLEAN,
  schema_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ext.extname::TEXT,
    true::BOOLEAN,
    nsp.nspname::TEXT
  FROM pg_extension ext
  JOIN pg_namespace nsp ON ext.extnamespace = nsp.oid
  WHERE ext.extname IN ('btree_gist', 'pgcrypto')
  ORDER BY ext.extname;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.verify_extensions_installed() TO authenticated;

-- Comentario de documentación
COMMENT ON FUNCTION public.verify_extensions_installed() IS 
'Verifica que las extensiones btree_gist y pgcrypto estén correctamente instaladas';