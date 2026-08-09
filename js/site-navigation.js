(() => {
  'use strict';

  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('mobileToggle');
  if (!nav || !toggle || toggle.dataset.navigationReady === 'true') return;

  toggle.dataset.navigationReady = 'true';
  toggle.setAttribute('aria-controls', 'mainNav');
  toggle.setAttribute('aria-expanded', 'false');

  const closeMenu = () => {
    nav.classList.remove('mobile-open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    const isOpen = nav.classList.toggle('mobile-open');
    toggle.classList.toggle('active', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('mobile-open')) {
      closeMenu();
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('mobile-open')) return;
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeMenu();
  });
})();
