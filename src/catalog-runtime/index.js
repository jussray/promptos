export { buildCatalogRecipes, CATALOG_TARGET, CATALOG_VERSION } from './catalog/buildCatalog.js';
export { builderPrompts } from './catalog/builderPrompts.js';
export { workflowPrompts, deepReasoningPrompts, adversarialChallengePrompts } from './catalog/workflowPrompts.js';
export { researchExpansionPrompts, researchExpansionGroups } from './catalog/researchExpansionPrompts.js';
export { compilePrompt } from './compiler/compilePrompt.js';
export { openPromptCard } from './openPromptCard.js';
export { canonicalFamilies, ALL_STAGES, ALL_MODES, ALL_RISK_LENSES } from './catalog/families.js';
export { clauses } from './catalog/clauses.js';
export { validateRecipeSpec, shouldRequirePlaywright } from './catalog/compatibility.js';

export const PUBLIC_COMMAND_CATEGORIES = Object.freeze([
  'Build',
  'Money',
  'Sell',
  'Create',
  'Research',
  'Legal',
  'Operate',
  'Communicate',
  'Personal',
]);

const PUBLIC_COMMAND_DEFINITIONS = [
  { id:'fix', aliases:['repair','fixfast'], category:'Build', label:'Fix', description:'Repair one bounded product or repository problem.', capabilityId:'repair', specialist:'current-project', catalogQuery:'repo audit', evidence:'source-and-runtime' },
  { id:'security', aliases:['secure'], category:'Build', label:'Security', description:'Review a product or repository security boundary.', capabilityId:'security-review', specialist:'current-project', catalogQuery:'security', evidence:'source-and-runtime' },
  { id:'architecture', aliases:['arch'], category:'Build', label:'Architecture', description:'Review or shape an existing system architecture.', capabilityId:'architecture-review', specialist:'current-project', catalogQuery:'architecture', evidence:'source' },
  { id:'codereview', aliases:['reviewcode','code-review'], category:'Build', label:'Code review', description:'Review an actual diff or implementation for issues.', capabilityId:'code-review', specialist:'current-project', catalogQuery:'review code', evidence:'source' },
  { id:'integration', aliases:['integrate'], category:'Build', label:'Integration', description:'Plan a bounded tool, provider, or product integration.', capabilityId:'integration-plan', specialist:'current-project', catalogQuery:'integration', evidence:'source-and-provider' },

  { id:'money', aliases:['economics'], category:'Money', label:'Money path', description:'Map truthful costs, revenue paths, and economic gates.', capabilityId:'economics', specialist:'current-project', catalogQuery:'pricing', evidence:'financial-and-product' },
  { id:'investor', aliases:['investorupdate'], category:'Money', label:'Investor update', description:'Build an evidence-bound investor communication.', capabilityId:'investor-comms', specialist:'current-project', catalogQuery:'investor', evidence:'verified-traction' },

  { id:'outreach', aliases:['coldemail','followup'], category:'Sell', label:'Outreach', description:'Prepare project-aware outreach using current relationship context.', capabilityId:'outreach', specialist:'current-project', catalogQuery:'outreach', evidence:'relationship-and-product' },
  { id:'content', aliases:['social'], category:'Sell', label:'Content', description:'Route social and founder content through the content intelligence lane.', capabilityId:'social-content', specialist:'signal-loop', catalogQuery:'social', evidence:'brand-and-channel' },
  { id:'launch', aliases:['golive'], category:'Sell', label:'Launch', description:'Evaluate launch readiness and the smallest safe go-live gate.', capabilityId:'launch-readiness', specialist:'current-project', catalogQuery:'launch', evidence:'source-runtime-and-release' },

  { id:'tagline', aliases:[], category:'Create', label:'Tagline', description:'Create or refine a tagline from current brand canon.', capabilityId:'brand-system', specialist:'current-project', catalogQuery:'brand', evidence:'brand-canon' },
  { id:'slogan', aliases:[], category:'Create', label:'Slogan', description:'Create or refine a slogan without overwriting brand canon.', capabilityId:'brand-system', specialist:'current-project', catalogQuery:'brand', evidence:'brand-canon' },
  { id:'packaging', aliases:['package'], category:'Create', label:'Packaging', description:'Shape product packaging from the actual commerce context.', capabilityId:'commerce-design', specialist:'current-project', catalogQuery:'commerce design', evidence:'product-and-brand' },
  { id:'charactersheet', aliases:['character'], category:'Create', label:'Character sheet', description:'Build or extend a character without contradicting canon.', capabilityId:'creative-canon', specialist:'storyengine', catalogQuery:'character', evidence:'creative-canon' },
  { id:'worldbuilding', aliases:['world','buildworld'], category:'Create', label:'Worldbuilding', description:'Develop a setting through the current story canon.', capabilityId:'creative-canon', specialist:'storyengine', catalogQuery:'world', evidence:'creative-canon' },
  { id:'dialogue', aliases:[], category:'Create', label:'Dialogue', description:'Write dialogue constrained by current character and story canon.', capabilityId:'creative-canon', specialist:'storyengine', catalogQuery:'dialogue', evidence:'creative-canon' },
  { id:'plottwist', aliases:['twist'], category:'Create', label:'Plot twist', description:'Develop a plot turn that preserves established continuity.', capabilityId:'creative-canon', specialist:'storyengine', catalogQuery:'story', evidence:'creative-canon' },
  { id:'shortstory', aliases:['story'], category:'Create', label:'Short story', description:'Create a bounded story artifact from current canon and intent.', capabilityId:'creative-canon', specialist:'storyengine', catalogQuery:'story', evidence:'creative-canon' },

  { id:'research', aliases:['investigate'], category:'Research', label:'Research', description:'Run evidence-bound research and separate fact from inference.', capabilityId:'research', specialist:'current-project', catalogQuery:'research', evidence:'authoritative-sources' },

  { id:'legal', aliases:['law'], category:'Legal', label:'Legal navigation', description:'Route legal navigation through jurisdiction-aware authority checks.', capabilityId:'legal-navigation', specialist:'truth-weaver', catalogQuery:'legal', evidence:'current-authority' },
  { id:'contract', aliases:['nda'], category:'Legal', label:'Contract', description:'Route contract work through current jurisdiction and source gates.', capabilityId:'legal-navigation', specialist:'truth-weaver', catalogQuery:'contract', evidence:'current-authority' },
  { id:'privacy', aliases:['privacypolicy'], category:'Legal', label:'Privacy', description:'Route privacy work through product facts and applicable legal authority.', capabilityId:'legal-navigation', specialist:'truth-weaver', catalogQuery:'privacy', evidence:'product-and-current-authority' },

  { id:'status', aliases:['state'], category:'Operate', label:'Status', description:'Reconcile current project state against evidence.', capabilityId:'current-status', specialist:'current-project', catalogQuery:'status', evidence:'current-state' },
  { id:'prove', aliases:['proof'], category:'Operate', label:'Prove', description:'Collect the cheapest valid evidence for a specific claim.', capabilityId:'evidence', specialist:'current-project', catalogQuery:'proof', evidence:'current-state' },
  { id:'ship', aliases:['release'], category:'Operate', label:'Ship', description:'Evaluate exact-head release gates without self-authorizing deployment.', capabilityId:'release', specialist:'current-project', catalogQuery:'release', evidence:'exact-head-and-runtime' },
  { id:'continue', aliases:['resume'], category:'Operate', label:'Continue', description:'Reacquire continuity and continue from the next unfinished gate.', capabilityId:'continuity', specialist:'current-project', catalogQuery:'workflow', evidence:'current-state' },

  { id:'introduction', aliases:['intro'], category:'Communicate', label:'Introduction', description:'Prepare a context-aware warm introduction.', capabilityId:'communication', specialist:'current-project', catalogQuery:'communication', evidence:'relationship-context' },
  { id:'proposal', aliases:['pitch'], category:'Communicate', label:'Proposal', description:'Prepare an evidence-bound proposal for the current goal and counterparty.', capabilityId:'communication', specialist:'current-project', catalogQuery:'proposal', evidence:'product-and-relationship' },

  { id:'goal', aliases:[], category:'Personal', label:'Goal', description:'Turn an intent into a bounded goal with proof and stop conditions.', capabilityId:'goal-shaping', specialist:'current-project', catalogQuery:'goal', evidence:'user-context' },
  { id:'plan', aliases:[], category:'Personal', label:'Plan', description:'Create a bounded plan without silently turning planning into execution.', capabilityId:'planning', specialist:'current-project', catalogQuery:'plan', evidence:'user-context' },
];

function freezeCommand(command) {
  return Object.freeze({
    ...command,
    aliases: Object.freeze([...(command.aliases ?? [])]),
  });
}

export const publicCommands = Object.freeze(PUBLIC_COMMAND_DEFINITIONS.map(freezeCommand));

const COMMAND_INDEX = new Map();
for (const command of publicCommands) {
  for (const alias of [command.id, ...command.aliases]) {
    const key = alias.toLowerCase();
    if (COMMAND_INDEX.has(key)) throw new Error(`Duplicate public command alias: ${key}`);
    COMMAND_INDEX.set(key, command);
  }
}

function parseCommandInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { name:'', arguments:'' };
  const match = raw.match(/^\/?([a-z0-9][a-z0-9-]*):?\s*(.*)$/i);
  if (!match) return { name:'', arguments:raw };
  return { name:match[1].toLowerCase(), arguments:match[2].trim() };
}

function specialistFor(command, project) {
  const normalizedProject = String(project ?? '').toLowerCase();
  if (command.capabilityId === 'legal-navigation') return 'truth-weaver';
  if (command.capabilityId === 'social-content') return 'signal-loop';
  if (command.capabilityId === 'creative-canon') {
    if (/sekret|se['’]?kret|\bbip\b/.test(normalizedProject)) return 'se-kret-bip';
    return command.specialist;
  }
  if (command.capabilityId === 'commerce-design') {
    if (/jbh|hair/.test(normalizedProject)) return 'juss-beautiful-hair';
    if (/sweats?/.test(normalizedProject)) return 'sweats';
  }
  return command.specialist;
}

export function listPublicCommands({ category = null } = {}) {
  if (!category) return [...publicCommands];
  return publicCommands.filter((command) => command.category === category);
}

export function resolvePublicCommand(input, context = {}) {
  const parsed = parseCommandInput(input);
  const command = COMMAND_INDEX.get(parsed.name);
  if (!command) {
    const suggestions = parsed.name
      ? publicCommands
          .filter((candidate) => [candidate.id, ...candidate.aliases].some((alias) => alias.startsWith(parsed.name) || alias.includes(parsed.name)))
          .slice(0, 5)
          .map((candidate) => `/${candidate.id}`)
      : [];
    return Object.freeze({
      ok:false,
      error:'unknown-command',
      query:parsed.name,
      suggestions:Object.freeze(suggestions),
    });
  }

  const project = String(context.project ?? '').trim() || null;
  const specialistProduct = specialistFor(command, project);
  return Object.freeze({
    ok:true,
    schema:'promptos/public-command-intent@v1',
    command:Object.freeze({
      id:command.id,
      token:`/${command.id}`,
      category:command.category,
      label:command.label,
    }),
    arguments:parsed.arguments,
    project,
    capabilityId:command.capabilityId,
    route:Object.freeze({
      owner:'promptos',
      reasoningPlane:'chief-ai-machine',
      specialistProduct,
      authorityPlane:'founder-control-room',
    }),
    authorityCeiling:'advisory-only',
    execution:Object.freeze({
      status:'not-executed',
      mutationAuthorized:false,
    }),
    evidence:Object.freeze({
      contract:command.evidence,
      staleOnStateChange:true,
    }),
    catalogQuery:command.catalogQuery,
  });
}

