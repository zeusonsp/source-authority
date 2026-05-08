/**
 * Source Authority — Tracking Pixel
 *
 * Cliente embeda no <head> do site da empresa. Dispara 1 evento por
 * sessão pra apps/web /api/pixel — captura URL, referrer, ?ref=, idioma.
 *
 * Uso:
 *   <script defer src="https://app.sourceauthority.com.br/pixel.js"
 *           data-slug="zeus"></script>
 *
 * Servido como static do Vercel CDN (cache imutável). ~1KB minificado.
 */
(function () {
  "use strict";

  // currentScript é null em scripts que rodam após DOMContentLoaded em
  // alguns browsers; fallback pra busca por src.
  var script =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("/pixel.js") !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  if (!script) return;

  var slug = script.getAttribute("data-slug");
  if (!slug) {
    if (window.console && console.warn) {
      console.warn("[source-authority/pixel] missing data-slug");
    }
    return;
  }

  // Endpoint absoluto pra fetch CORS funcionar.
  var endpoint =
    script.getAttribute("data-endpoint") ||
    "https://app.sourceauthority.com.br/api/pixel";

  // Dedupe por sessão. SessionStorage é per-tab/window — cada nova aba
  // gera 1 evento. Mais granular que cookies, menos privado que localStorage.
  var key = "sa_pixel_" + slug;
  try {
    if (window.sessionStorage && sessionStorage.getItem(key)) return;
    if (window.sessionStorage) sessionStorage.setItem(key, "1");
  } catch (e) {
    // sessionStorage pode estar bloqueado (private mode em alguns browsers).
    // Nesse caso disparamos toda hora — não é ideal mas evita quebrar.
  }

  // Captura ?ref= da URL atual pra atribuição.
  var ref = null;
  try {
    var url = new URL(window.location.href);
    ref = url.searchParams.get("ref");
  } catch (e) {
    // URL constructor pode falhar em browsers muito antigos.
  }

  var payload = {
    slug: slug,
    url: window.location.href,
    referrer: document.referrer || null,
    ref: ref,
    lang:
      (navigator.language ||
        navigator.userLanguage ||
        navigator.browserLanguage) ||
      null,
  };

  // keepalive permite que o request termine mesmo se a página navegar
  // logo em seguida. Suporte: Chrome 66+, Firefox 65+, Safari 14+ (~95%).
  try {
    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    }).catch(function () {
      // Falha silenciosa — não atrapalha experiência do visitante.
    });
  } catch (e) {
    // Browser sem fetch (IE) — graceful skip. Tracker via link mestre
    // continua funcionando.
  }
})();
