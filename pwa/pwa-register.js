(() => {
  "use strict";
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  const script = document.currentScript;
  const scriptUrl = new URL(script.src, location.href);
  const scopeUrl = new URL("./", scriptUrl);
  const workerUrl = new URL("./sw.js?v=20260911.2-authfix1", scriptUrl);
  let reloadAfterUpdate = false;

  function showUpdate(registration) {
    if (!navigator.serviceWorker.controller || document.getElementById("molPwaUpdate")) return;
    const render = () => {
      const banner = document.createElement("div");
      banner.id = "molPwaUpdate";
      banner.setAttribute("role", "status");
      banner.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid #31506b;border-radius:12px;background:#102a43;color:#f4f8fb;font:14px Inter,system-ui,sans-serif;box-shadow:0 12px 36px rgba(0,0,0,.35)";
      const text = document.createElement("span");
      text.textContent = "Dostępna jest aktualizacja aplikacji.";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Odśwież";
      button.style.cssText = "border:0;border-radius:8px;background:#12c8ff;color:#051018;padding:8px 12px;font-weight:700;cursor:pointer";
      button.addEventListener("click", () => {
        reloadAfterUpdate = true;
        const waiting = registration.waiting;
        if (waiting) waiting.postMessage({type:"SKIP_WAITING"});
      });
      banner.append(text, button);
      document.body.appendChild(banner);
    };
    if (document.body) render(); else document.addEventListener("DOMContentLoaded", render, {once:true});
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadAfterUpdate) location.reload();
  });

  navigator.serviceWorker.register(workerUrl, {scope: scopeUrl.pathname, updateViaCache: "none"}).then((registration) => {
    registration.update().catch(() => {});
    if (registration.waiting) showUpdate(registration);
    registration.addEventListener("updatefound", () => {
      const candidate = registration.installing;
      if (!candidate) return;
      candidate.addEventListener("statechange", () => {
        if (candidate.state === "installed") showUpdate(registration);
      });
    });
  }).catch(() => {
    // PWA registration must never block the application.
  });
})();
