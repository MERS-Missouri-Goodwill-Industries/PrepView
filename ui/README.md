# Intake UI

The participant-facing form for Interview Practice AI. A Vite + React 18 + TypeScript + Tailwind +
shadcn/ui single-page app. Static once built — no server-side code, no runtime dependencies beyond a
web server that can serve files.

See [../PLAYBOOK.md](../PLAYBOOK.md) for how this fits the wider system, and
[../docs/SETUP.md](../docs/SETUP.md) step 9 for install.

---

## Develop

```bash
cp .env.example .env.local     # point at your n8n webhooks
npm install
npm run dev                    # http://localhost:8080
```

## Build and serve

```bash
npm run build                  # -> dist/
python ../tools/serve_ui.py --port 8090
python ../tools/serve_ui.py --check      # exits 0 if healthy
```

`tools/serve_ui.py` is a dependency-free static server with single-page-app fallback, `no-store` on
`index.html` (a rebuild changes the hashed asset names inside it, and a stale copy points at files
that no longer exist), and a one-shot health probe. `tools/serve_ui.cmd` wraps it in a supervising
restart loop for running as a Windows service.

Any web server works. If you use your own, replicate two things: rewrite unknown paths to
`index.html`, and do not cache `index.html`.

---

## Configuration

All of it is **build-time**. Vite inlines `VITE_*` variables into the bundle, so changing one
requires `npm run build`, not just a restart.

| Variable | Purpose |
|---|---|
| `VITE_PROVISION_WEBHOOK_URL` | POST target. Must be the production `/webhook/` path — `/webhook-test/` only answers while an n8n editor tab is open |
| `VITE_STATUS_WEBHOOK_URL` | Polled every 3s during provisioning |
| `VITE_COACHES` | JSON array of `{name, email, location?}`. Overrides `src/config/coaches.ts` |

### Two files you must edit before real use

- **`src/config/coaches.ts`** — who receives each interview report. Ships as placeholders, and the UI
  displays an on-screen warning while they are in use. A dropdown rather than a free-text email
  field is deliberate: no typos, and the list stays under your control.
- **`src/config/facts.ts`** — the facts shown while the participant waits. **Every one must be
  sourced.** Never invent a statistic for a participant-facing screen; if a figure is computed rather
  than published, say so in the source line.

### Branding

`index.html` ships with the icon tags commented out and no logo files — an unbranded tab beats
shipping someone else's logo. Drop your icons into `public/`, uncomment the tags, and set
`theme-color`.

---

## How the flow works

Five one-question screens → review → provisioning progress → the phone number.

```
name → coach → job (URL or pasted description) → nervous about → focus area
    → review → POST (202) → poll every 3s → phone number
```

`src/hooks/useIntakeForm.ts` holds all state, validation and the submit. Two behaviours there are
not obvious and are load-bearing:

- **Provisioning is asynchronous.** The POST returns `202` in about 0.3s with a `sessionId`; the
  phone number arrives by polling. Provisioning takes 90–140 seconds, which is longer than many
  proxies will hold a request open — a synchronous design produced successful sessions that the
  browser displayed as errors.
- **A failed individual poll is ignored**, not treated as the end of the wait. One transient blip
  must not kill a session that is provisioning fine.

`src/components/ProvisioningProgress.tsx` eases the bar toward the next milestone over each stage's
measured duration, so it never looks hung during the slow prompt-generation step. The stages come
from the server, not from a timer.

### Job input: URL *or* pasted description

Validation is either/or — a valid URL, or a description of at least 120 characters. **A paste beats
a link** and is offered as a first-class option rather than a fallback: many postings cannot be read
from their URL at all (sites that block automation, postings behind a login, roles only ever emailed
to the applicant). A paste also skips the fetch entirely.

If both are supplied, the description wins; the link is still carried through for the record.

Check a URL before relying on it:

```bash
python ../tools/check_job_url.py "https://example.com/careers/the-job"
```
