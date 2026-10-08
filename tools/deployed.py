#!/usr/bin/env python3
"""
Keep the repo and the deployed n8n workflows honest about each other.

The two project workflows are the real system, but their Code nodes and prompt
parameters are only editable through the n8n API -- which means the repo can
silently stop describing what is actually running. This is the defence: a
byte-exact mirror plus a checker that fails loudly on drift.

  python tools/deployed.py export   # deployed n8n  -> workflow-nodes/   (refresh the mirror)
  python tools/deployed.py check    # compare repo <-> deployed, and assert the invariants

`check` exits non-zero if anything drifted. Run it before any demo and after any
workflow edit.

Nothing here writes to n8n. Export overwrites local files only.

CONFIGURATION
-------------
Reads the repository's own `.env` (see .env.example), or plain environment
variables, which win over the file:

    N8N_API_BASE_URL   https://n8n.example.org/api/v1
    N8N_API_KEY        n8n Settings -> API
    WORKFLOW_A_ID      from the editor URL after you import
    WORKFLOW_B_ID      from the editor URL after you import

Point at a different file with  INTERVIEW_ENV_FILE=/path/to/.env
"""
import json
import io
import os
import re
import sys
import difflib
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIRROR = os.path.join(REPO, 'workflow-nodes')
ENV = os.environ.get('INTERVIEW_ENV_FILE') or os.path.join(REPO, '.env')

# Parameters worth mirroring beyond Code nodes: the long prompts and SQL that
# carry the actual behaviour.
PARAM_KEYS = ('jsCode', 'query', 'text', 'responseBody', 'body', 'url')


REQUIRED = ('N8N_API_BASE_URL', 'N8N_API_KEY', 'WORKFLOW_A_ID', 'WORKFLOW_B_ID')


def env():
    """Repo .env, overridden by real environment variables."""
    out = {}
    if os.path.isfile(ENV):
        for line in io.open(ENV, encoding='utf-8', errors='replace'):
            m = re.match(r'^\s*([A-Z0-9_]+)\s*=\s*(.*)$', line.strip())
            if m and not line.lstrip().startswith('#'):
                out[m.group(1)] = m.group(2).strip().strip('"\'')
    for k in REQUIRED:
        if os.environ.get(k):
            out[k] = os.environ[k]
    missing = [k for k in REQUIRED if not out.get(k)]
    if missing:
        sys.stderr.write(
            'Missing configuration: %s\n\n'
            'Set them in %s (copy .env.example) or as environment variables.\n'
            'The two workflow IDs appear in the n8n editor URL after you import.\n'
            % (', '.join(missing), ENV))
        sys.exit(2)
    return out


def workflows():
    e = env()
    return {'A-session-provisioning': e['WORKFLOW_A_ID'],
            'B-post-call-analysis': e['WORKFLOW_B_ID']}


def fetch(wid):
    e = env()
    req = urllib.request.Request(
        e['N8N_API_BASE_URL'] + '/workflows/' + wid,
        headers={'X-N8N-API-KEY': e['N8N_API_KEY'],
                 # Cloudflare fronts n8n and blocks python-urllib's default UA
                 'User-Agent': 'curl/8.4.0', 'Accept': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=60))


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def extract(wf):
    """Deployed workflow -> {relative path: text} of everything we mirror."""
    files = {}
    for n in wf['nodes']:
        p = n.get('parameters') or {}
        for key in PARAM_KEYS:
            v = p.get(key)
            if not isinstance(v, str) or len(v) < 200:
                continue  # short values are plumbing, not behaviour
            ext = 'js' if key == 'jsCode' else ('sql' if key == 'query' else 'txt')
            files['%s.%s.%s' % (slug(n['name']), key, ext)] = v
        opts = p.get('options') or {}
        sysmsg = opts.get('systemMessage') if isinstance(opts, dict) else None
        if isinstance(sysmsg, str) and len(sysmsg) > 200:
            files['%s.systemMessage.md' % slug(n['name'])] = sysmsg
    return files


# ---------------------------------------------------------------- invariants
# Things the deployment owner has explicitly asked to be set in stone. Each returns an error
# string, or None when satisfied.

def invariant_voice(files):
    js = files.get('build-assistant-body.jsCode.js')
    if js is None:
        return "Build Assistant Body node not found"
    want = [("provider: 'vapi'", "voice provider must be vapi"),
            ("voiceId: 'Elliot'", "voiceId must be Elliot"),
            ("version: '2'", "voice version must be '2' (Elliot V2)"),
            ("language: 'auto'", "voice language must be auto (V2 detection)")]
    block = js[js.find('voice: {'):js.find('voice: {') + 400] if 'voice: {' in js else ''
    missing = [msg for token, msg in want if token not in block]
    return '; '.join(missing) or None


def invariant_single_name(files):
    arch = files.get('architect-generate-interviewer-prompt.systemMessage.md')
    if arch is None:
        return "Architect systemMessage not found"
    problems = []
    if not re.search(r'must not use their name again|not say their name again', arch, re.I):
        problems.append("architect prompt no longer forbids a second use of the name")
    if re.search(r"first name must appear in the interviewer's \*\*opening turn\*\*", arch, re.I):
        problems.append("architect prompt has reverted to REQUIRING the name in the opening turn")
    js = files.get('build-assistant-body.jsCode.js') or ''
    if 'do not say' not in js.lower() or 'name again' not in js.lower():
        problems.append("Platform Delivery Rules no longer carry the do-not-repeat-the-name backstop")
    return '; '.join(problems) or None


def invariant_no_tools(files):
    js = files.get('build-assistant-body.jsCode.js') or ''
    # Strip line comments first: the node deliberately carries the comment
    # "// no tools: the interviewer has none", which a naive search matches.
    code = re.sub(r'//[^\n]*', '', js)
    return "assistant body declares tools; the interviewer must have none" if re.search(r'\btools\s*:', code) else None


INVARIANTS = [
    ('voice is vapi/Elliot v2', invariant_voice),
    ('name is said exactly once', invariant_single_name),
    ('no tools on the assistant', invariant_no_tools),
]


def cmd_export():
    os.makedirs(MIRROR, exist_ok=True)
    total = 0
    for name, wid in workflows().items():
        wf = fetch(wid)
        d = os.path.join(MIRROR, name)
        os.makedirs(d, exist_ok=True)
        files = extract(wf)
        for rel, text in files.items():
            io.open(os.path.join(d, rel), 'w', encoding='utf-8', newline='\n').write(text)
        io.open(os.path.join(d, '_nodes.json'), 'w', encoding='utf-8', newline='\n').write(
            json.dumps([{'name': n['name'], 'type': n['type'], 'typeVersion': n.get('typeVersion')}
                        for n in sorted(wf['nodes'], key=lambda x: x['name'])], indent=2))
        print('  %-26s %d files' % (name, len(files)))
        total += len(files)
    print('exported %d files to workflow-nodes/' % total)
    return 0


def cmd_check():
    failures = []
    all_files = {}
    for name, wid in workflows().items():
        wf = fetch(wid)
        deployed = extract(wf)
        all_files.update(deployed)
        d = os.path.join(MIRROR, name)
        print('=== %s ===' % name)
        if not os.path.isdir(d):
            print('  NO MIRROR -- run: python tools/deployed.py export')
            failures.append('%s: no mirror' % name)
            continue
        on_disk = {f for f in os.listdir(d) if not f.startswith('_')}
        for rel in sorted(set(deployed) | on_disk):
            path = os.path.join(d, rel)
            live = deployed.get(rel)
            local = io.open(path, encoding='utf-8').read() if os.path.exists(path) else None
            if live is None:
                print('  %-52s ONLY IN REPO (node removed?)' % rel)
                failures.append('%s/%s only in repo' % (name, rel))
            elif local is None:
                print('  %-52s ONLY DEPLOYED (run export)' % rel)
                failures.append('%s/%s not mirrored' % (name, rel))
            elif live.replace('\r\n', '\n') == local.replace('\r\n', '\n'):
                print('  %-52s IDENTICAL' % rel)
            else:
                print('  %-52s DRIFTED' % rel)
                failures.append('%s/%s drifted' % (name, rel))
                for line in list(difflib.unified_diff(
                        local.splitlines(), live.splitlines(),
                        fromfile='repo', tofile='deployed', lineterm='', n=1))[:12]:
                    print('      ' + line[:150])
        print()

    print('=== invariants (set in stone) ===')
    for label, fn in INVARIANTS:
        err = fn(all_files)
        print('  %-34s %s' % (label, 'OK' if err is None else 'FAIL -- ' + err))
        if err:
            failures.append('invariant: %s (%s)' % (label, err))

    print()
    if failures:
        print('DRIFT DETECTED (%d):' % len(failures))
        for f in failures:
            print('  -', f)
        return 1
    print('All mirrored files identical and all invariants hold.')
    return 0


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if mode == 'export':
        sys.exit(cmd_export())
    elif mode == 'check':
        sys.exit(cmd_check())
    print(__doc__)
    sys.exit(2)
