/* Boot: pick the side-scroller (keyboard + mouse, wide screens) or the
   vertical walk (phones, tablets, narrow windows) and keep them in sync. */
(function () {
  'use strict';
  const HA = window.HA;
  const content = HA.content;
  const mq = matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)');
  const modes = {};
  let mode = null, modeName = null;

  HA.ui.init(content, {
    onNav: (id) => mode && mode.goChapter(id),
    onOpen: (id) => mode && mode.open(id),
    onGo: (id, openAfter) => mode && mode.goTo(id, !!openAfter),
    onPanel(open) {
      if (open) return;
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
    }
  });

  function boot() {
    const want = mq.matches ? 'vertical' : 'side';
    if (want === modeName) return;
    let at = location.hash.slice(1), switching = false;
    if (mode) {
      at = mode.stop() || at;
      switching = true;
    }
    if (HA.ui.panel.isOpen()) HA.ui.panel.close();
    if (HA.ui.menu.isOpen) HA.ui.menu.close();
    document.body.classList.toggle('mode-vertical', want === 'vertical');
    document.body.classList.toggle('mode-side', want === 'side');
    modeName = want;
    mode = modes[want] || (modes[want] = HA[want].create(content));
    HA.mode = mode;
    mode.start(at, switching);
  }

  if (mq.addEventListener) mq.addEventListener('change', boot);
  else mq.addListener(boot);

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (!id || !mode) return;
    if (content.stops.some((s) => s.id === id)) mode.goTo(id, true);
    else mode.goChapter(id);
  });

  boot();
})();
