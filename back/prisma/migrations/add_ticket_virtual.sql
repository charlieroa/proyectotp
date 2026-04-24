-- Ticket Virtual: la invoice abierta actua como "ticket" que se va llenando de items
-- y al cerrarse se cobra.

-- 1. Feature flag por tenant (el dueno lo activa en ajustes)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ticket_virtual_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Permitir invoices con client_id nulo (walk-in sin cuenta creada)
ALTER TABLE invoices
  ALTER COLUMN client_id DROP NOT NULL;

-- 3. total_amount con default 0 para poder abrir el ticket sin items
ALTER TABLE invoices
  ALTER COLUMN total_amount SET DEFAULT 0;

-- 4. Campos nuevos para soportar el flujo de ticket virtual
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS appointment_id    UUID REFERENCES appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opened_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS client_name_adhoc VARCHAR(255),
  ADD COLUMN IF NOT EXISTS closed_at         TIMESTAMPTZ;

-- 5. Indices para listar tickets abiertos rapido
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status
  ON invoices (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_appointment
  ON invoices (appointment_id)
  WHERE appointment_id IS NOT NULL;
