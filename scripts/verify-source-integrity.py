#!/usr/bin/env python3
"""Fail closed when tracked source or npm lockfiles were truncated or corrupted."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TRUNCATION_MARKERS = (
    b"Warning: truncated " + b"output (original token count:",
    b"tokens " + b"truncated",
)
PACKAGE_DIRS = (ROOT / "apps" / "android", ROOT / "apps" / "windows")
DEPENDENCY_KEYS = (
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
)


def tracked_files() -> list[Path]:
    raw = subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=ROOT
    )
    return [ROOT / item.decode("utf-8") for item in raw.split(b"\0") if item]


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError("top-level JSON value must be an object")
    return value


def normalized_map(value: Any) -> dict[str, str]:
    if value is None:
        return {}
    if not isinstance(value, dict) or not all(
        isinstance(key, str) and isinstance(item, str)
        for key, item in value.items()
    ):
        raise ValueError("dependency map must contain string keys and values")
    return dict(value)


def main() -> int:
    errors: list[str] = []
    files = tracked_files()

    for path in files:
        try:
            payload = path.read_bytes()
        except OSError as error:
            errors.append(f"cannot read {path.relative_to(ROOT)}: {error}")
            continue
        if any(marker in payload for marker in TRUNCATION_MARKERS):
            errors.append(f"truncation marker in {path.relative_to(ROOT)}")

    json_files = [path for path in files if path.suffix.lower() == ".json"]
    for path in json_files:
        try:
            read_json(path)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            errors.append(f"invalid JSON {path.relative_to(ROOT)}: {error}")

    for package_dir in PACKAGE_DIRS:
        package_path = package_dir / "package.json"
        lock_path = package_dir / "package-lock.json"
        try:
            package = read_json(package_path)
            lock = read_json(lock_path)
            root_package = lock.get("packages", {}).get("")
            if not isinstance(root_package, dict):
                raise ValueError("package-lock packages[''] is missing")
            if lock.get("lockfileVersion") != 3:
                raise ValueError("package-lock must use lockfileVersion 3")
            for key in ("name", "version"):
                expected = package.get(key)
                if lock.get(key) != expected or root_package.get(key) != expected:
                    raise ValueError(f"package-lock {key} does not match package.json")
            for key in DEPENDENCY_KEYS:
                if normalized_map(package.get(key)) != normalized_map(root_package.get(key)):
                    raise ValueError(f"package-lock {key} does not match package.json")
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            errors.append(f"invalid npm lock integrity in {package_dir.relative_to(ROOT)}: {error}")

    if errors:
        for error in errors:
            print(f"FAIL {error}")
        return 1

    print(f"PASS {len(json_files)} tracked JSON files parse successfully")
    print("PASS tracked files contain no output-truncation markers")
    print("PASS Android and Windows lockfiles match package metadata")
    print("Security Phase 14 source-integrity gate: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
