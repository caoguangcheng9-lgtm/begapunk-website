(() => {
  'use strict';

  // CSS keeps the navigation visible as a no-JavaScript fallback. Mark the
  // enhanced experience before wiring the compact-menu behavior.
  document.documentElement.classList.add('site-navigation-ready');

  const preservedCampaignParameters = Object.freeze({
    gclid: 300,
    gbraid: 300,
    wbraid: 300,
    utm_source: 200,
    utm_medium: 200,
    utm_campaign: 200,
    utm_term: 200,
    utm_content: 200,
  });
  const preservedPageParameters = Object.freeze({
    'search.html': Object.freeze({ q: 200 }),
    'contact.html': Object.freeze({
      request: 50,
      inquiry_type: 100,
      model: 100,
      product: 200,
      application: 500,
      source: 300,
    }),
  });

  function pageName(url) {
    const segment = url.pathname.split('/').filter(Boolean).pop();
    return segment || 'index.html';
  }

  function cleanQueryValue(value, maxLength) {
    return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
  }

  // Keep only the functional and campaign context that is understood by the
  // destination page. Arbitrary query parameters are deliberately discarded.
  function languageUrl(reference) {
    const current = new URL(window.location.href);
    let target;
    try {
      target = new URL(reference, current);
    } catch {
      return current.href;
    }

    const sameSite = target.protocol === current.protocol
      && target.host === current.host
      && !target.username
      && !target.password;
    if (!sameSite) return current.href;

    const targetPage = pageName(target);
    const pageParameters = preservedPageParameters[targetPage] || {};
    const allowedParameters = { ...preservedCampaignParameters, ...pageParameters };
    const currentParameters = new Map();
    current.searchParams.forEach((value, name) => {
      const normalizedName = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(allowedParameters, normalizedName)
        && !currentParameters.has(normalizedName)) {
        currentParameters.set(normalizedName, value);
      }
    });
    target.search = '';
    Object.entries(allowedParameters).forEach(([name, maxLength]) => {
      const value = cleanQueryValue(currentParameters.get(name) || '', maxLength);
      if (value) target.searchParams.set(name, value);
    });
    target.hash = current.hash;
    return target.href;
  }

  window.BegapunkLanguageUrl = languageUrl;

  // Directory-style homepage links are canonical on the deployed HTTP site,
  // but opening an HTML file directly makes them show a disk directory index.
  // Keep production URLs clean while making local file previews navigable.
  if (window.location.protocol === 'file:') {
    document.querySelectorAll('a[href], .i18n-switcher option[value]').forEach((element) => {
      const attribute = element.matches('option') ? 'value' : 'href';
      const value = element.getAttribute(attribute);
      const isRelativeDirectory = value
        && value.endsWith('/')
        && !value.startsWith('/')
        && !value.startsWith('//')
        && !/^[a-z][a-z\d+.-]*:/i.test(value);
      if (isRelativeDirectory) element.setAttribute(attribute, `${value}index.html`);
    });
  }

  const desktopNavigationMinWidth = 1280;

  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('mobileToggle');
  if (!nav || !toggle || toggle.dataset.navigationReady === 'true') return;

  toggle.dataset.navigationReady = 'true';
  toggle.setAttribute('aria-controls', 'mainNav');
  toggle.setAttribute('aria-expanded', 'false');

  const firstNavigationTarget = () => nav.querySelector(
    'a[href]:not([tabindex="-1"]), button:not([disabled]), select:not([disabled]), input:not([disabled])',
  );

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
    if (isOpen) {
      window.requestAnimationFrame(() => firstNavigationTarget()?.focus());
    }
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

  document.addEventListener('focusin', (event) => {
    if (!nav.classList.contains('mobile-open')) return;
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= desktopNavigationMinWidth) closeMenu();
  });
})();
