const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5JA7l3_7kg8Eg0oXDaZYogbP9kxVzJfvypjbiUz-B4pOuUz-bHzAteAyRjbaYNQ/pub?output=csv';

let productsData = [];
let videoStream = null;

document.getElementById('startScanner').addEventListener('click', startScanner);
document.getElementById('stopScanner').addEventListener('click', stopScanner);

window.addEventListener('DOMContentLoaded', () => {
  loadData();
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
    }
  }

  requestAnimationFrame(tick);
}

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
