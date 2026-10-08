-- Store a freshly researched report.
-- INSERT ... SELECT ... WHERE makes this a no-op for a cache hit or a
-- caller-provided override, so a hit neither rewrites the row nor destroys the
-- provenance of how the report was originally obtained.
INSERT INTO interview_job_reports (job_key, job_link, job_title, source, report, report_chars)
SELECT
  trim($$ {{ $('Resolve Job Source').first().json.jobKey }} $$),
  trim($$ {{ $('Resolve Job Source').first().json.jobLink }} $$),
  trim($$ {{ $('Resolve Job Source').first().json.jobTitle }} $$),
  trim($$ {{ $json.source }} $$),
  $$ {{ $json.jobReport }} $$,
  {{ $json.reportChars }}
WHERE trim($$ {{ $json.source }} $$) NOT IN ('cache', 'provided')
ON CONFLICT (job_key) DO UPDATE
SET report = EXCLUDED.report,
    report_chars = EXCLUDED.report_chars,
    source = EXCLUDED.source,
    fetched_at = NOW();