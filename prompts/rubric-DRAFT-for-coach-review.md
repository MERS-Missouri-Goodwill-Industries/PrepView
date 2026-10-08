# Mock Interview Scoring Rubric — DRAFT for coach review

**Status: PROPOSAL. Nothing here is adopted.** This exists so a your organization job coach has something
concrete to argue with rather than a blank page. Every dimension, band, and threshold below is a
starting guess by the build team and is expected to change.

**Who needs to review this:** a job coach who actually runs mock interviews with participants.
**What we need from them:** not approval — corrections. Specifically the six decisions marked
**[COACH DECISION]**.

**Why this matters more than it looks.** The AI scores every practice interview against this rubric,
and the coach receives the result as an emailed report. If the rubric does not match how coaches
really assess readiness, the reports will be confidently wrong — and because they read as
authoritative, they will be believed. The credibility of the whole tool rests here.

---

## 1. What the report is for

The **coach is the customer**, not the participant. The report's job is to give a coach who was not in
the room enough specific, quoted evidence to sit down with the participant and coach from it.

Consequences for scoring design:

- A score in isolation is not the deliverable. Evidence is.
- Every judgement must **quote what the participant actually said.** Feedback that could be pasted
  onto a different participant's transcript and still roughly work has failed. (This is the single
  most common failure mode of an LLM asked to critique — it is a known, observed problem in the
  a sibling voice-roleplay training tool.)
- The report must speak directly to what the participant said they were **nervous about** and what
  they wanted to **focus on practicing**. That is the part a coach will read first.

---

## 2. Proposed dimensions

Six dimensions, scored independently. **[COACH DECISION 1]** — are these the right six? Which are
missing, which don't matter, and which two matter most?

| # | Dimension | What we propose it measures |
|---|---|---|
| 1 | **Clarity and structure** | Can the participant answer a question in a way a hiring manager can follow — a beginning, a specific middle, an outcome — without rambling or trailing off? |
| 2 | **Concrete examples** | Do they support claims with a real situation and a real action they took, rather than generalities like "I'm a hard worker"? |
| 3 | **Relevance to the role** | Do the answers connect to what this specific job actually involves, per the listing? |
| 4 | **Handling difficulty** | When asked something unexpected, uncomfortable, or about a gap or a past problem, do they stay composed and answer it? |
| 5 | **Questions asked of the interviewer** | Did they ask anything, and did it show genuine interest in the role rather than only pay and hours? |
| 6 | **Professional presence** | Do they come across as engaged, courteous, and reasonably confident, allowing for nerves? |

### Scoring scale

**[COACH DECISION 2]** — what scale do coaches actually think in? Options:

- **(a) 1–5 numeric** per dimension. Familiar, easy to trend across sessions, but invites false precision.
- **(b) Three bands** — *Ready / Developing / Needs work.* Coarser, harder to argue with, closer to how
  most coaches talk.
- **(c) Band plus a one-line justification**, no number at all.

Our recommendation is **(b) or (c)**. Numbers imply a measurement precision a 15-minute AI interview
does not have, and a participant who sees "2 out of 5" hears a verdict, not coaching.

### Not-observed is a real outcome

If the interview never got to a dimension, the report must say **"not observed"** rather than scoring
it low. A short call is not evidence of weakness. **[COACH DECISION 3]** — is there a minimum call
length below which a report shouldn't be issued at all?

---

## 3. Critical flags

Some things are not a low score on a dimension — they are the whole story, and averaging them away
would be misleading. The proposal is that each **names itself explicitly in the report and caps the
overall assessment**, no matter how well the rest went.

**[COACH DECISION 4]** — is this the right list, and is capping the right response? Proposed flags:

| Flag | Trigger |
|---|---|
| **Fabrication** | Claimed experience, a credential, or a qualification that appears invented. |
| **Disclosed a disqualifier unprompted** | Volunteered something legally or practically damaging that was never asked about. |
| **Hostility toward the interviewer** | Insulted or became aggressive toward the interviewer, beyond ordinary nerves or frustration. |
| **Abandoned the interview** | Hung up mid-question or refused to continue. |

Two deliberate design notes:

- **Nerves are never a flag.** A nervous, halting, or apologetic participant is the normal case and the
  reason the tool exists. Frustration and short answers are not hostility.
- **A warm, chatty call is not automatically a good one.** Rapport is not the scoring signal — a
  participant can be delightful and still not answer a single question with substance. The rubric
  grades substance.

---

## 4. Proposed report structure

What lands in the coach's inbox. **[COACH DECISION 5]** — is this the right shape and length for
something you'd actually read between appointments?

1. **Header** — participant name, role and employer practiced for, date, call length.
2. **The one-paragraph version** — if the coach reads nothing else. Where they are and the single most
   useful thing to work on next.
3. **What they were worried about** — their stated `nervousAbout`, and whether it actually showed up as
   a weakness. Often the most valuable line in the report: *"She was worried about explaining her
   employment gap. She handled it more calmly than she expects — this is a confidence problem, not a
   skills problem."*
4. **What they wanted to practice** — their stated `focusArea` and how they did on it.
5. **Dimension-by-dimension** — band plus at least one **direct quote** as evidence. "Not observed"
   where applicable.
6. **Critical flags** — only if any fired.
7. **Two or three things to work on**, specific enough to rehearse.
8. **Full transcript**, appended.

**[COACH DECISION 6]** — should the participant ever see a version of this directly, or is it
coach-only? This is a real decision with privacy and trust implications, and it changes the tone the
report is written in.

---

## 5. Open questions beyond the rubric

- **Repeat attempts.** Participants can practice unlimited times. Should the report compare against
  their previous attempts? That is genuinely useful coaching data and needs the session history we
  already store.
- **Recordings.** Kept or not, and for how long? A participant privacy decision that needs an owner.
- **Failure to answer at all.** If someone calls, panics, and says almost nothing, what should the
  coach receive? A report would be cruel; silence loses the signal that they tried.

---

## 6. What happens after review

Once a coach has marked this up, the agreed rubric is wired into Workflow B as a scoring prompt that
emits structured JSON — one object per dimension with band, evidence quotes, and flags — and a
separate formatting step turns that into the email. Scoring and wording stay separate so the rubric
can be revised without touching the report layout.

We will also keep a record of which rubric version produced which report, so a coach who disagrees
with a score can be answered precisely rather than approximately.
