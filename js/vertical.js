/* Mobile: a vertical walk. The page scrolls normally; behind it the character
   walks down a path towards the camera (a pseudo-3D road like old racing
   games). The horizon, the path and the props along it change for each part
   of the walk, just like the desktop version. */
(function () {
  'use strict';
  const HA = (window.HA = window.HA || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function create(content) {
    const P = HA.pix, SC = HA.scenery, ui = HA.ui;
    const RM = matchMedia('(prefers-reduced-motion: reduce)');
    const canvas = document.getElementById('world');
    const ctx = canvas.getContext('2d');
    const stage = document.getElementById('stage');
    const root = document.getElementById('walk');
    const buf = document.createElement('canvas');
    const b = buf.getContext('2d');

    /* ------------------------------------------------------------ art */
    const mk = (g) => P.toCanvas(g);
    const CH = P.buildCharacter();
    const fr = {
      front: { idle: CH.front.idle.map(mk), walk: CH.front.walk.map(mk) },
      back: { idle: CH.back.idle.map(mk), walk: CH.back.walk.map(mk) }
    };
    const L = SC.layout(content);
    const far = SC.backdrops(L);
    const sunArt = SC.sunArt();
    const cloudArt = SC.cloudArt();
    const spr = (k) => SC.sprite(k, () => P.PROPS[k]());
    // what lines the path in each zone: [lamp, something else every third post]
    const SIDES = {
      brooklyn: [spr('lampNY'), null], cambridge: [spr('lampCam'), spr('tree')], tech: [spr('lampTech'), null],
      junk: [spr('lampJunk'), spr('crate')], marble: [spr('lampMarble'), spr('cypress')], finish: [spr('lampNY'), null]
    };
    // the path itself: two stripe colours, edges, a seam every so often, grass
    const PATHS = {
      pavers: { a: '#b9bec8', b: '#aab0bc', edge: '#e9ecf0', seam: 0 },
      brick: { a: '#bb5f48', b: '#ab533f', edge: '#e8e2d8', seam: 0 },
      tech: { a: '#434d61', b: '#3b4457', edge: '#7ff3ff', seam: 24, seamC: '#5fe8f5' },
      planks: { a: '#b6784a', b: '#a86d42', edge: '#5a3a22', seam: 6, seamC: '#5a3a22' },
      marble: { a: '#efeef4', b: '#e4e2ea', edge: '#ffffff', seam: 22, seamC: '#cfccd8' }
    };
    // where on each zone's backdrop the horizon is centred
    const CENTRE = { nyc: 330, bos: 380 };

    /* ------------------------------------------------------------ DOM */
    function buildDOM() {
      const p = content.person, esc = ui.esc;
      let h =
        `<section class="w-hero" data-chapter="start">` +
        `<p class="kicker">Hi, I'm</p><h1>${esc(p.name)}</h1>` +
        `<p class="w-role">${esc(p.role)}</p>` +
        `<ul class="chips"><li>${esc(p.location)}</li><li>${esc(p.focus)}</li><li class="chip-go">${esc(p.status)}</li></ul>` +
        `<p class="w-hint"><span class="w-arrow" aria-hidden="true">↓</span> Scroll to walk · tap a card to open it</p>` +
        `</section>`;
      let prev = null;
      const last = content.chapters[content.chapters.length - 1].id;
      content.stops.forEach((s) => {
        if (s.chapter !== prev) {
          if (prev) h += `</section>`;
          const ch = content.chapters.find((c) => c.id === s.chapter);
          h += `<section class="w-chapter" data-chapter="${esc(s.chapter)}">`;
          if (s.chapter === last) h += `<h2 class="w-banner w-finish"><span>${esc(ch.label)}</span></h2>`;
          else h += `<h2 class="w-banner"><span>${esc(ch.label)}</span></h2>`;
          prev = s.chapter;
        }
        if (s.landmark === 'gate') h += `<div class="w-travel" aria-hidden="true"><span>Boston · 215 mi</span></div>`;
        h +=
          `<div class="w-stop" id="w-${esc(s.id)}" data-stop="${esc(s.id)}">` +
          `<button type="button" class="w-card" data-open="${esc(s.id)}">` +
          ui.icon(s.icon, 2, 'w-icon') +
          `<span class="w-text">` +
          (s.kicker ? `<span class="kicker">${esc(s.kicker)}</span>` : '') +
          `<span class="w-title">${esc(s.title)}</span>` +
          (s.subtitle ? `<span class="sub">${esc(s.subtitle)}</span>` : '') +
          ui.meta(s, 'span') +
          (s.highlight ? `<span class="hl">${esc(s.highlight)}</span>` : '') +
          `</span><span class="w-tap">Tap to expand</span></button></div>`;
      });
      // the same construction barrier that closes the desktop walk
      const bar = HA.pix.toCanvas(HA.pix.barrier());
      h += `</section><p class="w-end"><img class="px w-barrier" src="${bar.toDataURL()}" alt="More coming soon" width="${bar.width}" height="${bar.height}" style="width: calc(var(--px) * ${bar.width})"></p>`;
      root.innerHTML = h;
    }
    function onRootClick(e) {
      const t = e.target.closest('[data-open]');
      if (t) open(t.dataset.open);
    }

    /* ---------------------------------------------------------- state */
    let S = 3, dpr = 1, VW = 0, VH = 0, HY = 0, FEET = 0, HC = 1;
    let vw = 0, vh = 0, skyCanvas = null;
    let raf = 0, last = 0, time = 0, running = false;
    let marks = [], chapterAt = [], zEnd = 0, bounds = [], zBounds = [];
    let zw = L.zones.map((z, i) => (i ? 0 : 1));
    let scrollY = 0, lastScroll = 0, vel = 0, moving = 0, facing = 'front', dist = 0, chapter = null;
    let scrollAnim = 0, observer = null, blinkAt = 2;
    const F = 100, KZ = 0.11, PATH = 22;

    function measure() {
      const st = window.scrollY;
      marks = Array.from(root.querySelectorAll('.w-stop')).map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.dataset.stop, el, y: r.top + st + r.height / 2 - vh / 2 };
      });
      chapterAt = Array.from(root.querySelectorAll('[data-chapter]')).map((el) => ({
        id: el.dataset.chapter,
        y: el.getBoundingClientRect().top + st - vh * 0.5
      }));
      // zone boundaries in scroll space (the first city change happens between
      // Saint Ann's and Harvard; the rest where each section starts)
      const gate = L.stops.find((s) => s.landmark === 'gate');
      const a = marks[0], g = marks.find((m) => gate && m.id === gate.id) || marks[1];
      const at = (id) => (chapterAt.find((c) => c.id === id) || { y: Infinity }).y + vh * 0.3;
      const start = { brooklyn: -Infinity, cambridge: (a.y + g.y) / 2, tech: at('experience'), junk: at('portfolio'), marble: at('interests'), finish: at('contact') };
      bounds = L.zones.map((z) => start[z.id]);
      zBounds = bounds.map((y) => (y === -Infinity ? Infinity : F - KZ * y));
      zEnd = F - KZ * (document.documentElement.scrollHeight + vh);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = window.innerWidth;
      vh = window.innerHeight;
      S = Math.max(2, Math.round(Math.min(vw, vh * 0.62) / 135));
      VW = Math.ceil(vw / S);
      VH = Math.ceil(vh / S);
      HY = Math.round(VH * 0.42);
      FEET = VH - 24;
      HC = FEET - HY;
      buf.width = VW;
      buf.height = VH;
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      skyCanvas = SC.sky(VW, HY + 2, HY);
      document.documentElement.style.setProperty('--px', S + 'px');
      measure();
      draw();
    }

    /* --------------------------------------------------------- drawing */
    const camZ = () => -scrollY * KZ;
    const smooth = (t) => t * t * (3 - 2 * t);
    // how much of each zone shows at the current scroll position
    function zoneTargets() {
      const span = vh * 0.45;
      const t = bounds.map((y, i) => (i === 0 ? 1 : smooth(clamp((scrollY - y + span / 2) / span, 0, 1))));
      return t.map((v, i) => v * (i + 1 < t.length ? 1 - t[i + 1] : 1));
    }
    // which zone a point on the path belongs to (further along = further down the road)
    function zoneAtZ(wz) {
      let k = 0;
      zBounds.forEach((zb, i) => { if (wz < zb) k = i; });
      return k;
    }

    function draw() {
      if (!skyCanvas) return;
      b.imageSmoothingEnabled = false;
      b.drawImage(skyCanvas, 0, 0);
      b.drawImage(sunArt, Math.round(VW * 0.72 - 22), 2);
      cloudArt.forEach((c, i) => {
        const span = VW + 120;
        const x = ((((i * span) / cloudArt.length - time * (2 + i) - scrollY * 0.004 * (i + 1)) % span) + span) % span - 60;
        b.globalAlpha = 0.85;
        b.drawImage(c, Math.round(x), Math.round(6 + ((i * 17) % Math.max(8, HY - 70))));
        b.globalAlpha = 1;
      });
      // the horizon for each zone, cross-fading, drifting slowly as you walk
      far.forEach((f, i) => {
        if (zw[i] < 0.004) return;
        const kind = L.zones[i].style.far;
        const drift = (scrollY - (bounds[i] === -Infinity ? 0 : bounds[i])) * 0.01;
        const centre = CENTRE[kind] || 300;
        const sx = clamp(Math.round(centre + drift - VW / 2), 0, Math.max(0, f.img.width - VW));
        b.globalAlpha = Math.min(1, zw[i]);
        b.drawImage(f.img, sx, 0, VW, SC.FAR_H, 0, HY - SC.FAR_H, VW, SC.FAR_H);
      });
      b.globalAlpha = 1;
      // river along the horizon
      const main = zw.indexOf(Math.max(...zw));
      b.fillStyle = `rgb(${L.zones[main].style.water[0].join(',')})`;
      b.fillRect(0, HY, VW, 5);
      for (let i = 0; i < 14; i++) {
        const x = (i * 37 + Math.floor(time * 6)) % VW, tw = Math.sin(time * 2 + i);
        if (tw > 0.3) {
          b.fillStyle = 'rgba(255,255,255,0.8)';
          b.fillRect(x, HY + 1 + (i % 4), 2, 1);
        }
      }
      ground();
      billboards();
      drawChar();
      // composite
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, 0, 0, VW * S * dpr, VH * S * dpr);
    }

    function ground() {
      const cz = camZ();
      for (let y = HY + 5; y < VH; y++) {
        const d = (F * HC) / (y - HY), wz = cz + d;
        const st = PATHS[L.zones[zoneAtZ(wz)].style.walk];
        b.fillStyle = Math.floor(wz / 9) & 1 ? '#6cc05f' : '#5fb35a';
        b.fillRect(0, y, VW, 1);
        const hw = (PATH * (y - HY)) / HC, cx = VW / 2;
        let c = Math.floor(wz / 5) & 1 ? st.a : st.b;
        if (st.seam && ((wz % st.seam) + st.seam) % st.seam < Math.max(0.6, 8 / (y - HY))) c = st.seamC;
        b.fillStyle = c;
        b.fillRect(Math.round(cx - hw), y, Math.round(hw * 2), 1);
        const edge = Math.max(1, Math.round(hw * 0.08));
        b.fillStyle = st.edge;
        b.fillRect(Math.round(cx - hw - edge), y, edge, 1);
        b.fillRect(Math.round(cx + hw), y, edge, 1);
      }
    }

    function billboards() {
      const cz = camZ(), items = [];
      // lamps and trees along both sides, in the style of the zone they stand in
      for (let z = F + 40; z > zEnd; z -= 34) {
        const d = z - cz;
        if (d < 30 || d > 2200) continue;
        const n = Math.round((F - z) / 34);
        const side = n % 2 ? 1 : -1;
        const [lamp, extra] = SIDES[L.zones[zoneAtZ(z)].id] || SIDES.brooklyn;
        if (n % 3 === 0) items.push({ img: extra, z, wx: side * (extra && extra.height < 20 ? PATH + 12 : 58), d });
        else items.push({ img: lamp, z, wx: side * (PATH + 9), d });
      }
      items.sort((a, c) => c.d - a.d);
      items.forEach((it) => {
        if (!it.img) return;
        const sc = F / it.d, y = HY + (F * HC) / it.d;
        const w = it.img.width * sc, h = it.img.height * sc;
        if (y - h > VH || w < 1) return;
        b.drawImage(it.img, Math.round(VW / 2 + it.wx * sc - w / 2), Math.round(y - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      });
    }

    function drawChar() {
      const set = fr[facing];
      let f;
      if (moving > 0) {
        const fast = Math.abs(vel) > 2600;
        f = set.walk[Math.floor(fast ? time * 14 : dist / 26) % set.walk.length];
      } else {
        const blink = facing === 'front' && time > blinkAt && time < blinkAt + 0.13;
        if (time > blinkAt + 0.13) blinkAt = time + 2.5 + Math.random() * 3;
        f = set.idle[blink ? 1 : 0];
      }
      // soft shadow
      b.fillStyle = 'rgba(30,40,60,0.18)';
      b.fillRect(Math.round(VW / 2 - 8), FEET - 1, 16, 2);
      b.drawImage(f, Math.round(VW / 2 - 12), FEET - 33);
    }

    /* --------------------------------------------------------- update */
    function onScroll() {
      scrollY = window.scrollY;
    }
    function tick(dt) {
      time += dt;
      const tw = zoneTargets();
      zw = zw.map((w, i) => w + (tw[i] - w) * Math.min(1, dt * 2.6));
      const dy = scrollY - lastScroll;
      lastScroll = scrollY;
      vel = dt > 0 ? dy / dt : 0;
      if (Math.abs(dy) > 0.5) {
        moving = 0.18;
        facing = dy > 0 ? 'front' : 'back';
        dist += Math.abs(dy);
      } else moving = Math.max(0, moving - dt);
      if (moving <= 0) facing = 'front';
      // header chapter + dock
      let ch = 'start';
      chapterAt.forEach((c) => { if (scrollY >= c.y) ch = c.id; });
      if (ch !== chapter) {
        chapter = ch;
        ui.setChapter(ch);
      }
      ui.chrome(scrollY > vh * 0.45);
      // a stop counts as visited once its card reaches the middle
      marks.forEach((m) => {
        if (Math.abs(scrollY - m.y) < vh * 0.25) ui.setVisited(m.id);
      });
    }

    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      if (!ui.panel.isOpen()) {
        tick(dt);
        draw();
      }
    }

    /* ---------------------------------------------------- navigation */
    function scrollToY(y) {
      y = clamp(y, 0, document.documentElement.scrollHeight - vh);
      cancelAnimationFrame(scrollAnim);
      if (RM.matches) return window.scrollTo(0, y);
      const y0 = window.scrollY, dy = y - y0, dur = clamp(Math.abs(dy) / 4, 350, 1300), t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        window.scrollTo(0, y0 + dy * ease(t));
        if (t < 1) scrollAnim = requestAnimationFrame(step);
      };
      scrollAnim = requestAnimationFrame(step);
    }
    const stopScrollAnim = () => cancelAnimationFrame(scrollAnim);

    function goTo(id, openAfter) {
      const m = marks.find((x) => x.id === id);
      if (!m) return;
      scrollToY(m.y);
      if (openAfter) setTimeout(() => open(id), 500);
    }
    function goChapter(id) {
      if (id === 'start') return scrollToY(0);
      const m = marks.find((x) => content.stops.find((s) => s.id === x.id).chapter === id);
      if (m) scrollToY(m.y);
    }
    function open(id) {
      const s = content.stops.find((x) => x.id === id);
      if (!s) return;
      ui.panel.open(s);
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* file:// */ }
    }

    /* ----------------------------------------------------------- start */
    function start(hash, quiet) {
      buildDOM();
      root.hidden = false;
      stage.hidden = false;
      root.addEventListener('click', onRootClick);
      observer = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-in')),
        { rootMargin: '0px 0px -18% 0px' }
      );
      root.querySelectorAll('.w-stop, .w-banner, .w-travel').forEach((el) => observer.observe(el));
      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('wheel', stopScrollAnim, { passive: true });
      window.addEventListener('touchstart', stopScrollAnim, { passive: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => running && measure());
      const isStop = content.stops.some((s) => s.id === hash);
      if (isStop) {
        const m = marks.find((x) => x.id === hash);
        if (m) window.scrollTo(0, m.y);
        if (!quiet) setTimeout(() => open(hash), 300);
      } else if (hash && content.chapters.some((c) => c.id === hash)) {
        setTimeout(() => goChapter(hash), 50);
      }
      scrollY = lastScroll = window.scrollY;
      zw = zoneTargets();
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollAnim);
      if (observer) observer.disconnect();
      root.removeEventListener('click', onRootClick);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', stopScrollAnim);
      window.removeEventListener('touchstart', stopScrollAnim);
      let near = null;
      if (window.scrollY > vh * 0.4)
        marks.forEach((m) => { if (!near || Math.abs(m.y - scrollY) < Math.abs(near.y - scrollY)) near = m; });
      root.hidden = true;
      root.innerHTML = '';
      ui.chrome(false);
      return near ? near.id : null;
    }

    return { start, stop, goTo, goChapter, open };
  }

  HA.vertical = { create };
})();
