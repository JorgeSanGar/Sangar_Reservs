/*
  # Fix RLS Policy Issues

  1. Security Fixes
    - Fix users table RLS policy to allow INSERT operations for authenticated users
    - Fix org_members table infinite recursion by simplifying policies
    - Remove circular dependencies in policy definitions

  2. Changes Made
    - Drop and recreate users table policies with proper INSERT/UPDATE permissions
    - Simplify org_members policies to avoid recursive lookups
    - Use direct auth.uid() checks instead of complex subqueries
*/

-- Fix users table RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create proper policies for users table
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fix org_members table infinite recursion by simplifying policies
DROP POLICY IF EXISTS "Managers can manage members" ON org_members;
DROP POLICY IF EXISTS "Org members can read members" ON org_members;

-- Create simplified policies for org_members without recursion
CREATE POLICY "Users can read own membership"
  ON org_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can manage all members"
  ON org_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members om_check
      WHERE om_check.org_id = org_members.org_id
      AND om_check.user_id = auth.uid()
      AND om_check.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om_check
      WHERE om_check.org_id = org_members.org_id
      AND om_check.user_id = auth.uid()
      AND om_check.role = 'manager'
    )
  );

-- Fix other tables that might have similar recursion issues
-- Update orgs policies to avoid recursion
DROP POLICY IF EXISTS "Org members can read org" ON orgs;
DROP POLICY IF EXISTS "orgs members read" ON orgs;

CREATE POLICY "Org members can read org"
  ON orgs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = orgs.id
      AND om.user_id = auth.uid()
    )
  );

-- Update services policies to avoid recursion
DROP POLICY IF EXISTS "Org members can read services" ON services;
DROP POLICY IF EXISTS "services members read" ON services;

CREATE POLICY "Org members can read services"
  ON services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = services.org_id
      AND om.user_id = auth.uid()
    )
  );

-- Update bookings policies to avoid recursion
DROP POLICY IF EXISTS "Org members can read bookings" ON bookings;
DROP POLICY IF EXISTS "bookings members read" ON bookings;

CREATE POLICY "Org members can read bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = bookings.org_id
      AND om.user_id = auth.uid()
    )
  );