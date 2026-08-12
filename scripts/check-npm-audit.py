import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
label = sys.argv[2] if len(sys.argv) > 2 else path.parent.name
report = json.loads(path.read_text(encoding='utf-8'))
metadata = report.get('metadata', {})
counts = metadata.get('vulnerabilities', {})
print(f"{label} npm audit: info={counts.get('info',0)} low={counts.get('low',0)} moderate={counts.get('moderate',0)} high={counts.get('high',0)} critical={counts.get('critical',0)} total={counts.get('total',0)}")

vulns = report.get('vulnerabilities', {})
for name, item in sorted(vulns.items()):
    severity = item.get('severity', 'unknown')
    if severity in {'high','critical'}:
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
        print(f"BLOCK {severity.upper()} {name}: {'; '.join(summaries[:3])} | fix={fix_text} | nodes={nodes}")

if int(counts.get('high', 0)) or int(counts.get('critical', 0)):
    sys.exit(1)
