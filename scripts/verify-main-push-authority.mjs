#!/usr/bin/env node

import { isFounderDirectPush, verifyAppMainPush } from './merge-authority-bridge.mjs';

const EXPECTED_REPOSITORY = 'jussray/promptos';
const EXPECTED_REF = 'refs/heads/main';
const EXPECTED_FOUNDER = 'jussray';
const SHA = /^[0-9a-f]{40}$/;

const repository = process.env.PROMPTOS_REPOSITORY || '';
const ref = process.env.PROMPTOS_REF || '';
const actor = process.env.PROMPTOS_ACTOR || '';
const triggeringActor = process.env.PROMPTOS_TRIGGERING_ACTOR || '';
const forced = process.env.PROMPTOS_FORCED || '';
const before = process.env.PROMPTOS_BEFORE_SHA || '';
const after = process.env.PROMPTOS_AFTER_SHA || '';

const errors = [];
if (repository !== EXPECTED_REPOSITORY) errors.push(`repository must be ${EXPECTED_REPOSITORY}`);
if (ref !== EXPECTED_REF) errors.push(`ref must be ${EXPECTED_REF}`);
if (forced !== 'false') errors.push('main push must not be forced');
if (!SHA.test(before) || /^0{40}$/.test(before)) errors.push('before SHA must be a real 40-character commit SHA');
if (!SHA.test(after) || /^0{40}$/.test(after)) errors.push('after SHA must be a real 40-character commit SHA');
if (before === after) errors.push('before and after SHA must differ');

// Founder direct pushes retain their existing authority check. Bot-authored
// pushes require independent proof of an exact founder-dispatched App merge.
// A bot login alone is NEVER sufficient.
const directFounder = isFounderDirectPush({ actor, triggeringActor });
let appProof = null;
if (!directFounder && errors.length === 0) {
  try {
    const token = process.env.GITHUB_TOKEN || '';
    if (!token) throw new Error('Read-only GitHub provider token unavailable.');
    const read = async (path) => {
      const response = await fetch('https://api.github.com/repos/' + EXPECTED_REPOSITORY + path, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + token,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'juss-promptos-merge-authority-v1',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(18000),
      });
      if (!response.ok) throw new Error('Provider evidence read failed: HTTP ' + response.status);
      return response.json();
    };
    appProof = await verifyAppMainPush({
      repository, ref, actor, triggeringActor, forced, before, after,
    }, {
      secret: process.env.PROMPTOS_MERGE_RECEIPT_KEY || '',
      read,
    });
  } catch (error) {
    errors.push('App-authored push lacks exact founder authority proof: ' + error.message);
  }
} else if (!directFounder) {
  errors.push('Unverified App actor cannot bypass invalid push metadata.');
}

const receipt = {
  repository,
  ref,
  actor,
  triggeringActor,
  forced,
  before,
  after,
  founderAuthorized: errors.length === 0,
  authority: directFounder ? 'direct-founder-push' : (appProof?.authority || 'blocked'),
  approvedPrNumber: appProof?.prNumber || null,
  founderWorkflowRunId: appProof?.workflowRunId || null,
};

console.log(JSON.stringify(receipt));

if (errors.length) {
  console.error('PromptOS main push authority verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
