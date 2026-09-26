const DEEP_JOBS = [
  ['Trace the decision to first principles','restate the real objective, identify governing constraints, and derive the decision from evidence rather than inherited assumptions'],
  ['Map the system before changing it','identify actors, components, dependencies, authority boundaries, data flows, and failure propagation before proposing edits'],
  ['Separate facts from inference','classify claims as verified, inferred, unknown, or blocked and prevent conclusions from outrunning the evidence'],
  ['Find the hidden dependency chain','trace upstream and downstream dependencies, single points of failure, stale assumptions, and coupling that could invalidate the obvious fix'],
  ['Compare three viable paths','produce conservative, balanced, and aggressive options using the same evidence, then compare reversibility, cost, proof burden, and upside'],
  ['Model second-order effects','examine what changes next if the proposed action succeeds, partially succeeds, fails, or changes incentives elsewhere in the system'],
  ['Reduce the problem to the smallest proof','identify the cheapest reversible experiment that resolves the most important uncertainty without spending authority or budget prematurely'],
  ['Reconstruct the real goal','distinguish the stated task from the underlying outcome, user need, launch condition, or business result and optimize for the latter'],
  ['Audit the evidence chain','trace every consequential claim to its source, freshness, exact scope, and whether the evidence actually proves the conclusion being drawn'],
  ['Expose contradictory requirements','find constraints that cannot all be satisfied simultaneously, explain the collision, and propose the smallest explicit tradeoff'],
  ['Design the recovery path first','define rollback, preservation, retry, conflict handling, and observability before choosing an implementation that can create irreversible state'],
  ['Find the leverage point','identify the smallest component, policy, interface, or decision whose change produces the largest verified improvement in the target outcome'],
  ['Challenge the default architecture','compare the current architecture with at least two plausible alternatives and preserve the existing design unless evidence justifies migration'],
  ['Diagnose why the obvious fix may be wrong','test whether the apparent symptom is downstream of another cause, stale proof, environment drift, or an authority/configuration mismatch'],
  ['Turn ambiguity into a decision packet','convert a vague problem into objective, evidence, constraints, unknowns, options, risks, decision rule, proof gate, and stop condition'],
  ['Prioritize under survival constraints','rank work by launch impact, reversibility, cash/time cost, dependency order, and proof value while protecting critical runway'],
  ['Find what must remain unchanged','identify invariants, user-visible behavior, authority boundaries, data guarantees, and working paths that the solution is not allowed to damage'],
  ['Simulate the user path end to end','walk from entry through success, failure, recovery, and repeat use while distinguishing source correctness from actual runtime usability'],
  ['Resolve competing sources of truth','identify which repo, branch, runtime, database, configuration, or external system is authoritative and demote stale copies to evidence only'],
  ['Convert research into an executable test','translate findings into a bounded hypothesis, implementation slice, measurable success/failure threshold, evidence capture, and kill/compound rule'],
  ['Inspect the decision for missing dimensions','check technical, user, legal/compliance, operational, financial, security, accessibility, and distribution implications only where material'],
  ['Reason from failure backward','start from the unacceptable outcome, trace credible paths that could cause it, and add the smallest prevention or detection control at the highest-leverage point'],
  ['Compress a complex plan into sequence','order the work by dependency and proof value, identify what can run in parallel, and stop at the first gate whose result could change later work'],
  ['Decide what not to do','identify attractive but unsupported, premature, duplicative, authority-widening, or low-leverage work and explicitly remove it from the current slice'],
];

const CHALLENGE_JOBS = [
  ['Try to break this plan ten ways','generate ten materially different failure paths spanning assumptions, dependencies, permissions, runtime behavior, stale proof, recovery, and user reality'],
  ['Find the easiest path to failure','look for the cheapest mistake, missing guard, stale dependency, bad default, or environmental mismatch that defeats the intended outcome'],
  ['Challenge every important assumption','list consequential assumptions, produce a falsification test for each, and downgrade any assumption that lacks current evidence'],
  ['Attack the proof, not the claim','look for fake-green tests, weak assertions, untested runtime paths, stale screenshots, wrong environments, and evidence that proves something adjacent instead'],
  ['Probe the authority boundary','identify every mutation, permission, publication, billing, secret, destructive, or privileged step and verify capability is not being confused with approval'],
  ['Search for stale green','invalidate evidence tied to an older commit, branch, deployment, dependency, configuration, dataset, or user path before accepting a previous pass'],
  ['Find the hidden destructive action','inspect retries, migrations, deletes, overwrites, bulk operations, sync, deploys, and cleanup steps for irreversible or unexpectedly broad effects'],
  ['Break the happy path','force empty, invalid, partial, duplicate, interrupted, offline, expired, unauthorized, and dependency-failure states through the primary workflow'],
  ['Challenge the rollback story','assume the change partially executes and test whether state, data, configuration, and user work can actually be recovered without invented steps'],
  ['Find the race and retry failures','probe duplicate submissions, concurrent edits, repeated webhooks, delayed responses, reordered events, timeouts, and non-idempotent retries'],
  ['Test the weakest integration boundary','treat every external API, webhook, plugin, provider, DNS/config edge, and credential boundary as unavailable, stale, malformed, or partially successful'],
  ['Look for silent data corruption','probe schema drift, truncation, coercion, duplicate writes, partial saves, conflict resolution, encoding, ordering, and mismatched identifiers'],
  ['Challenge the user-visible truth','compare what the UI claims with actual backend/runtime state and flag decorative success, misleading status, invented availability, or unsupported metrics'],
  ['Break it on mobile and keyboard','probe responsive layout, touch targets, focus order, dialog behavior, zoom, reduced motion, text overflow, and keyboard-only completion of the real task'],
  ['Find the security shortcut','look for browser-trusted authority, leaked secrets, missing server validation, overly broad tokens, unsafe redirects, injection surfaces, and fail-open behavior'],
  ['Probe cost and scale traps','test unbounded loops, fan-out, repeated model/provider calls, large payloads, cache misses, retry storms, and workload growth that can turn correctness into an outage or bill spike'],
  ['Find the duplicate system','search for old code paths, parallel state stores, duplicate workers, stale configuration, copied prompts, shadow APIs, and two components claiming the same authority'],
  ['Challenge the launch assumption','verify DNS, deployment identity, environment, migrations, auth, real user reachability, observability, rollback, and the exact public path rather than assuming source-green means launched'],
  ['Force contradictory inputs','supply mutually inconsistent constraints, malformed states, missing identifiers, impossible dates, and conflicting permissions and require an explicit fail-closed response'],
  ['Find the dependency that can disappear','remove optional and required dependencies one by one conceptually and identify which failures degrade gracefully versus collapse the core user path'],
  ['Test for evidence laundering','look for claims that cite a test, log, screenshot, tool result, or third-party statement whose scope does not match the conclusion being authorized'],
  ['Challenge the business path','probe whether the workflow actually reaches acquisition, conversion, payment, retention, referral, or another stated outcome instead of ending at activity or visibility'],
  ['Run the adversarial matrix','cross primary user paths with failure classes, authority boundaries, environments, and recovery states; automate expansion only where the test cost stays bounded'],
  ['Decide whether the survivor deserves to ship','after challenges, classify blockers, residual risks, mitigations, proof, rollback, and the smallest remaining gate before a launch or merge decision'],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function deepInstructions(title, focus) {
  return `Work on [SUBJECT] with the goal [GOAL]. ${title}: ${focus}. Start by establishing the authoritative source and current state. Separate VERIFIED, INFERRED, UNKNOWN, and BLOCKED. Identify constraints, invariants, dependencies, authority boundaries, and the assumptions that could change the decision. Compare plausible options using the same evidence. Prefer the smallest reversible action that resolves the highest-value uncertainty. Do not widen permissions, mutate external systems, spend money, publish, merge, or claim runtime proof unless that authority and evidence actually exist. Preserve working behavior and unrelated work. Define the success condition, failure condition, rollback, and stop condition before recommending the next move. End with REALITY, DECISION, PROOF, RISK, ROLLBACK, and NEXT GATE. Do not mention the internal workflow or its nickname in the response.`;
}

function challengeInstructions(title, focus) {
  return `Stress-test [SUBJECT] against the intended outcome [GOAL]. ${title}: ${focus}. Begin from the strongest current evidence, then actively try to falsify the plan rather than confirm it. Use independent challenge lenses so repeated wording does not count as a new failure mode. Probe stale proof, hidden dependencies, authority confusion, user-visible truth, failure/recovery states, regressions, and launch/runtime reality where relevant. For each material finding, state the evidence, consequence, cheapest reproduction or proof gate, smallest reversible repair, and whether it blocks shipping. Do not invent vulnerabilities, failures, integrations, permissions, or proof. Do not widen execution authority. Survivors are not automatically approved: classify residual risk and require explicit evidence for consequential claims. End with SURVIVED, BROKE, BLOCKERS, REPAIR, PROOF, and NEXT GATE. Do not mention the internal workflow or its nickname in the response.`;
}

function makeRecipes(items, familyId, pack, lineage, mode, riskLens, instructionFactory) {
  return items.map(([title, focus], index) => ({
    id:`workflow.curated.${familyId}.${String(index+1).padStart(2,'0')}.${slug(title)}|catalog-v1`,
    title,
    description:'Natural-language workflow trigger with explicit evidence, authority, rollback, and proof behavior.',
    pack,
    familyId,
    clauseIds:[],
    platform:index % 3 === 1 ? 'claude' : index % 3 === 2 ? 'perplexity' : 'chatgpt',
    stage:index % 4 === 0 ? 'audit' : index % 4 === 1 ? 'plan' : index % 4 === 2 ? 'test' : 'research',
    modes:[mode],
    riskLens,
    inputs:['subject','goal'],
    status:'curated',
    version:'catalog-v1',
    workflowLineage:lineage,
    instructions:instructionFactory(title, focus),
  }));
}

export const deepReasoningPrompts = makeRecipes(
  DEEP_JOBS,
  'reasoning.deep.systems',
  'reasoning-workflows',
  ['ultrathink@1.6'],
  'lindy',
  'correctness',
  deepInstructions,
);

export const adversarialChallengePrompts = makeRecipes(
  CHALLENGE_JOBS,
  'reasoning.adversarial.challenge',
  'reasoning-workflows',
  ['attack-ten','attack6000'],
  'redteam',
  'regression',
  challengeInstructions,
);

export const workflowPrompts = [...deepReasoningPrompts, ...adversarialChallengePrompts];
if (deepReasoningPrompts.length !== 24) throw new Error(`Deep reasoning prompt seed drift: expected 24, got ${deepReasoningPrompts.length}`);
if (adversarialChallengePrompts.length !== 24) throw new Error(`Adversarial challenge prompt seed drift: expected 24, got ${adversarialChallengePrompts.length}`);
if (workflowPrompts.length !== 48) throw new Error(`Workflow prompt seed drift: expected 48, got ${workflowPrompts.length}`);
