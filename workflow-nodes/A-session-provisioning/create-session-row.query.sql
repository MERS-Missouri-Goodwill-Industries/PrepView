-- Create the row the UI will poll. Written before any slow work starts.
INSERT INTO interview_sessions (
  session_id, participant_name, specialist_email, job_title, job_link,
  nervous_about, focus_area, status, stage
) VALUES (
  trim($$ {{ $json.sessionId }} $$),
  trim($$ {{ $json.participantName }} $$),
  trim($$ {{ $json.specialistEmail }} $$),
  trim($$ {{ $json.jobTitle }} $$),
  trim($$ {{ $json.jobLink }} $$),
  trim($$ {{ $json.nervousAbout }} $$),
  trim($$ {{ $json.focusArea }} $$),
  'provisioning',
  'accepted'
)
ON CONFLICT (session_id) DO NOTHING;