ALTER TABLE stylist_services ADD COLUMN IF NOT EXISTS total_completed INTEGER DEFAULT 0;
ALTER TABLE stylist_services ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMPTZ;
