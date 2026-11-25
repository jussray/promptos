import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const h=readFileSync('index.html','utf8'),j=readFileSync('parts/app.js','utf8');
test('both companions have independent selection and honest local status',()=>{assert.match(h,/value="prism">Prism/);assert.match(h,/value="orion">Orion/);assert.match(j,/p\.hidden=p\.dataset\.pet!==petChoice\.value/);assert.match(j,/petStatus\('Prompt prepared locally\.',false\)/);assert.match(j,/petStatus\('Composition failed\.',false\)/);assert.match(h,/prefers-reduced-motion:reduce/);});
