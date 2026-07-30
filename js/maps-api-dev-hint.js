(function () {
  function showMapsKeyHint() {
    var mapDiv = document.getElementById('map');
    if (!mapDiv) return;

    var origin = location.origin;
    var host = location.hostname;

    var mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.transform = '';
      mapContainer.style.animation = 'none';
      mapContainer.style.transition = '';
    }
    mapDiv.style.transform = '';
    mapDiv.style.animation = 'none';
    mapDiv.style.transition = '';

    var referrers = [origin + '/*'];
    if (/\.netlify\.app$/i.test(host)) {
      referrers.push('https://*.netlify.app/*');
    }
    if (/^localhost$/i.test(host) || /^127\.0\.0\.1$/i.test(host) || /^192\.168\./.test(host)) {
      referrers.push('http://localhost:5173/*', 'https://localhost:5173/*');
    }

    var listHtml = referrers
      .map(function (ref) {
        return (
          '<p style="margin:6px 0"><code style="background:#f3f4f6;padding:4px 6px;border-radius:4px;word-break:break-all">' +
          ref +
          '</code></p>'
        );
      })
      .join('');

    mapDiv.innerHTML =
      '<div style="padding:18px;text-align:left;font-family:system-ui,sans-serif;font-size:14px;line-height:1.45;color:#333;max-width:420px;margin:0 auto">' +
      '<p style="margin:0 0 10px;font-weight:700;color:#b30000">Google Maps bloqué pour cette adresse</p>' +
      '<p style="margin:0 0 8px">Dans <strong>Google Cloud Console</strong> → Clés API → la clé utilisée par CLQ (celle du build <code>api-key.js</code>, pas une autre) :</p>' +
      '<p style="margin:0 0 6px"><strong>1. Restrictions des applications</strong> (référents HTTP) — le suffixe <code>/*</code> est obligatoire :</p>' +
      listHtml +
      '<p style="margin:10px 0 6px"><strong>2. Restrictions des API</strong> — si la clé est limitée, autoriser au minimum&nbsp;:</p>' +
      '<p style="margin:0 0 6px"><code style="background:#f3f4f6;padding:4px 6px;border-radius:4px">Maps JavaScript API</code>, ' +
      '<code style="background:#f3f4f6;padding:4px 6px;border-radius:4px">Places API</code>, ' +
      '<code style="background:#f3f4f6;padding:4px 6px;border-radius:4px">Directions API</code></p>' +
      '<p style="margin:10px 0 0;font-size:13px;color:#666">Ce réglage est sur <strong>Google Cloud</strong>, pas Render.<br>' +
      'Erreur fréquente : <code>https://clq-aguilas.netlify.app</code> sans <code>/*</code> ne couvre pas <code>/main.html</code>.<br>' +
      'Attendre 2–5 min après modification, puis recharger.</p>' +
      '</div>';
  }

  window.gm_authFailure = showMapsKeyHint;
})();
