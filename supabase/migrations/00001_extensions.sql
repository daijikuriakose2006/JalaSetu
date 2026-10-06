-- Migration 00001: Enable required extensions
-- Run this in Supabase SQL editor or via migration

-- PostGIS for geography columns
CREATE EXTENSION IF NOT EXISTS postgis;

-- pgcrypto for hashing OTPs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_cron for scheduled tasks (enable in Supabase dashboard > Database > Extensions)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- pg_net for HTTP requests from Postgres (enable in Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
