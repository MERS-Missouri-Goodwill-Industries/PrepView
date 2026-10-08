// Pull everything the coach report needs out of the end-of-call payload.
// Field paths are the ones observed on a real call (CLAUDE.md section 6), not assumed.
const raw = $input.first().json.raw || {};
const body = raw.body !== undefined ? raw.body : raw;
const msg = (body && body.message !== undefined) ? body.message : body;

const md =
  (msg.assistant && msg.assistant.metadata) ||
  (msg.call && msg.call.metadata) ||
  msg.metadata ||
  {};

const transcript = String(msg.transcript || (msg.artifact && msg.artifact.transcript) || '').trim();
const durationSeconds = Math.round(Number(msg.durationSeconds || (Number(msg.durationMs || 0) / 1000)) || 0);

const participantName = md.participantName || 'the participant';
const firstName = String(md.participantName || '').split(/\s+/)[0] || 'Participant';

// Structured turns for the email's transcript. Vapi's `messages[]` carries one
// entry per turn with role `bot` | `user` | `system`, which is far more reliable
// than re-parsing the flat transcript string. Fall back to parsing only if the
// array is absent.
let turns = [];
if (Array.isArray(msg.messages) && msg.messages.length) {
  for (const m of msg.messages) {
    const role = String(m.role || '').toLowerCase();
    if (role !== 'bot' && role !== 'user' && role !== 'assistant') continue;
    const text = String(m.message || m.content || '').trim();
    if (!text) continue;
    turns.push({ speaker: role === 'user' ? 'user' : 'ai', text });
  }
}
if (!turns.length && transcript) {
  // "AI: ...\nUser: ..." -- split on speaker labels at line starts.
  const parts = transcript.split(/\n(?=(?:AI|User|Assistant|Bot):\s)/i);
  for (const p of parts) {
    const mm = p.match(/^(AI|User|Assistant|Bot):\s*([\s\S]*)$/i);
    if (!mm) continue;
    const who = mm[1].toLowerCase();
    turns.push({ speaker: who === 'user' ? 'user' : 'ai', text: mm[2].trim() });
  }
}

// A call that barely happened should not produce a confident report.
const TOO_SHORT_SECONDS = 60;
const tooShort = durationSeconds < TOO_SHORT_SECONDS || transcript.length < 300;

const costTotal = (msg.costBreakdown && msg.costBreakdown.total) || msg.cost || null;

return [{
  json: {
    sessionId: md.sessionId || null,
    participantName,
    firstName,
    coachEmail: md.coachEmail || null,
    jobTitle: md.jobTitle || 'the role',
    jobLink: md.jobLink || null,
    nervousAbout: md.nervousAbout || null,
    focusArea: md.focusArea || null,
    assistantId: (msg.assistant && msg.assistant.id) || (msg.call && msg.call.assistantId) || null,
    callId: (msg.call && msg.call.id) || null,
    endedReason: msg.endedReason || null,
    durationSeconds,
    durationLabel: durationSeconds >= 60
      ? Math.floor(durationSeconds / 60) + 'm ' + (durationSeconds % 60) + 's'
      : durationSeconds + 's',
    transcript,
    transcriptChars: transcript.length,
    turns,
    turnCount: turns.length,
    vapiSummary: String(msg.summary || (msg.analysis && msg.analysis.summary) || '').trim() || null,
    recordingUrl: msg.recordingUrl || (msg.artifact && msg.artifact.recordingUrl) || null,
    costTotal,
    tooShort,
    // No coach selected means there is nowhere to send. Surfaced rather than thrown
    // so teardown still runs and the failure is visible in the execution.
    sendable: !!(md.coachEmail && transcript.length > 0)
  }
}];
