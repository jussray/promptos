---
name: memory-snapshot
description: >
  Compile a portable, verified memory snapshot of the user — identity, work, communication
  preferences, people, projects, working style, tools — as one Markdown block another AI
  assistant can load verbatim. Use this whenever the user wants to migrate or export context
  to another assistant (ChatGPT, Gemini, Perplexity, Codex, a new Claude account or project),
  asks "what do you know about me", "who am I", wants a profile/handoff/about-me for an AI,
  wants to seed custom instructions or a memory file, wants to clean up or reconcile a memory
  export pasted from another AI, or says /createskill, /memory-export,
  or similar — even if they never say the word "snapshot". Not for importing someone else's
  export into Claude's memory (that is import-memory).
---

# Memory Snapshot

Produce a snapshot of what you *reliably* know about the user, formatted so it can be pasted
straight into another AI's memory. That downstream AI will treat every line as true and act on
it for months, so one wrong or invented fact costs more than ten missing ones. Quality beats
completeness.

## 1. Inventory your real sources first

Before writing anything, list what you can actually see. Typical sources:

- conversation history or memory available in this context
- saved user preferences / custom instructions / CLAUDE.md
- files, repos, or pasted transcripts the user pointed you at
- connected-account metadata (only as weak evidence of tool usage)

Be honest about the gap: if you cannot see past conversations, say so and build only from what
you can see. Never pretend to remember sessions that aren't in context.

If there are no real sources, so all you have is the request itself, don't build a snapshot
out of it. The phrasing or tone of one message is not a durable preference, and "is switching
to Gemini" is not a fact the next assistant needs. Say plainly that you have nothing to draw
from, then hand over `assets/intake-template.md` (or offer to ask its questions here) so the
user can give you real material. If there are only a few real facts, write a short snapshot
with just those. A short true snapshot beats a padded one.

## 2. Extract, then filter

For each candidate fact, keep it only if all of these hold:

- **Stated or directly evidenced** — the user said it, or a source they own shows it.
  `(inferred)` is a narrow label: use it for a conclusion that follows from the user's own
  statements or from a pattern repeated across conversations. A conclusion drawn from one
  incidental act is a guess, and guesses get dropped, not labelled. Examples of guesses: "uses
  Fahrenheit" because they once asked for a conversion, "prefers casual replies" from the tone
  of one message, "may have a second child" because another AI said so. The downstream AI
  can't see the label's reasoning; to it an `(inferred)` bullet is still a bullet it will act on.
- **Durable** — likely still true in a year. Skip one-off moods, a single errand, a price that
  will change, a temporary account status, a deadline that has passed. The *request* can be
  one-off while the fact it reveals is durable: "cake ideas for my daughter's 7th birthday" is
  an errand, but "has a daughter" is worth keeping.
- **Current** — when sources disagree over time, the newest statement wins. If the user moved,
  changed jobs, or corrected an earlier fact, write only the current version (optionally noting
  the change if it matters, e.g. "recently moved from Chicago"). Never present the stale value as
  current.
- **Faithful** — keep the user's own hedges. "I muddle through Spanish" becomes "has limited
  Spanish", not "speaks Spanish". Don't upgrade a maybe into a fact.
- **Not sensitive** — skip health conditions, mental health, finances (income, debt, account
  balances), and similar, *unless the user explicitly asked you to remember that item*. Stated
  allergies, dietary restrictions, and accessibility needs belong in "Health & dietary" because
  they are practical and the section asks for them — but only when the user stated them.
- **Not someone else's secret** — details about other people stay minimal: first name,
  relationship, one salient detail. Another person's health detail (often a child's allergy)
  goes in only when it changes how the assistant should help, such as household food
  suggestions; mention in your reply that you included it so the user can remove it.

**Other assistants' memory is a claim, not a fact.** In a migration you will often see a pasted
memory export, a profile written by ChatGPT or Gemini, or a summary from a previous session. It
may contain guesses, stale items, or plain errors. Keep an item from it only if the user's own
words back it up, and drop it if their words contradict it. If nothing in the user's words
confirms or contradicts an item, leave it out of the snapshot and list it in your reply under
"unconfirmed: tell me if these are true". That way the user decides, and the guess doesn't
travel on to a third assistant. Never let a fact gain certainty just because it went through
another AI.

Pronouns: use only pronouns the user stated. A name never tells you pronouns; default to
they/them when unstated and say so in Identity.

## 3. Write the block

Use the user's own section list and word limit if they gave them. Those always beat the
defaults (pass them to the checker with `--headers` and `--max-words`). Otherwise use this
default order:

```
## Identity
## Profession & work
## Communication preferences
## Recurring people
## Health & dietary
## Interests & hobbies
## Ongoing projects
## Working style & values
## Tools & environment
## Anything else durable
```

Rules for the block (these exist because the receiving AI ingests it mechanically):

- One Markdown code block, only the section headers above; omit any section with nothing solid
  — no "N/A", no placeholders.
- Third person ("the user", "they"), one factual sentence per bullet, no narrative or
  transitions.
- Append `(inferred)` only under the narrow rule in step 2; anything weaker is dropped.
- Hard cap: 2000 words (or the user's cap). Aim well under it.
- Prefer specifics the next AI can act on ("wants reports as REALITY / FIX / PROOF") over
  vague adjectives ("detail-oriented").

## 4. Check it

Save the block to a `.md` file and run the bundled checker:

```bash
python <skill-dir>/scripts/check_snapshot.py snapshot.md
```

It flags unknown headers, empty sections, over-cap word counts, first/second-person slips, and
multi-sentence bullets. Fix what it flags (or consciously override a false positive).

## 5. Deliver

Reply with:

1. One line naming the sources you used (and any you could not access).
2. The snapshot block itself.
3. One or two lines listing *categories* you deliberately excluded (e.g. "left out health and
   financial details") and the gaps the user could fill — without repeating the excluded content.
4. If any items were unconfirmed (usually from another AI's export), list them briefly as
   questions the user can answer.

Save the file somewhere the user can open. Do not commit it to a repo, post it, upload it, or
write it into another service unless the user asks: a profile of a person is private by
default, and a public repo or shared doc makes it permanent.

## Example bullet quality

Good: `- The user wants every UI fix verified with a Playwright run before it is called done.`
Bad: `- The user is very thorough and cares about quality and testing and proof.` (vague, multi-idea)
Bad: `- He lives in Atlanta.` (pronoun guessed, location never stated)
