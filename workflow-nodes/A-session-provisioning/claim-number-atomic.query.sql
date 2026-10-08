-- Atomic claim. SKIP LOCKED means a concurrent transaction skips a row
-- another caller is already claiming instead of blocking or stealing it.
UPDATE interview_number_pool p
SET session_id  = '{{ $("Validate Intake").first().json.sessionId }}',
    reserved_at = NOW(),
    released_at = NULL,
    updated_at  = NOW()
FROM (
  SELECT phone_number_id
  FROM interview_number_pool
  WHERE session_id IS NULL
  ORDER BY pool_name
  FOR UPDATE SKIP LOCKED
  LIMIT 1
) AS c
WHERE p.phone_number_id = c.phone_number_id
RETURNING p.phone_number_id, p.phone_number, p.pool_name;