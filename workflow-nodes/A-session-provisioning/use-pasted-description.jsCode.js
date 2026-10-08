// Feed the pasted description into the same structuring step the fetched-page
// path uses, in the same shape, so `Structure Report` needs no branching.
//
// No usability gate here: the applicant typed this deliberately and the UI already
// enforced a minimum length. Unlike a fetched page there is no risk of a login
// wall, a cookie banner, or a "position filled" notice masquerading as content.
const src = $('Resolve Job Source').first().json;

return [{
  json: {
    usable: true,
    reason: 'pasted-by-applicant',
    sourceLabel: 'job description pasted by the applicant',
    pageChars: (src.descText || '').length,
    pageText: src.descText || '',
    jobKey: src.jobKey,
    jobLink: src.jobLink,
    jobTitle: src.jobTitle
  }
}];
