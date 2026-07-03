/* ---------------------------------------------------
   Header state on scroll (shared behavior with index)
--------------------------------------------------- */
const header = document.getElementById('siteHeader');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------------------------------------------------
   Render accordion from RESOURCE_CATEGORIES
--------------------------------------------------- */
const list = document.getElementById('resourceList');
const searchInput = document.getElementById('resourceSearch');
const resultCount = document.getElementById('resultCount');
const emptyState = document.getElementById('emptyState');

const iconExternal = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 3H3v10h10V10M9 3h4v4M13 3L7 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function totalLinkCount(){
  return RESOURCE_CATEGORIES.reduce((sum, cat) => sum + cat.items.filter(i => i.url).length, 0);
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

function renderAll(){
  list.innerHTML = '';
  RESOURCE_CATEGORIES.forEach((cat, i) => {
    list.appendChild(renderCategory(cat, i === 0));
  });
  resultCount.textContent = `${totalLinkCount()} enlaces en ${RESOURCE_CATEGORIES.length} categorías`;
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
    resultCount.textContent = `${totalLinkCount()} enlaces en ${RESOURCE_CATEGORIES.length} categorías`;
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
