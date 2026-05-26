-- Migration: expose lat/lng on milestones via generated columns
-- Phase 3 Task 2 — Web Mercator overworld + MapLibre marker placement need
-- to read milestone coordinates back from the PostGIS `location` geography
-- column. Generated columns avoid every client-side parse of WKT/GeoJSON.

ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS lat double precision
    GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
  ADD COLUMN IF NOT EXISTS lng double precision
    GENERATED ALWAYS AS (ST_X(location::geometry)) STORED;

CREATE INDEX IF NOT EXISTS idx_milestones_lat
  ON public.milestones (lat)
  WHERE lat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_lng
  ON public.milestones (lng)
  WHERE lng IS NOT NULL;
