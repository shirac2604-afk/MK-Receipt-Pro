from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

checks = [
    (
        "Android registration password policy",
        ["node", "scripts/verify-auth-password-policy.mjs"],
        ROOT / "apps/android",
    ),
    (
        "Windows cloud session and attachment hardening",
        ["node", "scripts/verify-cloud-session-hardening.mjs"],
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

print("Security Phase 12 auth/session gate: PASS")
