// hELLO Hugo Theme — Light mode only (no toggle needed)
document.documentElement.classList.remove('dark');

const HEADER_TOP_THRESHOLD = 2;
const SCROLL_DELTA_THRESHOLD = 2;

document.addEventListener('DOMContentLoaded', () => {
  const siteHeader = document.querySelector('.site-header');
  const headerInner = siteHeader?.querySelector('.header-inner');

  if (!siteHeader || !headerInner) {
    return;
  }

  let lastScrollY = Math.max(window.scrollY, 0);
  let ticking = false;
  let isCollapsed = false;
  let isTransitioning = false;
  let headerBrandHeight = headerInner.scrollHeight;

  const syncHeaderHeight = () => {
    headerBrandHeight = headerInner.scrollHeight;
    siteHeader.style.setProperty('--header-brand-height', `${headerBrandHeight}px`);
  };

  const enableHeaderTransitions = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        siteHeader.classList.add('is-interactive');
      });
    });
  };

  const setCollapsed = (nextCollapsed) => {
    if (nextCollapsed === isCollapsed) {
      return nextCollapsed;
    }

    siteHeader.classList.toggle('is-collapsed', nextCollapsed);
    isTransitioning = true;
    return nextCollapsed;
  };

  const handleResize = () => {
    syncHeaderHeight();
    lastScrollY = Math.max(window.scrollY, 0);

    if (!isTransitioning && lastScrollY <= HEADER_TOP_THRESHOLD) {
      isCollapsed = setCollapsed(false);
    }
  };

  const handleTransitionEnd = (event) => {
    if (event.target !== headerInner || event.propertyName !== 'max-height') {
      return;
    }

    isTransitioning = false;
    lastScrollY = Math.max(window.scrollY, 0);
  };

  const updateHeaderState = () => {
    ticking = false;

    const currentScrollY = Math.max(window.scrollY, 0);
    const delta = currentScrollY - lastScrollY;

    if (isTransitioning) {
      lastScrollY = currentScrollY;
      return;
    }

    if (currentScrollY <= HEADER_TOP_THRESHOLD) {
      isCollapsed = setCollapsed(false);
      lastScrollY = currentScrollY;
      return;
    }

    if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) {
      lastScrollY = currentScrollY;
      return;
    }

    if (!isCollapsed && delta > 0 && currentScrollY > HEADER_TOP_THRESHOLD) {
      isCollapsed = setCollapsed(true);
    }

    lastScrollY = currentScrollY;
  };

  const onScroll = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateHeaderState);
  };

  syncHeaderHeight();
  isCollapsed = siteHeader.classList.contains('is-collapsed');
  updateHeaderState();
  enableHeaderTransitions();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  headerInner.addEventListener('transitionend', handleTransitionEnd);

  if (typeof ResizeObserver === 'function') {
    const resizeObserver = new ResizeObserver(syncHeaderHeight);
    resizeObserver.observe(headerInner);
  }

  const logoImage = headerInner.querySelector('.logo-img');
  if (logoImage && !logoImage.complete) {
    logoImage.addEventListener('load', syncHeaderHeight, { once: true });
  }
});
