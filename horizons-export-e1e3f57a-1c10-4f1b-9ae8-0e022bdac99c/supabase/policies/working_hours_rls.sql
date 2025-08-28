-- Helper view for membership and roles
CREATE OR REPLACE VIEW public.v_membership AS
SELECT org_id, user_id, role FROM public.org_members;

-- Enable RLS on working_hours table
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

-- Policies for working_hours
DROP POLICY IF EXISTS "Allow read access to organization members" ON public.working_hours;
CREATE POLICY "Allow read access to organization members"
ON public.working_hours FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.v_membership vm
    WHERE vm.org_id = public.working_hours.org_id
    AND vm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow managers to insert working hours" ON public.working_hours;
CREATE POLICY "Allow managers to insert working hours"
ON public.working_hours FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.v_membership vm
    WHERE vm.org_id = public.working_hours.org_id
    AND vm.user_id = auth.uid()
    AND vm.role = 'manager'
  )
);

DROP POLICY IF EXISTS "Allow managers to update working hours" ON public.working_hours;
CREATE POLICY "Allow managers to update working hours"
ON public.working_hours FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.v_membership vm
    WHERE vm.org_id = public.working_hours.org_id
    AND vm.user_id = auth.uid()
    AND vm.role = 'manager'
  )
);

DROP POLICY IF EXISTS "Allow managers to delete working hours" ON public.working_hours;
CREATE POLICY "Allow managers to delete working hours"
ON public.working_hours FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.v_membership vm
    WHERE vm.org_id = public.working_hours.org_id
    AND vm.user_id = auth.uid()
    AND vm.role = 'manager'
  )
);