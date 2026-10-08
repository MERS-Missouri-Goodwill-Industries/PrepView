// Turn the extraction into the email an employment specialist actually receives.
//
// The employment specialist is the customer for this report, not the participant. It has to be
// useful to someone sitting down with them afterwards, which means evidence in
// the participant's own words -- not a score in isolation.
const prep = $('Prepare Report Inputs').first().json;
const rawOut = String($input.first().json.output || '').trim();

// The model was told to return JSON only; strip a code fence if it added one.
function parseJson(text) {
  let t = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(t);
  } catch (e) {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try { return JSON.parse(t.slice(a, b + 1)); } catch (e2) { /* fall through */ }
    }
    return null;
  }
}

const x = parseJson(rawOut) || {};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const para = (s) => esc(s).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');

const rows = [];
const moments = Array.isArray(x.moments) ? x.moments : [];
for (const m of moments) {
  const rating = String(m.rating || '').toLowerCase();
  const colour = rating === 'strong' ? '#1a7f37' : rating === 'partial' ? '#9a6700' : '#b3261e';
  rows.push(
    '<tr>' +
    '<td style="padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top;font-weight:600;">' + esc(m.name) + '</td>' +
    '<td style="padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top;color:' + colour + ';font-weight:600;white-space:nowrap;">' + esc(m.rating) + '</td>' +
    '<td style="padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top;">' + para(m.evidence || '') + '</td>' +
    '</tr>'
  );
}

const nudges = Array.isArray(x.nudgesNeeded) ? x.nudgesNeeded : [];

function block(title, inner) {
  if (!inner) return '';
  return '<h3 style="margin:26px 0 8px;font-size:15px;color:#111;">' + esc(title) + '</h3>' + inner;
}

const incomplete = prep.tooShort || x.interviewReached === false;

// ---- transcript: one turn per line, only the speaker label coloured.
// AI turns are labelled "AI:", the participant's turns carry their first name.
// max-height + overflow gives a scroll box in Gmail and Outlook on the web;
// desktop Outlook ignores overflow and simply shows the whole thing, which is
// an acceptable fallback.
const AI_COLOUR = '#2563eb';
const YOU_COLOUR = '#15803d';
let transcriptHtml = '';
if (Array.isArray(prep.turns) && prep.turns.length) {
  const lines = prep.turns.map((t) => {
    const isUser = t.speaker === 'user';
    const label = isUser ? esc(prep.firstName) : 'AI';
    const colour = isUser ? YOU_COLOUR : AI_COLOUR;
    return '<div style="margin:0 0 12px;line-height:1.55;">' +
           '<span style="font-weight:700;color:' + colour + ';">' + label + ':</span> ' +
           '<span style="color:#111;">' + esc(t.text) + '</span></div>';
  });
  transcriptHtml =
    '<div style="max-height:420px;overflow-y:auto;padding:14px 16px;background:#fafafa;' +
    'border:1px solid #e5e7eb;border-radius:8px;font-size:13.5px;">' +
    lines.join('') + '</div>';
} else if (prep.transcript) {
  transcriptHtml =
    '<div style="max-height:420px;overflow-y:auto;padding:14px 16px;background:#fafafa;' +
    'border:1px solid #e5e7eb;border-radius:8px;white-space:pre-wrap;font-size:13.5px;color:#111;">' +
    esc(prep.transcript) + '</div>';
}

let html = '';
html += '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#222;max-width:720px;">';
html += '<p style="margin:0 0 4px;font-size:13px;color:#666;">Interview practice report</p>';
html += '<h2 style="margin:0 0 2px;font-size:20px;">' + esc(prep.participantName) + '</h2>';
html += '<p style="margin:0 0 18px;color:#666;">Practiced for <strong>' + esc(prep.jobTitle) + '</strong> · ' +
        esc(prep.durationLabel) + ' call' + (prep.endedReason ? ' · ended: ' + esc(prep.endedReason) : '') + '</p>';

if (incomplete) {
  html += '<div style="padding:12px 14px;background:#fff6e5;border:1px solid #f0d9a8;border-radius:8px;margin-bottom:18px;">' +
          '<strong>Short call.</strong> This interview ended early, so most of it never happened. ' +
          'Everything below covers only what actually took place. It is not a fair picture of ' +
          esc(prep.firstName) + '&rsquo;s interviewing overall.</div>';
}

html += block('The short version', x.specialistNote ? '<p>' + para(x.specialistNote) + '</p>' : '');

if (x.score || x.band) {
  html += '<p style="margin:18px 0;padding:12px 14px;background:#f4f6f8;border-radius:8px;">' +
          (x.score ? '<strong>Score:</strong> ' + esc(x.score) + '&nbsp;&nbsp;' : '') +
          (x.band ? '<strong>Band:</strong> ' + esc(x.band) : '') + '</p>';
}

// The two things they walked in worried about -- usually the most useful lines here.
if (prep.nervousAbout && x.nervousAboutOutcome) {
  html += block('What they were most nervous about',
    '<p style="margin:0 0 6px;color:#666;"><em>&ldquo;' + esc(prep.nervousAbout) + '&rdquo;</em></p>' +
    '<p style="margin:0;">' + para(x.nervousAboutOutcome) + '</p>');
}
if (prep.focusArea && x.focusAreaOutcome) {
  html += block('What they wanted to practice',
    '<p style="margin:0 0 6px;color:#666;"><em>&ldquo;' + esc(prep.focusArea) + '&rdquo;</em></p>' +
    '<p style="margin:0;">' + para(x.focusAreaOutcome) + '</p>');
}

if (rows.length) {
  html += block('Moment by moment',
    '<table style="border-collapse:collapse;width:100%;font-size:13px;">' +
    '<tr style="text-align:left;background:#f4f6f8;">' +
    '<th style="padding:8px 12px;">Moment</th><th style="padding:8px 12px;">Rating</th><th style="padding:8px 12px;">What they said</th></tr>' +
    rows.join('') + '</table>');
}

if (nudges.length) {
  html += block('Needed a follow-up to get there',
    '<p style="margin:0 0 6px;color:#666;">They covered these, but only after the interviewer prompted them. ' +
    'In a real interview nobody follows up, so this is the easiest thing in the report to improve.</p>' +
    '<ul style="margin:0;padding-left:20px;">' + nudges.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ul>');
}

if (x.topStrength) html += block('Biggest strength', '<p>' + para(x.topStrength) + '</p>');
if (x.workOn) html += block('Worth working on together', '<p>' + para(x.workOn) + '</p>');

// The participant heard this. The employment specialist should see exactly the same words, so the
// two of them are never working from different assessments.
if (x.spokenFeedback) {
  html += block('The feedback ' + prep.firstName + ' heard at the end of the call',
    '<div style="padding:12px 14px;background:#f9f9fb;border-left:3px solid #cbd5e1;border-radius:4px;white-space:pre-wrap;">' +
    esc(x.spokenFeedback) + '</div>');
}

if (transcriptHtml) {
  html += block('Full transcript', transcriptHtml);
}

html += '<p style="margin:24px 0 0;font-size:12px;color:#888;">' +
        'Generated automatically from an AI practice interview. Session ' + esc(prep.sessionId || 'unknown') +
        '. The AI played a hiring manager for this role; it is practice, not an assessment of employability.</p>';
html += '</div>';

const subject = 'Interview practice: ' + prep.participantName + ' | ' + prep.jobTitle +
                (incomplete ? ' (short call)' : '');

return [{
  json: {
    to: prep.specialistEmail,
    subject,
    html,
    parsedOk: Object.keys(x).length > 0,
    momentCount: rows.length,
    nudgeCount: nudges.length,
    turnCount: Array.isArray(prep.turns) ? prep.turns.length : 0,
    sessionId: prep.sessionId
  }
}];
