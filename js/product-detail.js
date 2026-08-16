(() => {
  'use strict';

  const panelIds = ['panel-specs', 'panel-compat', 'panel-install', 'panel-downloads'];

  function initializeTabs() {
    const mains = document.querySelectorAll('.page-product-detail main#main-content');
    const tabLists = document.querySelectorAll('.page-product-detail .pd-tabs');
    if (mains.length !== 1 || tabLists.length !== 1) return;
    const main = mains[0];
    const tabList = tabLists[0];
    if (!main.contains(tabList)) return;

    const tabs = [...tabList.querySelectorAll(':scope > a.pd-tab')];
    const panelMatches = panelIds.map((id) => [...document.querySelectorAll(`#${id}.pd-panel`)]);
    const panels = panelMatches.map((matches) => matches[0]);
    const valid = tabs.length === panelIds.length
      && panelMatches.every((matches) => matches.length === 1)
      && panels.every(Boolean)
      && new Set(tabs).size === panelIds.length
      && new Set(panels).size === panelIds.length
      && tabs.every((tab, index) => tab.getAttribute('href') === `#${panelIds[index]}`)
      && panels.every((panel, index) => panel.id === panelIds[index] && main.contains(panel));
    if (!valid) return;

    let activeIndex = 0;

    const focusTab = (index) => {
      tabs[index].focus();
      tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    const activate = (index, { focus = false, updateHash = false, scrollPanel = false } = {}) => {
      if (index < 0 || index >= tabs.length) return;
      activeIndex = index;
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[tabIndex].hidden = !selected;
      });
      if (updateHash && window.location.hash !== `#${panelIds[index]}`) {
        window.history.pushState(null, '', `#${panelIds[index]}`);
      }
      if (focus) focusTab(index);
      if (scrollPanel) panels[index].scrollIntoView({ block: 'start' });
    };

    tabList.setAttribute('role', 'tablist');
    tabs.forEach((tab, index) => {
      const tabId = `tab-${panelIds[index].slice('panel-'.length)}`;
      tab.id = tabId;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panelIds[index]);
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tabId);

      tab.addEventListener('click', (event) => {
        event.preventDefault();
        activate(index, { updateHash: true });
      });
      tab.addEventListener('keydown', (event) => {
        let nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (activeIndex + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex !== null) {
          event.preventDefault();
          activate(nextIndex, { focus: true, updateHash: true });
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate(index, { updateHash: true });
        }
      });
    });

    document.querySelectorAll('.page-product-detail a[href^="#panel-"]').forEach((link) => {
      if (tabs.includes(link)) return;
      const index = panelIds.indexOf(link.hash.slice(1));
      if (index < 0) return;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        activate(index, { updateHash: true, scrollPanel: true });
      });
    });

    const activateHash = () => {
      const index = panelIds.indexOf(window.location.hash.slice(1));
      activate(index >= 0 ? index : 0, { scrollPanel: index >= 0 });
    };
    window.addEventListener('hashchange', activateHash);

    const initialIndex = panelIds.indexOf(window.location.hash.slice(1));
    activate(initialIndex >= 0 ? initialIndex : 0);
    if (initialIndex >= 0) {
      window.requestAnimationFrame(() => panels[initialIndex].scrollIntoView({ block: 'start' }));
    }
  }

  function initializeFaq() {
    const items = [...document.querySelectorAll('.page-product-detail details.faq-item')];
    const valid = items.length === 5 && items.every((item) => (
      item.hasAttribute('open')
      &&
      item.querySelectorAll(':scope > summary.faq-question').length === 1
      && item.querySelectorAll(':scope > .faq-answer').length === 1
    ));
    if (!valid) return;
    items.forEach((item) => item.removeAttribute('open'));
  }

  function initializeThumbnails() {
    const row = document.querySelector('.page-product-detail .thumbnail-row');
    const mainImage = document.querySelector('.page-product-detail #main-img');
    if (!row || !mainImage) return;
    const links = [...row.querySelectorAll(':scope > a.thumb-link')];
    const images = links.map((link) => link.querySelector(':scope > img.thumb'));
    const valid = links.length === 3
      && images.every(Boolean)
      && links.every((link, index) => (
        link.querySelectorAll(':scope > img.thumb').length === 1
        && link.getAttribute('href') === images[index].getAttribute('src')
      ));
    if (!valid) return;

    const select = (index) => {
      const image = images[index];
      mainImage.src = image.getAttribute('src');
      mainImage.alt = image.getAttribute('alt') || '';
      links.forEach((link, linkIndex) => {
        if (linkIndex === index) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };

    links.forEach((link, index) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        select(index);
      });
      link.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        select(index);
      });
    });

    const initialIndex = Math.max(0, images.findIndex((image) => (
      image.getAttribute('src') === mainImage.getAttribute('src')
    )));
    links.forEach((link, linkIndex) => {
      if (linkIndex === initialIndex) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  initializeTabs();
  initializeFaq();
  initializeThumbnails();
})();
