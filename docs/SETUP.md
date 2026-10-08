# Setup guide

From nothing to a working mock-interview system. Allow **two to four hours** for a first install,
most of which is waiting on account signups and OAuth consent screens.

**Order matters.** Every step ends with a check. Do not continue past a failed check. Later failures
are much harder to diagnose than the one in front of you.

---

## 0. Prerequisites

### Accounts you need

| Service | What for | Notes |
|---|---|---|
| **Vapi** | Phone numbers, speech, call orchestration | Paid. You buy one number per concurrent interview |
| **An LLM provider** | Research, prompt generation, feedback extraction | Reference build uses Azure OpenAI. Any OpenAI-compatible provider works with a node swap |
| **An email sender** | Delivering coach reports | Reference build uses Microsoft Outlook OAuth2. SMTP or Gmail is a one-node change |
| **Perplexity** | *Optional* research fallback | Skip it. The primary path measured better |

### Software

- **n8n**: self-hosted, **publicly reachable over HTTPS**. See step 2; this is the step people get wrong.
- **PostgreSQL 12+**: reachable from the n8n container.
- **Node.js 20+** and **npm**: to build the intake UI.
- **Python 3.9+**: for the tools in `tools/`. Standard library only, nothing to install.

### Understand this before you start

**Vapi calls your webhook from their servers.** A `localhost` or LAN address for the report webhook
means every call works perfectly and no report ever arrives, silently. If you have no public
endpoint yet, solve that first: a reverse proxy with a real DNS name and TLS, a Cloudflare Tunnel,
or ngrok for testing.

```bash
cp .env.example .env     # fill this in as you go
```

---

## 1. Database

Create a database and apply the schema.

```bash
psql -U postgres -d postgres -f db/schema.sql
```

Read `db/schema.sql` before running it. It explains each table and **its header is honest that the
DDL was reconstructed** from the queries the workflows execute rather than dumped from a live
database. Every column is real; types are a best reconstruction.

Leave the seed block at the bottom commented out; you will fill it in at step 5, once your phone
numbers exist.

> **Check:** `\dt interview_*` lists `interview_job_reports`, `interview_number_pool`,
> `interview_sessions`.

---

## 2. n8n, publicly reachable

Stand up n8n however you prefer (Docker is typical), then put a public HTTPS endpoint in front of it.

Record in `.env`: `N8N_BASE_URL`, `N8N_API_BASE_URL`, and an API key from **Settings → API**.

> **Check (do this from outside your network)**, on a phone with Wi-Fi off:
> ```bash
> curl -I https://n8n.example.org/
> ```
> A valid certificate and a response. **If this fails, stop.** Nothing downstream will work and the
> failure will present as "calls work but no reports arrive," which is far harder to diagnose here.

---

## 3. n8n credentials

Create these in **Credentials → New**, with **exactly these names**. The imported workflows reference
credentials by name; a mismatch surfaces as "credential not found" on the first run.

| Type | Name | Holds |
|---|---|---|
| Header Auth (Bearer) | `Vapi API (Interview Practice)` | Your Vapi **private** key |
| Postgres | `Postgres - Interview Practice` | Host/port/db/user/password from step 1 |
| Azure OpenAI | `Azure Open AI account` | Endpoint + key + deployment |
| Microsoft Outlook OAuth2 | `Microsoft Outlook account` | Interactive browser consent required |
| Perplexity | `Perplexity API (Interview Practice)` | *Optional* |

Notes that save time:

- The Vapi **private** key, not the public one. The public key is browser-only and cannot read or
  write assistant configs.
- Postgres host is what **the n8n container** sees. If Postgres is a sibling container, that is the
  service name (`postgres`, not `localhost`).
- The Azure endpoint is `https://<resource>.openai.azure.com` with **no path appended**.
- **The email credential needs an interactive browser login as the sending account.** It cannot be
  created through the API. Use a **service mailbox**, not a personal one. Every coach report will
  carry that sender.

> **Check:** each credential saves without error. The Postgres one has a working "Test" button;
> use it.

---

## 4. Provision phone numbers in Vapi

**This is your concurrency ceiling.** One number = one simultaneous interview. Three to five is
sensible; five is what the reference deployment ran.

```bash
curl -X POST "https://api.vapi.ai/phone-number" \
  -H "Authorization: Bearer $VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider":"vapi","name":"INTERVIEW-01","numberDesiredAreaCode":"314"}'
```

Repeat for `INTERVIEW-02`, `-03`, … Use your own area code.

> **The `INTERVIEW-NN` name is load-bearing, not cosmetic.** Every teardown path refuses to unbind a
> number whose name does not match `^INTERVIEW-\d+$`. That is what stops this system from ever
> touching a production line in the same Vapi account. Do not rename them.

`numberDesiredAreaCode` works but is absent from the API reference page.

> **Check:** numbers come back `status: "activating"`. Wait, then confirm **`active`**:
> ```bash
> curl -s -H "Authorization: Bearer $VAPI_API_KEY" "https://api.vapi.ai/phone-number?limit=100"
> ```

---

## 5. Seed the pool

Take each number's `id` and `number` from that response and fill in the seed block at the bottom of
`db/schema.sql`, then run it.

> **Check:** every row free.
> ```sql
> SELECT pool_name, phone_number,
>        CASE WHEN session_id IS NULL THEN 'free' ELSE 'in use' END AS state
> FROM interview_number_pool ORDER BY pool_name;
> ```

---

## 6. Import the workflows

In n8n: **Workflows → Import from File**, once for each file in `workflows/`.

- `A-session-provisioning.json`: 36 nodes
- `B-post-call-analysis.json`: 29 nodes

Credential IDs were stripped on purpose so n8n matches by **name** against what you created in
step 3. Open a couple of credential-bearing nodes and confirm they resolved.

Record both workflow IDs (visible in the editor URL) into `.env`.

> **Check:** both import with no missing-credential warnings and the node counts above.

---

## 7. Set the report webhook URL (the step people miss)

Open **Workflow A → `Build Assistant Body`** and find:

```js
server: {
  url: 'https://n8n.example.org/webhook/interview-report',
  timeoutSeconds: 30
},
```

Replace it with **your** public URL. This is stamped onto every assistant as the address Vapi posts
the end-of-call report to.

> **Check:** the URL is `https://`, publicly resolvable, and matches Workflow B's
> `interview-report` webhook path. Paste it into a browser from outside your network. A 404 from
> n8n is fine and proves reachability; a DNS failure or timeout is not.

---

## 8. Activate

Activate both workflows. **After any later structural change, deactivate and reactivate**. A `PUT`
through the API does not re-register triggers, and a schedule trigger added that way silently never
fires.

> **Check:**
> ```bash
> # expect 400 with a readable JSON body -- validation is alive
> curl -s -o /dev/null -w "%{http_code}\n" -X POST \
>   https://n8n.example.org/webhook/interview-provision \
>   -H "Content-Type: application/json" -d '{}'
>
> # expect 200
> curl -s -o /dev/null -w "%{http_code}\n" \
>   "https://n8n.example.org/webhook/interview-status?sessionId=probe"
> ```

---

## 9. The intake UI

```bash
cd ui
cp .env.example .env.local      # set your two webhook URLs
npm install
npm run build
```

**Before any real participant uses this**, edit two files. Both ship as placeholders on purpose:

- **`src/config/coaches.ts`**: who receives the reports. Wrong address means a participant's
  interview analysis goes to the wrong person. Either edit the file or set `VITE_COACHES` to keep
  real addresses out of version control. While placeholders are in use the UI says so on screen.
- **`src/config/facts.ts`**: the waiting-screen facts. **Every one must be sourced.** Never invent a
  statistic for a participant-facing screen; if a figure is computed rather than published, say so.

Branding: `index.html` ships with the icon tags commented out and no logo files, deliberately: an
unbranded tab beats someone else's logo. Add your icons to `ui/public/` and uncomment.

Serve it with any web server, or use the bundled one:

```bash
python tools/serve_ui.py --port 8090
python tools/serve_ui.py --check     # exits 0 if healthy
```

`tools/serve_ui.cmd` wraps it in a supervising restart loop for running as a Windows service.

> **Check:** the form loads, and the built bundle contains your webhook URLs:
> ```bash
> grep -o "https://[a-z0-9.-]*/webhook/[a-z-]*" ui/dist/assets/*.js | sort -u
> ```

---

## 10. One real end-to-end run: the only step that proves anything

Steps 1–9 can all pass while the report webhook is unreachable and no report ever arrives.

1. Open the form. Submit with a **real job posting URL**. Check it first:
   ```bash
   python tools/check_job_url.py "https://example.com/careers/the-job"
   ```
   `GOOD` means the system can read it. `FAIL` or `THIN` means use the paste field instead; that
   path is more faithful anyway, and immune to bot-blocking.
2. Watch the progress bar. **Expect 90–140 seconds.** The architect step is the slow one.
3. Call the number. Listen for: no dead air after you say you're ready; questions clearly about
   *that* posting; your stated focus area probed **without the interviewer revealing it was told**.
4. Let it reach the spoken feedback. Hang up.
5. Confirm the coach email arrives, with transcript and feedback.

> **Check:** the line returns to the pool.
> ```sql
> SELECT count(*) FILTER (WHERE session_id IS NULL) AS free FROM interview_number_pool;
> ```

---

## 11. Verify the install

```bash
python tools/deployed.py check     # mirror diff + locked invariants
python tools/serve_ui.py --check   # UI health
```

`deployed.py check` asserts the three locked invariants in [PLAYBOOK.md §2.5](../PLAYBOOK.md#25-locked-invariants).
Run it before any demo and after any workflow edit.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Call works, **no coach email** | Report webhook not publicly reachable | Re-do step 7's check from outside your network |
| "Credential not found" | Name mismatch with step 3 | Names must match exactly |
| Provisioning hangs at 5 min | A node threw; session stuck at `provisioning` | n8n → Executions for the real error. The error handler in PLAYBOOK §9 (item 9) surfaces it to the participant |
| "All practice lines are busy" | Pool genuinely exhausted | Expected at capacity. Buy more numbers and add rows |
| Interview is generic | Job page unreadable | `check_job_url.py`, then use the paste field |
| Schedule trigger never fires | Workflow updated without reactivating | Deactivate, then activate |
| Python dies reading a transcript | Windows cp1252 default | `open(path, encoding='utf-8')` |

---

## Before you go to production

Complete these as part of setting the system up and making it yours. Each one is explained in
[PLAYBOOK.md §9](../PLAYBOOK.md#9-before-you-go-to-production).

**Personalize it**

- [ ] Coach roster set; the placeholder warning is gone
- [ ] Waiting-screen facts replaced with **sourced** facts about your organization
- [ ] Intake form branded with your icons and colors
- [ ] Reports sending from a **service mailbox**

**Decide with your program staff**

- [ ] A job coach has worked through `prompts/rubric-DRAFT-for-coach-review.md`
- [ ] Target interview length and question count chosen and written into the architect prompt
- [ ] Retention and consent policy decided and implemented

**Harden it**

- [ ] Public webhooks rate-limited, and the report webhook verified or allowlisted
- [ ] Workflow error handler in place
- [ ] Secret rotation schedule set

**Operate it**

- [ ] Database backups scheduled
- [ ] Execution logging tuned for the status poll
- [ ] Schema confirmed with `pg_dump --schema-only` after the first run
- [ ] End-to-end test scripted
