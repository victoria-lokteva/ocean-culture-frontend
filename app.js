const API = "data/organizations.json";
const NEWS_URL =
"https://opensheet.elk.sh/1SCBaht6OcwNptYAcOvwzP6srdEnBP26hJ9zJZX2bMEs/Hoja1";

/* ---------------------------------------------------
   Header state on scroll
--------------------------------------------------- */
const header = document.getElementById('siteHeader');
const onScroll = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 40);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------------------------------------------------
   Reveal-on-scroll for sections
--------------------------------------------------- */
const revealTargets = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach(el => io.observe(el));
} else {
  revealTargets.forEach(el => el.classList.add('is-visible'));
}

/* ---------------------------------------------------
   Category system
--------------------------------------------------- */
const CATEGORIES = {
  fundacion: { label: 'Fundaciones', color: '#3D7A5C' },
  ong:       { label: 'ONGs',        color: '#12586E' },
  red:       { label: 'Redes y programas', color: '#E3A857' },
  otros:     { label: 'Otras iniciativas',  color: '#63838C' },
};

function categorize(actorType){
  const t = (actorType || '').toLowerCase();
  if (t.includes('fundaci')) return 'fundacion';
  if (t.includes('ong')) return 'ong';
  if (t.includes('red') || t.includes('programa')) return 'red';
  return 'otros';
}

function markerIcon(color){
  return L.divIcon({
    className: '',
    html: `<div class="marker-dot" style="background:${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

const iconSvg = {
  website: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`,
};

function buildPopup(org){
  const tags = [org.city, org.actor_type].filter(Boolean);
  let html = `<div class="org-popup">
    <h3>${org.organization}</h3>
    <div class="org-tags">${tags.map(t => `<span class="org-tag">${t}</span>`).join('')}</div>`;

  if (org.relationship){
    html += `<p class="org-note">${org.relationship}</p>`;
  }

  html += `<div class="org-links">`;
  if (org.website){
    html += `<a class="org-link" href="${org.website}" target="_blank" rel="noopener">${iconSvg.website} Sitio</a>`;
  }
  if (org.instagram_url){
    html += `<a class="org-link" href="${org.instagram_url}" target="_blank" rel="noopener">${iconSvg.instagram} Instagram</a>`;
  }
  html += `</div></div>`;
  return html;
}

/* ---------------------------------------------------
   Map setup
--------------------------------------------------- */
const map = L.map('map', { scrollWheelZoom: false }).setView([-35.5, -71.0], 4.6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 18,
}).addTo(map);

map.on('focus', () => map.scrollWheelZoom.enable());
map.on('blur', () => map.scrollWheelZoom.disable());

const mapStatus = document.getElementById('mapStatus');
const legendEl = document.getElementById('legend');
const statCount = document.getElementById('statCount');
const statCities = document.getElementById('statCities');

const markersByCategory = {};

function renderLegend(counts){
  legendEl.innerHTML = '';
  Object.entries(CATEGORIES).forEach(([key, meta]) => {
    if (!counts[key]) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'legend-chip';
    chip.style.setProperty('--dot-color', meta.color);
    chip.dataset.category = key;
    chip.innerHTML = `<span class="legend-dot"></span> ${meta.label} (${counts[key]})`;
    chip.addEventListener('click', () => {
      const isOff = chip.classList.toggle('is-off');
      const layer = markersByCategory[key];
      if (!layer) return;
      if (isOff) map.removeLayer(layer);
      else layer.addTo(map);
    });
    legendEl.appendChild(chip);
  });
}

function fetchMapData(attempt = 1){
  // cache:'no-store' + a cache-busting param avoid the browser/CDN serving a
  // stale cached response (e.g. a 404 cached from right after a deploy) —
  // this is the most common cause of "no se pudo cargar" on a page that
  // actually has valid data.
  return fetch(`${API}?v=${Date.now()}`, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .catch(error => {
      if (attempt < 2){
        return new Promise(resolve => setTimeout(resolve, 600)).then(() => fetchMapData(attempt + 1));
      }
      throw error;
    });
}

fetchMapData()
  .then(data => {
    const counts = {};
    const cities = new Set();
    let placed = 0;

    data.forEach(org => {
      if (org.latitude == null || org.longitude == null) return;

      const category = categorize(org.actor_type);
      counts[category] = (counts[category] || 0) + 1;
      if (org.city) cities.add(org.city.split('/')[0].trim());

      if (!markersByCategory[category]){
        markersByCategory[category] = L.layerGroup().addTo(map);
      }

      L.marker([org.latitude, org.longitude], { icon: markerIcon(CATEGORIES[category].color) })
        .bindPopup(buildPopup(org))
        .addTo(markersByCategory[category]);

      placed++;
    });

    renderLegend(counts);
    statCount.textContent = placed;
    statCities.textContent = cities.size;

    mapStatus.classList.add('is-hidden');
    if (placed === 0){
      mapStatus.classList.remove('is-hidden');
      mapStatus.classList.add('is-error');
      mapStatus.textContent = 'No encontramos organizaciones con coordenadas para mostrar.';
    }
  })
  .catch(error => {
    console.error(error);
    mapStatus.classList.remove('is-hidden');
    mapStatus.classList.add('is-error');
    mapStatus.textContent = 'No pudimos cargar el mapa. Intenta recargar la página en unos segundos.';
  });


/* ---------------------------------------------------
   News
--------------------------------------------------- */
const newsContainer = document.getElementById("newsContainer");


function normalizeImageUrl(raw){
  const url = (raw || '').trim();
  if (!url) return '';

  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFile) return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`;

  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpen) return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`;

  return url;
}

fetch(NEWS_URL)
  .then(response => response.json())
  .then(news => {

    newsContainer.innerHTML = "";

    news.forEach(item => {

      const imageUrl = normalizeImageUrl(item.image);
      const imageHtml = imageUrl
        ? `
          <img
            src="${imageUrl}"
            alt="${item.title}"
            class="news-image"
            loading="lazy"
            onerror="this.remove()">
        `
        : "";

      newsContainer.innerHTML += `
        <article class="news-card">
          <h3>${item.title}</h3>

          ${imageHtml}

          <p>${item.summary}</p>

          <a href="${item.link}" target="_blank" rel="noopener">
            Leer noticia →
          </a>
        </article>
      `;

    });

  })
  .catch(error => {
    console.error(error);

    newsContainer.innerHTML =
      "<p>No fue posible cargar las noticias.</p>";
  });