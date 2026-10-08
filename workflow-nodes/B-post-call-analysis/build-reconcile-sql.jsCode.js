
// Emit one SQL statement that syncs the allocator to what Vapi actually holds.
// Vapi is authoritative for bindings; this table is authoritative for allocation.
// After a sweep the two can disagree, so free every row whose number is unbound.
//
// Runs on every schedule tick as its own branch -- NOT downstream of the teardown --
// because when nothing is stale the teardown chain emits no items and anything
// hanging off it never executes.
const items = $input.all();
let nums = (items.length === 1 && Array.isArray(items[0].json))
  ? items[0].json
  : items.map(i => i.json).filter(n => n && (n.id || n.number));

const pool = nums.filter(n => /^INTERVIEW-\d+$/.test(String(n.name || '')));
const free = pool.filter(n => !n.assistantId).map(n => n.id);

const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";

if (free.length === 0) {
  return [{ json: { sql: 'SELECT 0 AS released;', freeCount: 0, poolSize: pool.length } }];
}

const inList = free.map(esc).join(', ');

// `target` captures session_id BEFORE it is nulled. Postgres RETURNING yields the
// NEW row, so RETURNING session_id after SET session_id = NULL returns NULL and the
// join to interview_sessions silently matches nothing -- rows got freed but their
// sessions were never marked swept.
const sql = [
  'WITH target AS (',
  '  SELECT phone_number_id, session_id',
  '  FROM interview_number_pool',
  '  WHERE phone_number_id IN (' + inList + ')',
  '    AND session_id IS NOT NULL',
  '),',
  'freed AS (',
  '  UPDATE interview_number_pool p',
  '  SET session_id = NULL, assistant_id = NULL, released_at = NOW(), updated_at = NOW()',
  '  FROM target t',
  '  WHERE p.phone_number_id = t.phone_number_id',
  '  RETURNING t.session_id AS sid',
  ')',
  'UPDATE interview_sessions s',
  "SET status = CASE WHEN s.status IN ('provisioning','ready','provisioned') THEN 'swept' ELSE s.status END,",
  '    released_at = COALESCE(s.released_at, NOW())',
  'FROM freed f',
  'WHERE s.session_id = f.sid;'
].join('\n');

return [{ json: { sql, freeCount: free.length, poolSize: pool.length } }];
