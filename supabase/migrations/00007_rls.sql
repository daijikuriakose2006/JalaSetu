-- Migration 00007: Row Level Security policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE jetties ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================================
-- PROFILES
-- =========================================
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view provider profiles"
  ON profiles FOR SELECT
  USING (role IN ('ship_owner', 'taxi', 'worker'));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Cannot change own role
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    -- Cannot un-suspend self
    AND (NOT suspended OR suspended = (SELECT suspended FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  USING (is_admin());

-- =========================================
-- PREFERRED LOCATIONS
-- =========================================
CREATE POLICY "Users can manage own preferred locations"
  ON preferred_locations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can view all preferred locations"
  ON preferred_locations FOR SELECT
  USING (is_admin());

-- =========================================
-- PASSWORD RESET OTPs (service role only)
-- =========================================
-- No public access policies - handled via service role key on server

-- =========================================
-- JETTIES (public read, admin write)
-- =========================================
CREATE POLICY "Anyone can view active jetties"
  ON jetties FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can view all jetties"
  ON jetties FOR SELECT
  USING (is_admin());

CREATE POLICY "Admin can manage jetties"
  ON jetties FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =========================================
-- WATER EDGES (public read, admin write)
-- =========================================
CREATE POLICY "Anyone can view active water edges"
  ON water_edges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage water edges"
  ON water_edges FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =========================================
-- BOATS
-- =========================================
CREATE POLICY "Owners can manage their boats"
  ON boats FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Anyone can view active boats"
  ON boats FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage all boats"
  ON boats FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =========================================
-- ORDERS
-- =========================================
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own draft/posted orders"
  ON orders FOR UPDATE
  USING (user_id = auth.uid() AND status IN ('draft', 'posted'));

CREATE POLICY "Providers can view orders they have jobs for"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.order_id = orders.id
      AND (
        jobs.assigned_to = auth.uid()
        OR auth.uid() = ANY(jobs.offered_to)
        OR (jobs.status = 'open' AND EXISTS (
          SELECT 1 FROM orders o WHERE o.id = jobs.order_id AND o.status = 'queued'
        ))
      )
    )
  );

CREATE POLICY "Admin can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

CREATE POLICY "Admin can update all orders"
  ON orders FOR UPDATE
  USING (is_admin());

-- =========================================
-- ORDER LEGS
-- =========================================
CREATE POLICY "Users can view legs of their orders"
  ON order_legs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_legs.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view legs of assigned orders"
  ON order_legs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.order_id = order_legs.order_id
      AND (jobs.assigned_to = auth.uid() OR auth.uid() = ANY(jobs.offered_to))
    )
  );

CREATE POLICY "Admin can view all order legs"
  ON order_legs FOR SELECT
  USING (is_admin());

-- =========================================
-- JOBS
-- =========================================
CREATE POLICY "Providers can view jobs offered or assigned to them"
  ON jobs FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR auth.uid() = ANY(offered_to)
    -- Open pool for queued orders matching provider type
    OR (status = 'open' AND EXISTS (
      SELECT 1 FROM orders WHERE orders.id = jobs.order_id AND orders.status = 'queued'
    ))
  );

CREATE POLICY "Job owners can view jobs for their orders"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = jobs.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all jobs"
  ON jobs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =========================================
-- NOTIFICATIONS
-- =========================================
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =========================================
-- LIVE LOCATIONS
-- =========================================
CREATE POLICY "Users can insert/update their own location"
  ON live_locations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Order owners can view locations for their order's jobs"
  ON live_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      JOIN orders ON orders.id = jobs.order_id
      WHERE jobs.id = live_locations.job_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all locations"
  ON live_locations FOR SELECT
  USING (is_admin());

-- =========================================
-- RATINGS
-- =========================================
CREATE POLICY "Users can create ratings for delivered orders"
  ON ratings FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders WHERE orders.id = ratings.order_id AND orders.status = 'delivered'
    )
  );

CREATE POLICY "Users can view ratings involving them"
  ON ratings FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Admin can view all ratings"
  ON ratings FOR SELECT
  USING (is_admin());

-- =========================================
-- RATES (public read, admin write)
-- =========================================
CREATE POLICY "Anyone can view rates"
  ON rates FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage rates"
  ON rates FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =========================================
-- CONTACT MESSAGES
-- =========================================
CREATE POLICY "Anyone can insert contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can view contact messages"
  ON contact_messages FOR SELECT
  USING (is_admin());

CREATE POLICY "Admin can update contact messages"
  ON contact_messages FOR UPDATE
  USING (is_admin());

-- =========================================
-- AUDIT LOG
-- =========================================
CREATE POLICY "Admin can view audit log"
  ON audit_log FOR SELECT
  USING (is_admin());

-- Service role can insert (no policy needed, service role bypasses RLS)

-- =========================================
-- Enable realtime for key tables
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE live_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
