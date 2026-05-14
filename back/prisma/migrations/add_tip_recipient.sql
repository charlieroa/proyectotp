-- Permitir designar la propina a un estilista especifico (en vez de repartir
-- entre todos los sellers de la factura). Si esta NULL, la propina se reparte
-- equitativamente entre los estilistas que tengan items de servicio.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS tip_recipient_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_invoices_tip_recipient
  ON invoices (tip_recipient_user_id)
  WHERE tip_recipient_user_id IS NOT NULL;
