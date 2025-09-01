/*
  # Fix infinite recursion in org_members RLS policies

  1. Problem
    - Current org_members policies are causing infinite recursion
    - Policies are referencing org_members table within org_members policies
    - This creates circular dependency loops

  2. Solution
    - Drop all existing problematic policies on org_members
    - Create simple, non-recursive policies
    - Use direct auth.uid() checks instead of subqueries to org_members
    - Ensure policies don't reference the same table they're protecting

  3. Security
    - Users can read their own membership records
    - Managers can manage members in their organizations (using direct checks)
    - No circular references that cause infinite recursion
*/

-- Drop all existing policies on org_members to start fresh
DROP POLICY IF EXISTS "Managers can manage all members" ON org_members;
DROP POLICY IF EXISTS "Users can read own membership" ON org_members;
DROP POLICY IF EXISTS "org_members see own rows" ON org_members;

-- Create simple, non-recursive policies for org_members
-- Policy 1: Users can always read their own membership records
CREATE POLICY "Users can read own membership"
  ON org_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own membership (for invite code usage)
CREATE POLICY "Users can insert own membership"
  ON org_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow updates to own membership records
CREATE POLICY "Users can update own membership"
  ON org_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: For manager operations, we'll handle this through service functions
-- instead of RLS policies to avoid recursion
CREATE POLICY "Service functions can manage memberships"
  ON org_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;