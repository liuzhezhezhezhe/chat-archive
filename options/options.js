import {
  getAlternateLanguage,
  getLanguage,
  getLanguageToggleLabel,
  getOptionsCopy,
  setLanguage
} from '../src/i18n.js';

let currentLanguage = 'en';

function renderCards(items, className) {
  return items.map((item) => `
    <article class="${className}">
      <strong>${item.title}</strong>
      <p>${item.body}</p>
    </article>
  `).join('');
}

function renderGuide() {
  const copy = getOptionsCopy(currentLanguage);
  const root = document.getElementById('guideContent');

  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
  document.title = copy.title;
  document.getElementById('pageTitle').textContent = copy.title;
  document.getElementById('pageDescription').textContent = copy.description;
  document.getElementById('complianceLeadTitle').textContent = copy.complianceLead.title;
  document.getElementById('complianceLeadBody').textContent = copy.complianceLead.body;
  document.getElementById('languageToggleBtn').textContent = getLanguageToggleLabel(currentLanguage);

  document.getElementById('heroCards').innerHTML = copy.heroCards.map((card, index) => `
    <article class="hero-card${index === 0 ? ' accent-card' : ''}">
      <strong>${card.title}</strong>
      <p>${card.body}</p>
    </article>
  `).join('');

  root.innerHTML = `
    <div class="guide-content">
    <section class="guide-grid">
      <section class="panel panel-block reading-panel">
        <div class="section-head compact-head"><div><h2>${copy.sections.uses.title}</h2></div></div>
        <div class="reading-grid">${renderCards(copy.sections.uses.cards, 'reading-card')}</div>
      </section>

      <section class="panel panel-block reading-panel">
        <div class="section-head compact-head"><div><h2>${copy.sections.structure.title}</h2></div></div>
        <div class="structure-note">
          ${copy.sections.structure.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}
        </div>
        <pre class="schema-preview">${copy.sections.structure.schemaPreview}</pre>
      </section>
    </section>

    <section class="panel panel-block reading-panel">
      <div class="section-head compact-head">
        <div><h2>${copy.sections.variants.title}</h2></div>
        <p class="desc short">${copy.sections.variants.description}</p>
      </div>
      <div class="variant-grid">${renderCards(copy.sections.variants.cards, 'variant-card')}</div>
    </section>

    <section class="panel panel-block reading-panel soft-section">
      <div class="section-head compact-head">
        <div><h2>${copy.sections.usage.title}</h2></div>
        <p class="desc short">${copy.sections.usage.description}</p>
      </div>
      <div class="reading-grid">${renderCards(copy.sections.usage.cards, 'reading-card')}</div>
    </section>

    <section class="panel panel-block reading-panel soft-section">
      <div class="section-head compact-head">
        <div><h2>${copy.sections.compliance.title}</h2></div>
        <p class="desc short">${copy.sections.compliance.description}</p>
      </div>
      <div class="reading-grid">${renderCards(copy.sections.compliance.cards, 'reading-card')}</div>
    </section>
    </div>
  `;
}

async function boot() {
  currentLanguage = await getLanguage();
  renderGuide();

  document.getElementById('languageToggleBtn').addEventListener('click', async () => {
    currentLanguage = await setLanguage(getAlternateLanguage(currentLanguage));
    renderGuide();
  });
}

boot();
