// hELLO Hugo Theme — Light mode only (no toggle needed)
document.documentElement.classList.remove('dark');

const HEADER_TOP_THRESHOLD = 0;
const HEADER_BRAND_FADE_END = 0.45;
const HEADER_COMPACT_FADE_START = 0.62;
const HEADER_COMPACT_FADE_RANGE = 0.18;

document.addEventListener('DOMContentLoaded', () => {
  const siteHeader = document.querySelector('.site-header');
  const headerInner = siteHeader?.querySelector('.header-inner');
  const rootStyle = document.documentElement.style;

  if (!siteHeader || !headerInner) {
    return;
  }

  let ticking = false;
  let headerBrandHeight = 0;

  const syncHeaderHeight = () => {
    siteHeader.style.setProperty('--header-collapse-offset', '0px');
    siteHeader.style.setProperty('--header-collapse-progress', '0');
    siteHeader.style.setProperty('--header-brand-fade-progress', '0');
    siteHeader.style.setProperty('--header-compact-progress', '0');
    siteHeader.style.setProperty('--header-compact-visible', '0');
    headerBrandHeight = headerInner.scrollHeight;
    siteHeader.style.setProperty('--header-brand-height', `${headerBrandHeight}px`);
    updateHeaderState();
  };

  const updateHeaderState = () => {
    ticking = false;

    const currentScrollY = Math.max(window.scrollY - HEADER_TOP_THRESHOLD, 0);
    const collapseOffset = Math.min(currentScrollY, headerBrandHeight);
    const collapseProgress = headerBrandHeight > 0 ? collapseOffset / headerBrandHeight : 0;
    const brandFadeProgress = Math.min(collapseProgress / HEADER_BRAND_FADE_END, 1);
    const compactProgress = Math.max(
      0,
      Math.min((collapseProgress - HEADER_COMPACT_FADE_START) / HEADER_COMPACT_FADE_RANGE, 1)
    );
    const compactVisible = compactProgress > 0 ? 1 : 0;

    siteHeader.style.setProperty('--header-collapse-offset', `${collapseOffset}px`);
    siteHeader.style.setProperty('--header-collapse-progress', collapseProgress.toFixed(4));
    siteHeader.style.setProperty('--header-brand-fade-progress', brandFadeProgress.toFixed(4));
    siteHeader.style.setProperty('--header-compact-progress', compactProgress.toFixed(4));
    siteHeader.style.setProperty('--header-compact-visible', String(compactVisible));
    rootStyle.setProperty('--header-scroll-lock-offset', `${collapseOffset}px`);
    siteHeader.classList.toggle('is-collapsed', collapseProgress >= 0.999 && collapseOffset > 0);
  };

  const onScroll = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateHeaderState);
  };

  syncHeaderHeight();
  updateHeaderState();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', syncHeaderHeight);

  const siteLogo = headerInner.querySelector('.site-logo');

  if (typeof ResizeObserver === 'function') {
    const resizeObserver = new ResizeObserver(syncHeaderHeight);
    if (siteLogo) {
      resizeObserver.observe(siteLogo);
    }
  }

  const logoImage = headerInner.querySelector('.logo-img');
  if (logoImage && !logoImage.complete) {
    logoImage.addEventListener('load', syncHeaderHeight, { once: true });
  }
});
