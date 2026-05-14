-- Enable per-service price override at checkout (Admin-controlled salon setting)

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS price_override_enabled BOOLEAN NOT NULL DEFAULT false;

-- Audit columns for overridden service prices in the invoice
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS original_unit_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS override_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS overridden_by_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_overridden
  ON invoice_items (overridden_by_user_id)
  WHERE overridden_by_user_id IS NOT NULL;
