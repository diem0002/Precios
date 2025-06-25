const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5JA7l3_7kg8Eg0oXDaZYogbP9kxVzJfvypjbiUz-B4pOuUz-bHzAteAyRjbaYNQ/pub?output=csv';

let productsData = [];
let videoStream = null;
const scanHistory = [];

window.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupCarousel();
  setupEventListeners();
});

// -------------------- PROMO CAROUSEL --------------------

function setupCarousel() {
  const track = document.getElementById('promo-carousel-track');
  if (!track) return;

  const slides = track.querySelectorAll('img');
  let index = 0;
  let interval;

  function moveCarousel() {
    index = (index + 1) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
  }

  function startCarousel() {
    interval = setInterval(moveCarousel, 4000);
  }

  function stopCarousel() {
    clearInterval(interval);
  }

  // Mouse
  track.addEventListener('mouseover', stopCarousel);
  track.addEventListener('mouseleave', startCarousel);

  // Touch (móvil)
  let startX = 0;
  track.addEventListener('touchstart', (e) => startX = e.touches[0].clientX);
  track.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) index = (index + 1) % slides.length;
      else index = (index - 1 + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
    }
  });

  startCarousel();
}

// -------------------- EVENTOS --------------------

function setupEventListeners() {
  document.querySelectorAll('.price-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const [min, max] = btn.dataset.range.split('-').map(Number);
      showRandomProductsByPrice(min, max);
    });
  });

  document.getElementById('startScanner')?.addEventListener('click', startScanner);
  document.getElementById('stopScanner')?.addEventListener('click', stopScanner);
  document.getElementById('toggleManualSearch')?.addEventListener('click', toggleManualSearch);
  document.getElementById('manualSearchBtn')?.addEventListener('click', manualSearch);
}

// -------------------- ESTADO CONEXIÓN --------------------

function showConnectionStatus(connecting) {
  const statusElement = document.getElementById('connection-status');
  if (!statusElement) return;
  statusElement.classList.toggle('hidden', !connecting);
  statusElement.innerHTML = connecting ? '<p>Conectando al servidor para obtener datos actualizados...</p>' : '';
}

// -------------------- CARGA DE DATOS --------------------

async function loadData() {
  showConnectionStatus(true);
  document.getElementById('loading')?.classList.remove('hidden');

  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`${SHEET_URL}&timestamp=${timestamp}`);
    if (!response.ok) throw new Error('Error en la respuesta del servidor');

    const csvData = await response.text();
    Papa.parse(csvData, {
      header: true,
      complete: function(results) {
        productsData = results.data;
        document.getElementById('loading')?.classList.add('hidden');
        showConnectionStatus(false);
        updateLastUpdateTime();
      },
      error: function(error) {
        console.error('Error al parsear datos:', error);
        handleDataError();
      }
    });

  } catch (error) {
    console.error('Error al cargar datos:', error);
    handleDataError();
  }
}

function updateLastUpdateTime() {
  const now = new Date();
  const el = document.getElementById('last-update-time');
  if (el) el.textContent = now.toLocaleString();
}

function handleDataError() {
  document.getElementById('loading')?.classList.add('hidden');
  showConnectionStatus(true);
  document.getElementById('result').textContent = 'Error al cargar datos. Reconectando...';
  setTimeout(loadData, 5000);
}

// -------------------- PRODUCTOS POR PRECIO --------------------

function normalize(text) {
  return text?.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function showRandomProductsByPrice(minPrice, maxPrice) {
  if (!productsData.length) return;

  const excludedBodegas = [...lista_de_bodegas_a_excluir].map(normalize);
  const filtered = productsData.filter(product => {
    const precio = parseInt(product.Precio?.replace(/\D/g, ''));
    const bodega = normalize(product.Bodega || '');
    return (
      !isNaN(precio) &&
      precio >= minPrice &&
      precio <= maxPrice &&
      !excludedBodegas.includes(bodega)
    );
  });

  const selection = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 10);
  const sorted = selection.sort((a, b) => {
    const priceA = parseInt(a.Precio?.replace(/\D/g, '')) || 0;
    const priceB = parseInt(b.Precio?.replace(/\D/g, '')) || 0;
    return priceA - priceB;
  });

  const productsBody = document.getElementById('products-body');
  productsBody.innerHTML = '';
  if (!sorted.length) {
    productsBody.innerHTML = '<tr><td colspan="3">No se encontraron vinos en ese rango</td></tr>';
    return;
  }

  sorted.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.Producto || 'N/A'}</td>
      <td>${product.Bodega || 'N/A'}</td>
      <td>${product.Precio || 'N/A'}</td>
    `;
    productsBody.appendChild(row);
  });

  document.getElementById('bodega-name').textContent =
    maxPrice === 999999 ? `Vinos desde $${minPrice.toLocaleString()}` :
    `Vinos de $${minPrice.toLocaleString()} a $${maxPrice.toLocaleString()}`;
  document.getElementById('result').textContent = `Mostrando ${sorted.length} vinos en ese rango.`;
  document.getElementById('products-container').classList.remove('hidden');
}

// -------------------- SCANNER QR --------------------

function startScanner() {
  const video = document.getElementById('video');
  const scannerContainer = document.getElementById('scannerContainer');
  scannerContainer.classList.remove('hidden');
  document.getElementById('startScanner').classList.add('hidden');

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(function (stream) {
      videoStream = stream;
      video.srcObject = stream;
      video.classList.remove('hidden');
      video.play();
      requestAnimationFrame(tick);
    })
    .catch(function (err) {
      console.error("Error al acceder a la cámara:", err);
      document.getElementById('result').textContent = "No se pudo acceder a la cámara.";
    });
}

function stopScanner() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  document.getElementById('scannerContainer').classList.add('hidden');
  document.getElementById('startScanner').classList.remove('hidden');
  document.getElementById('video').classList.add('hidden');
}

function tick() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('scanner');
  const context = canvas.getContext('2d');

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.hidden = false;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

    if (code) {
      stopScanner();
      showProducts(code.data);
      updateHistory(code.data);
    }
  }

  requestAnimationFrame(tick);
}

// -------------------- BÚSQUEDA MANUAL --------------------

function toggleManualSearch() {
  const inputContainer = document.getElementById('manualInputContainer');
  inputContainer.classList.toggle('hidden');
  if (!inputContainer.classList.contains('hidden')) {
    document.getElementById('manualBodegaInput').focus();
  }
}

function manualSearch() {
  const input = document.getElementById('manualBodegaInput');
  const term = input.value.trim();
  if (!term) return document.getElementById('result').textContent = 'Por favor ingresa un nombre';

  const found = searchProductsByName(term);
  if (found.length) {
    showProductSearchResults(found, term);
    updateHistory(term);
    input.value = '';
    document.getElementById('manualInputContainer').classList.add('hidden');
  } else {
    document.getElementById('result').textContent = 'No se encontraron productos.';
  }
}

function searchProductsByName(searchTerm) {
  return productsData.filter(p => normalize(p.Producto).includes(normalize(searchTerm)));
}

function showProductSearchResults(products, searchTerm) {
  document.getElementById('bodega-name').textContent = `Resultados para: "${searchTerm}"`;
  document.getElementById('result').textContent = `Mostrando ${products.length} productos encontrados`;

  const tbody = document.getElementById('products-body');
  tbody.innerHTML = '';
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="3">No se encontraron productos</td></tr>';
    return;
  }

  products.sort((a, b) => (a.Producto || '').localeCompare(b.Producto || ''));
  products.forEach(p => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.Producto || 'N/A'} ${p.Varietal ? `<span class="product-detail">${p.Varietal}</span>` : ''}</td>
      <td>${p.Bodega || 'N/A'} ${p.Region ? `<span class="product-detail">${p.Region}</span>` : ''}</td>
      <td>${p.Precio || 'N/A'}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById('products-container').classList.remove('hidden');
  updateLastUpdateTime();
}

// -------------------- MOSTRAR PRODUCTOS POR BODEGA (QR) --------------------

function showProducts(bodegaName) {
  const normalized = normalize(bodegaName);
  const filtered = productsData.filter(p => normalize(p.Bodega || '') === normalized);
  document.getElementById('bodega-name').textContent = bodegaName;
  document.getElementById('result').textContent = `Mostrando productos para: ${bodegaName}`;

  const tbody = document.getElementById('products-body');
  tbody.innerHTML = '';
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="3">No se encontraron productos para esta bodega</td></tr>';
    return;
  }

  filtered.forEach(p => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.Producto || 'N/A'} ${p.Varietal ? `<span class="product-detail">${p.Varietal}</span>` : ''}</td>
      <td>${p.Bodega || 'N/A'} ${p.Region ? `<span class="product-detail">${p.Region}</span>` : ''}</td>
      <td>${p.Precio || 'N/A'}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById('products-container').classList.remove('hidden');
  updateLastUpdateTime();
}

// -------------------- HISTORIAL --------------------

function updateHistory(searchTerm) {
  const term = searchTerm.trim();
  if (!scanHistory.some(item => normalize(item) === normalize(term))) {
    scanHistory.unshift(term);
    if (scanHistory.length > 5) scanHistory.pop();
    renderHistory();
  }
}

function renderHistory() {
  const container = document.getElementById('historyContainer');
  const list = document.getElementById('historyList');
  list.innerHTML = '';

  scanHistory.forEach(term => {
    const li = document.createElement('li');
    li.textContent = term;
    li.addEventListener('click', () => {
      document.getElementById('manualBodegaInput').value = term;
      const found = searchProductsByName(term);
      if (found.length) showProductSearchResults(found, term);
      document.getElementById('manualInputContainer').classList.add('hidden');
    });
    list.appendChild(li);
  });

  if (scanHistory.length) container.classList.remove('hidden');
}
