
// SAFETY: this project owns only assistants named `INT ...` and phone numbers
// named `INTERVIEW-nn`. The same Vapi account may also run production phone
// lines and alerting systems. Every filter below is a hard gate, not a heuristic.
// See PLAYBOOK.md section 7 (pool ownership rule).
const ASSISTANT_OWNED = (name) => /^INT /.test(String(name || ''));
const NUMBER_OWNED    = (name) => /^INTERVIEW-\d+$/.test(String(name || ''));

// Sweep sessions that were provisioned but never cleaned up.
//
// Chain 1 releases a session the moment its call ends. This catches the case the
// brief calls out: a session provisioned for someone who never dialled. Without
// it the pool drains permanently and silently (P3).
const STALE_AFTER_MINUTES = 120;   // an interview is capped at 25 min, so 2h is generous

const bindings = $('Collect Pool Bindings').first().json.bindings || [];
const byAssistant = {};
for (const b of bindings) {
  if (b.assistantId) byAssistant[b.assistantId] = b;
}

const items = $input.all();
let assistants = (items.length === 1 && Array.isArray(items[0].json))
  ? items[0].json
  : items.map(i => i.json).filter(a => a && a.id);

const now = Date.now();
const out = [];

for (const a of assistants) {
  if (!ASSISTANT_OWNED(a.name)) continue;              // hard gate
  const ageMin = (now - new Date(a.createdAt).getTime()) / 60000;
  if (ageMin < STALE_AFTER_MINUTES) continue;
  const b = byAssistant[a.id];
  out.push({ json: {
    assistantId: a.id,
    assistantName: a.name,
    ageMinutes: Math.round(ageMin),
    phoneNumberId: b ? b.id : null,
    phoneNumberName: b ? b.name : null,
    hasNumber: !!b,
    reason: 'stale-sweep'
  }});
}

// Also unbind pool numbers pointing at an assistant that no longer exists.
const liveIds = new Set(assistants.map(a => a.id));
for (const b of bindings) {
  if (b.assistantId && !liveIds.has(b.assistantId)) {
    out.push({ json: {
      assistantId: null,
      assistantName: '(already deleted)',
      ageMinutes: null,
      phoneNumberId: b.id,
      phoneNumberName: b.name,
      hasNumber: true,
      reason: 'orphaned-binding'
    }});
  }
}

return out;
