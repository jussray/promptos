import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reconcileProviderGovernance } from './reconcile-provider-governance.mjs';

const desired = JSON.parse(await readFile('.control-room/provider-governance.desired.json', 'utf8'));

function detailed(id = 101) {
  return {
    ...desired,
    id,
    current_user_can_bypass: 'never',
  };
}

function fakeRequest(list = [], mutate = detailed()) {
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push({path, ...options});
    if (path.endsWith('rulesets?targets=branch&per_page=100')) return list;
    if (options.method === 'POST' || options.method === 'PUT') return mutate;
    if (/\/rulesets\/\d+$/.test(path)) return detailed(mutate.id);
    throw new Error(`unexpected path ${path}`);
  };
  return {request, calls};
}

test('desired contract creates the missing founder-only ruleset and verifies readback', async () => {
  const {request, calls} = fakeRequest([]);
  const receipt = await reconcileProviderGovernance({repository:'jussray/promptos', token:'x'.repeat(40), desired, request});
  assert.equal(receipt.state, 'VERIFIED');
  assert.equal(receipt.action, 'created');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].body.bypass_actors.length, 0);
});

test('existing named ruleset is updated in place rather than duplicated', async () => {
  const {request, calls} = fakeRequest([{id:101, name:'PromptOS main governance'}]);
  const receipt = await reconcileProviderGovernance({repository:'jussray/promptos', token:'x'.repeat(40), desired, request});
  assert.equal(receipt.action, 'updated');
  assert.equal(calls[1].method, 'PUT');
  assert.match(calls[1].path, /\/rulesets\/101$/);
});

test('ambiguous duplicate named rulesets fail closed', async () => {
  const {request} = fakeRequest([{id:101, name:'PromptOS main governance'}, {id:102, name:'PromptOS main governance'}]);
  await assert.rejects(
    reconcileProviderGovernance({repository:'jussray/promptos', token:'x'.repeat(40), desired, request}),
    /ambiguous mutation/,
  );
});

test('admin credential is mandatory and default GitHub token is never assumed', async () => {
  await assert.rejects(
    reconcileProviderGovernance({repository:'jussray/promptos', token:'', desired, request:async()=>[]}),
    /PROMPTOS_RULESET_ADMIN_TOKEN is required/,
  );
});

test('desired state cannot gain bypass actors', async () => {
  const widened = {...desired, bypass_actors:[{actor_type:'RepositoryRole', actor_id:5, bypass_mode:'always'}]};
  await assert.rejects(
    reconcileProviderGovernance({repository:'jussray/promptos', token:'x'.repeat(40), desired:widened, request:async()=>[]}),
    /zero bypass actors/,
  );
});
