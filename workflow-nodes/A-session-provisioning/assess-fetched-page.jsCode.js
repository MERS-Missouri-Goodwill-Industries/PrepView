
// Turn the fetched HTML into plain text and decide whether it is worth using.
// A thin or blocked page falls through to Perplexity rather than producing a
// confident report built on a login wall or a "position filled" notice.
const MIN_CHARS = 600;

const src = $('Resolve Job Source').first().json;
const raw = $input.first().json;

// The HTTP node returns text in `data` when responseFormat is text; be tolerant.
let html = '';
if (typeof raw === 'string') html = raw;
else if (typeof raw.data === 'string') html = raw.data;
else if (typeof raw.body === 'string') html = raw.body;
else html = JSON.stringify(raw || {});

let text = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<\/(p|div|li|tr|h[1-6]|section)>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n\s*\n+/g, '\n\n')
  .trim();

// Guard against pages that loaded but say nothing useful.
const closed = /position has been filled|no longer available|job posting has expired/i.test(text);
const usable = text.length >= MIN_CHARS && !closed;

// Keep the payload bounded -- a careers page can carry a lot of chrome.
if (text.length > 24000) text = text.slice(0, 24000);

return [{ json: {
  usable,
  reason: closed ? 'listing-closed' : (text.length < MIN_CHARS ? 'too-short' : 'ok'),
  pageChars: text.length,
  pageText: text,
  jobKey: src.jobKey,
  jobLink: src.jobLink,
  jobTitle: src.jobTitle
}}];
