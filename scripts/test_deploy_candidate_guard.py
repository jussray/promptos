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

        (repo / "receipts" / "proof.md").write_text("baseline\nsafe evidence\n", encoding="utf-8")
        run(repo, "git", "add", "receipts/proof.md")
        run(repo, "git", "commit", "-qm", "safe evidence drift")
        evidence_head = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
        safe = run(repo, sys.executable, str(GUARD), candidate, evidence_head, check=False)
        if safe.returncode != 0:
            fail("evidence-only drift incorrectly revoked candidate:\n" + safe.stdout + safe.stderr)

        (repo / "docs" / "FOUNDER_INTELLIGENCE_CONSTITUTION.md").write_text("authority v2\n", encoding="utf-8")
        run(repo, "git", "add", "docs/FOUNDER_INTELLIGENCE_CONSTITUTION.md")
        run(repo, "git", "commit", "-qm", "authority drift")
        authority_head = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
        authority = run(repo, sys.executable, str(GUARD), candidate, authority_head, check=False)
        if authority.returncode == 0:
            fail("governance document drift incorrectly preserved candidate")

        run(repo, "git", "reset", "--hard", evidence_head)
        (repo / "parts" / "app.js").write_text("export const runtime = 2;\n", encoding="utf-8")
        run(repo, "git", "add", "parts/app.js")
        run(repo, "git", "commit", "-qm", "runtime drift")
        runtime_head = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
        unsafe = run(repo, sys.executable, str(GUARD), candidate, runtime_head, check=False)
        if unsafe.returncode == 0:
            fail("staged runtime drift incorrectly preserved candidate")

    print("PROMPTOS LEASE TEST PASS: evidence-only drift leases; governance/runtime drift revokes")


if __name__ == "__main__":
    main()
