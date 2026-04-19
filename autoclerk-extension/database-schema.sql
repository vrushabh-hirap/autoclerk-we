-- AutoClerk Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the required tables

-- ===== Main Error Logs Table =====
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(255) NOT NULL,
  check_number INT NOT NULL DEFAULT 1,
  section VARCHAR(100) NOT NULL,
  error_type VARCHAR(100) NOT NULL,
  field_name VARCHAR(100),
  error_description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  form_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_student ON error_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_check_number ON error_logs(student_id, check_number);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_section ON error_logs(section);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- ===== Row Level Security =====
-- Enable RLS (recommended for production)
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow insert from anonymous key (the extension uses anon key)
CREATE POLICY "Allow anonymous insert" ON error_logs
  FOR INSERT WITH CHECK (true);

-- Policy: Allow select (for check number lookup)
CREATE POLICY "Allow anonymous select" ON error_logs
  FOR SELECT USING (true);

-- ===== Helpful Views =====

-- Summary per student per check
CREATE OR REPLACE VIEW check_summaries AS
SELECT
  student_id,
  check_number,
  COUNT(*) AS total_errors,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
  COUNT(*) FILTER (WHERE severity = 'warning') AS warning_count,
  COUNT(*) FILTER (WHERE severity = 'info') AS info_count,
  COUNT(*) FILTER (WHERE resolved = true) AS resolved_count,
  MIN(created_at) AS first_logged_at,
  MAX(created_at) AS last_logged_at
FROM error_logs
GROUP BY student_id, check_number
ORDER BY student_id, check_number DESC;

-- Most common errors across all students
CREATE OR REPLACE VIEW common_errors AS
SELECT
  section,
  error_type,
  field_name,
  error_description,
  severity,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT student_id) AS affected_students
FROM error_logs
GROUP BY section, error_type, field_name, error_description, severity
ORDER BY occurrence_count DESC;

-- ===== Sample Queries =====

-- Get all errors for a student
-- SELECT * FROM error_logs WHERE student_id = 'your_student_id' ORDER BY created_at DESC;

-- Get latest check errors for a student
-- SELECT * FROM error_logs WHERE student_id = 'your_student_id' AND check_number = (
--   SELECT MAX(check_number) FROM error_logs WHERE student_id = 'your_student_id'
-- );

-- Get check history summary
-- SELECT * FROM check_summaries WHERE student_id = 'your_student_id';

-- Mark errors as resolved
-- UPDATE error_logs SET resolved = true, resolved_at = NOW()
-- WHERE student_id = 'your_student_id' AND check_number = 1;
