# CLAUDE.md: Interview Practice AI

Instructions for any AI coding agent working in this repository.

**Read [PLAYBOOK.md](PLAYBOOK.md) first.** It is the authoritative description of the system. This
file adds only what an agent needs in order to change things safely, plus the gotchas that have
already cost someone a day.

---

## 1. What this is, in one paragraph

An on-demand AI mock-interview system. A job seeker fills in a short web form about a job they are
applying for; about two minutes later the screen shows a phone number; they call it and have an
unscripted spoken interview with an AI playing the hiring manager **for that specific posting**; at
the end the AI flips into a coach voice and talks them through how they did; their employment specialist receives
an emailed report. Two n8n workflows, a Postgres database, the Vapi voice platform, an LLM, and a
static React form. There is no application server.

Two facts drive every design decision:

- **The employment specialist is the customer for the report.** A score on its own is not the deliverable. The report
  has to be useful to a human sitting down with the participant afterwards.
- **The participant experience must be frictionless.** Form → phone number → call. No accounts, no
  app, no install.

---

## 2. Hard constraints

- **Never inline an API key.** Not in a workflow body, not in an expression, not in a header
  parameter, not in a file. n8n's credential store only, referenced by name. If you find an inlined
  key, report it rather than use it.
- **Never unbind a phone number whose name is not `INTERVIEW-NN`.** The same Vapi account may hold
  production lines: alerting, support, anything. Every unbind path is gated on that name pattern.
  Keep it that way, in code and by hand.
- **Only create or modify this project's own workflows.** If the n8n instance runs other automation,
  read it freely and change nothing. If copying a pattern requires *running* someone else's
  workflow, ask first.
- **Reuse credentials by name; never duplicate them.** The names are listed in `.env.example`.
- **Test with real but non-sensitive data**: a public job listing and your own contact details.
  **Never real participant information.**
- **Verify platform API details against current documentation**, not against this file and not
  against training data. Field names change.

---

## 3. Locked invariants: do not change these casually

Machine-checked by `python tools/deployed.py check`. Run it after any workflow edit and before any
demo. It is proven to catch regressions, not just to pass.

1. **Voice is pinned** to `{ provider: 'vapi', voiceId: 'Elliot', speed: 1.2, version: '2', language: 'auto' }`.
   The string `'2'` is deliberate; it is what the API echoes back.
2. **The applicant's first name is spoken exactly once per call.** The platform's `firstMessage`
   says it; nothing else may. Enforced in three independent places so one drifting generation cannot
   break it. The closing coach voice may use it once.
3. **No tools on the assistant.**

If you have a reason to change one, say so explicitly and get a human decision. Do not change one as
a side effect of something else.

---

## 4. The rule that killed the prototype

**Run the node, inspect the real output, then write the expression.** Never write against an assumed
schema.

An earlier version of this system was abandoned because every expression in it was written against a
guessed output shape and every one was wrong. Specific traps that are still live:

| Trap | Reality |
|---|---|
| **`$json` after ANY HTTP Request node** | Becomes the HTTP **response**, not the upstream item. This broke three nodes in one session: a delete that never ran, a database release that no-op'd, and a claim that wrote the literal string `"undefined"`. Reference the owning node explicitly: `$('Node Name').first().json` |
| A node emitting **zero items** | Silences its entire downstream chain. Anything that must run unconditionally needs its own branch off the trigger, not a position behind a filter |
| Postgres `RETURNING` | Yields the **new** row. `UPDATE … SET session_id = NULL … RETURNING session_id` returns NULL. Capture the old value in a `WITH target AS (SELECT …)` CTE first |
| `psql` output | Prints only the **last** statement's tag. A multi-statement query showing `UPDATE 0` may still have changed rows earlier. Check the data, not the tag |
| Verifying right after a webhook POST | Races the execution. Re-read before concluding a step failed |

---

## 5. n8n operational gotchas

- **`PUT /workflows/{id}` does not re-register triggers.** Add a schedule trigger that way and it
  silently never fires. Always `POST /workflows/{id}/deactivate` then `/activate` after a structural
  change.
- Those two endpoints need **`-H "Content-Length: 0"`**. Some HTTP clients send the wrong
  content-type and get "unsupported media type", **and the deactivate half may already have
  succeeded**, leaving the workflow off and its webhook 404ing. Use `curl` for these two.
- `respondToWebhook` status code must be `options.responseCode`. Set it top-level and it **silently
  returns 200** with the right body, which looks like it works.
- Assemble workflow JSON **in a script, never by hand**. Node parameters carry 20k+ character
  prompts full of quotes and newlines. `PUT` needs `{name, nodes, connections, settings}`; `active`
  is rejected there.
- Inspect a run with `GET /executions/{id}?includeData=true` →
  `data.resultData.runData['<Node Name>'][0]`. Fastest route to a real API error.
- Vapi 400 bodies: n8n reports only a generic "Bad request" and drops the detail. Re-POST the built
  body with `curl` to see the real message.
- Dollar-quoted SQL written as `$$ {{ expr }} $$` carries the padding spaces into the column. Wrap
  in `trim($$ … $$)`.
- Postgres nodes accept **multiple statements** separated by `;` in one query.

---

## 6. Prompt-text handling

Generated interviewer prompts are ~40,000 characters of em dashes, curly quotes, and non-ASCII. That
text has to reach the voice platform intact.

- **Never write prompt files with a UTF-8 BOM.** It becomes an invisible leading character in a live
  system prompt.
- On Windows PowerShell 5.1, a string request body is encoded as ASCII, best-fit mapping em dashes to
  hyphens and silently corrupting the prompt. Send explicit UTF-8 bytes.
- Python on Windows defaults to cp1252 and **dies reading transcripts**. Always
  `open(path, encoding='utf-8')` and start scripts with `sys.stdout.reconfigure(encoding='utf-8')`.
- **Bash heredocs mangle backslashes.** A Windows path written through one turned `\tools` into a
  literal tab character. Write multi-line scripts to a file, then run the file.
- Validate generated JavaScript with `node --check` both locally **and** after the round trip into
  n8n.

---

## 7. Where things live

| Path | What | Edit? |
|---|---|---|
| `PLAYBOOK.md` | Authoritative system description | Keep current |
| `docs/SETUP.md` | Install guide | Keep current |
| `db/schema.sql` | DDL, **reconstructed** (see its header) | Yes |
| `workflows/*.json` | The two workflows, import-ready | Regenerate via `tools/deployed.py export` |
| `workflow-nodes/` | Readable mirror of every code node, query, prompt | **Generated; do not hand-edit** |
| `prompts/architect-system.md` | Writes the interviewer prompt. **The highest-leverage file here** | Carefully |
| `prompts/rubric-DRAFT-for-specialist-review.md` | Straw-man with six `[SPECIALIST DECISION]` points | Only an employment specialist adopts it |
| `ui/src/config/specialists.ts` | **Report destinations.** Placeholder until edited | **Must edit before real use** |
| `ui/src/config/facts.ts` | Waiting-screen facts. **Must be sourced, never invented** | **Must edit before real use** |
| `tools/deployed.py` | Mirror + invariant checker | Rarely |
| `tools/check_job_url.py` | Will the system be able to read this posting? | Rarely |

### The mirror

```bash
python tools/deployed.py export   # deployed n8n -> workflow-nodes/
python tools/deployed.py check    # diff + assert invariants; non-zero on drift
```

The workflows are the real system, but their code nodes are only editable through the API, so the
repository can silently stop describing what is running. The mirror is the defence. **Run `check`
before any demo and after any workflow edit.**

---

## 8. Working style for this repo

- **Read widely, write narrowly.** Learn from anything; change only what the task needs.
- **Measure, don't assume.** This system has a history of assumptions being wrong in ways that look
  like success. When you report a number, say where it came from.
- **Label estimates as estimates.** "This execution was pruned and cannot be measured" is a correct
  and useful answer. An invented figure is not.
- **American spelling in participant-facing and staff-facing text** ("practiced", not "practised") unless
  your deployment is somewhere that prefers otherwise.
- **No markdown in anything the assistant speaks.** It will read the asterisks out loud.
- When a change touches a locked invariant (§3) or a design decision in PLAYBOOK §2.4, say so
  explicitly rather than letting it slide through.

---

## 9. Before you change the architect prompt

`prompts/architect-system.md` is ~22,500 characters and produces a ~40,000-character interviewer
prompt. It is the single highest-leverage file in the repository and also the latency bottleneck.

Things already learned the hard way, which the prompt now encodes:

- **Dead air after the opener reads as a crash.** The interviewer must speak immediately after the
  participant's first response. Never design "wait for the candidate" as the event right after
  "ready".
- **A nervous participant may get short or sarcastic.** The interviewer stays in role and keeps
  interviewing. It does not break character to offer resources.
- **A pleasant conversation is not a passing grade.** Rapport is not the scoring signal.
- **Generic feedback is worthless.** If a report could be pasted onto a different participant's
  transcript and still roughly work, it has failed. Scoring must quote the participant's actual
  words.
- **"Are you an AI?" happens in every deployment.** Deflect in character, then deflect again and
  redirect to the task.
- **The AI is the interviewer, never the candidate.** It must not answer its own questions.
- **Nerves, filler and false starts never lower a score.** An answer delivered imperfectly is still
  delivered.
- **Vague answers get probed, short ones do not.** An answer that stays general ("I'm a people
  person") gets up to two warm follow-ups asking for something specific, and a general claim is never
  scored Strong. A brief answer with one real detail is specific enough and is left alone. The rule
  lives in the architect prompt and is repeated in the Platform Delivery Rules, so every interviewer
  carries it even if a generation drifts.
- **Every nudge is built from the applicant's own words.** Never a generic "can you give more
  detail." The interviewer repeats the specific thing they said and asks about the parts that stayed
  general (what they actually did, what system or person was involved, what happened after), as one
  conversational turn. That gives a nervous person a road to walk: each part of the follow-up is now
  something they know they can talk about. The worked example in the architect prompt (a locked-out
  user and a password reset) is the pattern. An anchored follow-up that names two or three parts of
  the *same* story is one question, not a breach of the one-question-per-turn rule.
- **Praise is earned, not automatic.** The interviewer acknowledges an answer only when it delivered
  something specific; thin answers get a neutral "Okay" and the follow-up. Never "Great!" on every
  turn. The one unconditional piece of praise is the spoken feedback's opening, which always
  acknowledges that they got through the interview, whatever the score.

Changing the number of worked examples it must write is the main latency lever, and it trades
interview quality for speed. Make that trade deliberately, not accidentally.
