/* ---------------------------------------------------
   Header state on scroll (shared behavior with index)
--------------------------------------------------- */
const header = document.getElementById('siteHeader');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------------------------------------------------
   Load categories from Google Sheets, with a local
   fallback (resources-data.js) if the sheet can't be reached.

   Sheet columns expected in "Hoja1":
     orden | categoria | descripcion_categoria | texto_enlace | url
--------------------------------------------------- */
const SHEET_ID = "1ZUlUOLows-_gckQPBi726IE9eXqkBFzwcj2SfNCe00I";
const SHEET_TAB = "Hoja1";
const SHEET_URL = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_TAB}`;

function rowsToCategories(rows){
  const byOrder = new Map();

  rows.forEach(row => {
    const order = Number(row.orden) || 0;
    const title = (row.categoria || '').trim();
    if (!title) return;

    const intro = (row.descripcion_categoria || '').trim();
    const label = (row.texto_enlace || '').trim();
    const url = (row.url || '').trim();

    if (!byOrder.has(title)){
      byOrder.set(title, {
        id: title.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        title,
        order,
        intro: intro || '',
        items: [],
      });
    }

    const cat = byOrder.get(title);
    if (order) cat.order = Math.min(cat.order || order, order);
    if (intro && !cat.intro) cat.intro = intro;
    if (label) cat.items.push({ label, url: url || null });
  });

  return Array.from(byOrder.values()).sort((a, b) => a.order - b.order);
}

async function loadCategories(){
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    const categories = rowsToCategories(rows);
    if (!categories.length) throw new Error('Sheet returned no usable rows');
    return categories;
  } catch (error) {
    console.warn('No se pudo cargar la hoja de recursos, usando datos locales de respaldo.', error);
    return RESOURCE_CATEGORIES; // from resources-data.js, loaded as a <script> before this file
  }
}

/* ---------------------------------------------------
   Render accordion
--------------------------------------------------- */
const list = document.getElementById('resourceList');
const searchInput = document.getElementById('resourceSearch');
const resultCount = document.getElementById('resultCount');
const emptyState = document.getElementById('emptyState');

let CATEGORIES = [];

const iconExternal = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 3H3v10h10V10M9 3h4v4M13 3L7 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function totalLinkCount(){
  return CATEGORIES.reduce((sum, cat) => sum + cat.items.filter(i => i.url).length, 0);
}

function renderCategory(cat, open){
  const details = document.createElement('details');
  details.className = 'resource-category';
  details.dataset.categoryId = cat.id;
  if (open) details.open = true;

  const summary = document.createElement('summary');
  summary.innerHTML = `
    <span class="resource-category-title">${cat.title}</span>
    <span class="resource-category-count">${cat.items.length ? cat.items.length : ''}</span>
  `;
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'resource-category-body';

  if (cat.intro){
    const intro = document.createElement('p');
    intro.className = 'resource-category-intro';
    intro.textContent = cat.intro;
    body.appendChild(intro);
  }

  if (!cat.items.length){
    const note = document.createElement('p');
    note.className = 'resource-empty-note';
    note.textContent = cat.emptyNote || 'Contenido en construcción.';
    body.appendChild(note);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'resource-list';
    cat.items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'resource-item';
      li.dataset.label = item.label.toLowerCase();
      if (item.url){
        li.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener">${item.label} ${iconExternal}</a>`;
      } else {
        li.innerHTML = `<span class="resource-item-text">${item.label}</span>`;
      }
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }

  details.appendChild(body);
  return details;
}

async function renderAll(){
  CATEGORIES = await loadCategories();
  list.innerHTML = '';
  CATEGORIES.forEach((cat, i) => {
    list.appendChild(renderCategory(cat, i === 0));
  });
  resultCount.textContent = `${totalLinkCount()} enlaces en ${CATEGORIES.length} categorías`;
}

renderAll();

/* ---------------------------------------------------
   Live search: filters items, opens matching categories
--------------------------------------------------- */
let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilter, 120);
});

function applyFilter(){
  const query = searchInput.value.trim().toLowerCase();
  const categories = list.querySelectorAll('.resource-category');
  let visibleCount = 0;
  let anyMatch = false;

  if (!query){
    categories.forEach((cat, i) => {
      cat.style.display = '';
      cat.open = i === 0;
      cat.querySelectorAll('.resource-item').forEach(li => { li.style.display = ''; });
    });
    emptyState.classList.add('is-hidden');
    resultCount.textContent = `${totalLinkCount()} enlaces en ${CATEGORIES.length} categorías`;
    return;
  }

  categories.forEach(cat => {
    const items = cat.querySelectorAll('.resource-item');
    let matchesInCategory = 0;

    items.forEach(li => {
      const matches = li.dataset.label.includes(query);
      li.style.display = matches ? '' : 'none';
      if (matches) matchesInCategory++;
    });

    const titleMatches = cat.querySelector('.resource-category-title').textContent.toLowerCase().includes(query);

    if (matchesInCategory > 0 || (titleMatches && items.length === 0)){
      cat.style.display = '';
      cat.open = true;
      visibleCount += matchesInCategory;
      anyMatch = true;
    } else {
      cat.style.display = 'none';
    }
  });

  emptyState.classList.toggle('is-hidden', anyMatch);
  resultCount.textContent = anyMatch
    ? `${visibleCount} resultado${visibleCount === 1 ? '' : 's'} para “${searchInput.value.trim()}”`
    : '';
}
