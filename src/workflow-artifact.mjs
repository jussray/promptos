const DEFAULT_OUTPUT_CONTRACT = ['REALITY', 'FIX', 'PROOF', 'RISK', 'ROLLBACK', 'NEXT GATE'];
const DEFAULT_ROLLBACK = 'Return to the last verified source/runtime state, preserve evidence, and do not widen scope.';

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
      project: text(mission.project) || null,
      risk: text(mission.risk) || 'unknown',
      authorityCeiling,
    }),
    intent,
    desiredOutcome: text(options.desiredOutcome) || intent,
    aliases: copyStrings(options.aliases),
    inputs: copyStrings(options.inputs),
    protocols,
    providers,
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
  return { valid: errors.length === 0, errors };
}

export const PROMPTOS_WORKFLOW_ARTIFACT_VERSION = 1;
