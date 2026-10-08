
// Rebuild the deletion list after the unbind.
// $json here is the Vapi phone-number object returned by PATCH, so the original
// stale-session fields are gone. Map back by phone number id -- deterministic,
// with no reliance on pairedItem surviving an HTTP node.
const stale = $('Find Stale Sessions').all().map(i => i.json);
const out = [];

for (const item of $input.all()) {
  const numberId = item.json && item.json.id;
  const match = stale.find(s => s.phoneNumberId === numberId);
  if (!match) continue;
  if (!match.assistantId) continue;   // orphaned binding: number freed, assistant already gone
  out.push({ json: match });
}

return out;
