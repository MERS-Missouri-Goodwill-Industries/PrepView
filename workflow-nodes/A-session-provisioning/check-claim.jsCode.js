
// Normalise the claim result. The Postgres node returns one row on success and
// (with alwaysOutputData) a single empty item when the pool is exhausted.
const init = $('Validate Intake').first().json;
const row = $input.first().json || {};

const claimed = !!(row.phone_number_id);

return [{ json: {
  available: claimed,
  phoneNumberId: row.phone_number_id || null,
  phoneNumber: row.phone_number || null,
  phoneNumberName: row.pool_name || null,
  sessionId: init.sessionId
}}];
