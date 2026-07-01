-- Coworking / Chair Rental: teléfono del administrador del salón al que el bot
-- avisa cuando un renter responde con dudas/problemas de pago y quiere hablar con
-- un humano (tool contactar_administrador en whatsappStylistController.js).
-- Guardado en internacional sin '+', p.ej. "573044180748".
-- Run once on production. Reversible: see DOWN section.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS rental_admin_phone VARCHAR(50);

-- ============================================================
-- DOWN (rollback manual)
-- ============================================================
-- ALTER TABLE tenants DROP COLUMN IF EXISTS rental_admin_phone;
