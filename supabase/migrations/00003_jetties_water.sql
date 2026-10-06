-- Migration 00003: Jetties and water edges (Kerala waterway graph)

-- Jetties table
CREATE TABLE jetties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  geog GEOGRAPHY(POINT, 4326) NOT NULL,
  district TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_approximate BOOLEAN NOT NULL DEFAULT true,
  has_loading_facility BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jetties_geog ON jetties USING GIST(geog);
CREATE INDEX idx_jetties_active ON jetties(is_active) WHERE is_active = true;

CREATE TRIGGER jetties_updated_at
  BEFORE UPDATE ON jetties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Water edges (graph of waterway connections between jetties)
CREATE TABLE water_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_jetty_id UUID NOT NULL REFERENCES jetties(id) ON DELETE CASCADE,
  to_jetty_id UUID NOT NULL REFERENCES jetties(id) ON DELETE CASCADE,
  distance_km NUMERIC(10,2) NOT NULL,
  avg_speed_kmph NUMERIC(5,2) NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  waterway_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_loop CHECK (from_jetty_id != to_jetty_id),
  CONSTRAINT unique_edge UNIQUE (from_jetty_id, to_jetty_id)
);

CREATE INDEX idx_water_edges_from ON water_edges(from_jetty_id) WHERE is_active = true;
CREATE INDEX idx_water_edges_to ON water_edges(to_jetty_id) WHERE is_active = true;

CREATE TRIGGER water_edges_updated_at
  BEFORE UPDATE ON water_edges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Boats table
CREATE TABLE boats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity_t NUMERIC(10,2) NOT NULL,
  cargo_types TEXT[] NOT NULL DEFAULT '{}',
  home_jetty_id UUID REFERENCES jetties(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  registration_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_boats_owner ON boats(owner_id);
CREATE INDEX idx_boats_home_jetty ON boats(home_jetty_id);

CREATE TRIGGER boats_updated_at
  BEFORE UPDATE ON boats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
