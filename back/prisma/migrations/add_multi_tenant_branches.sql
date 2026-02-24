-- Multi-negocio: Add branch support to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'peluqueria';
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id);
