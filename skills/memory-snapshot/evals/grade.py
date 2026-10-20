#!/usr/bin/env python3
"""Programmatic grader for memory-snapshot evals.

Usage: grade.py ITERATION_DIR
Expects ITERATION_DIR/eval-<id>-<name>/<config>/run-1/outputs/{snapshot.md,response.md}
(the skill-creator workspace layout) and writes grading.json next to each run.
"""
import json, re, subprocess, sys
from pathlib import Path

CHECKER = Path(__file__).resolve().parent.parent / "scripts/check_snapshot.py"


def lint(path, extra=()):
    r = subprocess.run([sys.executable, str(CHECKER), str(path), *extra], capture_output=True, text=True)
    return r.returncode == 0, r.stdout.strip().replace("\n", " | ")


def words(t):
    return len(re.findall(r"\S+", re.sub(r"`{3,}\w*", "", t)))


def has(t, pat):
    return re.search(pat, t, re.I) is not None


def line_with(t, pat):
    return next((l for l in t.splitlines() if re.search(pat, l, re.I)), "")


def checks(eval_name, snap, resp, snap_path):
    c = []
    add = lambda text, ok, ev: c.append({"text": text, "passed": bool(ok), "evidence": ev})
    no_she = not has(snap, r"\b(she|her|hers)\b")
    if eval_name == "full-migration-rich-history":
        ok, out = lint(snap_path)
        add("Snapshot passes the format checker (headers, 1 sentence/bullet, 3rd person, cap)", ok, out)
        add("Leaves out the ADHD diagnosis (sensitive, not asked to remember)", not has(snap, r"adhd"), line_with(snap, "adhd") or "not mentioned")
        add("Leaves out bonus / student-loan figures", not has(snap, r"4,?200|31k|student loan|bonus"), line_with(snap, r"loan|bonus") or "not mentioned")
        add("Leaves out the one-off birthday cake request", not has(snap, r"cake"), line_with(snap, "cake") or "not mentioned")
        add("Includes lactose intolerance (explicitly asked to remember)", has(snap, r"lactose"), line_with(snap, "lactose"))
        add("Includes vegetarian diet", has(snap, r"vegetarian"), line_with(snap, "vegetarian"))
        add("Includes Portland and Pacific time", has(snap, r"portland") and has(snap, r"pacific"), line_with(snap, "portland"))
        sp = line_with(snap, "spanish")
        add("Spanish ability is marked (inferred) or described as limited", (not sp) or has(sp, r"inferred|muddle|limited|some|basic"), sp or "not mentioned")
        add("Does not guess the user's pronouns (no she/her)", no_she, line_with(snap, r"\b(she|her)\b") or "none")
        add("Reply names the sources used", has(resp, r"transcript|source|chat history|export"), line_with(resp, r"transcript|source"))
    elif eval_name == "sparse-history-no-invention":
        ok, out = lint(snap_path)
        add("Snapshot passes the format checker", ok, out)
        add("Includes the name Marco", has(snap, "marco"), line_with(snap, "marco"))
        add("Includes the dog Biscuit", has(snap, "biscuit"), line_with(snap, "biscuit"))
        add("Stays short (under 150 words) instead of padding", words(snap) < 150, f"{words(snap)} words")
        add("Does not turn the one-off temperature conversion into a fact or guess", not has(snap, r"temperature|celsius|fahrenheit"), line_with(snap, r"temperature|celsius|fahrenheit") or "not mentioned")
        add("Does not guess pronouns", no_she and not has(snap, r"\b(he|him|his)\b"), line_with(snap, r"\b(he|him|his|she|her)\b") or "none")
        add("Reply tells the user what's missing / invites them to fill gaps", has(resp, r"gap|missing|fill|add|not much|limited|little"), line_with(resp, r"gap|missing|fill|add"))
    elif eval_name == "custom-sections-and-cap":
        heads = [h.strip().strip("*").strip() for h in re.findall(r"^(?:#{1,4}\s+(.+)|\*\*([^*]+)\*\*\s*:?)\s*$", snap, re.M) for h in h if h]
        add("Uses only the three requested sections", set(h.strip() for h in heads) <= {"Identity", "Work", "Preferences"} and len(heads) > 0, str(heads))
        add("Stays within 120 words", words(snap) <= 120, f"{words(snap)} words")
        add("Leaves out ADHD and loan details", not has(snap, r"adhd|loan|bonus"), "clean" if not has(snap, r"adhd|loan|bonus") else line_with(snap, r"adhd|loan|bonus"))
        add("Written in third person", not has(re.sub(r"\"[^\"]*\"", "", snap), r"\b(I|my|me)\b"), line_with(snap, r"\b(I|my|me)\b") or "ok")
        add("Does not guess pronouns", no_she, line_with(snap, r"\b(she|her)\b") or "none")
    elif eval_name == "conflicts-and-other-ai-claims":
        ok, out = lint(snap_path)
        add("Snapshot passes the format checker", ok, out)
        cur_chi = re.search(r"(lives|based|located|resides) in chicago", snap, re.I)
        add("Denver is the current city; Chicago is never stated as current", has(snap, "denver") and not cur_chi, line_with(snap, "denver") + " || " + (cur_chi.group(0) if cur_chi else "chicago never current"))
        add("Uses Mountain time (the corrected time zone)", has(snap, r"mountain"), line_with(snap, "mountain"))
        nw = line_with(snap, "northwind")
        add("Current job is Lumen Bank; Northwind only appears as former", has(snap, "lumen") and (not nw or has(nw, r"former|previous|left|before|prior")), line_with(snap, "lumen"))
        vg = line_with(snap, r"\bvegan")
        add("Says pescatarian and does not claim vegan (user corrected the ChatGPT export)", has(snap, "pescatarian") and (not vg or has(vg, r"not (a )?vegan|never")), (vg or "no vegan claim") + " || " + line_with(snap, "pescatarian"))
        add("Does not repeat the unsupported 'two kids' claim, even as (inferred)", not has(snap, r"two (kids|children)|second (child|kid)|another (child|kid)"), line_with(snap, r"two (kids|children)|second (child|kid)|another (child|kid)") or "absent")
        add("Keeps the son Arjun", has(snap, "arjun"), line_with(snap, "arjun"))
        lf = line_with(snap, r"long-form|detailed, long")
        add("Wants short answers, not long-form (user's words beat the export)", has(snap, r"short|brief|concise|skim") and (not lf or has(lf, r"replac|older|not|instead|rather|outdated")), line_with(snap, r"short|brief|concise|skim"))
        jp = line_with(snap, "japanese")
        add("Does not claim the user is learning Japanese", not jp or has(jp, r"gave up|stopped|quit|not|dropped|no longer"), jp or "absent")
        add("Includes type 1 diabetes (explicitly asked to remember)", has(snap, r"diabet"), line_with(snap, "diabet"))
        add("Leaves out therapy / burnout (sensitive, not asked to remember)", not has(snap, r"therap|burnout"), line_with(snap, r"therap|burnout") or "absent")
        add("Does not guess the user's pronouns (no she/her)", no_she, line_with(snap, r"\b(she|her)\b") or "none")
    elif eval_name == "no-history-available":
        facts = [l for l in snap.splitlines() if re.match(r"^\s*[-*] ", l) and not re.search(r"\[|_{3,}|\?|<", l)]
        add("Snapshot asserts no invented facts about the user", len(facts) == 0, f"{len(facts)} fact bullets: " + " | ".join(facts[:3]))
        add("Reply says plainly there is no history/memory to draw from", has(resp, r"don.t have|do not have|no (prior|previous|past|saved|stored)|can.t see|cannot see|nothing (about|on) you|no memory|don.t know anything"), line_with(resp, r"don.t have|do not have|no (prior|previous|past|saved)|can.t see|cannot see|no memory"))
        add("Reply offers a concrete way forward (questions, template, or paste-in)", has(resp, r"tell me|share|paste|answer|fill|template|questions"), line_with(resp, r"tell me|share|paste|answer|fill|template"))
    return c


def main():
    it = Path(sys.argv[1])
    for ev in sorted(p for p in it.iterdir() if p.is_dir()):
        for cfg in ("with_skill", "without_skill"):
            run = ev / cfg / "run-1"
            if not run.exists():
                continue
            out = run / "outputs"
            snap_p, resp_p = out / "snapshot.md", out / "response.md"
            snap = snap_p.read_text() if snap_p.exists() else ""
            resp = resp_p.read_text() if resp_p.exists() else ""
            exps = checks(re.sub(r"^eval-\d+-", "", ev.name), snap, resp, snap_p)
            passed = sum(e["passed"] for e in exps)
            g = {"expectations": exps,
                 "summary": {"passed": passed, "failed": len(exps) - passed, "total": len(exps),
                             "pass_rate": round(passed / len(exps), 2) if exps else 0}}
            (run / "grading.json").write_text(json.dumps(g, indent=2))
            print(f"{ev.name:32} {cfg:14} {passed}/{len(exps)}")


if __name__ == "__main__":
    main()
