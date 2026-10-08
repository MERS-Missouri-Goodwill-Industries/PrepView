-- Free the pool row for a session whose call has ended.
UPDATE interview_number_pool
SET session_id = NULL, assistant_id = NULL, released_at = NOW(), updated_at = NOW()
WHERE assistant_id = '{{ $('Find Bound Number').first().json.assistantId }}'
   OR phone_number_id = '{{ $('Find Bound Number').first().json.phoneNumberId }}';

UPDATE interview_sessions
SET status = 'completed', call_ended_at = NOW(), released_at = NOW(),
    ended_reason = $$ {{ $('Capture Raw Payload').first().json.probe.endedReason }} $$
WHERE assistant_id = '{{ $('Find Bound Number').first().json.assistantId }}';