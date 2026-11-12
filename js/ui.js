/* Interface pieces shared by the side-scroller and the mobile walk:
   header navigation (drop-downs on desktop, a full-screen menu on phones),
   the pop-up bubble, the expanded panel, the contact dock, the controls
   guide and a screen-reader list of every stop. */
(function () {
  'use strict';
  const HA = (window.HA = window.HA || {});
  const $ = (sel, root = document) => root.querySelector(sel);

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const icon = (name, scale, cls) =>
    `<img class="px ${cls || ''}" src="${HA.pix.iconURL(name, scale)}" alt="" width="${24 * scale}" height="${24 * scale}">`;

  // Dates and place as separate pieces so a line never ends on a separator
  const meta = (s, tag) =>
    s.dates || s.place
      ? `<${tag} class="meta">${[s.dates, s.place].filter(Boolean).map((m) => `<span>${esc(m)}</span>`).join('')}</${tag}>`
      : '';

  const store = {
    get(k) {
      try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ }
    }
  };

  let content, handlers, chapterStops = {};
  const visited = new Set(store.get('ha-visited') || []);

  /* -------------------------------------------------------------- header */
  function buildHeader() {
    const nav = $('#hud-nav'), n = content.chapters.length;
    nav.innerHTML = content.chapters
      .map((c, i) => {
        const stops = chapterStops[c.id] || [];
        const pips = stops.map((s) => `<i data-pip="${esc(s.id)}"${visited.has(s.id) ? ' class="on"' : ''}></i>`).join('');
        // hovering a section lists its stops so you can run straight to one
        const drop = stops.length
          ? `<div class="hud-drop${i >= n - 2 ? ' end' : ''}">` +
            stops
              .map((s) => `<button type="button" class="drop-item" data-run="${esc(s.id)}">${icon(s.icon, 2, 'drop-icon')}<span><b>${esc(s.title)}</b><small>${esc(s.tag || s.subtitle || '')}</small></span></button>`)
              .join('') +
            `</div>`
          : '';
        return `<div class="hud-item"><button type="button" class="hud-link" data-go="${esc(c.id)}"><span>${esc(c.label)}</span><span class="pips" aria-hidden="true">${pips}</span></button>${drop}</div>`;
      })
      .join('');
    $('#hud-logo').src = HA.pix.iconURL('logo', 1);
    document.addEventListener('click', (e) => {
      const run = e.target.closest('[data-run]');
      if (run) {
        e.preventDefault();
        handlers.onGo(run.dataset.run);
        shut(run);
        return;
      }
      const b = e.target.closest('[data-go]');
      if (!b) return;
      e.preventDefault();
      handlers.onNav(b.dataset.go, e.detail > 0);
      if (e.detail > 0) shut(b);
    });
  }
  // after a pick, tuck the drop-down away until the pointer leaves it
  function shut(el) {
    el.blur();
    const item = el.closest('.hud-item');
    if (!item) return;
    item.classList.add('is-shut');
    item.addEventListener('mouseleave', () => item.classList.remove('is-shut'), { once: true });
  }

  /* --------------------------------------------- phone menu (full screen) */
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = {
    isOpen: false,
    init() {
      this.el = $('#menu');
      this.btn = $('#hud-burger');
      $('#menu-list').innerHTML = content.chapters
        .map((c) => {
          const first = (chapterStops[c.id] || [])[0];
          const art = first ? icon(first.icon, 2, 'menu-icon') : `<img class="px menu-icon" src="${HA.pix.iconURL('logo', 2)}" alt="" width="64" height="64">`;
          return `<li><button type="button" class="menu-link" data-menu-go="${esc(c.id)}">${art}<span>${esc(c.label)}</span></button></li>`;
        })
        .join('');
      this.btn.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
      this.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-menu-go]');
        if (b) this.close(() => handlers.onNav(b.dataset.menuGo, true));
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });
    },
    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      clearTimeout(this.timer);
      this.el.hidden = false;
      document.documentElement.classList.add('menu-open');
      this.btn.setAttribute('aria-expanded', 'true');
      this.btn.setAttribute('aria-label', 'Close menu');
      void this.el.offsetWidth; // start the fade from transparent
      this.el.classList.add('is-open');
      const f = this.el.querySelector('.menu-link');
      if (f) f.focus({ preventScroll: true });
    },
    close(then) {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.el.classList.remove('is-open');
      this.btn.setAttribute('aria-expanded', 'false');
      this.btn.setAttribute('aria-label', 'Open menu');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.el.hidden = true;
        document.documentElement.classList.remove('menu-open');
        if (then) then();
      }, RM.matches ? 0 : 200);
    }
  };

  function setChapter(id) {
    const nav = $('#hud-nav');
    document.querySelectorAll('.hud-link').forEach((b) => {
      if (b.dataset.go !== id) return b.removeAttribute('aria-current');
      b.setAttribute('aria-current', 'true');
      // on small screens the header scrolls sideways; keep the current section in view
      if (nav.scrollWidth > nav.clientWidth + 2) nav.scrollTo({ left: b.offsetLeft - nav.offsetLeft - 12, behavior: 'smooth' });
    });
  }

  function setVisited(id) {
    if (visited.has(id)) return;
    visited.add(id);
    store.set('ha-visited', Array.from(visited));
    document.querySelectorAll(`[data-pip="${CSS.escape(id)}"]`).forEach((p) => p.classList.add('on'));
  }

  /* -------------------------------------------------------------- bubble */
  const bubble = {
    el: null,
    stop: null,
    init() {
      this.el = $('#bubble');
      this.el.addEventListener('click', () => this.stop && handlers.onOpen(this.stop.id));
    },
    show(stop) {
      if (this.stop === stop) return;
      this.stop = stop;
      const list = chapterStops[stop.chapter] || [];
      const n = list.findIndex((x) => x.id === stop.id) + 1;
      const chapter = content.chapters.find((c) => c.id === stop.chapter);
      const count = list.length > 1 ? ` · ${n}/${list.length}` : '';
      this.el.innerHTML =
        `<div class="bubble-card">` +
        `<p class="kicker">${esc(stop.kicker || chapter.label)}${esc(count)}</p>` +
        `<h3>${esc(stop.title)}</h3>` +
        (stop.subtitle ? `<p class="sub">${esc(stop.subtitle)}</p>` : '') +
        meta(stop, 'p') +
        (stop.highlight ? `<p class="hl">${esc(stop.highlight)}</p>` : '') +
        `<p class="cta"><span class="cta-key">Press <kbd>E</kbd> to expand</span><span class="cta-tap">Tap to expand</span></p>` +
        `</div>`;
      this.el.classList.remove('is-out');
      this.el.classList.add('is-in');
      announce(`${stop.title}${stop.subtitle ? ', ' + stop.subtitle : ''}. Press E to expand.`);
    },
    place(x, y) {
      const w = this.el.offsetWidth, vw = window.innerWidth;
      y = Math.max(y, this.el.offsetHeight + 66);
      const left = Math.max(12, Math.min(vw - w - 12, x - w / 2));
      this.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(y)}px) translateY(-100%)`;
      this.el.style.setProperty('--tail', `${Math.round(Math.max(18, Math.min(w - 18, x - left)))}px`);
    },
    hide() {
      if (!this.stop) return;
      this.stop = null;
      this.el.classList.remove('is-in');
      this.el.classList.add('is-out');
    }
  };

  /* --------------------------------------------------------------- panel */
  const panel = {
    el: null,
    stop: null,
    init() {
      this.el = $('#panel');
      this.body = $('#panel-body');
      this.el.addEventListener('click', (e) => {
        if (e.target === this.el) return this.close();
        if (e.target.closest('[data-close]')) return this.close();
        const rel = e.target.closest('[data-to]');
        if (rel) {
          const to = rel.dataset.to;
          this.close();
          handlers.onGo(to);
          return;
        }
        const zoom = e.target.closest('[data-zoom]');
        if (zoom) lightbox(zoom.getAttribute('src'), zoom.getAttribute('alt'));
      });
      // Escape and E both close (or back out of a zoomed photo first)
      document.addEventListener('keydown', (e) => {
        if (!this.isOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.code !== 'Escape' && (e.code !== 'KeyE' || e.repeat)) return;
        e.preventDefault();
        if (!$('#lightbox').hidden) closeLightbox();
        else this.close();
      });
      this.el.addEventListener('cancel', (e) => {
        e.preventDefault();
        if (!$('#lightbox').hidden) return closeLightbox();
        this.close();
      });
      $('#lightbox').addEventListener('click', closeLightbox);
    },
    isOpen() {
      return this.el.open;
    },
    open(stop) {
      clearTimeout(this.closing);
      this.stop = stop;
      this.body.innerHTML = render(stop);
      this.body.scrollTop = 0;
      document.documentElement.classList.add('panel-open');
      if (!this.el.open) this.el.showModal();
      this.el.classList.remove('is-closing');
      this.body.focus({ preventScroll: true });
      setVisited(stop.id);
      handlers.onPanel && handlers.onPanel(true, stop);
    },
    close() {
      if (!this.el.open) return;
      this.el.querySelectorAll('video').forEach((v) => v.pause());
      closeLightbox();
      this.el.classList.add('is-closing');
      const done = () => {
        this.el.classList.remove('is-closing');
        this.el.close();
        document.documentElement.classList.remove('panel-open');
        handlers.onPanel && handlers.onPanel(false, this.stop);
      };
      clearTimeout(this.closing);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
      else this.closing = setTimeout(done, 140);
    }
  };

  function lightbox(src, alt) {
    const lb = $('#lightbox');
    $('img', lb).src = src;
    $('img', lb).alt = alt || '';
    lb.hidden = false;
  }
  function closeLightbox() {
    $('#lightbox').hidden = true;
  }

  function render(s) {
    const p = content.person;
    let h = `<header class="panel-head">${icon(s.icon, 3, 'panel-icon')}<div>`;
    if (s.kicker) h += `<p class="kicker">${esc(s.kicker)}</p>`;
    h += `<h2 id="panel-title">${esc(s.title)}</h2>`;
    if (s.subtitle) h += `<p class="sub">${esc(s.subtitle)}</p>`;
    h += meta(s, 'p');
    h += `</div></header>`;
    if (s.highlight && !s.contact) h += `<p class="panel-hl">${esc(s.highlight)}</p>`;
    if (s.summary) h += `<p class="lead">${esc(s.summary)}</p>`;
    if (s.facts)
      h += `<dl class="facts">${s.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    if (s.bullets) h += `<ul class="bullets">${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
    if (s.media) {
      h += `<div class="gallery">`;
      s.media.forEach((m) => {
        const cls = [m.wide ? 'wide' : '', m.tall ? 'tall' : '', m.type].filter(Boolean).join(' ');
        h += `<figure class="${cls}"><div class="frame">`;
        if (m.type === 'video')
          h += `<video src="${esc(m.src)}" poster="${esc(m.poster || '')}" controls playsinline preload="none"></video>`;
        else
          h += `<img src="${esc(m.src)}" alt="${esc(m.alt || '')}" loading="lazy" data-zoom onload="this.closest('figure').style.setProperty('--r', this.naturalWidth / this.naturalHeight)">`;
        h += `</div>${m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ''}</figure>`;
      });
      h += `</div>`;
    }
    (s.sections || []).forEach((sec) => {
      h += `<section class="panel-sec">`;
      if (sec.heading) h += `<h3>${esc(sec.heading)}</h3>`;
      h += sec.text.map((t) => `<p>${esc(t)}</p>`).join('');
      h += `</section>`;
    });
    if (s.tags) h += `<ul class="tags">${s.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
    if (s.contact) {
      h += `<ul class="contact-list">
        <li><span>Email</span><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li>
        <li><span>LinkedIn</span><a href="${esc(p.linkedin)}" target="_blank" rel="noopener">linkedin.com/in/haronofsky</a></li>
        <li><span>GitHub</span><a href="${esc(p.github)}" target="_blank" rel="noopener">github.com/HenryAronofsky</a></li>
      </ul>
      <p class="links"><a class="btn btn-primary" href="${esc(p.resume)}" download>Download résumé (PDF)</a></p>`;
    }
    if (s.links)
      h += `<p class="links">${s.links.map((l) => `<a class="btn" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</p>`;
    const hasBody = ['summary', 'facts', 'bullets', 'media', 'sections', 'tags', 'contact', 'links', 'related'].some((k) => s[k]);
    if (!hasBody) h += `<p class="lead soon">More about this soon.</p>`;
    if (s.related) {
      h += `<div class="related"><h3>Walk to</h3><div class="related-list">`;
      h += s.related
        .map((r) => {
          const t = content.stops.find((x) => x.id === r.to);
          return `<button type="button" class="related-btn" data-to="${esc(r.to)}">${t ? icon(t.icon, 2) : ''}<span><b>${esc(r.label)}</b>${r.note ? `<small>${esc(r.note)}</small>` : ''}</span><i aria-hidden="true">→</i></button>`;
        })
        .join('');
      h += `</div></div>`;
    }
    return h;
  }

  /* ---------------------------------------------------- controls guide */
  const controls = {
    el: null,
    done: new Set(),
    init() {
      this.el = $('#controls');
    },
    show() {
      this.el.classList.add('is-in');
    },
    hide() {
      this.el.classList.remove('is-in');
      this.el.classList.add('is-gone');
    },
    key(code, down) {
      this.el.querySelectorAll(`[data-key~="${code}"]`).forEach((k) => k.classList.toggle('is-down', down));
    },
    did(act) {
      if (this.done.has(act)) return;
      this.done.add(act);
      const row = this.el.querySelector(`[data-act="${act}"]`);
      if (row) row.classList.add('is-done');
    }
  };

  /* ------------------------------------------------------------ helpers */
  function announce(text) {
    const live = $('#live');
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = text));
  }

  function buildStopList() {
    const nav = $('#stops-list');
    nav.innerHTML = content.stops
      .map((s) => `<li><button type="button" data-open="${esc(s.id)}">${esc(s.title)}${s.subtitle ? ' — ' + esc(s.subtitle) : ''}</button></li>`)
      .join('');
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]');
      if (b) handlers.onOpen(b.dataset.open);
    });
  }

  function init(c, h) {
    content = c;
    handlers = h;
    content.stops.forEach((s) => (chapterStops[s.chapter] = chapterStops[s.chapter] || []).push(s));
    buildHeader();
    menu.init();
    bubble.init();
    panel.init();
    controls.init();
    buildStopList();
    $('#dock-email').href = 'mailto:' + content.person.email;
  }

  HA.ui = {
    init, esc, icon, meta, setChapter, setVisited, visited, bubble, panel, controls, menu, announce, store,
    // the header and the contact dock come and go together
    chrome(show) {
      document.body.classList.toggle('chrome-on', !!show);
    }
  };
})();
