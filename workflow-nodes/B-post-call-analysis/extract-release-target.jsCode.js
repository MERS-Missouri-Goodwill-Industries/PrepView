
// SAFETY: this project owns only assistants named `INT ...` and phone numbers
// named `INTERVIEW-nn`. The same Vapi account may also run production phone
// lines and alerting systems. Every filter below is a hard gate, not a heuristic.
// See PLAYBOOK.md section 7 (pool ownership rule).
const ASSISTANT_OWNED = (name) => /^INT /.test(String(name || ''));
const NUMBER_OWNED    = (name) => /^INTERVIEW-\d+$/.test(String(name || ''));

// Decide what to release now that the call is over. Runs even if metadata did
// not survive, because the assistantId alone is enough to tear down.
const p = $input.first().json.probe || {};
const assistantId = p.assistantId || null;

return [{ json: {
  assistantId,
  sessionId: p.sessionId,
  reason: 'end-of-call',
  releasable: !!assistantId
}}];
