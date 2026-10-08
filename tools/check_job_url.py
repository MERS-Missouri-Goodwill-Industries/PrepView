#!/usr/bin/env python3
"""
Will the interview system actually be able to read this job posting?

Seeing a job description in your browser -- or in Google's search results -- does
NOT mean our system can read it. Your browser runs JavaScript, carries your
cookies, and is trusted by bot-detection; the system does a plain HTTP fetch and
reads the raw HTML. Google's crawler is also often allowed where everyone else is
blocked. The three can see three different things.

This runs the EXACT checks the live workflow runs, so its verdict is the one that
matters:

  python tools/check_job_url.py "https://..."
  python tools/check_job_url.py url1 url2 url3

Verdicts:
  GOOD   usable, and it reads like a real single posting -> safe to use
  THIN   passes the size gate but has almost no job content -> paste the
         description instead; the interview would be built on page furniture
  FAIL   the system cannot use this -> paste the description instead

Exits 0 only if every URL came back GOOD.
"""
import re
import sys
import urllib.request
import urllib.error

# Mirrors the Fetch Job Page node
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36')
TIMEOUT = 20

# Mirrors Assess Fetched Page
MIN_CHARS = 600
CLOSED = re.compile(r'position has been filled|no longer available|job posting has expired', re.I)

# Extra check the workflow does NOT do, added after a real near-miss: a hospital
# careers page passed the size gate on 2,929 characters that were entirely
# navigation menus and privacy notices in fifteen languages. Size is not substance.
SIGNALS = ['responsibilit', 'qualificat', 'requirement', 'required', 'duties',
           'experience', 'salary', 'benefit', 'shift', 'degree', 'certif',
           'you will', "you'll", 'we are looking', 'about the role']
MIN_SIGNALS = 3

# A results/search page is not a posting. This was a real mistake: a ZipRecruiter
# search URL was submitted and produced a vague, generic interview.
LISTY = re.compile(r'/jobs-search|[?&]search=|/search\?|/jobs\?|q-.*-jobs|'
                   r'[?&](keywords|query)=|/browse|/results', re.I)


def strip_html(html):
    t = re.sub(r'<script[\s\S]*?</script>', ' ', html)
    t = re.sub(r'<style[\s\S]*?</style>', ' ', t)
    t = re.sub(r'<noscript[\s\S]*?</noscript>', ' ', t)
    t = re.sub(r'<!--[\s\S]*?-->', ' ', t)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = (t.replace('&nbsp;', ' ').replace('&amp;', '&')
          .replace('&quot;', '"').replace('&#39;', "'")
          .replace('&lt;', '<').replace('&gt;', '>'))
    return re.sub(r'\s+', ' ', t).strip()


def check(url):
    print('-' * 72)
    print(url)

    if LISTY.search(url):
        print('  VERDICT: FAIL -- this looks like a SEARCH or RESULTS page, not one posting.')
        print('           The system is built to read a single listing. Open the specific')
        print('           job, copy its URL, or paste the description instead.')
        return 'FAIL'

    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
    })
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            status = r.status
            html = r.read(3_000_000).decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        print('  VERDICT: FAIL -- the site returned HTTP %s to an automated request.' % e.code)
        print('           It very likely still looks fine in your browser. Paste the description.')
        return 'FAIL'
    except Exception as e:
        print('  VERDICT: FAIL -- could not fetch (%s). Paste the description.' % type(e).__name__)
        return 'FAIL'

    text = strip_html(html)
    found = [s for s in SIGNALS if s in text.lower()]

    print('  HTTP %s, %d characters of readable text, %d job-content signals'
          % (status, len(text), len(found)))

    if CLOSED.search(text):
        print('  VERDICT: FAIL -- the page says the position is filled, closed, or expired.')
        return 'FAIL'

    if len(text) < MIN_CHARS:
        print('  VERDICT: FAIL -- only %d characters came back (need %d).' % (len(text), MIN_CHARS))
        print('           Almost always means the page builds itself with JavaScript, which')
        print('           your browser runs and our fetch does not. Paste the description.')
        return 'FAIL'

    if len(found) < MIN_SIGNALS:
        print('  VERDICT: THIN -- enough text, but it does not read like a job posting.')
        print('           Signals found: %s' % (', '.join(found) or 'none'))
        print('           Usually menus, cookie banners, or boilerplate rather than the job.')
        print('           Paste the description -- otherwise the interview is built on furniture.')
        return 'THIN'

    print('  VERDICT: GOOD -- safe to use.')
    print('           Signals: %s' % ', '.join(found[:8]))
    snippet = text[:260].strip()
    print('           Reads as: %s...' % snippet)
    return 'GOOD'


def main():
    urls = sys.argv[1:]
    if not urls:
        print(__doc__)
        sys.exit(2)
    results = [check(u) for u in urls]
    print('-' * 72)
    print('%d checked: %d GOOD, %d THIN, %d FAIL'
          % (len(results), results.count('GOOD'), results.count('THIN'), results.count('FAIL')))
    print()
    print('Reminder: pasting the job description always works and is the most faithful')
    print('input available. A link is a convenience, not the reliable path.')
    sys.exit(0 if all(r == 'GOOD' for r in results) else 1)


if __name__ == '__main__':
    main()
