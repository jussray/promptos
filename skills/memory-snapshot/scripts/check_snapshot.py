#!/usr/bin/env python3
"""Lint a memory snapshot Markdown file.

Usage: check_snapshot.py SNAPSHOT.md [--max-words 2000] [--headers "A,B,..."]
Exit code 0 = clean, 1 = problems found.
"""
import argparse
import re
import sys

DEFAULT_HEADERS = [
    "Identity",
    "Profession & work",
    "Communication preferences",
    "Recurring people",
    "Health & dietary",
    "Interests & hobbies",
    "Ongoing projects",
    "Working style & values",
    "Tools & environment",
    "Anything else durable",
]
PLACEHOLDER = re.compile(r"^\s*[-*]\s*(n/?a|none|unknown|tbd|—|-)\s*\.?\s*$", re.I)
FIRST_SECOND = re.compile(r"\b(I|I'm|I've|me|my|mine|you|your|yours)\b")
SENTENCE_END = re.compile(r"[.!?](?:\s+|$)(?=[A-Z])")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--max-words", type=int, default=2000)
    ap.add_argument("--headers", help="comma-separated allowed section names")
    a = ap.parse_args()

    allowed = [h.strip() for h in a.headers.split(",")] if a.headers else DEFAULT_HEADERS
    text = open(a.path, encoding="utf-8").read()
    # Strip an enclosing code fence if the block was saved fenced.
    text = re.sub(r"^`{3,}\w*\n|\n`{3,}\s*$", "", text.strip())

    problems, sections, current = [], {}, None
    for n, line in enumerate(text.splitlines(), 1):
        if line.startswith("## "):
            current = line[3:].strip()
            if current not in allowed:
                problems.append(f"line {n}: unknown header '{current}'")
            if current in sections:
                problems.append(f"line {n}: duplicate header '{current}'")
            sections[current] = []
            continue
        if not line.strip():
            continue
        if current is None:
            problems.append(f"line {n}: content before first header")
            continue
        sections[current].append((n, line))
        if not re.match(r"^\s*[-*] ", line):
            problems.append(f"line {n}: not a bullet")
            continue
        body = re.sub(r"`[^`]*`", "", line)  # ignore quoted code/snippets
        body = re.sub(r"\"[^\"]*\"|“[^”]*”", "", body)  # ignore quoted user phrases
        if PLACEHOLDER.match(line):
            problems.append(f"line {n}: placeholder bullet")
        if FIRST_SECOND.search(body):
            problems.append(f"line {n}: first/second person ('{FIRST_SECOND.search(body).group(0)}')")
        if len(SENTENCE_END.findall(body.rstrip())) >= 1:
            problems.append(f"line {n}: looks like more than one sentence")

    for name, lines in sections.items():
        if not lines:
            problems.append(f"section '{name}' is empty — omit it instead")

    order = [h for h in allowed if h in sections]
    if list(sections) != order:
        problems.append("sections are out of the expected order")

    words = len(re.findall(r"\S+", text))
    print(f"words: {words}/{a.max_words}  sections: {len(sections)}  "
          f"bullets: {sum(len(v) for v in sections.values())}  "
          f"inferred: {text.count('(inferred)')}")
    if words > a.max_words:
        problems.append(f"over word cap ({words} > {a.max_words})")
    for p in problems:
        print("PROBLEM:", p)
    print("OK" if not problems else f"{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
