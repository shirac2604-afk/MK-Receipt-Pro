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
    windows_auth = read("apps/windows/apps/desktop/electron/main/SupabaseCloudService.ts")
    android_app = read("apps/android/app.json")
    windows_ipc = read("apps/windows/apps/desktop/electron/ipc/databaseHandlers.ts")
    docs = read("docs/PASSWORD_RECOVERY_STAGING.md")

    for platform, source in (("Android", android_auth), ("Windows", windows_auth)):
        require(has_auth_option(source, "persistSession", "false"), f"{platform} recovery client must not persist a session")
        require(has_auth_option(source, "autoRefreshToken", "false"), f"{platform} recovery client must not refresh a session")
        require(has_auth_option(source, "detectSessionInUrl", "false"), f"{platform} recovery client must not consume URL tokens")
        require("resetPasswordForEmail" in source, f"{platform} must request Supabase password recovery")
        require("PASSWORD_RESET_REDIRECT_URL" in source, f"{platform} must use the controlled reset page")
        require("redirectTo:PASSWORD_RESET_REDIRECT_URL" in source, f"{platform} reset request must use the controlled redirect")
        require("verifyOtp" not in source, f"{platform} must not verify recovery OTPs locally")
        require("RECOVERY_TOKEN_RE" not in source, f"{platform} must not parse recovery tokens locally")

    require("scheme" not in android_app and "intentFilters" not in android_app,
            "Phase 15 must not add an Android deep-link trust boundary")
    require("request-password-recovery" in windows_ipc and "recover-password" not in windows_ipc,
            "Windows IPC must expose only the reset-link request operation")
    require("Staging" in docs and "PASSWORD_RESET_REDIRECT_URL" not in docs,
            "Staging test guidance must not depend on source constants")
    require("password-reset" in docs and "Production" in docs,
            "Reset-link destination and Production guardrail must be documented")

    print("PASS: Phase 15 static security gate")


if __name__ == "__main__":
    main()
