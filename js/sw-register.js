// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registrado con éxito:', registration.scope);
      })
      .catch(err => {
        console.log('Error al registrar ServiceWorker:', err);
      });
  });
}

// Mostrar prompt de instalación
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Mostrar botón de instalación
  const installBtn = document.createElement('button');
  installBtn.id = 'installBtn';
  installBtn.className = 'btn';
  installBtn.textContent = 'Instalar App';
  installBtn.style.margin = '10px auto';
  installBtn.style.display = 'block';
  
  document.querySelector('h1').after(installBtn);
  
  installBtn.addEventListener('click', () => {
    installBtn.style.display = 'none';
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuario aceptó instalar');
      }
      deferredPrompt = null;
    });
  });
});