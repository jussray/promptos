/* PromptOS parser bootstrap.
   Loads the hash-pinned generated donor catalog before the unchanged auth core.
*/
(function () {
  'use strict';

  if (!Array.isArray(window.PROMPTS)) window.PROMPTS = [];

  window.__PROMPTOS_GENERATED_DONOR__ = Object.freeze({
    path: 'parts/p04-donor-missing.js',
    source: 'archive/promptos-donor-175.html',
    count: 126,
    sha256: '196b4958508f5b096d610b0110e5c1e39d74a2fe3f3eb52b20ff18161a87da0d'
  });

  if (document.readyState !== 'loading') {
    throw new Error('PromptOS bootstrap must execute during parser loading');
  }

  function writeScript(src) {
    document.write('<script src="' + src + '">' + '</scr' + 'ipt>');
  }

  writeScript('./parts/p04-donor-missing.js');
  writeScript('./parts/auth-core.js');
})();
