/*
  # Fix infinite recursion in org_members RLS policies

  1. Problem
    - Current RLS policies on org_members table are causing infinite recursion
    - Policies are referencing the same table they're protecting, creating circular dependencies

  2. Solution
    - Drop ALL existing policies on org_members table
    - Create simple, direct policies that don't reference org_members table recursively
    - Use only auth.uid() for user identification without complex joins

  3. Security
    - Users can only access their own membership records
    - Service role can manage all memberships for administrative functions
*/

-- Drop all existing policies on org_members table to eliminate recursion
DROP POLICY IF EXISTS "Org members can manage resources" ON org_members;
DROP POLICY IF EXISTS "Org members can read resources" ON org_members;
DROP POLICY IF EXISTS "Service functions can manage memberships" ON org_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON org_members;
DROP POLICY IF EXISTS "Users can read own membership" ON org_members;
DROP POLICY IF EXISTS "Users can update own membership" ON org_members;
DROP POLICY IF EXISTS "org_members_select_policy" ON org_members;
DROP POLICY IF EXISTS "org_members_insert_policy" ON org_members;
DROP POLICY IF EXISTS "org_members_update_policy" ON org_members;
DROP POLICY IF EXISTS "org_members_delete_policy" ON org_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own memberships"
  ON org_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memberships"
  ON org_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memberships"
  ON org_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON org_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);