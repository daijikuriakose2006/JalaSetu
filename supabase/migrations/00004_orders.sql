-- Migration 00004: Orders and order legs

-- Order status enum
CREATE TYPE order_status AS ENUM (
  'draft', 'posted', 'matched', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'queued'
);

-- Leg type enum
CREATE TYPE leg_type AS ENUM ('road_origin', 'water', 'road_destination');

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'draft',
  
  -- Cargo details
  cargo_name TEXT NOT NULL,
  cargo_description TEXT,
  weight_tonnes NUMERIC(10,2) NOT NULL,
  needs_loading_unloading BOOLEAN NOT NULL DEFAULT false,
  
  -- Pickup / delivery
  pickup_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_immediate BOOLEAN NOT NULL DEFAULT true,
  
  -- Origin
  origin_address TEXT NOT NULL,
  origin_geog GEOGRAPHY(POINT, 4326) NOT NULL,
  origin_jetty_id UUID REFERENCES jetties(id),
  
  -- Destination
  destination_address TEXT NOT NULL,
  destination_geog GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_jetty_id UUID REFERENCES jetties(id),
  
  -- Route comparison
  road_distance_km NUMERIC(10,2),
  road_duration_min NUMERIC(10,2),
  road_cost NUMERIC(10,2),
  road_co2_kg NUMERIC(10,2),
  water_distance_km NUMERIC(10,2),
  water_duration_min NUMERIC(10,2),
  water_cost NUMERIC(10,2),
  water_co2_kg NUMERIC(10,2),
  
  -- Gemini explanation
  comparison_explanation TEXT,
  
  -- Recommended vehicles
  recommended_origin_vehicle vehicle_type,
  recommended_dest_vehicle vehicle_type,
  recommended_boat_type TEXT,
  
  -- Chat history
  chat_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Timestamps
  matched_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pickup_time ON orders(pickup_time);
CREATE INDEX idx_orders_origin_geog ON orders USING GIST(origin_geog);
CREATE INDEX idx_orders_dest_geog ON orders USING GIST(destination_geog);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Order legs table
CREATE TABLE order_legs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  leg_type leg_type NOT NULL,
  sequence_num INT NOT NULL,
  
  -- Points
  from_address TEXT,
  from_geog GEOGRAPHY(POINT, 4326),
  from_jetty_id UUID REFERENCES jetties(id),
  to_address TEXT,
  to_geog GEOGRAPHY(POINT, 4326),
  to_jetty_id UUID REFERENCES jetties(id),
  
  -- Route details
  distance_km NUMERIC(10,2),
  duration_min NUMERIC(10,2),
  cost NUMERIC(10,2),
  co2_kg NUMERIC(10,2),
  
  -- Route geometry (for drawing on map)
  route_geometry JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_legs_order ON order_legs(order_id);
