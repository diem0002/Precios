const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5JA7l3_7kg8Eg0oXDaZYogbP9kxVzJfvypjbiUz-B4pOuUz-bHzAteAyRjbaYNQ/pub?output=csv';

let productsData = [];
let videoStream = null;
const scanHistory = [];

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  
  // Configurar event listeners
  document.getElementById('startScanner').addEventListener('click', startScanner);
  document.getElementById('stopScanner').addEventListener('click', stopScanner);
  document.getElementById('toggleManualSearch').addEventListener('click', toggleManualSearch);
  document.getElementById('manualSearchBtn').addEventListener('click', manualSearch);
});

async function loadData() {
  document.getElementById('loading').classList.remove('hidden');

  try {
    const response = await fetch(SHEET_URL);
    const csvData = await response.text();

    Papa.parse(csvData, {
      header: true,
      complete: function (results) {
        productsData = results.data;
        document.getElementById('loading').classList.add('hidden');
        console.log('Datos cargados:', productsData);
      },
      error: function (error) {
        console.error('Error al cargar datos:', error);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('result').textContent = 'Error al cargar los datos. Intenta recargar la página.';
      }
    });
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('result').textContent = 'Error al cargar los datos. Intenta recargar la página.';
  }
}

// Funciones del escáner QR
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

// Funciones de búsqueda manual
function toggleManualSearch() {
  document.getElementById('manualInputContainer').classList.toggle('hidden');
  if (!document.getElementById('manualInputContainer').classList.contains('hidden')) {
    document.getElementById('manualBodegaInput').focus();
  }
}

function manualSearch() {
  const input = document.getElementById('manualBodegaInput');
  const bodega = input.value.trim();
  
  if (bodega) {
    showProducts(bodega);
    updateHistory(bodega);
    input.value = '';
    document.getElementById('manualInputContainer').classList.add('hidden');
  } else {
    document.getElementById('result').textContent = 'Por favor ingresa un nombre de bodega';
  }
}

// Mostrar productos
function showProducts(bodegaName) {
  document.getElementById('bodega-name').textContent = bodegaName;
  document.getElementById('result').textContent = `Mostrando productos para: ${bodegaName}`;

  const filteredProducts = productsData.filter(product =>
    product.Bodega && product.Bodega.trim().toLowerCase() === bodegaName.trim().toLowerCase()
  );

  const productsBody = document.getElementById('products-body');
  productsBody.innerHTML = '';

  if (filteredProducts.length === 0) {
    productsBody.innerHTML = '<tr><td colspan="3">No se encontraron productos para esta bodega</td></tr>';
  } else {
    filteredProducts.forEach(product => {
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
}

// Historial de búsquedas
function updateHistory(bodega) {
  if (!scanHistory.includes(bodega)) {
    scanHistory.unshift(bodega);
    if (scanHistory.length > 5) scanHistory.pop();
    renderHistory();
  }
}

function renderHistory() {
  const container = document.getElementById('historyContainer');
  const list = document.getElementById('historyList');
  
  list.innerHTML = '';
  scanHistory.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    li.addEventListener('click', () => {
      document.getElementById('manualBodegaInput').value = name;
      showProducts(name);
      document.getElementById('manualInputContainer').classList.add('hidden');
    });
    list.appendChild(li);
  });
  
  if (scanHistory.length > 0) {
    container.classList.remove('hidden');
  }
}