/** Service Worker : enregistrement en prod / preview ; nettoyage seulement sous Vite HMR */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var host = String(location.hostname || '').toLowerCase();
  var isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host);
  // Désactiver le SW uniquement avec le serveur Vite (HMR), pas avec http-server / preview sur :5173
  var isVite =
    !!document.querySelector('script[src*="/@vite/client"]') ||
    !!document.querySelector('script[type="module"][src*="/@vite/"]');
  var forceDev = (location.search || '').indexOf('dev=1') !== -1 && isLocalHost;

  if (isVite || forceDev) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) {
        r.unregister();
      });
    });
    if ('caches' in window) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) {
          caches.delete(k);
        });
      });
    }
    return;
  }

  navigator.serviceWorker.register('service-worker.js?v=38')
    .then(function () {
      console.log('Service Worker enregistré.');
    })
    .catch(function (error) {
      console.log('Service Worker échec :', error);
    });
})();
