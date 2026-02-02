-- Add user_id column to audit_logs table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
