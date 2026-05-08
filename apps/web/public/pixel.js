/**
 * Source Authority — Tracking Pixel + Conversion API
 *
 * Cliente embeda no <head> do site. Captura page-views (1 por sessão)
 * e expõe `window.saTrack('conversion', {...})` pra reportar vendas.
 *
 * Uso básico:
 *   <script defer src="https://app.sourceauthority.com.br/pixel.js"
 *           data-slug="zeus"></script>
 *
 * Reportar venda (ex: página de obrigado):
 *   <script>
 *     saTrack('conversion', {
 *       external_id: 'ORDER_12345',
 *       amount: 9990,        // em centavos: R$ 99,90
 *       currency: 'BRL'
 *     });
 *   </script>
 *
 * Atribuição: last-click within session. Pixel grava session_id em
 * localStorage. Quando saTrack('conversion') é chamado, backend casa
 * com último event do mesmo session_id que tinha referrer_code.
 *
 * Servido como static do Vercel CDN. ~2KB gzip.
 */
(function () {
  "use strict";

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

  var endpoint =
    script.getAttribute("data-endpoint") ||
    "https://app.sourceauthority.com.br";

  // ─── Session ID (durável via localStorage) ─────────────────────────────────
  // Pra atribuição last-click cross-page-view: o mesmo visitor mantém o
  // session_id em todas suas visitas. saTrack('conversion') mais tarde
  // bate no events.session_id pra encontrar o último ?ref=.
  //
  // Se localStorage bloqueado (private mode), fallback pra sessionStorage
  // (perde ao fechar aba) ou random per-load (sem atribuição).
  function getOrCreateSessionId() {
    var key = "sa_session_" + slug;
    try {
      if (window.localStorage) {
        var existing = localStorage.getItem(key);
        if (existing) return existing;
        var sid = generateUuid();
        localStorage.setItem(key, sid);
        return sid;
      }
    } catch (e) {}
    try {
      if (window.sessionStorage) {
        var existing2 = sessionStorage.getItem(key);
        if (existing2) return existing2;
        var sid2 = generateUuid();
        sessionStorage.setItem(key, sid2);
        return sid2;
      }
    } catch (e2) {}
    return generateUuid();
  }

  // UUIDv4 simples — não cripto-segura, suficiente pra session ID.
  function generateUuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var chars = "0123456789abcdef";
    var s = "";
    for (var i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) s += "-";
      else if (i === 14) s += "4";
      else if (i === 19) s += chars[(Math.random() * 4) | 8];
      else s += chars[(Math.random() * 16) | 0];
    }
    return s;
  }

  var sessionId = getOrCreateSessionId();

  // ─── Page view: dedupe por sessão ──────────────────────────────────────────
  var pageviewKey = "sa_pixel_pv_" + slug;
  var firedPageView = false;
  try {
    if (
      window.sessionStorage &&
      sessionStorage.getItem(pageviewKey)
    ) {
      firedPageView = true;
    } else if (window.sessionStorage) {
      sessionStorage.setItem(pageviewKey, "1");
    }
  } catch (e) {}

  if (!firedPageView) {
    var ref = null;
    try {
      ref = new URL(window.location.href).searchParams.get("ref");
    } catch (e) {}

    // Browser/device enrichment.
    var sw = window.screen || {};
    var conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection ||
      null;

    // UTM params parsing — padrão Google Analytics.
    var utm = {};
    try {
      var u = new URL(window.location.href);
      utm.source = u.searchParams.get("utm_source");
      utm.medium = u.searchParams.get("utm_medium");
      utm.campaign = u.searchParams.get("utm_campaign");
      utm.term = u.searchParams.get("utm_term");
      utm.content = u.searchParams.get("utm_content");
    } catch (e) {}

    var pv = {
      slug: slug,
      url: window.location.href,
      url_path: (function () {
        try {
          return new URL(window.location.href).pathname || null;
        } catch (e) {
          return null;
        }
      })(),
      referrer: document.referrer || null,
      ref: ref,
      lang:
        navigator.language ||
        navigator.userLanguage ||
        navigator.browserLanguage ||
        null,
      session_id: sessionId,
      // Screen/viewport.
      screen_width: typeof sw.width === "number" ? sw.width : null,
      screen_height: typeof sw.height === "number" ? sw.height : null,
      viewport_width: window.innerWidth || null,
      viewport_height: window.innerHeight || null,
      color_depth: typeof sw.colorDepth === "number" ? sw.colorDepth : null,
      device_pixel_ratio:
        typeof window.devicePixelRatio === "number"
          ? Math.round(window.devicePixelRatio * 100) / 100
          : null,
      network_type: conn && typeof conn.effectiveType === "string" ? conn.effectiveType : null,
      // UTM
      utm_source: utm.source || null,
      utm_medium: utm.medium || null,
      utm_campaign: utm.campaign || null,
      utm_term: utm.term || null,
      utm_content: utm.content || null,
    };

    sendBeacon(endpoint + "/api/pixel", pv);
  }

  // ─── Conversion API global ─────────────────────────────────────────────────
  // window.saTrack('conversion', { external_id, amount, currency, ... })
  //
  // Idempotência via external_id — chamadas duplicadas (page reload, retry)
  // pra mesmo order_id geram só 1 row no DB.
  window.saTrack = function (action, data) {
    if (action !== "conversion") {
      if (window.console && console.warn) {
        console.warn("[source-authority/pixel] unknown action: " + action);
      }
      return;
    }
    if (!data || typeof data !== "object") {
      if (window.console && console.warn) {
        console.warn("[source-authority/pixel] saTrack(conversion) missing data");
      }
      return;
    }
    var payload = {
      slug: slug,
      external_id: String(data.external_id || ""),
      amount_cents:
        typeof data.amount === "number"
          ? Math.round(data.amount)
          : typeof data.amount_cents === "number"
            ? Math.round(data.amount_cents)
            : 0,
      currency: data.currency || "BRL",
      session_id: sessionId,
      occurred_at: data.occurred_at || null,
    };
    if (!payload.external_id) {
      if (window.console && console.warn) {
        console.warn(
          "[source-authority/pixel] conversion missing external_id (the ID of the sale in your system)",
        );
      }
      return;
    }
    sendBeacon(endpoint + "/api/pixel/conversion", payload);
  };

  // ─── Helper ────────────────────────────────────────────────────────────────
  function sendBeacon(url, payload) {
    try {
      fetch(url, {
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
      // Browser sem fetch (IE) — graceful skip.
    }
  }
})();
