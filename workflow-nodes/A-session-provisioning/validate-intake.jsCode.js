
// Validate intake, mint a sessionId, normalise fields.
// Returns a single item; `valid` drives the IF node so failures answer the UI
// with a readable message instead of a 500.
const b = ($input.first().json.body) || {};

const s = (v) => (v === undefined || v === null) ? '' : String(v).trim();

const participantName = s(b.participantName || b.name);
const jobLink         = s(b.jobLink);
const nervousAbout    = s(b.nervousAbout);
const focusArea       = s(b.focusArea);
const coachEmail      = s(b.coachEmail);
const jobTitle        = s(b.jobTitle);
// A pasted description takes priority over the link: no fetch needed, and it
// works for listings that block bots or sit behind a login.
const jobDescription  = s(b.jobDescription);
// Perplexity is not yet credentialed. Until it is, the caller supplies the
// Job Intelligence Report directly. Once the credential exists, the Perplexity
// node fills this and the requirement below is dropped.
const jobReport       = s(b.jobReport);

const missing = [];
if (!participantName) missing.push('participantName');
if (!nervousAbout)    missing.push('nervousAbout');
if (!focusArea)       missing.push('focusArea');
if (!jobLink && !jobTitle && !jobDescription) missing.push('jobLink, jobDescription, or jobTitle');
// jobReport is now OPTIONAL -- an explicit override for testing. The research
// chain (cache -> page fetch -> GPT-5.4, Perplexity as fallback) supplies it.

// The interviewer greets the candidate by first name, so derive it here rather
// than making the prompt parse a full name at runtime.
const firstName = participantName.split(/\s+/)[0] || participantName;

// uuid v4 without relying on a crypto global being exposed in the sandbox
const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : ((r & 0x3) | 0x8);
  return v.toString(16);
});

return [{
  json: {
    valid: missing.length === 0,
    missing,
    sessionId: uuid,
    createdAt: new Date().toISOString(),
    participantName, firstName, jobLink, jobTitle, jobDescription, nervousAbout, focusArea, coachEmail, jobReport
  }
}];
