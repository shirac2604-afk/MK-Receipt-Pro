from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
FAIL=[]

blocked_suffixes={'.keystore','.jks','.p12','.pem','.key','.apk','.aab','.exe','.msi'}
blocked_names={'.env'}
for p in ROOT.rglob('*'):
    if '.git' in p.parts or 'node_modules' in p.parts:
        continue
    if p.is_file():
        if p.name in blocked_names or p.suffix.lower() in blocked_suffixes:
            FAIL.append(f'blocked file committed: {p.relative_to(ROOT)}')

example=ROOT/'apps/android/.env.example'
if example.exists():
    t=example.read_text(encoding='utf-8',errors='ignore')
    if 'YOUR_PROJECT' not in t or 'YOUR_PUBLISHABLE_KEY' not in t:
        FAIL.append('.env.example must contain placeholders only')

patterns=[
    re.compile(r'\bservice_role\b',re.I),
    re.compile(r'SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+',re.I),
    re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(r'\bsk-[A-Za-z0-9_-]{20,}\b'),
]
scan_ext={'.ts','.tsx','.js','.mjs','.cjs','.json','.yml','.yaml','.md','.sql','.ps1','.sh','.txt'}
for p in ROOT.rglob('*'):
    if not p.is_file() or p.suffix.lower() not in scan_ext or '.git' in p.parts or 'node_modules' in p.parts:
        continue
    rel=str(p.relative_to(ROOT))
    # Policy/docs may mention the literal term service_role as a prohibition.
    text=p.read_text(encoding='utf-8',errors='ignore')
    for pat in patterns[1:]:
        if pat.search(text): FAIL.append(f'possible secret pattern in {rel}: {pat.pattern}')

# Require all third-party actions to be pinned to a 40-char commit SHA.
for wf in (ROOT/'.github/workflows').glob('*.yml'):
    text=wf.read_text(encoding='utf-8',errors='ignore')
    for action,ref in re.findall(r'uses:\s*([^\s@]+)@([^\s#]+)',text):
        if action.startswith('./'):
            continue
        if not re.fullmatch(r'[0-9a-fA-F]{40}',ref):
            FAIL.append(f'unpinned action in {wf.name}: {action}@{ref}')

if FAIL:
    print('Security Phase 8 FAIL')
    for x in FAIL: print('FAIL',x)
    sys.exit(1)
print('Security Phase 8 static gate: PASS')
