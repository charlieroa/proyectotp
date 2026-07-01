-- Integración Facturación Electrónica vía API de Bolti (DIAN, Colombia).
-- Tupelukeria llama a https://bolti.co/api/public/v1/invoices con la API key del
-- salón para emitir la FE al cobrar. Estas columnas se leen/escriben con SQL crudo
-- ($queryRaw/$executeRaw) para no tener que regenerar el cliente Prisma.

-- Config por salón (credenciales de la API de Bolti).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bolti_fe_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bolti_api_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bolti_api_url TEXT;  -- override; si null usa el default global

-- Documento del cliente registrado (para identificar al adquiriente en la FE).
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_type VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);

-- Datos fiscales y resultado de la emisión en cada factura.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_document_type VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_document_number VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cufe VARCHAR(120);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dian_status VARCHAR(30);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bolti_invoice_id VARCHAR(60);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bolti_invoice_number VARCHAR(60);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fe_error TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fe_attempted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_dian_status ON invoices(tenant_id, dian_status);
