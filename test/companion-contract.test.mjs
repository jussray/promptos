import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const h=readFileSync('index.html','utf8'),j=readFileSync('parts/app.js','utf8');
test('both companions have independent selection and honest local status',()=>{assert.match(h,/value="prism">Prism/);assert.match(h,/value="orion">Orion/);assert.match(j,/p\.hidden=p\.dataset\.pet!==petChoice\.value/);assert.match(j,/petStatus\('Prompt prepared locally\.',false\)/);assert.match(j,/petStatus\('Composition failed\.',false\)/);assert.match(h,/prefers-reduced-motion:reduce/);});

import {createHash} from 'node:crypto';
test('Orion original idle and processing sprite bytes are preserved; Prism remains selectable',()=>{const b64=h.match(/\.orion-sprite\{[^}]*base64,([A-Za-z0-9+/=]+)/)?.[1];assert.ok(b64);assert.equal(createHash('sha256').update(Buffer.from(b64,'base64')).digest('hex'),'2ced717378f9c68261e6c3d17c0651dfda3c78f72464512d4ff89f2bf4fe05ed');assert.match(h,/data-pet="prism"/);assert.match(h,/data-pet="orion" class="orion-sprite"/);assert.match(h,/orion-idle 1\.68s steps\(6,end\)/);assert.match(h,/orion-processing 1\.68s steps\(6,end\)/);assert.match(h,/prefers-reduced-motion:reduce\)\{\.orion-sprite\{animation:none/);});
