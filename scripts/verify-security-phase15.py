#!/usr/bin/env python3
"""Static security gate for Phase 15 password recovery."""

from __future__ import annotations

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        print(f"FAIL: {message}")
        raise SystemExit(1)


def has_auth_option(source: str, option: str, value: str) -> bool:
    return re.search(rf"{re.escape(option)}\s*:\s*{re.escape(value)}", source) is not None


def main() -> None:
    android_auth = read("apps/android/src/auth/AuthService.ts")
    android_context = read("apps/android/src/context/AuthContext.tsx")
    android_app = read("apps/android/app.json")
    windows_auth = read("apps/windows/apps/desktop/electron/main/SupabaseCloudService.ts")
    windows_main = read("apps/windows/apps/desktop/electron/main/main.ts")
    windows_ipc = read("apps/windows/apps/desktop/electron/ipc/databaseHandlers.ts")
    windows_preload = read("apps/windows/apps/desktop/electron/preload/preload.ts")
    windows_types = read("apps/windows/packages/database/src/types.ts")
    windows_package = read("apps/windows/package.json")
    retired_endpoint = read("supabase/functions/password-reset/index.ts")
    docs = read("docs/PASSWORD_RECOVERY_STAGING.md")

    for platform, source in (("Android", android_auth), ("Windows", windows_auth)):
        require(has_auth_option(source, "persistSession", "false"), f"{platform} recovery client must not persist a session")
        require(has_auth_option(source, "autoRefreshToken", "false"), f"{platform} recovery client must not refresh a session")
        require(has_auth_option(source, "detectSessionInUrl", "false"), f"{platform} recovery client must not consume URL tokens implicitly")
        require('PASSWORD_RESET_REDIRECT_URL="mkreceiptpro://auth/recovery"' in source, f"{platform} must use the exact registered callback")
        require("resetPasswordForEmail" in source, f"{platform} must request Supabase password recovery")
        require("parseRecoveryLink" in source and 'fragment.get("type")!=="recovery"' in source, f"{platform} must accept only bounded recovery links")
        require("getUser()" in source and "activeRecovery" in source, f"{platform} must verify a recovery user before allowing password update")
        require('signOut({scope:"global"})' in source and 'signOut({scope:"local"})' in source, f"{platform} must clear sessions after a successful recovery")
        require("verifyOtp" not in source and "RECOVERY_TOKEN_RE" not in source, f"{platform} must not support the previous OTP flow")

    require('"scheme": "mkreceiptpro"' in android_app and '"intentFilters"' not in android_app,
            "Android must register exactly one scheme without broad intent filters")
    require('Linking.addEventListener("url"' in android_context and "beginPasswordRecovery" in android_context,
            "Android must receive the callback through the dedicated recovery handler")
    require("RECOVERY_PROTOCOL=\"mkreceiptpro\"" in windows_main and "requestSingleInstanceLock" in windows_main and "second-instance" in windows_main,
            "Windows must register a single-instance recovery callback path")
    require('"mkreceiptpro"' in windows_package,
            "Windows installer must register the recovery scheme")
    require("password-recovery-status" in windows_ipc and "complete-password-recovery" in windows_ipc,
            "Windows IPC must expose recovery status and completion")
    require("beginPasswordRecovery" not in windows_preload and "completePasswordRecovery" in windows_preload,
            "Windows renderer must never receive a raw recovery URL or token")
    require("access_token" not in windows_types and "refresh_token" not in windows_types,
            "Windows IPC types must never contain recovery tokens")
    require("status:410" in retired_endpoint and "createClient" not in retired_endpoint,
            "The retired Staging endpoint must not process recovery credentials")
    require("mkreceiptpro://auth/recovery" in docs and "{{ .ConfirmationURL }}" in docs and "Production" in docs,
            "Staging test guidance must document the callback, template, and Production guardrail")
    require("Edge Function" not in docs and "functions/v1" not in docs,
            "Staging guidance must not depend on the unsupported HTML Edge Function design")
    require(not (ROOT / ".github/workflows/one-time-phase15-link-migration.yml").exists(),
            "Phase 15 must not retain an auto-migration workflow with write access")

    print("PASS: Phase 15 static security gate")


if __name__ == "__main__":
    main()
