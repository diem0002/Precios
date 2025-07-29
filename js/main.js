// Configuración de la URL de la hoja de cálculo
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5JA7l3_7kg8Eg0oXDaZYogbP9kxVzJfvypjbiUz-B4pOuUz-bHzAteAyRjbaYNQ/pub?output=csv';

// Estado de la aplicación
const AppState = {
  products: [],
  scanHistory: [],
  videoStream: null,
  currentCarouselInterval: null,
  isScanning: false,
  retryCount: 0,
  MAX_RETRIES: 5,
  connectionActive: false
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  try {
    initCarousel();
    loadData();
    setupEventListeners();
  } catch (error) {
    console.error('Error en la inicialización:', error);
    showError('Error al iniciar la aplicación. Por favor recarga la página.');
  }
});

// Configuración del carrusel
function initCarousel() {
  const container = document.querySelector('.promo-carousel-container');
  const slides = document.querySelectorAll('.promo-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  
  if (!container || slides.length === 0) return;

  let currentIndex = 0;
  const slidesToShow = calculateSlidesToShow();

  // Clonar slides para efecto infinito
  const cloneSlides = Array.from(slides).map(slide => slide.cloneNode(true));
  cloneSlides.forEach(slide => container.appendChild(slide));

  function calculateSlidesToShow() {
    return window.innerWidth <= 768 ? 
      (window.innerWidth <= 480 ? 1 : 2) : 3;
  }

  function updateCarousel() {
    const slideWidth = 100 / slidesToShow;
    const offset = -currentIndex * slideWidth;
    container.style.transform = `translateX(${offset}%)`;
    
    const activeDot = currentIndex % dots.length;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeDot);
    });
  }

  function nextSlide() {
    currentIndex++;
    if (currentIndex >= slides.length) {
      currentIndex = 0;
      container.style.transition = 'none';
      updateCarousel();
      setTimeout(() => {
        container.style.transition = 'transform 0.5s ease';
        nextSlide();
      }, 10);
    } else {
      updateCarousel();
    }
  }

  function startCarousel() {
    stopCarousel();
    AppState.currentCarouselInterval = setInterval(nextSlide, 5000);
  }

  function stopCarousel() {
    if (AppState.currentCarouselInterval) {
      clearInterval(AppState.currentCarouselInterval);
    }
  }

  // Event listeners
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      currentIndex = i;
      updateCarousel();
    });
  });

  window.addEventListener('resize', () => {
    const newSlidesToShow = calculateSlidesToShow();
    if (newSlidesToShow !== slidesToShow) {
      currentIndex = 0;
      updateCarousel();
    }
  });

  // Iniciar
  updateCarousel();
  startCarousel();
}

// Configuración de event listeners
function setupEventListeners() {
  // Filtros de precio
  document.querySelectorAll('.price-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const [min, max] = btn.dataset.range.split('-').map(Number);
      showRandomProductsByPrice(min, max);
    });
  });

  // Scanner QR
  document.getElementById('startScanner')?.addEventListener('click', startScanner);
  document.getElementById('stopScanner')?.addEventListener('click', stopScanner);
  
  // Búsqueda manual
  document.getElementById('toggleManualSearch')?.addEventListener('click', toggleManualSearch);
  document.getElementById('manualSearchBtn')?.addEventListener('click', manualSearch);
  
  // Mejorar accesibilidad del input
  document.getElementById('manualBodegaInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') manualSearch();
  });
}

// Normalización de texto para búsquedas
function normalize(text) {
  return text?.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Función mejorada para cargar datos
async function loadData() {
  if (AppState.connectionActive) return;
  
  AppState.connectionActive = true;
  showConnectionStatus(true);
  document.getElementById('loading').classList.remove('hidden');
  
  try {
    // Añadir parámetro de caché aleatorio para evitar problemas
    const cacheBuster = `&cache=${Date.now()}`;
    const response = await fetch(`${SHEET_URL}${cacheBuster}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvData = await response.text();

    // Verificar que los datos no estén vacíos
    if (!csvData || csvData.trim().length === 0) {
      throw new Error('El archivo CSV está vacío');
    }

    // Parsear los datos con PapaParse
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (results.errors.length > 0) {
          console.warn('Errores de parseo:', results.errors);
        }
        
        // Verificar que hay datos válidos
        if (!results.data || results.data.length === 0) {
          throw new Error('No se encontraron datos válidos en el CSV');
        }

        AppState.products = results.data.filter(item => 
          item.Producto && item.Bodega && item.Precio
        );
        
        document.getElementById('loading').classList.add('hidden');
        showConnectionStatus(false);
        updateLastUpdateTime();
        AppState.retryCount = 0; // Resetear contador de reintentos
        AppState.connectionActive = false;
        
        // Mostrar mensaje de éxito
        document.getElementById('result').textContent = 
          `Datos cargados correctamente. ${AppState.products.length} productos disponibles.`;
      },
      error: function(error) {
        throw new Error(`Error al parsear CSV: ${error.message}`);
      }
    });

  } catch (error) {
    console.error('Error al cargar datos:', error);
    AppState.connectionActive = false;
    handleDataError(error);
  }
}

// Manejo mejorado de errores
function handleDataError(error) {
  document.getElementById('loading').classList.add('hidden');
  showConnectionStatus(true);
  
  AppState.retryCount++;
  
  if (AppState.retryCount >= AppState.MAX_RETRIES) {
    showError(`No se pudo conectar con el servidor. Error: ${error.message}`);
    return;
  }
  
  const delay = Math.min(5000, 1000 * Math.pow(2, AppState.retryCount)); // Retry con backoff exponencial
  document.getElementById('result').textContent = 
    `Error al cargar datos. Reintentando en ${delay/1000} segundos... (Intento ${AppState.retryCount}/${AppState.MAX_RETRIES})`;
  
  setTimeout(loadData, delay);
}

// Función para mostrar errores
function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.innerHTML = `
    <p>❌ ${message}</p>
    <button id="retryButton" class="btn btn-primary">Reintentar</button>
  `;
  
  document.getElementById('result').innerHTML = '';
  document.getElementById('result').appendChild(errorElement);
  
  document.getElementById('retryButton').addEventListener('click', () => {
    AppState.retryCount = 0;
    loadData();
  });
}

// Mostrar estado de conexión
function showConnectionStatus(connecting) {
  const statusElement = document.getElementById('connection-status');
  if (connecting) {
    statusElement.classList.remove('hidden');
  } else {
    statusElement.classList.add('hidden');
  }
}

// Actualizar marca de tiempo
function updateLastUpdateTime() {
  document.getElementById('last-update-time').textContent = new Date().toLocaleString();
}

// Filtrado por precio
function showRandomProductsByPrice(minPrice, maxPrice) {
  if (!AppState.products.length) {
    document.getElementById('result').textContent = 'Cargando datos... Por favor espera.';
    loadData();
    return;
  }

  const excludedBodegas = [
    'accesorios', 'aceites de oliva', 'agua bidon', 'agua y soda', 'aperitivos',
    'bebidas fuertes', 'blsas friselina', 'cajas y canastas para vino',
    'cerveza botella x330', 'cervezas importadas latas', 'cervezas nacionales latas',
    'estuches cerveza', 'grolsch ( porron ceramico)', 'licores', 'pronto baggio 1lt',
    'whiskys importados', 'whiskys nacionales', 'damajuanas', 'estuches', 'pulpas',
    'leches latte baggio', 'lays (snacks)', 'botellas retornables', 'especias',
    'encurtidos vanoli', 'escabeches', 'budines', 'gaseosas y energisantes',
    'estuches con copas', 'copas individuales', 'hieleras', 'productos almacen',
    'snacks', 'botanicos', 'promos', 'vinos para cocinar', 'estuches copas',
    'olivares del cesar', 'cigarros', '9 de oro', 'doña chola',
    'valle calchaquies', 'sidras', 'espumantes'
  ].map(normalize);

  const filtered = AppState.products.filter(product => {
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

  let rangoTexto = '';
  if (minPrice === 0) {
    rangoTexto = `Vinos hasta $${maxPrice.toLocaleString()}`;
  } else if (maxPrice === 999999) {
    rangoTexto = `Vinos desde $${minPrice.toLocaleString()}`;
  } else {
    rangoTexto = `Vinos entre $${minPrice.toLocaleString()} y $${maxPrice.toLocaleString()}`;
  }

  displayProducts(
    selected,
    rangoTexto,
    `Mostrando ${selected.length} vinos en ese rango de precios`
  );
}

// Función genérica para mostrar productos
function displayProducts(products, title, subtitle) {
  document.getElementById('bodega-name').textContent = title;
  document.getElementById('result').textContent = subtitle;

  const productsBody = document.getElementById('products-body');
  productsBody.innerHTML = '';

  if (!products.length) {
    productsBody.innerHTML = '<tr><td colspan="3">No se encontraron productos</td></tr>';
  } else {
    products.forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.Producto || 'N/A'}</td>
        <td>${product.Bodega || 'N/A'}</td>
        <td>${product.Precio || 'N/A'}</td>
      `;
      productsBody.appendChild(row);
    });
  }

  document.getElementById('products-container').classList.remove('hidden');
  updateLastUpdateTime();
}

// Scanner QR - Versión mejorada para evitar doble cámara
function startScanner() {
  if (AppState.isScanning) return;
  
  AppState.isScanning = true;
  const scannerContainer = document.getElementById('scannerContainer');
  const video = document.getElementById('video');

  scannerContainer.classList.remove('hidden');
  document.getElementById('startScanner').classList.add('hidden');

  // Limpiar cualquier stream existente
  if (AppState.videoStream) {
    AppState.videoStream.getTracks().forEach(track => track.stop());
  }

  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    } 
  })
    .then(stream => {
      AppState.videoStream = stream;
      video.srcObject = stream;
      video.classList.remove('hidden');
      
      video.onloadedmetadata = () => {
        video.play().catch(err => {
          console.error("Error al reproducir video:", err);
          stopScanner();
        });
      };
      
      requestAnimationFrame(scanQR);
    })
    .catch(err => {
      console.error("Error al acceder a la cámara:", err);
      document.getElementById('result').textContent = "No se pudo acceder a la cámara. Asegúrate de permitir el acceso.";
      AppState.isScanning = false;
    });
}

function stopScanner() {
  if (AppState.videoStream) {
    AppState.videoStream.getTracks().forEach(track => track.stop());
    AppState.videoStream = null;
  }

  document.getElementById('scannerContainer').classList.add('hidden');
  document.getElementById('startScanner').classList.remove('hidden');
  document.getElementById('video').classList.add('hidden');
  AppState.isScanning = false;
}

function scanQR() {
  if (!AppState.isScanning) return;

  const video = document.getElementById('video');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
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

  if (AppState.isScanning) {
    requestAnimationFrame(scanQR);
  }
}

// Búsqueda manual
function toggleManualSearch() {
  const container = document.getElementById('manualInputContainer');
  container.classList.toggle('hidden');
  
  if (!container.classList.contains('hidden')) {
    document.getElementById('manualBodegaInput').focus();
  }
}

function manualSearch() {
  const input = document.getElementById('manualBodegaInput');
  const searchTerm = input.value.trim();

  if (searchTerm) {
    const foundProducts = searchProducts(searchTerm);
    
    if (foundProducts.length > 0) {
      displayProducts(
        foundProducts,
        `Resultados para: "${searchTerm}"`,
        `Mostrando ${foundProducts.length} productos encontrados`
      );
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

// Búsqueda mejorada (en nombre Y bodega)
function searchProducts(searchTerm) {
  if (!AppState.products.length) {
    document.getElementById('result').textContent = 'Cargando datos... Por favor espera.';
    loadData();
    return [];
  }
  
  const searchTermLower = normalize(searchTerm);
  
  return AppState.products.filter(product => {
    const productName = normalize(product.Producto || '');
    const bodegaName = normalize(product.Bodega || '');
    
    return productName.includes(searchTermLower) || 
           bodegaName.includes(searchTermLower);
  }).sort((a, b) => (a.Producto || '').localeCompare(b.Producto || ''));
}

// Mostrar productos por bodega (para QR)
function showProducts(bodegaName) {
  const normalizedBodegaName = normalize(bodegaName);
  const filteredProducts = AppState.products.filter(product =>
    product.Bodega && normalize(product.Bodega) === normalizedBodegaName
  );
  
  displayProducts(
    filteredProducts,
    bodegaName,
    `Mostrando productos para: ${bodegaName}`
  );
}

// Historial de búsquedas
function updateHistory(searchTerm) {
  const normalizedTerm = searchTerm.trim();
  
  if (!AppState.scanHistory.some(item => normalize(item) === normalize(normalizedTerm))) {
    AppState.scanHistory.unshift(normalizedTerm);
    if (AppState.scanHistory.length > 5) AppState.scanHistory.pop();
    renderHistory();
  }
}

function renderHistory() {
  const container = document.getElementById('historyContainer');
  const list = document.getElementById('historyList');

  list.innerHTML = '';
  
  AppState.scanHistory.forEach(term => {
    const li = document.createElement('li');
    li.textContent = term;
    li.addEventListener('click', () => {
      document.getElementById('manualBodegaInput').value = term;
      const foundProducts = searchProducts(term);
      
      if (foundProducts.length > 0) {
        displayProducts(
          foundProducts,
          `Resultados para: "${term}"`,
          `Mostrando ${foundProducts.length} productos encontrados`
        );
      }
      
      document.getElementById('manualInputContainer').classList.add('hidden');
    });
    
    list.appendChild(li);
  });

  container.classList.toggle('hidden', AppState.scanHistory.length === 0);
}