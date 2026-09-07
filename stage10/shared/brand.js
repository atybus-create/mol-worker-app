(() => {
  'use strict';

  // Stage 11: the ESTYL raster logo is intentionally not used in the application chrome.
  // Keep only the compact MOL mark so the header stays clean on mobile and WWW.
  document.querySelectorAll('.estyl-brand-logo').forEach((node) => node.remove());

  document.querySelectorAll('.brand-mark').forEach((target) => {
    target.replaceChildren();
    target.textContent = '◆';
    target.setAttribute('aria-hidden', 'true');
  });

  document.querySelectorAll('.auth-logo').forEach((target) => {
    target.replaceChildren();
    target.textContent = '◆';
    target.setAttribute('aria-hidden', 'true');
  });
})();
