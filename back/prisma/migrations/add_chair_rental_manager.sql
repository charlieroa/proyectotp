-- Coworking / Chair Rental: encargado exclusivo de coworking por tenant.
-- Si está seteado, SOLO ese usuario (además del Super Admin rol 5) puede ver
-- y gestionar el coworking del tenant; los demás admins/owners quedan fuera.
-- Si es NULL, aplica la regla general (roles 1/2/5).
-- Run once on production. Reversible: see DOWN section.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS chair_rental_manager_user_id UUID;

-- ============================================================
-- DOWN (rollback manual)
-- ============================================================
-- ALTER TABLE tenants DROP COLUMN IF EXISTS chair_rental_manager_user_id;
