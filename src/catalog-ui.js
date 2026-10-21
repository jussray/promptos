import { PUBLIC_COMMAND_CATEGORIES, buildCatalogRecipes, canonicalFamilies, openPromptCard, publicCommands, resolvePublicCommand } from './catalog-runtime/index.js';

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

function relabelQuickLibraryButton(button, { mobile = false } = {}) {
  if (!button) return;
  button.setAttribute('aria-label', 'Quick prompt subset');
  if (mobile) {
    button.textContent = '📚 Quick';
    return;
  }
  const count = button.querySelector('.n-count');
  button.replaceChildren(document.createTextNode('📚 Quick Library '));
  if (count) button.appendChild(count);
}

function relabelQuickLibrarySurface() {
  relabelQuickLibraryButton(document.querySelector('.sidebar [data-page="library"]'));
  relabelQuickLibraryButton(document.querySelector('.mobile-nav [data-page="library"]'), { mobile: true });

  const page = document.getElementById('page-library');
  if (!page) return;
  const crumb = page.querySelector('.crumb b');
  const heading = page.querySelector('.page-head h2');
  const description = page.querySelector('.page-head p');
  const firstStatLabel = page.querySelector('.stat-row .stat .l');
  if (crumb) crumb.textContent = 'quick library';
  if (heading) heading.textContent = 'Quick Library';
  if (description) {
    description.textContent = 'A compact quick-access subset. The canonical PromptOS catalog contains 398 curated prompts across 5,000 bounded recipes.';
  }
  if (firstStatLabel) firstStatLabel.textContent = 'Quick prompts';
}

function navButton({ mobile = false } = {}) {
  const button = document.createElement('button');
  button.className = 'nav-item';
  button.dataset.page = 'catalog';
  button.setAttribute('aria-label', 'Canonical PromptOS recipe catalog');
  if (mobile) button.textContent = '🧬 Catalog';
  else button.innerHTML = '🧬 Catalog <span class="n-count" id="catalogNavCount">5K</span>';
  return button;
}

function mountNavigation(onOpen) {
  const desktopLibrary = document.querySelector('.sidebar [data-page="library"]');
  if (desktopLibrary && !document.querySelector('.sidebar [data-page="catalog"]')) {
    const button = navButton();
    button.addEventListener('click', onOpen);
    desktopLibrary.insertAdjacentElement('beforebegin', button);
  }

  const mobileLibrary = document.querySelector('.mobile-nav [data-page="library"]');
  if (mobileLibrary && !document.querySelector('.mobile-nav [data-page="catalog"]')) {
    const button = navButton({ mobile: true });
    button.addEventListener('click', onOpen);
    mobileLibrary.insertAdjacentElement('beforebegin', button);
  }
}

function bindGlobalCatalogTruth(built) {
  const summary = {
    curatedCount: built.curatedCount,
    selectedCount: built.recipes.length,
    candidateCount: built.candidateCount,
    quickLibraryCount: Array.isArray(window.PROMPTS) ? window.PROMPTS.length : 0,
  };
  window.__PROMPTOS_CATALOG_SUMMARY__ = Object.freeze(summary);

  const pill = document.getElementById('countPill');
  if (!pill) return;
  const truth = `${summary.curatedCount.toLocaleString()} curated · ${summary.selectedCount.toLocaleString()} recipes`;
  const enforce = () => {
    if (pill.textContent !== truth) pill.textContent = truth;
    pill.dataset.catalogTruth = 'canonical';
  };
  enforce();

  const observer = new MutationObserver(enforce);
  observer.observe(pill, { childList: true, characterData: true, subtree: true });
}

function createPage() {
  const section = document.createElement('section');
  section.className = 'page';
  section.id = 'page-catalog';
  section.innerHTML = `
    <div class="page-head">
      <div class="crumb">promptos <span>/</span> <b>catalog</b></div>
      <h2>5,000 bounded recipes. Compile only what the task needs.</h2>
      <p>398 curated prompts anchor the canonical recipe index. Filter the catalog, add concrete context, and compile a provider-ready prompt with provenance and proof guardrails.</p>
    </div>
    <div class="promptos-command-deck" aria-label="PromptOS public command palette">
      <div class="promptos-command-head">
        <div>
          <div class="crumb">intent <span>/</span> <b>command palette</b></div>
          <h3>Short command in. Governed capability route out.</h3>
          <p>Use a human-sized command. PromptOS resolves the capability and specialist while execution authority stays separate.</p>
        </div>
        <span class="badge cat" id="commandCountBadge">30 public commands</span>
      </div>
      <form class="promptos-command-form" id="commandForm">
        <label class="promptos-command-input"><span>Command</span><input id="commandInput" type="text" placeholder="/fix checkout" autocomplete="off" spellcheck="false"></label>
        <label><span>Project hint</span><input id="commandProject" type="text" placeholder="optional: Se'kret Bip" autocomplete="off"></label>
        <button class="mini-btn solid" type="submit">Resolve</button>
      </form>
      <div class="promptos-command-categories" id="commandCategories" aria-label="Command categories"></div>
      <div class="promptos-command-suggestions" id="commandSuggestions" aria-live="polite"></div>
      <div class="promptos-command-route" id="commandRoute" data-state="idle" aria-live="polite">
        <div class="promptos-command-route-top"><strong id="commandRouteToken">/command</strong><span id="commandRouteState">Choose a command to inspect its route.</span></div>
        <dl>
          <div><dt>Capability</dt><dd id="commandRouteCapability">Not resolved</dd></div>
          <div><dt>Specialist</dt><dd id="commandRouteSpecialist">Not resolved</dd></div>
          <div><dt>Authority</dt><dd id="commandRouteAuthority">Advisory only · FCR not connected</dd></div>
          <div><dt>Arguments</dt><dd id="commandRouteArgs">None</dd></div>
        </dl>
        <button class="mini-btn" id="commandBrowse" type="button" disabled>Browse related recipes</button>
      </div>
    </div>
    <div class="promptos-stats" aria-label="PromptOS catalog summary">
      <div class="stat"><div class="n" id="catalogTotal">5,000</div><div class="l">Selected recipes</div></div>
      <div class="stat"><div class="n" id="catalogCuratedTotal">398</div><div class="l">Curated prompts</div></div>
      <div class="stat"><div class="n" id="catalogCandidateTotal">5,400</div><div class="l">Valid candidates</div></div>
      <div class="stat"><div class="n" id="catalogFamilyTotal">8</div><div class="l">Canonical families</div></div>
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

function initializeCommandPalette(page) {
  const form = page.querySelector('#commandForm');
  if (!form) return;

  const input = page.querySelector('#commandInput');
  const project = page.querySelector('#commandProject');
  const categoryWrap = page.querySelector('#commandCategories');
  const suggestions = page.querySelector('#commandSuggestions');
  const route = page.querySelector('#commandRoute');
  const browse = page.querySelector('#commandBrowse');
  const routeToken = page.querySelector('#commandRouteToken');
  const routeState = page.querySelector('#commandRouteState');
  const routeCapability = page.querySelector('#commandRouteCapability');
  const routeSpecialist = page.querySelector('#commandRouteSpecialist');
  const routeAuthority = page.querySelector('#commandRouteAuthority');
  const routeArgs = page.querySelector('#commandRouteArgs');
  const countBadge = page.querySelector('#commandCountBadge');
  let activeCategory = PUBLIC_COMMAND_CATEGORIES[0];
  let currentResult = null;

  countBadge.textContent = `${publicCommands.length} public commands`;
  window.__PROMPTOS_COMMAND_SUMMARY__ = Object.freeze({
    commandCount: publicCommands.length,
    categories: Object.freeze([...PUBLIC_COMMAND_CATEGORIES]),
    authority: 'founder-control-room',
    productSurface: 'standalone-promptos',
    fcrConnected: false,
    executionAuthority: false,
  });

  function renderCategories() {
    categoryWrap.replaceChildren();
    for (const category of PUBLIC_COMMAND_CATEGORIES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'promptos-command-category';
      button.classList.toggle('active', category === activeCategory);
      button.textContent = category;
      button.addEventListener('click', () => {
        activeCategory = category;
        renderCategories();
        renderSuggestions();
      });
      categoryWrap.appendChild(button);
    }
  }

  function visibleCommands() {
    const query = input.value.trim().toLowerCase().replace(/^\//, '').split(/\s+/)[0].replace(/:$/, '');
    const inCategory = publicCommands.filter((command) => command.category === activeCategory);
    if (!query) return inCategory;
    return publicCommands.filter((command) => {
      const tokens = [command.id, ...command.aliases, command.label, command.description].map((value) => String(value).toLowerCase());
      return tokens.some((value) => value.includes(query));
    });
  }

  function renderSuggestions() {
    const commands = visibleCommands().slice(0, 8);
    suggestions.replaceChildren();
    for (const command of commands) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'promptos-command-suggestion';
      const token = document.createElement('strong');
      token.textContent = `/${command.id}`;
      const description = document.createElement('span');
      description.textContent = command.description;
      button.append(token, description);
      button.addEventListener('click', () => {
        input.value = `/${command.id}`;
        resolveAndRender();
        input.focus();
      });
      suggestions.appendChild(button);
    }
  }

  function resolveAndRender() {
    const result = resolvePublicCommand(input.value, { project: project.value });
    currentResult = result.ok ? result : null;
    if (!result.ok) {
      route.dataset.state = 'error';
      routeToken.textContent = input.value.trim() || '/command';
      routeState.textContent = result.suggestions.length
        ? `Unknown command. Try ${result.suggestions.join(', ')}.`
        : 'Unknown command. Choose one of the public capabilities above.';
      routeCapability.textContent = 'Not resolved';
      routeSpecialist.textContent = 'Not resolved';
      routeAuthority.textContent = 'Advisory only · FCR not connected';
      routeArgs.textContent = 'None';
      browse.disabled = true;
      return;
    }

    route.dataset.state = 'resolved';
    routeToken.textContent = result.command.token;
    routeState.textContent = `${result.command.category} intent resolved. Execution has not been claimed.`;
    routeCapability.textContent = result.capabilityId;
    routeSpecialist.textContent = result.route.specialistProduct;
    routeAuthority.textContent = 'Advisory only · FCR not connected';
    routeArgs.textContent = result.arguments || 'None';
    browse.disabled = false;
    window.dispatchEvent(new CustomEvent('promptos:command', { detail: result }));
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    resolveAndRender();
  });
  input.addEventListener('input', renderSuggestions);
  project.addEventListener('input', () => {
    if (currentResult) resolveAndRender();
  });
  browse.addEventListener('click', () => {
    if (!currentResult) return;
    const catalogSearch = page.querySelector('#catalogSearch');
    if (!catalogSearch) return;
    catalogSearch.value = currentResult.catalogQuery;
    catalogSearch.dispatchEvent(new Event('input', { bubbles:true }));
    catalogSearch.scrollIntoView({ behavior:'smooth', block:'center' });
    catalogSearch.focus();
  });

  renderCategories();
  renderSuggestions();
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
  relabelQuickLibrarySurface();

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
  initializeCommandPalette(page);

  function initializeCatalog() {
    if (initialized) return;
    initialized = true;

    const built = buildCatalogRecipes();
    recipes = built.recipes;
    bindGlobalCatalogTruth(built);
    page.querySelector('#catalogTotal').textContent = recipes.length.toLocaleString();
    page.querySelector('#catalogCuratedTotal').textContent = built.curatedCount.toLocaleString();
    page.querySelector('#catalogCandidateTotal').textContent = built.candidateCount.toLocaleString();
    page.querySelector('#catalogFamilyTotal').textContent = Object.keys(canonicalFamilies).length.toLocaleString();

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
      curatedCount: built.curatedCount,
      candidateCount: built.candidateCount,
    });
  }

  showCatalog();
}

mountPromptOSCatalog();
