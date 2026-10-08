-- ============================================================================
-- Interview Practice AI -- database schema
--
-- Target: PostgreSQL 12 or newer. Nothing here is Supabase-specific; the
-- reference deployment happened to use the Postgres inside a Supabase stack,
-- but plain Postgres is fine and is what most installs should use.
--
-- Apply with:
--     psql -U postgres -d postgres -f db/schema.sql
--
-- Safe to re-run. Every statement is IF NOT EXISTS or ON CONFLICT guarded.
--
-- ---------------------------------------------------------------------------
-- PROVENANCE -- READ THIS
--
-- This DDL was RECONSTRUCTED from the SQL the deployed workflows actually
-- execute, not dumped from a live database (the reference instance was not
-- reachable at packaging time). Every column below is referenced by a real
-- query in workflows/ or workflow-nodes/. Column TYPES and the exact index
-- set are the author's best reconstruction and may differ in width or
-- nullability from the original.
--
-- It is correct enough to run the system. If you later want a byte-exact
-- comparison, run `pg_dump --schema-only` after your first successful
-- session and diff it against this file.
-- ---------------------------------------------------------------------------

BEGIN;

-- ============================================================================
-- 1. interview_number_pool -- the atomic phone-line allocator
--
-- This table is the reason concurrent sign-ups work. Vapi offers no
-- conditional "bind this number only if free" operation, so the mutual
-- exclusion has to live here. `session_id IS NULL` means the line is free.
--
-- Seed it with ONE ROW PER PHONE NUMBER you have provisioned in Vapi, and
-- nothing else. The workflows can only ever bind numbers listed here, which is
-- what structurally prevents them from grabbing a production line that happens
-- to be unbound at that moment.
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_number_pool (
    -- Vapi's phone-number id. Natural primary key: it is what the API binds.
    phone_number_id TEXT PRIMARY KEY,

    -- Must match ^INTERVIEW-\d+$ . The teardown and sweep code treats this
    -- name as a hard ownership gate before it will ever unbind a number.
    pool_name       TEXT        NOT NULL UNIQUE,

    -- E.164, e.g. +13145550100. Shown to the participant.
    phone_number    TEXT        NOT NULL,

    -- NULL = free. Non-NULL = claimed by that session.
    session_id      UUID,

    -- The Vapi assistant currently bound to this number, once created.
    assistant_id    TEXT,

    -- Optional operational note ('active', 'quarantined', ...). Not read by
    -- the workflows; present for humans triaging a line that misbehaves.
    status          TEXT        NOT NULL DEFAULT 'active',

    reserved_at     TIMESTAMPTZ,
    released_at     TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The claim query is:
--   SELECT phone_number_id FROM interview_number_pool
--   WHERE session_id IS NULL ORDER BY pool_name
--   FOR UPDATE SKIP LOCKED LIMIT 1
-- A partial index on the free rows keeps that O(1)-ish as the table grows.
CREATE INDEX IF NOT EXISTS idx_pool_free
    ON interview_number_pool (pool_name)
    WHERE session_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pool_assistant
    ON interview_number_pool (assistant_id);


-- ============================================================================
-- 2. interview_sessions -- one row per provisioned session
--
-- Also the mechanism that makes asynchronous provisioning possible. The row is
-- written BEFORE any slow work starts so the browser has something to poll;
-- the status endpoint reads `status` and `stage` from here.
--
--   status : provisioning -> ready -> completed | reported | released | swept
--            or 'failed' with error_message set
--   stage  : accepted -> researching -> writing_interviewer -> reserving_line
--            -> ready   (or 'failed')
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_sessions (
    session_id       UUID PRIMARY KEY,

    -- From the intake form.
    participant_name TEXT,
    specialist_email      TEXT,
    job_title        TEXT,
    job_link         TEXT,
    nervous_about    TEXT,
    focus_area       TEXT,

    -- Drives the UI poll. See the state machine above.
    status           TEXT        NOT NULL DEFAULT 'provisioning',
    stage            TEXT        NOT NULL DEFAULT 'accepted',
    error_message    TEXT,

    -- Filled in once provisioning succeeds.
    assistant_id     TEXT,
    phone_number     TEXT,
    phone_number_id  TEXT,
    prompt_chars     INTEGER,

    -- Filled in after the call, by the post-call workflow.
    transcript       TEXT,
    duration_seconds INTEGER,
    ended_reason     TEXT,
    report_sent_at   TIMESTAMPTZ,
    released_at      TIMESTAMPTZ,

    provisioned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The post-call workflow finds the session by the assistant that just hung up.
CREATE INDEX IF NOT EXISTS idx_sessions_assistant
    ON interview_sessions (assistant_id);

-- The sweep scans for sessions still open past the stale threshold.
CREATE INDEX IF NOT EXISTS idx_sessions_status_time
    ON interview_sessions (status, provisioned_at DESC);


-- ============================================================================
-- 3. interview_job_reports -- the job-research cache
--
-- OPTIONAL FOR CORRECTNESS, VALUABLE IN PRACTICE. Drop it and the system still
-- works, just ~20s slower per repeat listing and exposed again to the research
-- provider's rate limit.
--
--   job_key : normalised URL (host without www, no scheme, no trailing slash)
--             or 'desc:<hash>:<length>' for a pasted description
--             or a lowercased bare job title
--   source  : page-fetch | pasted | perplexity | cache | provided
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_job_reports (
    job_key      TEXT PRIMARY KEY,
    job_link     TEXT,
    job_title    TEXT,

    -- Provenance of how this report was obtained. Deliberately preserved
    -- across cache hits so you can always tell how a report was built.
    source       TEXT,

    report       TEXT        NOT NULL,
    report_chars INTEGER,

    -- Incremented on every cache hit. Useful for spotting the listing everyone
    -- is practising against before an event.
    hit_count    INTEGER     NOT NULL DEFAULT 0,

    fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cache lookups are keyed and age-bounded: WHERE job_key = $1 AND fetched_at > NOW() - INTERVAL '30 days'
CREATE INDEX IF NOT EXISTS idx_reports_fetched
    ON interview_job_reports (fetched_at DESC);

COMMIT;


-- ============================================================================
-- SEED THE PHONE POOL
--
-- ** EDIT THIS BEFORE RUNNING. ** Replace the example rows with the numbers you
-- actually provisioned in Vapi (see docs/SETUP.md step 4). The values come
-- straight from the Vapi API response when you create each number.
--
-- Rules that are not negotiable:
--   - pool_name MUST match ^INTERVIEW-\d+$ . The teardown code refuses to
--     unbind anything whose name does not match, which is what stops it from
--     ever touching a production line in the same Vapi account.
--   - Put ONLY numbers dedicated to this system in this table.
--   - The number of rows here is your hard concurrency ceiling. A sixth
--     simultaneous participant on a five-row pool gets a readable
--     "all practice lines are busy" message, not a failure.
-- ============================================================================

-- INSERT INTO interview_number_pool (phone_number_id, pool_name, phone_number) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'INTERVIEW-01', '+13145550101'),
--   ('00000000-0000-0000-0000-000000000002', 'INTERVIEW-02', '+13145550102'),
--   ('00000000-0000-0000-0000-000000000003', 'INTERVIEW-03', '+13145550103'),
--   ('00000000-0000-0000-0000-000000000004', 'INTERVIEW-04', '+13145550104'),
--   ('00000000-0000-0000-0000-000000000005', 'INTERVIEW-05', '+13145550105')
-- ON CONFLICT (phone_number_id) DO NOTHING;


-- ============================================================================
-- VERIFY
-- ============================================================================
-- Expect three tables:
--     \dt interview_*
--
-- Expect one row per provisioned number, all free:
--     SELECT pool_name, phone_number,
--            CASE WHEN session_id IS NULL THEN 'free' ELSE 'in use' END AS state
--     FROM interview_number_pool ORDER BY pool_name;
--
-- Prove the atomic claim works (should return exactly one row, then zero on a
-- second concurrent run inside an open transaction):
--     BEGIN;
--     SELECT pool_name FROM interview_number_pool
--     WHERE session_id IS NULL ORDER BY pool_name
--     FOR UPDATE SKIP LOCKED LIMIT 1;
--     ROLLBACK;
