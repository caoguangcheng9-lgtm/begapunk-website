const DEFAULT_SELECTOR = '.i18n-switcher select';

export async function requireFreshNavigationResponses(page) {
  // Release acceptance needs fresh 200 bodies for exact artifact hashing.
  // Keep strict status checks; do not treat a bodyless 304 as a passed page.
  await page.setCacheEnabled(false);
}

function errorText(error) {
  if (error?.stack) return error.stack;
  if (error?.message) return error.message;
  return String(error);
}

export function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(errorText(error)));
  return errors;
}

export async function openMobileNavigationWithPointer(page, { timeout = 3000 } = {}) {
  await page.click('#mobileToggle');
  // The real menu intentionally focuses its first link on the next frame.
  // Wait for that application transition before scrolling a later menu item;
  // otherwise deferred focus can scroll the item out of view after inspection.
  await page.waitForFunction(() => {
    const nav = document.querySelector('#mainNav');
    const toggle = document.querySelector('#mobileToggle');
    return toggle?.getAttribute('aria-expanded') === 'true'
      && nav?.contains(document.activeElement)
      && getComputedStyle(nav).display !== 'none'
      && nav.getBoundingClientRect().height > 0;
  }, { timeout });
}

export async function inspectPointerActionability(element, { scroll = false } = {}) {
  if (scroll) {
    await element.evaluate((candidate) => {
      const root = document.documentElement;
      const previousInlineBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      candidate.scrollIntoView({ block: 'center', inline: 'center' });
      root.style.scrollBehavior = previousInlineBehavior;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return element.evaluate((candidate) => {
    const rect = candidate.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const isDisabled = Boolean(candidate.disabled)
      || candidate.getAttribute('aria-disabled') === 'true'
      || Boolean(candidate.closest('[inert]'))
      || Boolean(candidate.closest('fieldset[disabled]'));

    let visibleThroughAncestors = true;
    let effectiveOpacity = 1;
    for (let current = candidate; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
        visibleThroughAncestors = false;
      }
      effectiveOpacity *= Number.parseFloat(style.opacity || '1');
    }

    const ownStyle = getComputedStyle(candidate);
    const insetX = Math.min(Math.max(rect.width * 0.2, 2), Math.max(rect.width / 2 - 1, 0));
    const insetY = Math.min(Math.max(rect.height * 0.2, 2), Math.max(rect.height / 2 - 1, 0));
    const proposedPoints = [
      { name: 'center', x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      { name: 'top-left', x: rect.left + insetX, y: rect.top + insetY },
      { name: 'top-right', x: rect.right - insetX, y: rect.top + insetY },
      { name: 'bottom-left', x: rect.left + insetX, y: rect.bottom - insetY },
      { name: 'bottom-right', x: rect.right - insetX, y: rect.bottom - insetY },
    ];
    const probePoints = proposedPoints.map((point) => {
      const insideViewport = point.x >= 0 && point.x < viewportWidth && point.y >= 0 && point.y < viewportHeight;
      const target = insideViewport ? document.elementFromPoint(point.x, point.y) : null;
      return {
        ...point,
        insideViewport,
        hit: Boolean(target && (target === candidate || candidate.contains(target))),
        hitTarget: target
          ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}${[...target.classList].map((name) => `.${name}`).join('')}`
          : null,
      };
    });
    const clickPoint = probePoints.find((point) => point.hit) || null;
    const rendered = visibleThroughAncestors
      && effectiveOpacity > 0.01
      && ownStyle.pointerEvents !== 'none'
      && rect.width > 0
      && rect.height > 0
      && candidate.getClientRects().length > 0;

    return {
      actionable: rendered && !isDisabled && Boolean(clickPoint),
      rendered,
      disabled: isDisabled,
      pointerEvents: ownStyle.pointerEvents,
      effectiveOpacity,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      clickPoint: clickPoint ? { name: clickPoint.name, x: clickPoint.x, y: clickPoint.y } : null,
      probePoints,
    };
  });
}

export async function chooseSelectOptionWithPointerAndKeyboard(page, targetLabel, {
  selector = DEFAULT_SELECTOR,
  navigationTimeout = 10000,
  waitUntil = 'domcontentloaded',
} = {}) {
  const select = await page.$(selector);
  if (!select) throw new Error(`Language selector is missing: ${selector}`);

  const state = await inspectPointerActionability(select, { scroll: true });
  if (!state.actionable || !state.clickPoint) {
    throw new Error(`Language selector is not pointer-actionable (${JSON.stringify(state)}).`);
  }

  const optionState = await select.evaluate((element, label) => {
    const options = [...element.options];
    const targetIndex = options.findIndex((option) => option.textContent.trim() === label);
    if (targetIndex < 0) throw new Error(`Language option is missing: ${label}`);
    return {
      currentIndex: element.selectedIndex,
      targetIndex,
      targetValue: options[targetIndex].value,
    };
  }, targetLabel);
  if (optionState.currentIndex === optionState.targetIndex) {
    throw new Error(`Language option ${targetLabel} is already selected; a navigation interaction cannot be proven.`);
  }

  const navigation = page.waitForNavigation({ waitUntil, timeout: navigationTimeout });
  await page.mouse.click(state.clickPoint.x, state.clickPoint.y);
  await page.keyboard.press('Home');
  for (let index = 0; index < optionState.targetIndex; index += 1) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');

  return {
    response: await navigation,
    targetValue: optionState.targetValue,
    interaction: 'mouse-click+keyboard',
    selectorState: state,
  };
}
