import assert from "node:assert/strict";
import fs from "node:fs";
import { loadAppManifests, resolveAppSkillSet, validateRegistry } from "../src/skill-registry/index.ts";

const expected = ["chief-ai-machine","founder-control-room","juss-pay","promptos","sekret-bip","solcontinuity","storyengine"];
const manifests = loadAppManifests();
assert.deepEqual(validateRegistry(manifests), [], "all app manifests must satisfy schema and compatibility contracts");
assert.deepEqual(manifests.map(item=>item.app.id), expected, "registry must contain the seven requested standalone apps");
const names=fs.readdirSync(new URL("../manifests/apps/",import.meta.url)).filter(name=>name.endsWith(".json")).sort();
assert.deepEqual(names, expected.map(id=>id+".json").sort(), "one central manifest must exist for each requested app");

for (const manifest of manifests) {
 const resolved=resolveAppSkillSet(manifest.app.id,manifests);
 assert.equal(resolved.app.authorityOwner,manifest.app.id,"each app retains its own authority owner");
 assert.ok(manifest.app.repository.startsWith("jussray/"),"each app pins its canonical owner/repository identity");
 assert.equal(resolved.authority,"catalog-and-compatibility-only");
 assert.equal(resolved.installationState,"not-asserted");
 assert.equal(resolved.executionAuthority,"none");
 assert.equal(resolved.sharedSkills.length,4);
 assert.ok(resolved.sharedSkills.every(skill=>skill.sourceRepository==="jussray/ULTRATHINK-"&&skill.sourceRevision==="4e650bdb2ca3a372300ca99bbf8af18c75a1d5ca"&&skill.lifecycle==="candidate"&&skill.mode==="reference-only"));
 assert.ok(resolved.plugins.length>0&&resolved.plugins.every(plugin=>plugin.connectionState==="runtime-discovery-required"&&plugin.authority==="none"&&plugin.writePolicy==="explicit-action-approval-required"&&typeof plugin.displayName==="string"&&!Object.hasOwn(plugin,"installed")));
 assert.ok(resolved.plugins.every(plugin=>plugin.kind==="chatgpt-plugin"?(typeof plugin.canonicalPluginId==="string"&&plugin.canonicalPluginId.startsWith("plugin_")&&plugin.catalogStatus==="listed"):plugin.canonicalPluginId===null));
 assert.equal(resolved.compatibility.issues.length,0);
 assert.deepEqual(manifest.app.localManifestPaths,[".juss/app.manifest.json",".juss/skills.manifest.json"]);
}

const byId=new Map(manifests.map(item=>[item.app.id,item]));
const fcr=byId.get("founder-control-room"), chief=byId.get("chief-ai-machine"), bip=byId.get("sekret-bip"), pay=byId.get("juss-pay");
assert.ok(fcr.skills.owned.some(skill=>skill.id==="portfolio-control-plane"));
assert.ok(["atlassian","gmail","google-calendar","asana","linear","notion","slack"].every(id=>fcr.plugins.some(plugin=>plugin.id===id)));
assert.ok(fcr.plugins.some(plugin=>plugin.id==="atlassian"&&plugin.resolutionNote?.includes("distinct Rovo Legacy plugin entry was not found")));
assert.ok(chief.skills.owned.some(skill=>skill.id==="chief-ai-operator"));
assert.ok(chief.skills.owned.some(skill=>skill.id==="gmail-resolve"&&skill.lifecycle==="draft"));
assert.ok(["gmail","google-calendar","atlassian"].every(id=>chief.plugins.some(plugin=>plugin.id===id)));
assert.ok(!chief.skills.owned.some(skill=>skill.id==="founder-authorization"),"Chief must not absorb FCR founder approval");
assert.ok(bip.skills.owned.some(skill=>skill.id==="bip-privacy-redteam"));
assert.ok(bip.skills.owned.some(skill=>skill.id==="bip-auth-onboarding"));
assert.ok(pay.plugins.some(plugin=>plugin.id==="stripe"&&plugin.safetyMode==="test-only"&&plugin.liveActions==="blocked-by-product-contract"&&plugin.canonicalPluginId==="plugin_connector_690ab09fa43c8191bca40280e4563238"));
assert.ok(pay.skills.owned.every(skill=>skill.mode==="proposal"),"JussPay skills remain proposed until source-audited");
const sol=byId.get("solcontinuity");
assert.ok(sol.skills.owned.some(skill=>skill.id==="goalfix"&&skill.sourcePath===".ai-skills/skills/goalfix.md"&&skill.status==="source-path-verified"));
assert.ok(sol.skills.owned.some(skill=>skill.id==="recovery-planning"&&skill.mode==="proposal"));

const duplicate=[...manifests,structuredClone(manifests[0])];
assert.ok(validateRegistry(duplicate).some(error=>error.includes("duplicate app id")));
const ownerMutation=structuredClone(manifests[0]); ownerMutation.app.authorityOwner="chief-ai-machine";
assert.ok(validateRegistry([ownerMutation]).some(error=>error.includes("authority owner mismatch")));
const pluginMutation=structuredClone(manifests[0]); pluginMutation.plugins[0].connectionState="connected";
assert.ok(validateRegistry([pluginMutation]).some(error=>error.includes("connection state must be discovered")));
const skillMutation=structuredClone(manifests[0]); skillMutation.skills.shared[0].authority="execute";
assert.ok(validateRegistry([skillMutation]).some(error=>error.includes("skill authority must be advisory")));
const staleSource=structuredClone(manifests[0]); staleSource.skills.owned[0].sourceRevision="0".repeat(40);
assert.ok(validateRegistry([staleSource]).some(error=>error.includes("source revision does not match inspected app head")));
assert.throws(()=>resolveAppSkillSet("unknown-app",manifests),/Unknown app/);

const index=JSON.parse(fs.readFileSync(new URL("../src/skill-registry/app-manifests.index.json",import.meta.url),"utf8"));
assert.equal(index.generated,true);
assert.deepEqual(index.apps,manifests.map(item=>({id:item.app.id,name:item.app.name,repository:item.app.repository,manifestPath:`manifests/apps/${item.app.id}.json`})));
const promptos=byId.get("promptos");
const localApp=JSON.parse(fs.readFileSync(new URL("../.juss/app.manifest.json",import.meta.url),"utf8"));
const localSkills=JSON.parse(fs.readFileSync(new URL("../.juss/skills.manifest.json",import.meta.url),"utf8"));
assert.deepEqual(localApp,{schemaVersion:"1.0",registryVersion:"2.0.0",...promptos.app});
assert.deepEqual(localSkills.skills,promptos.skills);
assert.deepEqual(localSkills.plugins,promptos.plugins);
assert.equal(localSkills.registry.revision,"self-managed");
console.log(`Skill alignment verified: ${manifests.length} apps, 4 portable skills, ${manifests.reduce((n,app)=>n+app.plugins.length,0)} declared plugin references; no installation or execution authority asserted.`);
