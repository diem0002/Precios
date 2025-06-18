// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(registration => {
        console.log('ServiceWorker registrado con éxito:', registration.scope);
        
        // Verificar actualizaciones cada hora
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch(err => {
        console.log('Error al registrar ServiceWorker:', err);
      });
  });
}

// Manejar instalación PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  const installBtn = document.createElement('button');
  installBtn.id = 'installBtn';
  installBtn.className = 'btn';
  installBtn.textContent = 'Instalar App';
  installBtn.style.margin = '10px auto';
  installBtn.style.display = 'block';
  
  if (document.querySelector('h1')) {
    document.querySelector('h1').after(installBtn);
  }
  
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