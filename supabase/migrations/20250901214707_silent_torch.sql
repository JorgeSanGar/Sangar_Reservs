/*
  # Fix RLS Policies and Views to Resolve Dashboard Loading Issues

  This migration addresses the dashboard loading problem by:
  1. Dropping and recreating problematic RLS policies on org_members and orgs tables
  2. Fixing the v_membership view to prevent infinite recursion
  3. Ensuring users can properly access their organization data after authentication

  ## Changes Made:
  1. **org_members table**: Simple RLS policies allowing users to manage only their own membership records
  2. **orgs table**: Policies allowing users to access organizations they belong to
  3. **v_membership view**: Made SECURITY DEFINER to prevent recursion issues
*/

-- Drop existing problematic RLS policies on org_members
DROP POLICY IF EXISTS "org_members_delete" ON public.org_members;
DROP POLICY IF EXISTS "org_members_insert" ON public.org_members;
DROP POLICY IF EXISTS "org_members_select" ON public.org_members;
DROP POLICY IF EXISTS "org_members_service_role" ON public.org_members;
DROP POLICY IF EXISTS "org_members_update" ON public.org_members;

-- Drop existing problematic RLS policies on orgs
DROP POLICY IF EXISTS "orgs_select" ON public.orgs;
DROP POLICY IF EXISTS "orgs_update" ON public.orgs;

-- Create simple and direct RLS policies for org_members
CREATE POLICY "org_members_select" ON public.org_members
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "org_members_insert" ON public.org_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "org_members_update" ON public.org_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "org_members_delete" ON public.org_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role policy for org_members (for system operations)
CREATE POLICY "org_members_service_role" ON public.org_members
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for orgs table
CREATE POLICY "orgs_select" ON public.orgs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om 
      WHERE om.org_id = orgs.id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "orgs_update" ON public.orgs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om 
      WHERE om.org_id = orgs.id AND om.user_id = auth.uid() AND om.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om 
      WHERE om.org_id = orgs.id AND om.user_id = auth.uid() AND om.role = 'manager'
    )
  );

-- Drop and recreate v_membership view as SECURITY DEFINER to prevent recursion
DROP VIEW IF EXISTS public.v_membership CASCADE;

CREATE VIEW public.v_membership 
WITH (security_invoker = off) AS
SELECT 
  om.org_id,
  om.user_id,
  om.role
FROM public.org_members om;

-- Grant necessary permissions on the view
GRANT SELECT ON public.v_membership TO authenticated;
GRANT SELECT ON public.v_membership TO service_role;