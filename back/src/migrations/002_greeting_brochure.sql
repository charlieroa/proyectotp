-- Migración: Agregar saludo personalizado y brochure a tenants
-- Ejecutar contra la BD Neon

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS greeting_message TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brochure_url VARCHAR(500);
