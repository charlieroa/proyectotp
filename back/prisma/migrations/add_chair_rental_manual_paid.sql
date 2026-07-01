-- Coworking: días marcados como pagados manualmente (override sin tocar la tarjeta).
-- Cuando el cobro diario falla por falta de fondos y el dueño cobró por otro medio
-- (efectivo o un cobro extra), marca el día como pagado. Array JSON de objetos:
-- [{ "date":"YYYY-MM-DD", "amount_cop":40000, "note":"efectivo", "marked_by":"<uuid>", "at":"<iso>" }]
ALTER TABLE users ADD COLUMN IF NOT EXISTS rental_manual_paid_days JSONB DEFAULT '[]'::jsonb;
