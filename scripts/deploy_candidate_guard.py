#!/usr/bin/env python3
"""Validate that an approved PromptOS deployment candidate is still production-equivalent to main.

The candidate SHA remains the immutable proof/deploy subject. Main may advance only
through paths explicitly allowlisted as non-deploying drift. Unknown paths fail
closed. Every intervening commit is inspected, so a sensitive change cannot regain
authority merely by being reverted before the current main tip.
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import pathlib
import re
import subprocess
import sys

SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def die(message: str) -> None:
    print(f"DEPLOY CANDIDATE INVALID: {message}", file=sys.stderr)
    raise SystemExit(1)


def git(*args: str) -> str:
    process = subprocess.run(["git", *args], text=True, capture_output=True, check=False)
    if process.returncode != 0:
        die(process.stderr.strip() or f"git {' '.join(args)} failed")
    return process.stdout.strip()


def git_bytes(*args: str) -> bytes:
    process = subprocess.run(["git", *args], capture_output=True, check=False)
    if process.returncode != 0:
        message = process.stderr.decode("utf-8", "replace").strip()
        die(message or f"git {' '.join(args)} failed")
    return process.stdout


def load_policy(path: pathlib.Path) -> list[str]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        die(f"missing policy file: {path}")
    except json.JSONDecodeError as exc:
        die(f"invalid policy JSON: {exc}")

    if raw.get("version") != 1:
        die("unsupported policy version")
    if raw.get("policy") != "unknown-paths-invalidate-candidate":
        die("policy must remain fail-closed for unknown paths")

    globs = raw.get("safe_drift_globs")
    if not isinstance(globs, list) or not globs or not all(isinstance(item, str) and item for item in globs):
        die("safe_drift_globs must be a non-empty list of strings")
    return globs


def intervening_paths(candidate: str, current: str) -> list[str]:
    """Return the exact path union touched by every commit after candidate through current."""
    commits = [commit for commit in git("rev-list", "--reverse", f"{candidate}..{current}").splitlines() if commit]
    seen: dict[str, None] = {}
    for commit in commits:
        raw = git_bytes("diff-tree", "-m", "--no-commit-id", "--name-only", "-r", "-z", commit)
        for encoded_path in raw.split(b"\0"):
            if not encoded_path:
                continue
            path = encoded_path.decode("utf-8", "surrogateescape")
            seen.setdefault(path, None)
    return list(seen)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("candidate_sha")
    parser.add_argument("current_main_sha")
    parser.add_argument("--policy", default=".deployment-authority.json")
    args = parser.parse_args()

    candidate = args.candidate_sha.lower()
    current = args.current_main_sha.lower()
    if not SHA_RE.fullmatch(candidate):
        die("candidate SHA must be an exact lowercase 40-character commit SHA")
    if not SHA_RE.fullmatch(current):
        die("current main SHA must be an exact lowercase 40-character commit SHA")

    git("cat-file", "-e", f"{candidate}^{{commit}}")
    git("cat-file", "-e", f"{current}^{{commit}}")

    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", candidate, current],
        text=True,
        capture_output=True,
        check=False,
    )
    if ancestor.returncode != 0:
        die("approved candidate is not an ancestor of current main")

    safe_globs = load_policy(pathlib.Path(args.policy))
    changed = intervening_paths(candidate, current)
    unsafe = [path for path in changed if not any(fnmatch.fnmatchcase(path, pattern) for pattern in safe_globs)]

    if unsafe:
        print("Deployment-sensitive drift detected in candidate history:", file=sys.stderr)
        for path in unsafe:
            print(f"  - {path!r}", file=sys.stderr)
        die("an intervening commit touched a path outside the explicit non-deploying allowlist; approve a new candidate")

    print(f"DEPLOY CANDIDATE VALID: {candidate}")
    print(f"CURRENT MAIN: {current}")
    if changed:
        print("SAFE INTERVENING DRIFT:")
        for path in changed:
            print(f"  - {path!r}")
    else:
        print("SAFE INTERVENING DRIFT: none")


if __name__ == "__main__":
    main()
