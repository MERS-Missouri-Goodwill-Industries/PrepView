
// PHASE 2 STEP 1: observe, do not interpret.
// The brief is explicit -- log the raw Vapi payload and inspect it before
// building anything downstream. Nothing here assumes a schema; it surfaces a
// shallow map of what actually arrived so the real shape can be read off an
// execution, then keeps the untouched payload alongside it.
const raw = $input.first().json;
const body = raw.body !== undefined ? raw.body : raw;
const msg  = (body && body.message !== undefined) ? body.message : body;

const typeOf = (v) => Array.isArray(v) ? 'array[' + v.length + ']' : (v === null ? 'null' : typeof v);

const shape = {};
if (msg && typeof msg === 'object') {
  for (const k of Object.keys(msg)) {
    const v = msg[k];
    shape[k] = typeOf(v);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      shape[k] += ' {' + Object.keys(v).slice(0, 25).join(',') + '}';
    }
  }
}

// Probe the fields Workflow B will eventually need, without depending on them.
const probe = {
  serverMessageType: msg && msg.type,
  endedReason:       msg && msg.endedReason,
  hasTranscript:     !!(msg && msg.transcript),
  transcriptChars:   msg && msg.transcript ? String(msg.transcript).length : 0,
  hasMessagesArray:  !!(msg && Array.isArray(msg.messages)),
  hasArtifact:       !!(msg && msg.artifact),
  hasRecordingUrl:   !!(msg && (msg.recordingUrl || (msg.artifact && msg.artifact.recordingUrl))),
  hasSummary:        !!(msg && (msg.summary || (msg.analysis && msg.analysis.summary))),
  durationSeconds:   msg && (msg.durationSeconds || msg.durationMs),
  callId:            msg && msg.call && msg.call.id,
  assistantId:       (msg && msg.assistant && msg.assistant.id) || (msg && msg.call && msg.call.assistantId) || null,
  // The whole P1 question: does metadata survive the call boundary?
  metadataFromAssistant: msg && msg.assistant && msg.assistant.metadata ? msg.assistant.metadata : null,
  metadataFromCall:      msg && msg.call && msg.call.metadata ? msg.call.metadata : null,
  metadataTopLevel:      msg && msg.metadata ? msg.metadata : null
};

probe.metadataFound = !!(probe.metadataFromAssistant || probe.metadataFromCall || probe.metadataTopLevel);
const md = probe.metadataFromAssistant || probe.metadataFromCall || probe.metadataTopLevel || {};
probe.sessionId    = md.sessionId    || null;
probe.specialistEmail   = md.specialistEmail   || null;
probe.participantName = md.participantName || null;

return [{ json: { receivedAt: new Date().toISOString(), probe, shape, raw } }];
