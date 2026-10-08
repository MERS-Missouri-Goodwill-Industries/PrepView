// Decide where the Job Intelligence Report will come from, and compute the cache key.
//
// Priority: a pasted description wins over a link. Plenty of listings cannot be
// read from their URL -- career sites that block automated fetches, postings
// behind a login, roles only ever emailed to the applicant -- and a paste is the
// most faithful account of the role available. It also skips both the fetch and
// Perplexity entirely, which is faster and immune to Perplexity's one-request cap.
const init = $('Validate Intake').first().json;

const link = String(init.jobLink || '').trim();
const title = String(init.jobTitle || '').trim();
const desc = String(init.jobDescription || '').trim();

// Normalise the URL so trivial variations share one cache entry:
// lowercase host, drop the scheme, drop www, drop trailing slash.
function normaliseUrl(u) {
  try {
    const m = u.match(/^https?:\/\/([^/?#]+)([^?#]*)/i);
    if (!m) return u.toLowerCase();
    const host = m[1].toLowerCase().replace(/^www\./, '');
    const path = (m[2] || '').replace(/\/+$/, '');
    return host + path;
  } catch (e) {
    return u.toLowerCase();
  }
}

// Stable short hash so the same pasted text reuses its cached report.
// djb2 -- not cryptographic, just needs to be deterministic and cheap.
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

let mode, jobKey;

if (String(init.jobReport || '').trim()) {
  // Explicit full-report override, used for testing.
  mode = 'provided';
  jobKey = 'provided:' + (link ? normaliseUrl(link) : title.toLowerCase());
} else if (desc) {
  mode = 'description';
  const canon = desc.replace(/\s+/g, ' ').trim().toLowerCase();
  jobKey = 'desc:' + hash(canon) + ':' + canon.length;
} else if (/^https?:\/\//i.test(link)) {
  mode = 'url';
  jobKey = 'url:' + normaliseUrl(link);
} else {
  mode = 'title';
  jobKey = 'title:' + title.toLowerCase().replace(/\s+/g, ' ');
}

// Keep the payload bounded; a paste can include a whole careers page.
const MAX_DESC = 24000;
const descText = desc.length > MAX_DESC ? desc.slice(0, MAX_DESC) : desc;

return [{
  json: {
    mode,
    jobKey,
    jobLink: link,
    jobTitle: title,
    hasDescription: !!desc,
    descChars: desc.length,
    descText,
    sessionId: init.sessionId
  }
}];
