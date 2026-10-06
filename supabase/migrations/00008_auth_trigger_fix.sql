-- Migration 00008: Auth trigger robustness & profiles INSERT RLS policy

-- 1. Ensure INSERT policy exists on public.profiles
DROP POLICY IF EXISTS "Allow system and users to insert profiles" ON public.profiles;
CREATE POLICY "Allow system and users to insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- 2. Robust handle_new_user function handling nulls and type conversions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'user';
  v_vehicle vehicle_type := NULL;
  v_capacity NUMERIC := NULL;
BEGIN
  -- Parse role safely
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL AND NEW.raw_user_meta_data->>'role' != '' THEN
    BEGIN
      v_role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'user';
    END;
  END IF;

  -- Parse vehicle_type safely
  IF NEW.raw_user_meta_data->>'vehicle_type' IS NOT NULL AND NEW.raw_user_meta_data->>'vehicle_type' != '' THEN
    BEGIN
      v_vehicle := (NEW.raw_user_meta_data->>'vehicle_type')::vehicle_type;
    EXCEPTION WHEN OTHERS THEN
      v_vehicle := NULL;
    END;
  END IF;

  -- Parse capacity safely
  IF NEW.raw_user_meta_data->>'capacity_t' IS NOT NULL AND NEW.raw_user_meta_data->>'capacity_t' != '' THEN
    BEGIN
      v_capacity := (NEW.raw_user_meta_data->>'capacity_t')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      v_capacity := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, vehicle_type, capacity_t)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    v_vehicle,
    v_capacity
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    vehicle_type = EXCLUDED.vehicle_type,
    capacity_t = EXCLUDED.capacity_t;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback so auth signup never fails
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
