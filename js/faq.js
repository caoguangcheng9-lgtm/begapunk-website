(() => {
  const content = document.getElementById('faq-content');
  if (!content) return;

  const buttons = [...content.querySelectorAll('.faq-question[aria-controls]')];

  function setExpanded(button, expanded) {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;

    button.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
    button.closest('.faq-item')?.classList.toggle('open', expanded);
  }

  for (const button of buttons) {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) continue;

    button.addEventListener('click', () => {
      setExpanded(button, button.getAttribute('aria-expanded') !== 'true');
    });

    setExpanded(button, false);
    button.disabled = false;
  }

  function openHashTarget() {
    if (!window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    const item = target?.closest('.faq-item');
    const button = item?.querySelector('.faq-question');
    if (button) setExpanded(button, true);
  }

  openHashTarget();
  window.addEventListener('hashchange', openHashTarget);
})();
