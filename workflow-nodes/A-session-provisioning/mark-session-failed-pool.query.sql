-- No line free. Recorded for the poller instead of returned as a 503,
-- because the HTTP response was already sent.
UPDATE interview_sessions
SET status = 'failed', stage = 'failed',
    error_message = 'All practice lines are busy right now. Please try again in a few minutes.'
WHERE session_id = trim($$ {{ $('Validate Intake').first().json.sessionId }} $$);