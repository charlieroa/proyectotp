-- Add audit fields to cash_movements for tracking edits
ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS edited_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2);
