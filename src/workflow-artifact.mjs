const DEFAULT_OUTPUT_CONTRACT = ['REALITY', 'FIX', 'PROOF', 'RISK', 'ROLLBACK', 'NEXT GATE'];
const DEFAULT_ROLLBACK = 'Return to the last verified source/runtime state, preserve evidence, and do not widen scope.';

const MODEL_EXECUTION_PROFILE_DEFINITIONS = Object.freeze({
  'chatgpt-sol': Object.freeze({
    provider: 'openai',
    compilerBias: Object.freeze([
      'cross-system-reconciliation',
      'tool-and-connector-orchestration',
      'multimodal-product-analysis',
      'founder-readable-decision-synthesis',
    ]),
    promptShape: 'evidence-first-orchestration',
  }),
  'claude-code': Object.freeze({
    provider: 'anthropic',
    compilerBias: Object.freeze([
      'long-context-repository-analysis',
      'focused-implementation',
      'careful-refactor-planning',
      'structured-documentation',
    ]),
    promptShape: 'repository-context-implementation',
  }),
});

const MODEL_EXECUTION_HANDOFF_FIELDS = Object.freeze([
  'modelProfileId',
  'observedRuntimeModel',
  'observedCapabilities',
  'sourceTruthRefs',
  'authorityRequired',
  'proofRequired',
  'claims',
  'unknowns',
  'continuityFingerprint',
  'resultEvidence',
]);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueStrings(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.map(text).filter(Boolean))];
}

function slug(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function copyStrings(value) {
  return uniqueStrings(value);
}

function compileModelExecutionHandoff(input, mission, requiredEvidence) {
  if (input == null) return null;
  if (!input || typeof input !== 'object') throw new Error('modelExecution must be an object when supplied.');

  const modelProfileId = text(input.modelProfileId);
  const profile = MODEL_EXECUTION_PROFILE_DEFINITIONS[modelProfileId];
  if (!profile) throw new Error('modelExecution.modelProfileId must name a supported observed model profile.');

  const observedRuntimeModel = text(input.observedRuntimeModel);
  if (!observedRuntimeModel) throw new Error('modelExecution.observedRuntimeModel is required.');

  const sourceTruthRefs = copyStrings(input.sourceTruthRefs);
  if (!sourceTruthRefs.length) throw new Error('modelExecution.sourceTruthRefs requires at least one authoritative truth reference.');

  const continuityFingerprint = text(input.continuityFingerprint);
  if (!continuityFingerprint) throw new Error('modelExecution.continuityFingerprint is required.');

  const observedCapabilities = copyStrings(input.observedCapabilities);
  const authorityRequired = copyStrings(input.authorityRequired).length
    ? copyStrings(input.authorityRequired)
    : [text(mission.authorityCeiling)].filter(Boolean);
  const proofRequired = copyStrings(input.proofRequired).length
    ? copyStrings(input.proofRequired)
    : [...requiredEvidence];

  return Object.freeze({
    modelProfileId,
    provider: profile.provider,
    promptShape: profile.promptShape,
    compilerBias: Object.freeze([...profile.compilerBias]),
    observedRuntimeModel,
    observedCapabilities: Object.freeze([...observedCapabilities]),
    sourceTruthRefs: Object.freeze([...sourceTruthRefs]),
    authorityRequired: Object.freeze([...authorityRequired]),
    proofRequired: Object.freeze([...proofRequired]),
    claims: Object.freeze(copyStrings(input.claims)),
    unknowns: Object.freeze(copyStrings(input.unknowns)),
    continuityFingerprint,
    resultEvidence: Object.freeze(copyStrings(input.resultEvidence)),
    toolUseRule: 'observed-only-no-simulation',
    executionAuthorized: false,
    authorityTransferred: false,
    founderApprovalCarriedForward: false,
  });
}

export function compileWorkflowArtifact(mission, options = {}) {
  if (!mission || typeof mission !== 'object') throw new Error('A compiled PromptOS mission is required.');
  const intent = text(mission.intent);
  if (!intent) throw new Error('The compiled mission must preserve founder intent.');

  const title = text(options.title) || intent.slice(0, 80);
  const id = slug(options.id || title || intent);
  if (!id) throw new Error('Workflow id could not be derived.');

  const authorityCeiling = text(mission.authorityCeiling);
  if (!/^L[0-6]$/.test(authorityCeiling)) throw new Error('Mission authority ceiling must be L0-L6.');

  const requiredEvidence = copyStrings(mission.requiredEvidence);
  const protocols = copyStrings(mission.protocols);
  const providers = copyStrings(mission.providers);
  const stopConditions = copyStrings(mission.stopConditions);
  if (!stopConditions.length) throw new Error('A workflow requires at least one stop condition.');

  const project = text(mission.project) || null;
  const shellId = project ? `project:${slug(project)}` : null;
  const modelExecution = compileModelExecutionHandoff(options.modelExecution, mission, requiredEvidence);

  return Object.freeze({
    schemaVersion: 1,
    artifactType: 'promptos-workflow',
    id,
    version: text(options.version) || '1.0',
    title,
    status: 'draft',
    registrationAuthority: false,
    sourceMission: Object.freeze({
      version: text(mission.version) || 'unknown',
      intent,
      project,
      risk: text(mission.risk) || 'unknown',
      authorityCeiling,
    }),
    intent,
    desiredOutcome: text(options.desiredOutcome) || intent,
    aliases: copyStrings(options.aliases),
    inputs: copyStrings(options.inputs),
    protocols,
    providers,
    modelExecution,
    executionBoundary: Object.freeze({
      authority: 'proposal-only',
      projectId: project,
      shellId,
      credentialLane: project ? 'project' : 'unbound',
      credentialProjectId: project,
      allowedProviderIds: Object.freeze([...providers]),
      providerFallback: 'deny',
      networkMode: 'deny-all',
      allowedEgressHosts: Object.freeze([]),
      blockPrivateNetworks: true,
      humanFinalAuthorizationRequired: true,
      fcrLeaseRequired: true,
    }),
    requiredEvidence,
    stopConditions,
    verification: Object.freeze({
      exactHeadRequired: requiredEvidence.includes('exact-head'),
      playwrightRequired: requiredEvidence.includes('playwright'),
      providerReadbackRequired: requiredEvidence.includes('provider-readback'),
      requiredEvidence,
    }),
    rollback: text(options.rollback) || DEFAULT_ROLLBACK,
    outputContract: copyStrings(options.outputContract).length
      ? copyStrings(options.outputContract)
      : [...DEFAULT_OUTPUT_CONTRACT],
    lineage: copyStrings(options.lineage),
  });
}

export function validateWorkflowArtifact(workflow) {
  const errors = [];
  if (!workflow || typeof workflow !== 'object') return { valid: false, errors: ['workflow must be an object'] };
  if (workflow.schemaVersion !== 1) errors.push('schemaVersion must equal 1');
  if (workflow.artifactType !== 'promptos-workflow') errors.push('artifactType must be promptos-workflow');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(workflow.id))) errors.push('id must be a lowercase kebab-case identifier');
  if (!text(workflow.intent)) errors.push('intent is required');
  if (!/^L[0-6]$/.test(text(workflow?.sourceMission?.authorityCeiling))) errors.push('source mission authority ceiling is invalid');
  if (workflow.status !== 'draft') errors.push('newly compiled workflows must remain draft');
  if (workflow.registrationAuthority !== false) errors.push('compiled workflow cannot self-register');
  if (!Array.isArray(workflow.stopConditions) || !workflow.stopConditions.length) errors.push('stopConditions are required');
  if (!Array.isArray(workflow.requiredEvidence)) errors.push('requiredEvidence must be an array');
  if (!Array.isArray(workflow.outputContract) || !workflow.outputContract.length) errors.push('outputContract is required');

  const modelExecution = workflow.modelExecution;
  if (modelExecution != null) {
    const profile = MODEL_EXECUTION_PROFILE_DEFINITIONS[text(modelExecution.modelProfileId)];
    if (!profile) errors.push('modelExecution profile is unsupported');
    else {
      if (modelExecution.provider !== profile.provider) errors.push('modelExecution provider must match the canonical profile');
      if (modelExecution.promptShape !== profile.promptShape) errors.push('modelExecution promptShape must match the canonical profile');
      if (JSON.stringify(modelExecution.compilerBias) !== JSON.stringify([...profile.compilerBias])) {
        errors.push('modelExecution compilerBias must match the canonical profile');
      }
    }
    if (!text(modelExecution.observedRuntimeModel)) errors.push('modelExecution observedRuntimeModel is required');
    if (!Array.isArray(modelExecution.observedCapabilities)) errors.push('modelExecution observedCapabilities must be an array');
    if (!Array.isArray(modelExecution.sourceTruthRefs) || !modelExecution.sourceTruthRefs.length) errors.push('modelExecution sourceTruthRefs are required');
    if (!Array.isArray(modelExecution.authorityRequired)) errors.push('modelExecution authorityRequired must be an array');
    if (!Array.isArray(modelExecution.proofRequired)) errors.push('modelExecution proofRequired must be an array');
    if (!Array.isArray(modelExecution.claims)) errors.push('modelExecution claims must be an array');
    if (!Array.isArray(modelExecution.unknowns)) errors.push('modelExecution unknowns must be an array');
    if (!text(modelExecution.continuityFingerprint)) errors.push('modelExecution continuityFingerprint is required');
    if (!Array.isArray(modelExecution.resultEvidence)) errors.push('modelExecution resultEvidence must be an array');
    for (const field of MODEL_EXECUTION_HANDOFF_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(modelExecution, field)) errors.push(`modelExecution handoff field missing: ${field}`);
    }
    if (modelExecution.toolUseRule !== 'observed-only-no-simulation') errors.push('modelExecution must forbid simulated tool use');
    if (modelExecution.executionAuthorized !== false) errors.push('modelExecution cannot authorize execution');
    if (modelExecution.authorityTransferred !== false) errors.push('modelExecution cannot transfer authority');
    if (modelExecution.founderApprovalCarriedForward !== false) errors.push('modelExecution cannot carry founder approval forward');
  }

  const boundary = workflow.executionBoundary;
  if (!boundary || typeof boundary !== 'object') errors.push('executionBoundary is required');
  else {
    if (boundary.authority !== 'proposal-only') errors.push('PromptOS execution boundary must remain proposal-only');
    if (boundary.providerFallback !== 'deny') errors.push('provider fallback must be denied');
    if (boundary.networkMode !== 'deny-all') errors.push('compiled workflows must default to deny-all network access');
    if (!Array.isArray(boundary.allowedEgressHosts) || boundary.allowedEgressHosts.length !== 0) errors.push('compiled workflows cannot self-grant egress');
    if (boundary.blockPrivateNetworks !== true) errors.push('private-network blocking must remain required');
    if (boundary.humanFinalAuthorizationRequired !== true) errors.push('human final authorization must remain required');
    if (boundary.fcrLeaseRequired !== true) errors.push('FCR lease must remain required');
    if (boundary.projectId) {
      if (boundary.credentialLane !== 'project') errors.push('project workflows must use the project credential lane');
      if (boundary.credentialProjectId !== boundary.projectId) errors.push('credential project binding must match workflow project');
      if (!text(boundary.shellId)) errors.push('project workflows require a shellId');
    } else if (boundary.credentialLane !== 'unbound') {
      errors.push('unbound workflows cannot claim a credential lane');
    }
    if (!Array.isArray(boundary.allowedProviderIds)) errors.push('allowedProviderIds must be an array');
    else if (JSON.stringify([...boundary.allowedProviderIds].sort()) !== JSON.stringify([...copyStrings(workflow.providers)].sort())) {
      errors.push('execution provider allowlist must match declared workflow providers');
    }
  }

  return { valid: errors.length === 0, errors };
}

export const PROMPTOS_WORKFLOW_ARTIFACT_VERSION = 1;
export const PROMPTOS_MODEL_EXECUTION_PROFILES = MODEL_EXECUTION_PROFILE_DEFINITIONS;
export const PROMPTOS_MODEL_EXECUTION_HANDOFF_FIELDS = MODEL_EXECUTION_HANDOFF_FIELDS;
