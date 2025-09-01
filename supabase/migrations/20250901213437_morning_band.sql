/*
  # Fix v_membership Dependencies

  This migration resolves the issue where v_membership view cannot be dropped due to dependent RLS policies.
  
  1. Drop dependent RLS policies
  2. Drop v_membership view
  3. Recreate v_membership view with security_invoker = off
  4. Recreate dependent RLS policies
  5. Fix org_members and orgs RLS policies to prevent infinite recursion
*/

-- Step 1: Drop dependent RLS policies
DROP POLICY IF EXISTS "working_hours read access" ON public.working_hours;
DROP POLICY IF EXISTS "working_hours manager insert" ON public.working_hours;
DROP POLICY IF EXISTS "working_hours manager update" ON public.working_hours;
DROP POLICY IF EXISTS "working_hours manager delete" ON public.working_hours;
DROP POLICY IF EXISTS "select_member_access" ON public.duration_stats;
DROP POLICY IF EXISTS "select_member_access" ON public.duration_outliers;

-- Step 2: Drop v_membership view
DROP VIEW IF EXISTS public.v_membership;

-- Step 3: Recreate v_membership view with security_invoker = off
CREATE VIEW public.v_membership 
WITH (security_invoker = off)
AS SELECT 
    org_id,
    user_id,
    role
FROM public.org_members;

-- Step 4: Recreate dependent RLS policies
CREATE POLICY "working_hours read access" ON public.working_hours
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.v_membership vm
            WHERE vm.org_id = working_hours.org_id 
            AND vm.user_id = auth.uid()
        )
    );

CREATE POLICY "working_hours manager insert" ON public.working_hours
    FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.v_membership vm
            WHERE vm.org_id = working_hours.org_id 
            AND vm.user_id = auth.uid() 
            AND vm.role = 'manager'
        )
    );

CREATE POLICY "working_hours manager update" ON public.working_hours
    FOR UPDATE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.v_membership vm
            WHERE vm.org_id = working_hours.org_id 
            AND vm.user_id = auth.uid() 
            AND vm.role = 'manager'
        )
    );

CREATE POLICY "working_hours manager delete" ON public.working_hours
    FOR DELETE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.v_membership vm
            WHERE vm.org_id = working_hours.org_id 
            AND vm.user_id = auth.uid() 
            AND vm.role = 'manager'
        )
    );

CREATE POLICY "select_member_access" ON public.duration_stats
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.v_membership vm
            WHERE vm.user_id = auth.uid() 
            AND vm.org_id = duration_stats.org_id
        )
    );

CREATE POLICY "select_member_access" ON public.duration_outliers
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.v_membership vm
            WHERE vm.user_id = auth.uid() 
            AND vm.org_id = duration_outliers.org_id
        )
    );

-- Step 5: Fix org_members and orgs RLS policies to prevent infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read own memberships" ON public.org_members;
DROP POLICY IF EXISTS "Users can insert own memberships" ON public.org_members;
DROP POLICY IF EXISTS "Users can update own memberships" ON public.org_members;
DROP POLICY IF EXISTS "Service role full access" ON public.org_members;
DROP POLICY IF EXISTS "Org members can read org" ON public.orgs;
DROP POLICY IF EXISTS "Managers can update org" ON public.orgs;

-- Create simple, non-recursive policies for org_members
CREATE POLICY "org_members_select" ON public.org_members
    FOR SELECT
    TO public
    USING (auth.uid() = user_id);

CREATE POLICY "org_members_insert" ON public.org_members
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "org_members_update" ON public.org_members
    FOR UPDATE
    TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "org_members_delete" ON public.org_members
    FOR DELETE
    TO public
    USING (auth.uid() = user_id);

CREATE POLICY "org_members_service_role" ON public.org_members
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create policies for orgs that use the new v_membership view
CREATE POLICY "orgs_select" ON public.orgs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.v_membership vm
            WHERE vm.org_id = orgs.id 
            AND vm.user_id = auth.uid()
        )
    );

CREATE POLICY "orgs_update" ON public.orgs
    FOR UPDATE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.v_membership vm
            WHERE vm.org_id = orgs.id 
            AND vm.user_id = auth.uid() 
            AND vm.role = 'manager'
        )
    );