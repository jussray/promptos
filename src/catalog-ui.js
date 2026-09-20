import { buildCatalogRecipes, canonicalFamilies, openPromptCard } from './catalog-runtime/index.js';

const PAGE_SIZE = 24;
const LONG_INPUTS = new Set([
  'goal', 'expected', 'actual', 'currentState', 'competitiveContext', 'brandVoice',
  'designSystem', 'userFlow', 'regulatoryContext', 'constraints', 'surface',
]);

function emitAnalytics(event, recipe = null, extra = {}) {
  window.dispatchEvent(new CustomEvent('promptos:catalog', {
    detail: {
      event,
      catalogVersion: 'catalog-v1',
      ...(recipe ? {
        familyId: recipe.familyId,
        platform: recipe.platform,
        stage: recipe.stage,
        riskLens: recipe.riskLens,
      } : {}),
      ...extra,
    },
  }));
}

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 2200);
}

function addStylesheet() {
  if (document.querySelector('link[data-promptos-catalog-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../styles/catalog.css', import.meta.url).href;
  link.dataset.promptosCatalogStyle = 'true';
  document.head.appendChild(link);
}

function navButton({ mobile = false } = {}) {
  const button = document.createElement('button');
  button.className = 'nav-item';
  button.dataset.page = 'catalog';
  button.setAttribute('aria-label', 'PromptOS recipe catalog');
  if (mobile) button.textContent = '🧬 Catalog';
  else button.innerHTML = '🧬 Catalog <span class="n-count" id="catalogNavCount">5K</span>';
  return button;
}

function mountNavigation(onOpen) {
  const desktopLibrary = document.querySelector('.sidebar [data-page="library"]');
  if (desktopLibrary && !document.querySelector('.sidebar [data-page="catalog"]')) {
    const button = navButton();
    button.addEventListener('click', onOpen);
    desktopLibrary.insertAdjacentElement('afterend', button);
  }

  const mobileLibrary = document.querySelector('.mobile-nav [data-page="library"]');
  if (mobileLibrary && !document.querySelector('.mobile-nav [data-page="catalog"]')) {
    const button = navButton({ mobile: true });
    button.addEventListener('click', onOpen);
    mobileLibrary.insertAdjacentElement('afterend', button);
  }
}

function createPage() {
  const section = document.createElement('section');
  section.className = 'page';
  section.id = 'page-catalog';
  section.innerHTML = `
    <div class="page-head">
      <div class="crumb">promptos <span>/</span> <b>catalog</b></div>
      <h2>5,000 bounded recipes. Compile only what the task needs.</h2>
      <p>Filter the canonical recipe index, add concrete context, and compile a provider-ready prompt with provenance and proof guardrails.</p>
    </div>
    <div class="promptos-stats" aria-label="PromptOS catalog summary">
      <div class="stat"><div class="n" id="catalogTotal">5,000</div><div class="l">Selected recipes</div></div>
      <div class="stat"><div class="n" id="catalogCandidateTotal">5,400</div><div class="l">Valid candidates</div></div>
      <div class="stat"><div class="n">8</div><div class="l">Canonical families</div></div>
      <div class="stat"><div class="n">On demand</div><div class="l">Prompt compilation</div></div>
    </div>
    <div class="promptos-toolbar" aria-label="PromptOS catalog filters">
      <label class="promptos-search"><span>Search</span><input id="catalogSearch" type="search" placeholder="Repo audit, launch, pricing, UX…" autocomplete="off"></label>
      <label><span>Family</span><select id="catalogFamily"><option value="">All families</option></select></label>
      <label><span>Platform</span><select id="catalogPlatform"><option value="">All platforms</option></select></label>
      <label><span>Stage</span><select id="catalogStage"><option value="">All stages</option></select></label>
      <button class="mini-btn" id="catalogReset" type="button">Reset filters</button>
    </div>
    <div class="promptos-resultbar"><strong id="catalogResultCount">Catalog loads when opened</strong><span id="catalogShownCount">0 shown</span></div>
    <div class="promptos-grid" id="catalogGrid" aria-live="polite"></div>
    <div class="promptos-more-wrap"><button class="mini-btn" id="catalogMore" type="button" hidden>Load 24 more</button></div>
  `;
  return section;
}

function createDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'promptos-dialog';
  dialog.id = 'catalogDialog';
  dialog.innerHTML = `
    <div class="promptos-dialog-shell">
      <div class="promptos-dialog-head">
        <div><div class="crumb">catalog <span>/</span> <b id="catalogDialogFamily"></b></div><h3 id="catalogDialogTitle"></h3><p id="catalogDialogDescription"></p></div>
        <button class="icon-btn" id="catalogClose" type="button" aria-label="Close catalog recipe">✕</button>
      </div>
      <div class="promptos-dialog-grid">
        <div class="promptos-input-panel">
          <div class="panel-title"><span class="dot"></span>Concrete task context</div>
          <div id="catalogInputs"></div>
          <button class="mini-btn solid" id="catalogCompile" type="button">Compile prompt</button>
          <div class="promptos-readiness" id="catalogReadiness" role="status"></div>
        </div>
        <div class="promptos-output-panel">
          <div class="promptos-output-head"><div class="panel-title"><span class="dot"></span>Compiled output</div><button class="mini-btn" id="catalogCopy" type="button" disabled>Copy prompt</button></div>
          <pre id="catalogOutput">Fill the required inputs, then compile.</pre>
          <div class="promptos-provenance" id="catalogProvenance"></div>
        </div>
      </div>
    </div>
  `;
  return dialog;
}

function addOption(select, value, label = value) {
  const item = document.createElement('option');
  item.value = value;
  item.textContent = label;
  select.appendChild(item);
}

function cardFor(recipe, onOpen) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'promptos-card';
  card.dataset.family = recipe.familyId;
  card.innerHTML = `
    <div class="promptos-card-kicker"><span></span><span></span></div>
    <h3></h3>
    <p></p>
    <div class="badges"><span class="badge cat"></span><span class="badge"></span><span class="badge"></span></div>
    <div class="promptos-card-foot"><span></span><strong>Compile →</strong></div>
  `;
  const kicker = card.querySelectorAll('.promptos-card-kicker span');
  kicker[0].textContent = recipe.pack;
  kicker[1].textContent = recipe.platform;
  card.querySelector('h3').textContent = recipe.title;
  card.querySelector('p').textContent = recipe.description;
  const badges = card.querySelectorAll('.badge');
  badges[0].textContent = recipe.stage;
  badges[1].textContent = recipe.modes.join(', ');
  badges[2].textContent = recipe.riskLens;
  card.querySelector('.promptos-card-foot span').textContent = `${recipe.inputs.length} required inputs`;
  card.addEventListener('click', () => onOpen(recipe));
  return card;
}

export function mountPromptOSCatalog() {
  if (document.getElementById('page-catalog')) return;
  addStylesheet();

  const main = document.querySelector('.main');
  if (!main) return;

  const page = createPage();
  const dialog = createDialog();
  main.appendChild(page);
  document.body.appendChild(dialog);

  let initialized = false;
  let recipes = [];
  let visibleCount = PAGE_SIZE;
  let currentRecipe = null;
  let currentResult = null;

  function showCatalog() {
    document.querySelectorAll('.page').forEach((item) => item.classList.remove('on'));
    page.classList.add('on');
    document.querySelectorAll('.nav-item[data-page]').forEach((button) => {
      button.classList.toggle('active', button.dataset.page === 'catalog');
    });
    initializeCatalog();
  }

  mountNavigation(showCatalog);

  function initializeCatalog() {
    if (initialized) return;
    initialized = true;

    const built = buildCatalogRecipes();
    recipes = built.recipes;
    page.querySelector('#catalogTotal').textContent = recipes.length.toLocaleString();
    page.querySelector('#catalogCandidateTotal').textContent = built.candidateCount.toLocaleString();

    const search = page.querySelector('#catalogSearch');
    const family = page.querySelector('#catalogFamily');
    const platform = page.querySelector('#catalogPlatform');
    const stage = page.querySelector('#catalogStage');
    const grid = page.querySelector('#catalogGrid');
    const resultCount = page.querySelector('#catalogResultCount');
    const shownCount = page.querySelector('#catalogShownCount');
    const more = page.querySelector('#catalogMore');

    for (const item of Object.values(canonicalFamilies)) addOption(family, item.id, item.title);
    for (const value of [...new Set(recipes.map((recipe) => recipe.platform))].sort()) addOption(platform, value);
    for (const value of [...new Set(recipes.map((recipe) => recipe.stage))].sort()) addOption(stage, value);

    function filtered() {
      const query = search.value.trim().toLowerCase();
      return recipes.filter((recipe) => {
        if (family.value && recipe.familyId !== family.value) return false;
        if (platform.value && recipe.platform !== platform.value) return false;
        if (stage.value && recipe.stage !== stage.value) return false;
        if (!query) return true;
        return [recipe.title, recipe.description, recipe.pack, recipe.familyId, recipe.riskLens, ...recipe.modes]
          .some((value) => String(value).toLowerCase().includes(query));
      });
    }

    function openRecipe(recipe) {
      currentRecipe = recipe;
      currentResult = null;
      dialog.querySelector('#catalogDialogFamily').textContent = recipe.familyId;
      dialog.querySelector('#catalogDialogTitle').textContent = recipe.title;
      dialog.querySelector('#catalogDialogDescription').textContent = recipe.description;
      const inputs = dialog.querySelector('#catalogInputs');
      inputs.replaceChildren();

      for (const key of recipe.inputs) {
        const wrapper = document.createElement('label');
        wrapper.className = 'field';
        const label = document.createElement('span');
        label.textContent = key.replace(/([a-z])([A-Z])/g, '$1 $2');
        const control = document.createElement(LONG_INPUTS.has(key) ? 'textarea' : 'input');
        control.dataset.catalogInput = key;
        control.name = key;
        control.required = true;
        control.autocomplete = 'off';
        wrapper.append(label, control);
        inputs.appendChild(wrapper);
      }

      dialog.querySelector('#catalogOutput').textContent = 'Fill the required inputs, then compile.';
      dialog.querySelector('#catalogReadiness').textContent = `${recipe.inputs.length} required inputs`;
      dialog.querySelector('#catalogReadiness').removeAttribute('data-state');
      dialog.querySelector('#catalogCopy').disabled = true;
      dialog.querySelector('#catalogProvenance').textContent = `${recipe.platform} · ${recipe.stage} · ${recipe.modes.join(', ')} · ${recipe.riskLens}`;
      emitAnalytics('card_opened', recipe);
      dialog.showModal();
      inputs.querySelector('input, textarea')?.focus();
    }

    function render() {
      const list = filtered();
      const visible = list.slice(0, visibleCount);
      grid.replaceChildren(...visible.map((recipe) => cardFor(recipe, openRecipe)));
      resultCount.textContent = `${list.length.toLocaleString()} recipe${list.length === 1 ? '' : 's'}`;
      shownCount.textContent = `${visible.length.toLocaleString()} shown`;
      more.hidden = visible.length >= list.length;
    }

    function resetAndRender() {
      visibleCount = PAGE_SIZE;
      render();
      emitAnalytics('catalog_filtered', null, {
        hasSearch: Boolean(search.value.trim()),
        family: family.value || null,
        platform: platform.value || null,
        stage: stage.value || null,
      });
    }

    for (const control of [search, family, platform, stage]) {
      control.addEventListener(control === search ? 'input' : 'change', resetAndRender);
    }
    page.querySelector('#catalogReset').addEventListener('click', () => {
      search.value = '';
      family.value = '';
      platform.value = '';
      stage.value = '';
      resetAndRender();
    });
    more.addEventListener('click', () => {
      visibleCount += PAGE_SIZE;
      render();
    });

    dialog.querySelector('#catalogClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.querySelector('#catalogCompile').addEventListener('click', () => {
      if (!currentRecipe) return;
      const values = {};
      dialog.querySelectorAll('[data-catalog-input]').forEach((control) => {
        values[control.dataset.catalogInput] = control.value;
      });
      currentResult = openPromptCard(currentRecipe, values, {});
      const output = dialog.querySelector('#catalogOutput');
      const readiness = dialog.querySelector('#catalogReadiness');
      const copy = dialog.querySelector('#catalogCopy');
      output.textContent = currentResult.preview;
      copy.disabled = !currentResult.readyToCopy;
      if (currentResult.readyToCopy) {
        readiness.textContent = 'Ready to copy · all required context is present.';
        readiness.dataset.state = 'ready';
        emitAnalytics('compile_ready', currentRecipe);
      } else {
        readiness.textContent = `Missing: ${currentResult.missingInputs.join(', ')}`;
        readiness.dataset.state = 'missing';
        emitAnalytics('compile_missing_input', currentRecipe, { missingCount: currentResult.missingInputs.length });
      }
    });

    dialog.querySelector('#catalogCopy').addEventListener('click', async () => {
      if (!currentRecipe || !currentResult?.readyToCopy) return;
      try {
        await navigator.clipboard.writeText(currentResult.preview);
        toast('Catalog prompt copied.');
        emitAnalytics('prompt_copied', currentRecipe);
      } catch {
        toast('Clipboard access is unavailable in this browser.');
      }
    });

    render();
    emitAnalytics('catalog_mounted', null, {
      selectedCount: recipes.length,
      candidateCount: built.candidateCount,
    });
  }
}

mountPromptOSCatalog();
