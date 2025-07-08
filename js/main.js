const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5JA7l3_7kg8Eg0oXDaZYogbP9kxVzJfvypjbiUz-B4pOuUz-bHzAteAyRjbaYNQ/pub?output=csv';

let productsData = [];
let videoStream = null;
const scanHistory = [];

function setupCarousel() {
  const track = document.getElementById('promo-carousel-track');
  const indicatorsContainer = document.getElementById('promo-indicators');
  if (!track || !indicatorsContainer) return;

  const visibleSlides = 3;
  let slides = Array.from(track.querySelectorAll('img'));

  // Clonar imágenes si el total no es múltiplo de 3
  const totalSlides = slides.length;
  const remainder = totalSlides % visibleSlides;
  if (remainder !== 0) {
    const clonesNeeded = visibleSlides - remainder;
    for (let i = 0; i < clonesNeeded; i++) {
      const clone = slides[i % totalSlides].cloneNode(true);
      track.appendChild(clone);
    }
    slides = Array.from(track.querySelectorAll('img')); // Actualizar la lista
  }

  const totalGroups = slides.length / visibleSlides;
  let index = 0;
  let interval;

  // Crear indicadores
  indicatorsContainer.innerHTML = '';
  for (let i = 0; i < totalGroups; i++) {
    const dot = document.createElement('span');
    dot.classList.add('promo-dot');
    if (i === 0) dot.classList.add('active');
    indicatorsContainer.appendChild(dot);
  }

  const dots = indicatorsContainer.querySelectorAll('.promo-dot');

  function updateIndicators() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function moveCarousel() {
    index = (index + 1) % totalGroups;
    track.style.transform = `translateX(-${(100 / totalGroups) * index}%)`;
    updateIndicators();
  }

  function startCarousel() {
    stopCarousel();
    interval = setInterval(moveCarousel, 4000);
  }

  function stopCarousel() {
    if (interval) clearInterval(interval);
  }

  // Eventos
  track.addEventListener('mouseenter', stopCarousel);
  track.addEventListener('mouseleave', startCarousel);

  let startX = 0;
  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    stopCarousel();
  });

  track.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        index = (index + 1) % totalGroups;
      } else {
        index = (index - 1 + totalGroups) % totalGroups;
      }
      track.style.transform = `translateX(-${(100 / totalGroups) * index}%)`;
      updateIndicators();
    }
    startCarousel();
  });

  startCarousel();
}




// Mostrar estado de conexión
function showConnectionStatus(connecting) {
  const statusElement = document.getElementById('connection-status');
  if (connecting) {
    statusElement.classList.remove('hidden');
    statusElement.innerHTML = '<p>Conectando al servidor para obtener datos actualizados...</p>';
  } else {
    statusElement.classList.add('hidden');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupCarousel();

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
});

function normalize(text) {
  return text?.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function showRandomProductsByPrice(minPrice, maxPrice) {
  if (!productsData.length) return;

  const excludedBodegas = ['accesorios',
    'aceites de oliva',
    'agua bidon',
    'agua y soda',
    'aperitivos',
    'bebidas fuertes',
    'blsas friselina',
    'cajas y canastas para vino',
    'cerveza botella x330',
    'cervezas importadas latas',
    'cervezas nacionales latas',
    'estuches cerveza',
    'grolsch ( porron ceramico)',
    'licores',
    'pronto baggio 1lt',
    'whiskys importados',
    'whiskys nacionales',
    'damajuanas',
    'aperitivos',
    'estuches',
    'pulpas',
    'leches latte baggio',
    'lays (snacks)',
    'botellas retornables',
    'cerveza botella x330',
    'especias',
    'encurtidos vanoli',
    'escabeches',
    'budines',
    'GASEOSAS Y ENERGISANTES',
    'ESTUCHES CON COPAS',
    'Copas individuales',
    'HIELERAS',
    'PRODUCTOS ALMACEN',
    'SNACKS',
    'BOTANICOS',
    'PROMOS',
    'VINOS PARA COCINAR',
    'Estuches Copas',
    'OLIVARES DEL CESAR',
    'PRONTO BAGGIO 1LT',
    'CIGARROS',
    '9 de oro',
    'Doña chola',
    'Cajas y canastas para vino',
    'Gaseosas y jugos',
    'Valle calchaquies',
    'SIDRAS',
    'Espumantes',
    
  ].map(normalize);

  const filtered = productsData.filter(product => {
    const precioRaw = product.Precio?.replace(/\D/g, '');
    const precio = parseInt(precioRaw);
    const bodega = normalize(product.Bodega || '');

    return (
      !isNaN(precio) &&
      precio > 0 &&
      precio >= minPrice &&
      precio <= maxPrice &&
      !excludedBodegas.includes(bodega)
    );
  });

  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 10).sort((a, b) => {
    const priceA = parseInt(a.Precio?.replace(/\D/g, '')) || 0;
    const priceB = parseInt(b.Precio?.replace(/\D/g, '')) || 0;
    return priceA - priceB;
  });

  document.getElementById('products-container').classList.remove('hidden');
  let rangoTexto = '';
if (minPrice === 0) {
  rangoTexto = `Vinos hasta $${maxPrice.toLocaleString()}`;
} else if (maxPrice === 999999) {
  rangoTexto = `Vinos desde $${minPrice.toLocaleString()}`;
} else {
  rangoTexto = `Vinos entre $${minPrice.toLocaleString()} y $${maxPrice.toLocaleString()}`;
}
document.getElementById('bodega-name').textContent = rangoTexto;


  document.getElementById('result').textContent = `Mostrando ${selected.length} vinos en ese rango de precios.`;

  const productsBody = document.getElementById('products-body');
  productsBody.innerHTML = '';

  if (!selected.length) {
    productsBody.innerHTML = '<tr><td colspan="3">No se encontraron vinos en ese rango</td></tr>';
    return;
  }

  selected.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.Producto || 'N/A'}</td>
      <td>${product.Bodega || 'N/A'}</td>
      <td>${product.Precio || 'N/A'}</td>
    `;
    productsBody.appendChild(row);
  });
}


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
      complete: function (results) {
        productsData = results.data;
        document.getElementById('loading')?.classList.add('hidden');
        showConnectionStatus(false);
        updateLastUpdateTime();
      },
      error: function (error) {
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
  document.getElementById('last-update-time').textContent = now.toLocaleString();
}

function handleDataError() {
  document.getElementById('loading')?.classList.add('hidden');
  showConnectionStatus(true);
  document.getElementById('result').textContent = 'Error al cargar datos. Reconectando...';
  setTimeout(loadData, 5000);
}

// Escáner QR
function startScanner() {
  const scannerContainer = document.getElementById('scannerContainer');
  const video = document.getElementById('video');

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
      document.getElementById('result').textContent = "No se pudo acceder a la cámara. Asegúrate de permitir el acceso.";
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
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code) {
      stopScanner();
      showProducts(code.data);
      updateHistory(code.data);
    }
  }

  requestAnimationFrame(tick);
}

// Búsqueda manual por NOMBRE DE PRODUCTO
function toggleManualSearch() {
  document.getElementById('manualInputContainer').classList.toggle('hidden');
  if (!document.getElementById('manualInputContainer').classList.contains('hidden')) {
    document.getElementById('manualBodegaInput').focus();
  }
}

function manualSearch() {
  const input = document.getElementById('manualBodegaInput');
  const searchTerm = input.value.trim();

  if (searchTerm) {
    const foundProducts = searchProductsByName(searchTerm);
    if (foundProducts.length > 0) {
      showProductSearchResults(foundProducts, searchTerm);
      updateHistory(searchTerm);
      input.value = '';
      document.getElementById('manualInputContainer').classList.add('hidden');
    } else {
      document.getElementById('result').textContent = 'No se encontraron productos. Intenta con otro nombre.';
    }
  } else {
    document.getElementById('result').textContent = 'Por favor ingresa un nombre de producto';
  }
}

function searchProductsByName(searchTerm) {
  if (!productsData.length) return [];
  
  const searchTermLower = normalize(searchTerm);
  
  return productsData.filter(product => {
    const productName = normalize(product.Producto || '');
    return productName.includes(searchTermLower);
  });
}

function showProductSearchResults(products, searchTerm) {
  document.getElementById('bodega-name').textContent = `Resultados para: "${searchTerm}"`;
  document.getElementById('result').textContent = `Mostrando ${products.length} productos encontrados`;

  const productsBody = document.getElementById('products-body');
  productsBody.innerHTML = '';

  if (!products.length) {
    productsBody.innerHTML = '<tr><td colspan="3">No se encontraron productos</td></tr>';
    return;
  }

  // Ordenar por nombre de producto
  products.sort((a, b) => (a.Producto || '').localeCompare(b.Producto || ''));

  products.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.Producto || 'N/A'}</td>
      <td>${product.Bodega || 'N/A'}</td>
      <td>${product.Precio || 'N/A'}</td>
    `;
    productsBody.appendChild(row);
  });

  document.getElementById('products-container').classList.remove('hidden');
  updateLastUpdateTime();
}

// Mostrar productos por bodega (para QR)
function showProducts(bodegaName) {
  const normalizedBodegaName = normalize(bodegaName);
  document.getElementById('bodega-name').textContent = bodegaName;
  document.getElementById('result').textContent = `Mostrando productos para: ${bodegaName}`;

  const filteredProducts = productsData.filter(product =>
    product.Bodega && normalize(product.Bodega) === normalizedBodegaName
  );

  const productsBody = document.getElementById('products-body');
  productsBody.innerHTML = '';

  if (!filteredProducts.length) {
    productsBody.innerHTML = '<tr><td colspan="3">No se encontraron productos para esta bodega</td></tr>';
    return;
  }

  filteredProducts.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.Producto || 'N/A'}</td>
      <td>${product.Bodega || 'N/A'}</td>
      <td>${product.Precio || 'N/A'}</td>
    `;
    productsBody.appendChild(row);
  });

  document.getElementById('products-container').classList.remove('hidden');
  updateLastUpdateTime();
}

function updateHistory(searchTerm) {
  const normalizedTerm = searchTerm.trim();
  if (!scanHistory.some(item => normalize(item) === normalize(normalizedTerm))) {
    scanHistory.unshift(normalizedTerm);
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
      const foundProducts = searchProductsByName(term);
      if (foundProducts.length > 0) {
        showProductSearchResults(foundProducts, term);
      }
      document.getElementById('manualInputContainer').classList.add('hidden');
    });
    list.appendChild(li);
  });

  if (scanHistory.length > 0) {
    container.classList.remove('hidden');
  }
}