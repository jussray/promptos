export const ALL_STAGES = ['audit','debug','plan','build','test','polish','research','launch'];
export const ALL_MODES = ['audit-first','minimal-edits','root-cause','redteam','lindy'];
export const ALL_RISK_LENSES = ['security','performance','maintainability','regression','correctness','conversion','pricing','ux','compliance'];

const CORE_CLAUSES = ['evidence.hierarchy','classification.four-state','guardrail.core','rollback.required','stop-condition.required'];

export const canonicalFamilies = {
  'repo.audit.first': {
    id: 'repo.audit.first', title: 'Repo Audit First', pack: 'repo-engineering',
    allowedPlatforms: ['chatgpt','claude','perplexity'], allowedStages: ALL_STAGES, allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['repoName','branchOrPr','commitHead','stack','goal'],
    baseClauseIds: ['role.repo-auditor',...CORE_CLAUSES,'method.repo-audit','output.audit-report']
  },
  'debug.without.thrashing': {
    id: 'debug.without.thrashing', title: 'Debug Without Thrashing', pack: 'repo-engineering',
    allowedPlatforms: ['chatgpt','claude','perplexity'], allowedStages: ['debug','test','audit','build'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['repoName','feature','expected','actual'],
    baseClauseIds: ['role.senior-debugger',...CORE_CLAUSES,'method.root-cause','output.debug-plan']
  },
  'migration.and.release.planner': {
    id: 'migration.and.release.planner', title: 'Migration & Release Planner', pack: 'repo-engineering',
    allowedPlatforms: ['chatgpt','claude','perplexity'], allowedStages: ALL_STAGES, allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['repoName','area','currentState','goal'],
    baseClauseIds: ['role.migration-architect',...CORE_CLAUSES,'method.phased-migration','output.migration-plan']
  },
  'market.and.pricing.strategist': {
    id: 'market.and.pricing.strategist', title: 'Market & Pricing Strategist', pack: 'growth-strategy',
    allowedPlatforms: ['chatgpt','claude','perplexity'], allowedStages: ['research','plan','audit','launch'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['productOrBrand','audience','competitiveContext','goal'],
    baseClauseIds: ['role.market-strategist',...CORE_CLAUSES,'method.evidence-first-strategy','output.strategy-brief']
  },
  'brand.voice.and.content': {
    id: 'brand.voice.and.content', title: 'Brand Voice & Content Studio', pack: 'brand-content',
    allowedPlatforms: ['chatgpt','claude','canva'], allowedStages: ['build','polish','launch','research'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['brandVoice','audience','channel','goal'],
    baseClauseIds: ['role.brand-content-partner',...CORE_CLAUSES,'method.voice-consistent-drafting','output.content-package']
  },
  'ux.design.system.auditor': {
    id: 'ux.design.system.auditor', title: 'UX & Design System Auditor', pack: 'ux-ui-design',
    allowedPlatforms: ['chatgpt','claude','figma'], allowedStages: ['audit','build','polish','test'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['productOrSurface','designSystem','userFlow','goal'],
    baseClauseIds: ['role.ux-systems-auditor',...CORE_CLAUSES,'method.design-system-audit','output.ux-audit-report','verification.playwright-if-ui']
  },
  'ecommerce.storefront.operator': {
    id: 'ecommerce.storefront.operator', title: 'Ecommerce Storefront Operator', pack: 'ecommerce-ops',
    allowedPlatforms: ['chatgpt','claude','shopify'], allowedStages: ['audit','build','launch','polish'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['storeName','catalogArea','goal'],
    baseClauseIds: ['role.ecommerce-operator',...CORE_CLAUSES,'method.storefront-operations','output.ops-plan']
  },
  'compliance.and.security.sentinel': {
    id: 'compliance.and.security.sentinel', title: 'Compliance & Security Sentinel', pack: 'repo-engineering',
    allowedPlatforms: ['chatgpt','claude','perplexity'], allowedStages: ['audit','plan','launch','test'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['repoName','surface','regulatoryContext','goal'],
    baseClauseIds: ['role.compliance-sentinel',...CORE_CLAUSES,'method.compliance-sweep','output.compliance-report']
  },
  'application.builder': {
    id: 'application.builder', title: 'Application Builder', pack: 'builder-starter',
    allowedPlatforms: ['chatgpt','claude','shopify'], allowedStages: ['plan','build','test','polish','launch'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['projectName','goal','stack','constraints'],
    baseClauseIds: [...CORE_CLAUSES],
    seedOnly: true,
    seedCount: 200
  },
  'reasoning.deep.systems': {
    id: 'reasoning.deep.systems', title: 'Deep Systems Reasoning', pack: 'reasoning-workflows',
    allowedPlatforms: ['chatgpt','claude','perplexity'], allowedStages: ['audit','plan','test','research'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['subject','goal'],
    baseClauseIds: [...CORE_CLAUSES],
    seedOnly: true,
    seedCount: 24
  },
  'reasoning.adversarial.challenge': {
    id: 'reasoning.adversarial.challenge', title: 'Adversarial Challenge', pack: 'reasoning-workflows',
    allowedPlatforms: ['chatgpt','claude','perplexity'], allowedStages: ['audit','plan','test','research'], allowedModes: ALL_MODES, allowedRiskLenses: ALL_RISK_LENSES,
    requiredInputs: ['subject','goal'],
    baseClauseIds: [...CORE_CLAUSES],
    seedOnly: true,
    seedCount: 24
  }
};
