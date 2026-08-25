from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

checks = [
    (
        "Android authenticated password change",
        ["node", "scripts/verify-password-change.mjs"],
        ROOT / "apps/android",
    ),
    (
        "Windows authenticated password change",
        ["node", "scripts/verify-password-change.mjs"],
        ROOT / "apps/windows",
    ),
]

failed = False
for label, command, cwd in checks:
    result = subprocess.run(command, cwd=cwd, check=False)
    if result.returncode:
        print(f"FAIL {label}")
        failed = True
    else:
        print(f"PASS {label}")

if failed:
    sys.exit(1)

print("Security Phase 13 authenticated password-change gate: PASS")
