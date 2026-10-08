# Interview Practice AI

> ### Author
>
> **Anmar Mahmod**
> [linkedin.com/in/anmar-m-13b318250](https://www.linkedin.com/in/anmar-m-13b318250/)
>
> Feel free to reach out, whether you have questions about how any of this works, want a hand
> getting it set up in your own environment, or just want to connect. Happy to help.

---

**On-demand AI mock interviews, for the job a person is actually applying to.**

A job seeker fills in a short form about a job they're applying for. About two minutes later the
screen shows a phone number. They call it and have an unscripted spoken interview with an AI playing
the hiring manager **for that specific posting**, built from the real listing, not a generic
template. At the end the AI steps out of character and talks them through how they did. Their job
coach receives an email with the transcript, the feedback the participant heard, and notes to coach
from.

Self-hosted. Your infrastructure, your data, your phone numbers.

---

## Why it exists

Mock interviews are among the highest-value and most staff-expensive things a job coach does, so most
participants get one rehearsal or none. This makes practice unlimited without adding caseload hours.

**The coach still coaches.** The system produces the record they coach *from*.

---

## What it does

```
Form  →  job posting researched  →  bespoke interviewer written  →  phone number
                                                                        ↓
                        coach's inbox  ←  report  ←  spoken feedback  ←  the call
```

- **Specific to the listing.** It reads the actual posting (the software named in it, the shift
  pattern, the pay) and interviews against that. Can't read the page? Paste the description; that
  path is more faithful anyway.
- **Anxiety-lowering by design.** The form asks what the person is nervous about and what they want
  to practice. Both become real interview beats, framed to reduce pressure, and the interviewer
  never reveals it was told.
- **Nudges, not grades.** In character, capped at two per issue, pointing at a gap without
  explaining how to fill it. Nerves, filler and false starts never lower a score.
- **Feedback out loud, then in writing.** The participant hears it; the coach reads the same
  assessment. They cannot diverge, because the report forwards what was said rather than re-scoring.
- **Built for a live audience.** Simultaneous sign-ups get different phone lines, provably. Lines
  return to the pool automatically, and a sweep reclaims any that were never called.

---

## What you need

| | |
|---|---|
| **n8n** | Self-hosted, **publicly reachable over HTTPS**. The voice platform calls back into it |
| **PostgreSQL 12+** | Phone-line allocator, session ledger, research cache |
| **Vapi account** | Phone numbers and voice. One number per concurrent interview |
| **An LLM** | Azure OpenAI in the reference build; any OpenAI-compatible provider works |
| **An email sender** | Outlook OAuth2 in the reference build; SMTP or Gmail is a one-node swap |
| **Node 20+, Python 3.9+** | To build the UI and run the tooling |

Optional: a search API as a research fallback. You probably don't need it; see
[PLAYBOOK.md §4](PLAYBOOK.md#4-build-history-what-was-done-and-why).

---

## Quick start

```bash
git clone <your-repo-url> interview-practice-ai
cd interview-practice-ai
cp .env.example .env

psql -U postgres -d postgres -f db/schema.sql     # 1. database
                                                   # 2. n8n, publicly reachable
                                                   # 3. create 5 credentials by name
                                                   # 4. buy numbers, name them INTERVIEW-01..NN
                                                   # 5. seed the pool
                                                   # 6. import workflows/*.json
                                                   # 7. set YOUR report webhook URL
                                                   # 8. activate both workflows

cd ui && cp .env.example .env.local && npm install && npm run build
python ../tools/serve_ui.py --port 8090
```

**Follow [docs/SETUP.md](docs/SETUP.md) properly**. Each step has a validation check, and step 7 is
the one everyone gets wrong.

---

## Documentation

| Document | Read it when |
|---|---|
| **[PLAYBOOK.md](PLAYBOOK.md)** | **Start here.** Architecture, data flow, security, operations, and the production checklist. Written so someone with zero context can operate or rebuild this |
| [docs/SETUP.md](docs/SETUP.md) | Installing |
| [CLAUDE.md](CLAUDE.md) | You're an AI agent working on this repo, or a developer about to change a workflow |
| [db/schema.sql](db/schema.sql) | Understanding the data model |
| [prompts/architect-system.md](prompts/architect-system.md) | Changing how the interviewer behaves. The highest-leverage file here |

---

## Repository layout

```
PLAYBOOK.md          the master document
CLAUDE.md            instructions for AI coding agents
docs/SETUP.md        step-by-step install
db/schema.sql        three tables, documented inline
workflows/           the two n8n workflows, import-ready
workflow-nodes/      readable mirror of every code node, query and prompt
prompts/             architect, research, draft rubric
ui/                  React intake form
tools/               link checker, invariant checker, static server
```

---

## Before you go to production

The system works end to end as shipped, which is enough for a pilot or a demo. Before real
participants use it, complete these steps as part of setting it up and making it yours. Each one is
explained, with how to do it, in [PLAYBOOK.md §9](PLAYBOOK.md#9-before-you-go-to-production).

**Personalize it**

- **Set your coach roster** in `ui/src/config/coaches.ts`. Reports go wherever that list says.
- **Replace the waiting-screen facts** in `ui/src/config/facts.ts` with sourced facts about your
  organization. Never invent a statistic for a participant-facing screen.
- **Brand the intake form** with your own icons and colors.
- **Send reports from a service mailbox**, not a personal one.

**Decide with your program staff**

- **Adopt a scoring rubric with a job coach.** The draft in `prompts/` marks the six decisions a coach
  should make.
- **Choose a target interview length** and number of questions.
- **Set retention and consent policy** for transcripts and recordings. The engineering default is to
  keep everything forever, and that is the wrong answer.

**Harden it**

- **Protect the public webhooks** with rate limiting, plus signature verification or an IP allowlist
  on the report path.
- **Add a workflow error handler** so a failure reaches the participant as a readable message.
- **Set a secret rotation schedule.**

**Operate it**

- **Back up the database.** Transcripts are the record coaches work from.
- **Tune execution logging** so status polls don't bury real runs.
- **Confirm the schema** against `db/schema.sql` after your first run.
- **Add an end-to-end test.**

---

## License

[MIT](LICENSE). Use it, modify it, deploy it, build on it. Just keep the copyright notice.

---

## Origin

Built for a nonprofit workforce-development program and generalized for reuse. All
organization-specific configuration, branding, contact details and infrastructure identifiers have
been removed; what remains is the system and the lessons learned building it.

The measured facts quoted throughout the documentation (call durations, token counts, latency,
cost per minute) come from real interviews on the reference deployment and are labelled where they
appear.
