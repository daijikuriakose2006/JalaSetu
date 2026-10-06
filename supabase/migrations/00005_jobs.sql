-- Migration 00005: Jobs (matching and dispatch)

CREATE TYPE job_type AS ENUM ('ship', 'taxi', 'load', 'unload');
CREATE TYPE job_status AS ENUM ('open', 'assigned', 'active', 'done', 'cancelled');

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  leg_id UUID REFERENCES order_legs(id) ON DELETE SET NULL,
  type job_type NOT NULL,
  status job_status NOT NULL DEFAULT 'open',
  
  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  boat_id UUID REFERENCES boats(id),
  offered_to UUID[] NOT NULL DEFAULT '{}',
  
  -- Matching parameters
  radius_km NUMERIC(10,2) NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ,
  notify_at TIMESTAMPTZ,
  
  -- Location for matching
  location_geog GEOGRAPHY(POINT, 4326),
  jetty_id UUID REFERENCES jetties(id),
  
  -- Payout
  estimated_payout NUMERIC(10,2),
  
  -- Status tracking
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_order ON jobs(order_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_assigned ON jobs(assigned_to);
CREATE INDEX idx_jobs_type_status ON jobs(type, status);
CREATE INDEX idx_jobs_notify_at ON jobs(notify_at) WHERE status = 'open';
CREATE INDEX idx_jobs_expires_at ON jobs(expires_at) WHERE status = 'open';
CREATE INDEX idx_jobs_location ON jobs USING GIST(location_geog);

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Atomic claim function (the core of matching)
CREATE OR REPLACE FUNCTION claim_job(p_job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE jobs
  SET 
    assigned_to = auth.uid(),
    status = 'assigned',
    updated_at = now(),
    status_history = status_history || jsonb_build_array(jsonb_build_object(
      'status', 'assigned',
      'at', now()::TEXT,
      'by', auth.uid()::TEXT
    ))
  WHERE id = p_job_id
    AND status = 'open'
    AND (
      -- Either user is in offered_to list, or job is open pool (queued order)
      auth.uid() = ANY(offered_to) 
      OR array_length(offered_to, 1) IS NULL 
      OR EXISTS (
        SELECT 1 FROM orders WHERE orders.id = jobs.order_id AND orders.status = 'queued'
      )
    );
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
