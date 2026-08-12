import json
import sys
from pathlib import Path

args = sys.argv[1:]
if not args:
    raise SystemExit('usage: check-npm-audit.py REPORT [LABEL] [--baseline FILE]')
path = Path(args[0])
label = args[1] if len(args) > 1 and args[1] != '--baseline' else path.parent.name
baseline_path = None
if '--baseline' in args:
    i = args.index('--baseline')
    if i + 1 >= len(args):
        raise SystemExit('--baseline requires a file')
    baseline_path = Path(args[i + 1])

report = json.loads(path.read_text(encoding='utf-8'))
metadata = report.get('metadata', {})
counts = metadata.get('vulnerabilities', {})
critical_count = int(counts.get('critical', 0))
high_count = int(counts.get('high', 0))
print(f"{label} npm audit: info={counts.get('info',0)} low={counts.get('low',0)} moderate={counts.get('moderate',0)} high={high_count} critical={critical_count} total={counts.get('total',0)}")

vulns = report.get('vulnerabilities', {})
high_packages = set()
for name, item in sorted(vulns.items()):
    severity = item.get('severity', 'unknown')
    if severity in {'high','critical'}:
        if severity == 'high':
            high_packages.add(name)
        via = item.get('via', [])
        summaries = []
        for entry in via:
            if isinstance(entry, dict):
                summaries.append(str(entry.get('title') or entry.get('name') or 'advisory'))
            elif isinstance(entry, str):
                summaries.append(entry)
        fix = item.get('fixAvailable', False)
        if isinstance(fix, dict):
            fix_text = f"{fix.get('name','?')}@{fix.get('version','?')} major={bool(fix.get('isSemVerMajor'))}"
        else:
            fix_text = str(fix)
        nodes = ','.join(item.get('nodes', [])[:3])
        print(f"{severity.upper()} {name}: {'; '.join(summaries[:3])} | fix={fix_text} | nodes={nodes}")

if baseline_path is None:
    if high_count or critical_count:
        raise SystemExit(1)
    print('PASS strict high/critical gate')
    raise SystemExit(0)

baseline = json.loads(baseline_path.read_text(encoding='utf-8'))
critical_max = int(baseline.get('critical_max', 0))
high_max = int(baseline.get('high_max', 0))
known = set(baseline.get('known_high_packages', []))
new_high = sorted(high_packages - known)
missing_known = sorted(known - high_packages)

failed = False
if critical_count > critical_max:
    print(f'FAIL critical count {critical_count} exceeds reviewed max {critical_max}')
    failed = True
if high_count > high_max:
    print(f'FAIL high count {high_count} exceeds reviewed max {high_max}')
    failed = True
if new_high:
    print('FAIL new high packages: ' + ', '.join(new_high))
    failed = True
if missing_known:
    print('INFO previously known highs not currently present: ' + ', '.join(missing_known))

if failed:
    raise SystemExit(1)
print('PASS reviewed known-risk baseline (not remediation)')
