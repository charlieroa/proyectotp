-- Coworking / Chair Rental: marca de la última notificación de mora enviada por
-- WhatsApp al renter. Se usa para NO reenviar el aviso de mora en cada reintento
-- de cobro de Stripe: máximo una vez por día (zona Bogotá).
-- Run once on production. Reversible: see DOWN section.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rental_last_dunning_at TIMESTAMPTZ;

-- ============================================================
-- DOWN (rollback manual)
-- ============================================================
-- ALTER TABLE users DROP COLUMN IF EXISTS rental_last_dunning_at;
