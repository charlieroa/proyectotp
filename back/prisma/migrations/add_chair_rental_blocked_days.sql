-- Coworking / Chair Rental: días bloqueados por renter (no se cobra ese día).
-- Guardado como arreglo JSON de strings "YYYY-MM-DD" (zona Bogotá).
-- Run once on production. Reversible: see DOWN section.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rental_blocked_days JSONB;

-- ============================================================
-- DOWN (rollback manual)
-- ============================================================
-- ALTER TABLE users DROP COLUMN IF EXISTS rental_blocked_days;
