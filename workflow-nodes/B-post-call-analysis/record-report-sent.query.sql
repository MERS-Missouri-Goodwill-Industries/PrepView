UPDATE interview_sessions
SET report_sent_at = NOW(),
    status = CASE WHEN status IN ('provisioning','ready','provisioned') THEN 'reported' ELSE status END,
    transcript = $$ {{ $('Prepare Report Inputs').first().json.transcript }} $$,
    duration_seconds = {{ $('Prepare Report Inputs').first().json.durationSeconds }},
    ended_reason = trim($$ {{ $('Prepare Report Inputs').first().json.endedReason }} $$)
WHERE session_id = trim($$ {{ $('Prepare Report Inputs').first().json.sessionId }} $$);