
// Single convergence point for every research path, so downstream nodes never
// have to care which branch produced the report.
const src = $('Resolve Job Source').first().json;
const init = $('Validate Intake').first().json;
const inp = $input.first().json;

let report = '';
let source = '';

if (inp && typeof inp.cachedReport === 'string' && inp.cachedReport.trim()) {
  report = inp.cachedReport; source = 'cache';
} else if (inp && typeof inp.report === 'string' && inp.report.trim()) {
  report = inp.report; source = inp.source || 'unknown';
} else if (inp && inp.output) {                       // Azure agent node
  // Same structuring node serves both paths; the mode says which fed it.
  report = String(inp.output);
  source = (src.mode === 'description') ? 'pasted' : 'page-fetch';
} else if (inp && inp.choices && inp.choices[0]) {    // Perplexity chat-completions
  report = String(inp.choices[0].message.content); source = 'perplexity';
} else if (String(init.jobReport || '').trim()) {
  report = String(init.jobReport); source = 'provided';
}

report = report.trim();

if (report.length < 400) {
  throw new Error('Job Intelligence Report came back at ' + report.length +
    ' chars from source "' + source + '". Refusing to build an interview on that.');
}

return [{ json: {
  jobReport: report,
  reportChars: report.length,
  source,
  jobKey: src.jobKey,
  jobLink: src.jobLink,
  jobTitle: src.jobTitle,
  sessionId: init.sessionId
}}];
