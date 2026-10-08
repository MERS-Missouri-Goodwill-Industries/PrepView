
// SAFETY: this project owns only assistants named `INT ...` and phone numbers
// named `INTERVIEW-nn`. The same Vapi account may also run production phone
// lines and alerting systems. Every filter below is a hard gate, not a heuristic.
// See PLAYBOOK.md section 7 (pool ownership rule).
const ASSISTANT_OWNED = (name) => /^INT /.test(String(name || ''));
const NUMBER_OWNED    = (name) => /^INTERVIEW-\d+$/.test(String(name || ''));

// Which pool number is currently bound to the assistant that just finished?
const target = $('Extract Release Target').first().json;

const items = $input.all();
let nums = (items.length === 1 && Array.isArray(items[0].json))
  ? items[0].json
  : items.map(i => i.json).filter(n => n && (n.id || n.number));

// Only ever consider this project's own numbers.
const pool = nums.filter(n => NUMBER_OWNED(n.name));
const bound = pool.find(n => n.assistantId && n.assistantId === target.assistantId);

return [{ json: {
  assistantId: target.assistantId,
  sessionId: target.sessionId,
  phoneNumberId: bound ? bound.id : null,
  phoneNumberName: bound ? bound.name : null,
  hasNumber: !!bound
}}];
