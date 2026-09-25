#!/usr/bin/env python3
"""Behavioral attack test for PromptOS deployment candidate leases."""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
GUARD = ROOT / "scripts" / "deploy_candidate_guard.py"
POLICY = ROOT / ".deployment-authority.json"


def fail(message: str) -> None:
    print(f"PROMPTOS LEASE TEST FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def run(cwd: pathlib.Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True, check=False)
    if check and result.returncode != 0:
        fail(f"command failed: {' '.join(args)}\n{result.stdout}{result.stderr}")
    return result


def guard(repo: pathlib.Path, candidate: str, current: str) -> subprocess.CompletedProcess[str]:
    return run(repo, sys.executable, str(GUARD), candidate, current, check=False)


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        repo = pathlib.Path(tmp)
        run(repo, "git", "init", "-q", "-b", "main")
        run(repo, "git", "config", "user.email", "lease@example.invalid")
        run(repo, "git", "config", "user.name", "PromptOS Lease Test")
        (repo / "parts").mkdir()
        (repo / "receipts").mkdir()
        (repo / "docs").mkdir()
        (repo / "parts" / "app.js").write_text("export const runtime = 1;\n", encoding="utf-8")
        (repo / "receipts" / "proof.md").write_text("baseline\n", encoding="utf-8")
        (repo / "docs" / "FOUNDER_INTELLIGENCE_CONSTITUTION.md").write_text("authority v1\n", encoding="utf-8")
        (repo / ".deployment-authority.json").write_text(POLICY.read_text(encoding="utf-8"), encoding="utf-8")
        run(repo, "git", "add", ".")
        run(repo, "git", "commit", "-qm", "candidate")
        candidate = run(repo, "git", "rev-parse", "HEAD").stdout.strip()

        # Unicode evidence path must remain exact and safe.
        unicode_receipt = repo / "receipts" / "café.md"
        unicode_receipt.write_text("safe evidence\n", encoding="utf-8")
        run(repo, "git", "add", "receipts/café.md")
        run(repo, "git", "commit", "-qm", "safe unicode evidence drift")
        evidence_head = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
        safe = guard(repo, candidate, evidence_head)
        if safe.returncode != 0:
            fail("evidence-only Unicode drift incorrectly revoked candidate:\n" + safe.stdout + safe.stderr)

        # Governance prose is authority-bearing and must revoke.
        (repo / "docs" / "FOUNDER_INTELLIGENCE_CONSTITUTION.md").write_text("authority v2\n", encoding="utf-8")
        run(repo, "git", "add", "docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md")
        run(repo, "git", "commit", "-qm", "authority drift")
        authority_head = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
        if guard(repo, candidate, authority_head).returncode == 0:
            fail("governance document drift incorrectly preserved candidate")

        # A sensitive change followed by a revert must still revoke the older lease.
        run(repo, "git", "reset", "--hard", evidence_head)
        (repo / "parts" / "app.js").write_text("export const runtime = 2;\n", encoding="utf-8")
        run(repo, "git", "add", "parts/app.js")
        run(repo, "git", "commit", "-qm", "runtime drift")
        runtime_commit = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
        run(repo, "git", "revert", "--no-edit", runtime_commit)
        (repo / "receipts" / "proof.md").write_text("baseline\nafter revert evidence\n", encoding="utf-8")
        run(repo, "git", "add", "receipts/proof.md")
        run(repo, "git", "commit", "-qm", "safe receipt after revert")
        reverted_head = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
        if guard(repo, candidate, reverted_head).returncode == 0:
            fail("runtime change followed by revert incorrectly restored candidate authority")

        # Leading whitespace is part of a Git path and must never be trimmed into an allowlisted path.
        run(repo, "git", "reset", "--hard", evidence_head)
        forged = repo / " receipts"
        forged.mkdir()
        (forged / "forged.md").write_text("unsafe exact path\n", encoding="utf-8")
        run(repo, "git", "add", " receipts/forged.md")
        run(repo, "git", "commit", "-qm", "leading-space path drift")
        whitespace_head = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
        if guard(repo, candidate, whitespace_head).returncode == 0:
            fail("leading-space unknown path was incorrectly normalized into the safe allowlist")

    print("PROMPTOS LEASE TEST PASS: exact safe evidence leases; governance, reverted runtime, and forged paths revoke")


if __name__ == "__main__":
    main()
