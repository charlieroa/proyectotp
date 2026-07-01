-- Coworking / Chair Rental: política de reajuste al bloquear días.
-- false (default) = "saltar": los días bloqueados se reembolsan, el renter paga menos.
-- true            = "reajustar": los días bloqueados NO se reembolsan, paga el mes completo.
-- Run once on production. Reversible: see DOWN section.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rental_readjust_blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- DOWN (rollback manual)
-- ============================================================
-- ALTER TABLE users DROP COLUMN IF EXISTS rental_readjust_blocked;
