# Human-Safe Build Contract

PromptOS is built for the human choosing, composing, reviewing, and acting on AI-assisted work.

## Core rule

A user-facing prompt surface, route, provider state, automation step, or result workflow must not resolve to silence when the system knows enough to show a state.

Do not use `return null` for loading, error, empty, denied, offline, unavailable, recovery, or transitional states that can block understanding or action.

## Required human-facing states

Every prompt operation must provide the applicable state with clear language and an honest next action:

- loading or checking;
- success;
- empty;
- denied or permission-limited;
- offline or degraded;
- error;
- blocked with the missing input, proof, or approval;
- recovery, retry, revise, back, or safe exit.

Never imply that a prompt, save, provider call, automation, publication, or handoff completed when evidence is missing.

## Where `null` remains valid

`null` may remain in data, parser, registry, provider, service, storage, cache, and optional-value contracts when it explicitly means `not found`, `not configured`, or `not applicable`.

That contract must be typed or tested. A human-facing caller must translate it into a visible state whenever the absence affects comprehension, trust, safety, cost, publication, or the next action.

Optional decorative elements may render nothing only when their absence cannot hide progress, failure, denial, important data, or a required action.

## Safe implementation loop

### Observe

Inspect the active prompt path, component, provider adapter, exact branch head, existing tests, and rendered behavior. Distinguish a valid data sentinel from a blank-state defect.

### Orient

Red-team empty inputs, malformed placeholders, unavailable providers, stale drafts, missing credentials, rate limits, unsafe output, network loss, and narrow/mobile layouts.

### Decide

Choose the smallest proven repair. Prefer platform primitives and existing components. Do not add a dependency when plain JavaScript, browser, Worker, or server behavior is sufficient.

### Act

Render the missing state, preserve human intent and approval boundaries, add a focused regression test, and run the exact applicable proof gates.

## Proof requirements

- Unit or source-contract proof for the state decision.
- Type, test, and build proof where applicable.
- Playwright proof for changed rendered behavior.
- Exact-head CI evidence before merge.

A screenshot, design mock, or green unrelated workflow is not runtime proof.

## Red-team constraints

Never replace `null` mechanically across a repository. Blind replacement can invent output, conceal provider failure, weaken denied states, or trigger unsafe automation.

Never show a saved, published, automated, or successful state when the underlying operation is unknown or failed.

## Definition of done

The change is complete when the human can tell:

1. what the system is doing;
2. what happened;
3. whether the output and intended action are trustworthy;
4. what they can do next;
5. how to recover when recovery is possible.

Build the smallest safe thing, prove it at the exact head, and leave no human staring into an empty frame.
