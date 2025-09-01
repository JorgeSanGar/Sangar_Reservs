```sql
-- Drop existing RLS policies on public.org_members
DROP POLICY IF EXISTS org_members_delete ON public.org_members;
DROP POLICY IF EXISTS org_members_insert ON public.org_members;
DROP POLICY IF EXISTS org_members_select ON public.org_members;
DROP POLICY IF EXISTS org_members_service_role ON public.org_members;
DROP POLICY IF EXISTS org_members_update ON public.org_members;

-- Re-create RLS policies for public.org_members
CREATE POLICY org_members_delete ON public.org_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY org_members_insert ON public.org_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY org_members_select ON public.org_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY org_members_update ON public.org_members FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Add a service_role policy for org_members (if needed for admin operations)
CREATE POLICY org_members_service_role ON public.org_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Drop existing RLS policies on public.orgs
DROP POLICY IF EXISTS orgs_select ON public.orgs;
DROP POLICY IF EXISTS orgs_update ON public.orgs;

-- Re-create RLS policies for public.orgs
CREATE POLICY orgs_select ON public.orgs FOR SELECT USING (EXISTS ( SELECT 1 FROM public.org_members om WHERE (om.org_id = orgs.id AND om.user_id = auth.uid()) ));
CREATE POLICY orgs_update ON public.orgs FOR UPDATE USING (EXISTS ( SELECT 1 FROM public.org_members om WHERE (om.org_id = orgs.id AND om.user_id = auth.uid() AND om.role = 'manager') )) WITH CHECK (EXISTS ( SELECT 1 FROM public.org_members om WHERE (om.org_id = orgs.id AND om.user_id = auth.uid() AND om.role = 'manager') ));

-- Drop and recreate v_membership view with SECURITY DEFINER
DROP VIEW IF EXISTS public.v_membership;
CREATE VIEW public.v_membership WITH (security_invoker = off) AS
SELECT
    om.org_id,
    om.user_id,
    om.role
FROM
    public.org_members om;
```