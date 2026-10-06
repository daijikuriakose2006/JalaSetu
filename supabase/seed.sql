-- Seed Script for JalaSetu
-- Run this after all migrations
-- This seeds: admin account, demo users, Kerala jetties, water edges, rates

-- =============================================
-- 1. RATES (pricing and CO2 factors)
-- =============================================
INSERT INTO rates (category, key, value, unit, description) VALUES
  -- Taxi rates (per km, base fare in INR)
  ('taxi', 'taxi_base_fare_auto', 30, 'INR', 'Base fare for auto-rickshaw'),
  ('taxi', 'taxi_per_km_auto', 12, 'INR/km', 'Per km rate for auto-rickshaw'),
  ('taxi', 'taxi_base_fare_pickup', 50, 'INR', 'Base fare for pickup truck'),
  ('taxi', 'taxi_per_km_pickup', 18, 'INR/km', 'Per km rate for pickup truck'),
  ('taxi', 'taxi_base_fare_mini_truck', 80, 'INR', 'Base fare for mini truck'),
  ('taxi', 'taxi_per_km_mini_truck', 25, 'INR/km', 'Per km rate for mini truck'),
  ('taxi', 'taxi_base_fare_truck', 150, 'INR', 'Base fare for truck'),
  ('taxi', 'taxi_per_km_truck', 35, 'INR/km', 'Per km rate for truck'),
  ('taxi', 'taxi_base_fare_trailer', 250, 'INR', 'Base fare for trailer'),
  ('taxi', 'taxi_per_km_trailer', 45, 'INR/km', 'Per km rate for trailer'),
  
  -- Water transport rates
  ('water', 'water_cost_per_tonne_km', 3.5, 'INR/tonne-km', 'Water transport cost per tonne per km'),
  ('water', 'water_loading_charge_per_tonne', 150, 'INR/tonne', 'Loading/unloading charge per tonne'),
  
  -- Road transport rates (for comparison)
  ('road', 'road_cost_per_tonne_km', 6.0, 'INR/tonne-km', 'Road transport cost per tonne per km (truck)'),
  
  -- CO2 emission factors
  ('co2', 'co2_road_per_tonne_km', 0.062, 'kg CO2/tonne-km', 'CO2 emissions for road transport'),
  ('co2', 'co2_water_per_tonne_km', 0.016, 'kg CO2/tonne-km', 'CO2 emissions for water transport'),
  ('co2', 'co2_taxi_per_km', 0.12, 'kg CO2/km', 'CO2 emissions for taxi/truck per km')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- =============================================
-- 2. KERALA JETTIES (15 real jetties with approximate coordinates)
-- Coordinates looked up via Nominatim, flagged as approximate
-- =============================================
INSERT INTO jetties (name, geog, district, is_active, is_approximate, has_loading_facility) VALUES
  ('Ernakulam Boat Jetty', ST_GeogFromText('POINT(76.2673 9.9687)'), 'Ernakulam', true, true, true),
  ('Fort Kochi Jetty', ST_GeogFromText('POINT(76.2432 9.9639)'), 'Ernakulam', true, true, true),
  ('Willingdon Island Jetty', ST_GeogFromText('POINT(76.2714 9.9498)'), 'Ernakulam', true, true, true),
  ('Vypin Jetty', ST_GeogFromText('POINT(76.2331 10.0014)'), 'Ernakulam', true, true, false),
  ('Bolgatty Jetty', ST_GeogFromText('POINT(76.2583 9.9833)'), 'Ernakulam', true, true, false),
  ('Vaikom Jetty', ST_GeogFromText('POINT(76.3940 9.7480)'), 'Kottayam', true, true, true),
  ('Kumarakom Jetty', ST_GeogFromText('POINT(76.4274 9.5894)'), 'Kottayam', true, true, false),
  ('Muhamma Jetty', ST_GeogFromText('POINT(76.3682 9.4752)'), 'Alappuzha', true, true, false),
  ('Alappuzha Boat Jetty', ST_GeogFromText('POINT(76.3380 9.4901)'), 'Alappuzha', true, true, true),
  ('Thottappally Jetty', ST_GeogFromText('POINT(76.2680 9.3481)'), 'Alappuzha', true, true, false),
  ('Changanassery Jetty', ST_GeogFromText('POINT(76.5361 9.4441)'), 'Kottayam', true, true, false),
  ('Thanneermukkom Jetty', ST_GeogFromText('POINT(76.3621 9.6201)'), 'Alappuzha', true, true, true),
  ('Kottayam Jetty', ST_GeogFromText('POINT(76.5222 9.5916)'), 'Kottayam', true, true, true),
  ('Kollam Boat Jetty', ST_GeogFromText('POINT(76.5883 8.8832)'), 'Kollam', true, true, true),
  ('Nedumudi Jetty', ST_GeogFromText('POINT(76.4156 9.4574)'), 'Alappuzha', true, true, false)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 3. WATER EDGES (Kerala backwater connections)
-- Bidirectional edges for the waterway graph
-- =============================================
-- Using CTEs to reference jetties by name
DO $$
DECLARE
  j_ernakulam UUID;
  j_fort_kochi UUID;
  j_willingdon UUID;
  j_vypin UUID;
  j_bolgatty UUID;
  j_vaikom UUID;
  j_kumarakom UUID;
  j_muhamma UUID;
  j_alappuzha UUID;
  j_thottappally UUID;
  j_changanassery UUID;
  j_thanneermukkom UUID;
  j_kottayam UUID;
  j_kollam UUID;
  j_nedumudi UUID;
BEGIN
  SELECT id INTO j_ernakulam FROM jetties WHERE name = 'Ernakulam Boat Jetty';
  SELECT id INTO j_fort_kochi FROM jetties WHERE name = 'Fort Kochi Jetty';
  SELECT id INTO j_willingdon FROM jetties WHERE name = 'Willingdon Island Jetty';
  SELECT id INTO j_vypin FROM jetties WHERE name = 'Vypin Jetty';
  SELECT id INTO j_bolgatty FROM jetties WHERE name = 'Bolgatty Jetty';
  SELECT id INTO j_vaikom FROM jetties WHERE name = 'Vaikom Jetty';
  SELECT id INTO j_kumarakom FROM jetties WHERE name = 'Kumarakom Jetty';
  SELECT id INTO j_muhamma FROM jetties WHERE name = 'Muhamma Jetty';
  SELECT id INTO j_alappuzha FROM jetties WHERE name = 'Alappuzha Boat Jetty';
  SELECT id INTO j_thottappally FROM jetties WHERE name = 'Thottappally Jetty';
  SELECT id INTO j_changanassery FROM jetties WHERE name = 'Changanassery Jetty';
  SELECT id INTO j_thanneermukkom FROM jetties WHERE name = 'Thanneermukkom Jetty';
  SELECT id INTO j_kottayam FROM jetties WHERE name = 'Kottayam Jetty';
  SELECT id INTO j_kollam FROM jetties WHERE name = 'Kollam Boat Jetty';
  SELECT id INTO j_nedumudi FROM jetties WHERE name = 'Nedumudi Jetty';

  -- Kochi harbour area (short connections, higher speed)
  INSERT INTO water_edges (from_jetty_id, to_jetty_id, distance_km, avg_speed_kmph, waterway_name) VALUES
    (j_ernakulam, j_fort_kochi, 3.5, 12, 'Kochi Harbour'),
    (j_fort_kochi, j_ernakulam, 3.5, 12, 'Kochi Harbour'),
    (j_ernakulam, j_willingdon, 2.5, 12, 'Kochi Harbour'),
    (j_willingdon, j_ernakulam, 2.5, 12, 'Kochi Harbour'),
    (j_ernakulam, j_vypin, 4.0, 10, 'Kochi Harbour'),
    (j_vypin, j_ernakulam, 4.0, 10, 'Kochi Harbour'),
    (j_ernakulam, j_bolgatty, 1.5, 12, 'Kochi Harbour'),
    (j_bolgatty, j_ernakulam, 1.5, 12, 'Kochi Harbour'),
    (j_willingdon, j_fort_kochi, 2.0, 12, 'Kochi Harbour'),
    (j_fort_kochi, j_willingdon, 2.0, 12, 'Kochi Harbour'),
    (j_bolgatty, j_vypin, 3.0, 10, 'Kochi Harbour'),
    (j_vypin, j_bolgatty, 3.0, 10, 'Kochi Harbour')
  ON CONFLICT (from_jetty_id, to_jetty_id) DO NOTHING;

  -- Main backwater route: Kochi -> Vaikom -> Kumarakom -> Alappuzha
  INSERT INTO water_edges (from_jetty_id, to_jetty_id, distance_km, avg_speed_kmph, waterway_name) VALUES
    -- Ernakulam -> Vaikom (via Vembanad Lake)
    (j_ernakulam, j_vaikom, 32, 10, 'Vembanad Lake'),
    (j_vaikom, j_ernakulam, 32, 10, 'Vembanad Lake'),
    -- Vaikom -> Thanneermukkom
    (j_vaikom, j_thanneermukkom, 18, 10, 'Vembanad Lake'),
    (j_thanneermukkom, j_vaikom, 18, 10, 'Vembanad Lake'),
    -- Thanneermukkom -> Kumarakom
    (j_thanneermukkom, j_kumarakom, 8, 10, 'Vembanad Lake'),
    (j_kumarakom, j_thanneermukkom, 8, 10, 'Vembanad Lake'),
    -- Kumarakom -> Muhamma
    (j_kumarakom, j_muhamma, 14, 8, 'Vembanad Lake - South'),
    (j_muhamma, j_kumarakom, 14, 8, 'Vembanad Lake - South'),
    -- Muhamma -> Alappuzha
    (j_muhamma, j_alappuzha, 8, 10, 'Alappuzha Backwaters'),
    (j_alappuzha, j_muhamma, 8, 10, 'Alappuzha Backwaters'),
    -- Muhamma -> Nedumudi
    (j_muhamma, j_nedumudi, 6, 8, 'Alappuzha Backwaters'),
    (j_nedumudi, j_muhamma, 6, 8, 'Alappuzha Backwaters'),
    -- Nedumudi -> Alappuzha
    (j_nedumudi, j_alappuzha, 12, 8, 'Alappuzha Backwaters'),
    (j_alappuzha, j_nedumudi, 12, 8, 'Alappuzha Backwaters'),
    -- Alappuzha -> Thottappally (coastal)
    (j_alappuzha, j_thottappally, 22, 8, 'West Coast Canal'),
    (j_thottappally, j_alappuzha, 22, 8, 'West Coast Canal'),
    -- Kottayam connections
    (j_kumarakom, j_kottayam, 14, 8, 'Meenachil River'),
    (j_kottayam, j_kumarakom, 14, 8, 'Meenachil River'),
    (j_changanassery, j_kottayam, 18, 8, 'Meenachil River'),
    (j_kottayam, j_changanassery, 18, 8, 'Meenachil River'),
    -- Direct Ernakulam -> Thanneermukkom (across Vembanad)
    (j_ernakulam, j_thanneermukkom, 42, 10, 'Vembanad Lake'),
    (j_thanneermukkom, j_ernakulam, 42, 10, 'Vembanad Lake'),
    -- Direct Ernakulam -> Kumarakom
    (j_ernakulam, j_kumarakom, 52, 10, 'Vembanad Lake'),
    (j_kumarakom, j_ernakulam, 52, 10, 'Vembanad Lake'),
    -- Thottappally -> Kollam (long route)
    (j_thottappally, j_kollam, 65, 8, 'West Coast Canal'),
    (j_kollam, j_thottappally, 65, 8, 'West Coast Canal'),
    -- Willingdon -> Vaikom (cargo route)
    (j_willingdon, j_vaikom, 30, 10, 'Vembanad Lake'),
    (j_vaikom, j_willingdon, 30, 10, 'Vembanad Lake')
  ON CONFLICT (from_jetty_id, to_jetty_id) DO NOTHING;
END $$;

-- =============================================
-- 4. NOTE: Admin and demo users
-- These are created via the signup API or Supabase Auth admin API.
-- See the seed script in scripts/seed-users.ts
-- 
-- Admin:  admin@jalasetu.in / Admin@123
-- User:   user@jalasetu.in / User@123
-- Ship:   ship@jalasetu.in / Ship@123
-- Taxi:   taxi@jalasetu.in / Taxi@123
-- Worker: worker@jalasetu.in / Worker@123
-- =============================================
