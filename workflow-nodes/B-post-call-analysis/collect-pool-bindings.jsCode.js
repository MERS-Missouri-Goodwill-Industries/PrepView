
// SAFETY: this project owns only assistants named `INT ...` and phone numbers
// named `INTERVIEW-nn`. The same Vapi account may also run production phone
// lines and alerting systems. Every filter below is a hard gate, not a heuristic.
// See PLAYBOOK.md section 7 (pool ownership rule).
const ASSISTANT_OWNED = (name) => /^INT /.test(String(name || ''));
const NUMBER_OWNED    = (name) => /^INTERVIEW-\d+$/.test(String(name || ''));

// Snapshot the pool so the sweep can match numbers to stale assistants.
const items = $input.all();
let nums = (items.length === 1 && Array.isArray(items[0].json))
  ? items[0].json
  : items.map(i => i.json).filter(n => n && (n.id || n.number));

const pool = nums.filter(n => NUMBER_OWNED(n.name));

return [{ json: {
  bindings: pool.map(n => ({ id: n.id, name: n.name, assistantId: n.assistantId || null })),
  poolSize: pool.length,
  boundCount: pool.filter(n => !!n.assistantId).length,
  freeCount: pool.filter(n => !n.assistantId).length
}}];
