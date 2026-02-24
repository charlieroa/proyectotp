-- Migration: Super Admin + Global OpenAI API Key + Token Tracking
-- Run on VPS PostgreSQL

-- 1. New role: superadmin
INSERT INTO roles (id, name) VALUES (5, 'superadmin') ON CONFLICT DO NOTHING;

-- 2. Global settings table (for OpenAI API key, etc.)
CREATE TABLE IF NOT EXISTS global_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO global_settings (key, value) VALUES ('openai_api_key', NULL) ON CONFLICT DO NOTHING;

-- 3. Token usage tracking table
CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    call_type VARCHAR(30) NOT NULL,  -- 'chat', 'whisper', 'tts'
    model VARCHAR(50),
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_token_usage_tenant ON token_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_tenant_date ON token_usage(tenant_id, created_at);

-- 4. Payment plan column on tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_plan VARCHAR(30) DEFAULT 'free';

-- 5. Copy existing per-tenant API key to global settings (pick the first non-null one)
UPDATE global_settings SET value = (
    SELECT openai_api_key FROM tenants WHERE openai_api_key IS NOT NULL LIMIT 1
), updated_at = NOW() WHERE key = 'openai_api_key';

-- 6. Create super admin user (run from Node.js to bcrypt the password)
-- Example:
--   INSERT INTO users (tenant_id, role_id, first_name, last_name, email, password_hash)
--   VALUES (NULL, 5, 'Super', 'Admin', 'superadmin@tupelukeria.com', '<bcrypt_hash>');
