import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const h=readFileSync('index.html','utf8'),j=readFileSync('parts/app.js','utf8');
test('both companions have independent selection and honest local status',()=>{assert.match(h,/value="prism">Prism/);assert.match(h,/value="orion">Orion/);assert.match(j,/p\.hidden=p\.dataset\.pet!==petChoice\.value/);assert.match(j,/petStatus\('Prompt prepared locally\.',false,'inspect'\)/);assert.match(j,/petStatus\('Composition failed\.',false,'error'\)/);assert.match(h,/prefers-reduced-motion:reduce/);});

import {createHash} from 'node:crypto';
test('Orion original idle and processing sprite bytes are preserved; Prism remains selectable',()=>{const b64=h.match(/\.orion-sprite\{[^}]*base64,([A-Za-z0-9+/=]+)/)?.[1];assert.ok(b64);assert.equal(createHash('sha256').update(Buffer.from(b64,'base64')).digest('hex'),'2ced717378f9c68261e6c3d17c0651dfda3c78f72464512d4ff89f2bf4fe05ed');assert.match(h,/data-pet="prism"/);assert.match(h,/data-pet="orion" class="orion-sprite"/);assert.match(h,/orion-idle 1\.68s steps\(6,end\)/);assert.match(h,/orion-processing 1\.68s steps\(6,end\)/);assert.match(h,/prefers-reduced-motion:reduce\)\{\.orion-sprite\{animation:none/);});

test('Prism uses the exact original pose sheet and honest result states',()=>{const encoded=h.match(/\.prism-sprite\{[^}]*base64,([A-Za-z0-9+/=]+)/)?.[1];assert.ok(encoded);assert.equal(createHash('sha256').update(Buffer.from(encoded,'base64')).digest('hex'),'fc03cce9c2123b24dfe80319f9f779121edd82a89a1f572f3b2bc1904de91b11');assert.match(j,/petStatus\('Composing locally…',true,'process'\)/);assert.match(j,/petStatus\('Prompt prepared locally\.',false,'inspect'\)/);assert.match(h,/prefers-reduced-motion:reduce\)\{\.prism-sprite\{animation:none/);});
