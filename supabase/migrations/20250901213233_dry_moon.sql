/*
  # Fix RLS Policies and Views to Resolve Dashboard Loading Issues

  1. Clean up existing problematic RLS policies
  2. Create simple, non-recursive RLS policies for org_members
  3. Update RLS policies for orgs table
  4. Fix v_membership view to prevent infinite recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read own memberships" ON public.org_members;
DROP POLICY IF EXISTS "Users can insert own memberships" ON public.org_members;
DROP POLICY IF EXISTS "Users can update own memberships" ON public.org_members;
DROP POLICY IF EXISTS "Service role full access" ON public.org_members;
DROP POLICY IF EXISTS "Org members can read org" ON public.orgs;
DROP POLICY IF EXISTS "Managers can update org" ON public.orgs;

-- Drop and recreate v_membership view to fix security invoker issue
DROP VIEW IF EXISTS public.v_membership;

-- Create simple, direct RLS policies for org_members
CREATE POLICY "org_members_select_own" ON public.org_members
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "org_members_insert_own" ON public.org_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "org_members_update_own" ON public.org_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "org_members_delete_own" ON public.org_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role policy for administrative operations
CREATE POLICY "org_members_service_role_all" ON public.org_members
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for orgs table
CREATE POLICY "orgs_select_members" ON public.orgs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.org_members om 
    WHERE om.org_id = orgs.id AND om.user_id = auth.uid()
  ));

CREATE POLICY "orgs_update_managers" ON public.orgs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.org_members om 
    WHERE om.org_id = orgs.id AND om.user_id = auth.uid() AND om.role = 'manager'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.org_members om 
    WHERE om.org_id = orgs.id AND om.user_id = auth.uid() AND om.role = 'manager'
  ));

-- Recreate v_membership view with security_invoker = off to prevent recursion
CREATE VIEW public.v_membership 
WITH (security_invoker = off) AS
SELECT 
  org_id,
  user_id,
  role
FROM public.org_members;