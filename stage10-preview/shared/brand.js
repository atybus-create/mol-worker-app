(() => {
  const logo = window.ESTYL_LOGO;
  if (!logo) return;

  const style = document.createElement('style');
  style.textContent = `
    .estyl-brand-logo{display:block;width:auto;max-width:132px;height:30px;object-fit:contain;object-position:left center}
    .auth-logo .estyl-brand-logo{max-width:150px;height:36px}
    .web-brand .estyl-brand-logo{max-width:118px;height:28px}
    @media(max-width:390px){.estyl-brand-logo{max-width:110px;height:26px}.auth-logo .estyl-brand-logo{max-width:132px;height:32px}}
  `;
  document.head.append(style);

  document.querySelectorAll('.brand-mark, .auth-logo').forEach((target) => {
    target.textContent = '';
    const image = document.createElement('img');
    image.className = 'estyl-brand-logo';
    image.src = logo;
    image.alt = 'ESTYL';
    target.append(image);
  });
})();
