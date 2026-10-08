-- Serve a recent report for this listing if we already have one.
UPDATE interview_job_reports
SET hit_count = hit_count + 1
WHERE job_key = trim($$ {{ $json.jobKey }} $$)
  AND fetched_at > NOW() - INTERVAL '30 days'
RETURNING report AS "cachedReport", source AS "cachedSource", report_chars AS "cachedChars";