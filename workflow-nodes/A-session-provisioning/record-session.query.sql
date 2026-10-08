-- Provisioning finished. Attach the assistant to the claim and mark the
-- session ready, which is what the UI's poll is waiting to see.
UPDATE interview_number_pool
SET assistant_id = '{{ $('Vapi - POST Create Assistant').first().json.id }}',
    updated_at = NOW()
WHERE phone_number_id = '{{ $('Check Claim').first().json.phoneNumberId }}';

UPDATE interview_sessions
SET assistant_id    = '{{ $('Vapi - POST Create Assistant').first().json.id }}',
    phone_number    = '{{ $('Check Claim').first().json.phoneNumber }}',
    phone_number_id = '{{ $('Check Claim').first().json.phoneNumberId }}',
    prompt_chars    = {{ $('Build Assistant Body').first().json.promptChars }},
    status          = 'ready',
    stage           = 'ready'
WHERE session_id = trim($$ {{ $('Validate Intake').first().json.sessionId }} $$);