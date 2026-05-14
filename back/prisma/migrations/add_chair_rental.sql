-- Chair Rental Feature: arriendo de cupos a estilistas con cobro diario por Stripe Connect
-- Run once on production. Reversible: see DOWN section at the bottom.

-- ============================================================
-- TENANTS: configuración del salón como "arrendador"
-- ============================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS chair_rental_enabled          BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rental_block_grace_days       INT         NOT NULL DEFAULT 3;

-- ============================================================
-- USERS: estilistas que arriendan cupo
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS employment_type               VARCHAR(20) NOT NULL DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS monthly_rent_cop              DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS rental_status                 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS rental_stripe_customer_id     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rental_stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rental_past_due_since         TIMESTAMPTZ;

-- Constraints de valores válidos
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_employment_type_check,
  ADD CONSTRAINT users_employment_type_check
    CHECK (employment_type IN ('employee', 'renter'));

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_rental_status_check,
  ADD CONSTRAINT users_rental_status_check
    CHECK (rental_status IS NULL OR rental_status IN ('active', 'past_due', 'blocked'));

-- Si es renter, debe tener tenant_id (a qué salón arrienda)
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_renter_tenant_check,
  ADD CONSTRAINT users_renter_tenant_check
    CHECK (employment_type = 'employee' OR (employment_type = 'renter' AND tenant_id IS NOT NULL));

-- Índice para buscar bloqueos rápido
CREATE INDEX IF NOT EXISTS idx_users_rental_status
  ON users (rental_status)
  WHERE rental_status IS NOT NULL;

-- ============================================================
-- DOWN (rollback manual si hace falta)
-- ============================================================
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_renter_tenant_check;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_rental_status_check;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_employment_type_check;
-- DROP INDEX IF EXISTS idx_users_rental_status;
-- ALTER TABLE users
--   DROP COLUMN IF EXISTS rental_past_due_since,
--   DROP COLUMN IF EXISTS rental_stripe_subscription_id,
--   DROP COLUMN IF EXISTS rental_stripe_customer_id,
--   DROP COLUMN IF EXISTS rental_status,
--   DROP COLUMN IF EXISTS monthly_rent_cop,
--   DROP COLUMN IF EXISTS employment_type;
-- ALTER TABLE tenants
--   DROP COLUMN IF EXISTS rental_block_grace_days,
--   DROP COLUMN IF EXISTS stripe_connect_charges_enabled,
--   DROP COLUMN IF EXISTS stripe_connect_account_id,
--   DROP COLUMN IF EXISTS chair_rental_enabled;
