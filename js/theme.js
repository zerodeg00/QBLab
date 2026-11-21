// hELLO Hugo Theme — Light mode only (no toggle needed)
document.documentElement.classList.remove('dark');

const HEADER_TOP_THRESHOLD = 0;
const HEADER_BRAND_FADE_END = 0.45;
const HEADER_COMPACT_FADE_START = 0.30;
const HEADER_COMPACT_FADE_RANGE = 0.35;

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

    siteHeader.style.setProperty('--header-collapse-offset', `${collapseOffset}px`);
    siteHeader.style.setProperty('--header-collapse-progress', collapseProgress.toFixed(4));
    siteHeader.style.setProperty('--header-brand-fade-progress', brandFadeProgress.toFixed(4));
    siteHeader.style.setProperty('--header-compact-progress', compactProgress.toFixed(4));
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

  // --- Bidirectional sticky sidebar ---
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    const SIDEBAR_TOP_MAX = 80;
    let sidebarTop = SIDEBAR_TOP_MAX;
    let prevSidebarScrollY = window.scrollY;
    let sidebarTicking = false;

    const updateSidebarPosition = () => {
      sidebarTicking = false;
      const scrollY = window.scrollY;
      const delta = scrollY - prevSidebarScrollY;
      prevSidebarScrollY = scrollY;

      const viewportH = window.innerHeight;
      const sidebarH = sidebar.offsetHeight;

      if (sidebarH <= viewportH - SIDEBAR_TOP_MAX) {
        sidebar.style.top = SIDEBAR_TOP_MAX + 'px';
        sidebarTop = SIDEBAR_TOP_MAX;
        return;
      }

      const minTop = viewportH - sidebarH;
      sidebarTop = Math.max(minTop, Math.min(SIDEBAR_TOP_MAX, sidebarTop - delta));
      sidebar.style.top = Math.round(sidebarTop) + 'px';
    };

    window.addEventListener('scroll', () => {
      if (!sidebarTicking) {
        sidebarTicking = true;
        requestAnimationFrame(updateSidebarPosition);
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      sidebarTop = SIDEBAR_TOP_MAX;
      updateSidebarPosition();
    });
  }
});
