-- Migration: Multi-Sede (Shared Stylists), Tips, Super Calendar
-- Date: 2026-02-24

-- 1. Toggle de estilistas compartidos en tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shared_stylists_enabled BOOLEAN DEFAULT false;

-- 2. Porcentaje de propina para el salón (configurable, default 10%)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tip_salon_percent DECIMAL(5,2) DEFAULT 10.00;

-- 3. Tabla de asignación de estilistas a sedes (multi-sede)
CREATE TABLE IF NOT EXISTS stylist_branch_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stylist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stylist_id, branch_tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_sba_stylist ON stylist_branch_assignments(stylist_id);
CREATE INDEX IF NOT EXISTS idx_sba_branch ON stylist_branch_assignments(branch_tenant_id);

-- 4. Campo de propina en invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10,2) DEFAULT 0;

-- 5. Color de sede para el supercalendario
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS branch_color VARCHAR(7) DEFAULT '#3788d8';

-- 6. Parent tenant para multi-sede (jerarquía de sedes)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id);
