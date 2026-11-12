/* Scenery: the world layout (where every stop, sign and prop sits along the
   walk) and the static background art, drawn once into offscreen canvases.
   Units are art pixels; the game scales them up. */
(function () {
  'use strict';
  const HA = (window.HA = window.HA || {});
  const P = HA.pix;

  const NEAR_TOP = 100; // rows above the walking line in the near layer
  const NEAR_BOT = 72; // rows below it
  const FAR_H = 130; // skyline canvas height (baseline = bottom row)
  const BANK_H = 124; // riverbank layer height (baseline = bottom row)
  const PARALLAX = { far: 0.12, bank: 0.6, fore: 1.22, icons: 0.36 };
  // Typical screen width (art px) used to line parallax landmarks up with stops
  const REF_VIEW = 480;

  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    c.getContext('2d').imageSmoothingEnabled = false;
    return c;
  }
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  }
  const cache = {};
  function sprite(key, make) {
    return cache[key] || (cache[key] = P.toCanvas(make()));
  }
  function rect(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function line(g, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    g.fillStyle = c;
    for (;;) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  /* -------------------------------------------------------------- layout */
  function layout(content) {
    const L = { spawn: 170, stops: [], signs: [], decor: [], platforms: [], pigeons: [], chapters: [] };
    const label = {};
    content.chapters.forEach((c) => (label[c.id] = c.label));
    let x = 0, prev = null;
    content.stops.forEach((s) => {
      const st = Object.assign({}, s);
      if (st.chapter !== prev) {
        if (prev === null) x = 620;
        else if (st.chapter === 'harvard') x += 920;
        else if (st.chapter === 'contact') x += 380;
        else {
          x += 200;
          L.signs.push({ x, label: label[st.chapter] });
          x += 190;
        }
        L.chapters.push({ id: st.chapter, x: prev === null ? L.spawn : x });
      } else x += 300;
      st.x = x;
      L.stops.push(st);
      prev = st.chapter;
    });
    L.len = x + 340;
    L.end = L.len - 60;
    L.byId = {};
    L.stops.forEach((s) => (L.byId[s.id] = s));
    // Chapter boundaries sit halfway between the neighbouring stops
    L.chapters.forEach((c, i) => {
      const first = L.stops.find((s) => s.chapter === c.id);
      const before = L.stops[L.stops.indexOf(first) - 1];
      c.from = i === 0 ? -Infinity : (before.x + first.x) / 2;
    });

    const first = L.stops[0];
    L.highway = first.x + 330;
    L.citySwitch = first.x + 640;
    L.harvard = L.byId.harvard ? L.byId.harvard.x : first.x + 920;
    L.blend = [first.x + 450, L.harvard - 230];
    L.cityAt = (wx) => smooth(L.blend[0], L.blend[1], wx);

    const busy = (px, d) =>
      L.stops.some((s) => Math.abs(s.x - px) < d) ||
      L.signs.some((s) => Math.abs(s.x - px) < d) ||
      Math.abs(px - L.highway) < d + 20 ||
      Math.abs(px - L.spawn) < d;

    // Street lamps along the back of the walkway
    for (let lx = 60; lx < L.end - 30; lx += 175)
      if (!busy(lx, 48)) L.decor.push({ k: lx < L.citySwitch ? 'lampNY' : 'lampCam', x: lx });
    // Something to hop on between most pairs of stops
    const kinds = ['bench', 'crates', 'planter', 'bench', 'crate'];
    let ki = 0;
    for (let i = 1; i < L.stops.length; i++) {
      const a = L.stops[i - 1], b = L.stops[i];
      if (b.x - a.x > 420 || b.chapter !== a.chapter) continue;
      const mx = Math.round((a.x + b.x) / 2) + (i % 2 ? 18 : -18);
      addPlatform(L, kinds[ki++ % kinds.length], mx);
    }
    addPlatform(L, 'bench', L.spawn + 230);
    addPlatform(L, 'crates', L.highway + 150);
    L.decor.push({ k: 'trash', x: L.spawn - 70 });
    L.decor.push({ k: 'trash', x: L.citySwitch + 90 });
    // Pigeons that scatter when you walk past
    [L.spawn + 120, first.x + 200, L.harvard + 160]
      .concat(L.stops.filter((s, i) => i % 4 === 2).map((s) => s.x + 140))
      .forEach((px, i) => L.pigeons.push({ x: px, n: 2 + (i % 2) }));
    return L;
  }

  function addPlatform(L, kind, x) {
    if (kind === 'bench') {
      L.decor.push({ k: 'bench', x, front: true });
      L.platforms.push({ x0: x - 13, x1: x + 13, top: 6 });
    } else if (kind === 'planter') {
      L.decor.push({ k: 'planter', x, front: true });
      L.platforms.push({ x0: x - 15, x1: x + 15, top: 9 });
    } else if (kind === 'crate') {
      L.decor.push({ k: 'crate', x, front: true });
      L.platforms.push({ x0: x - 7, x1: x + 7, top: 14 });
    } else {
      L.decor.push({ k: 'crate', x: x - 7, front: true }, { k: 'crate', x: x + 7, front: true }, { k: 'crate', x: x + 7, y: 14, front: true }, { k: 'crate', x: x + 21, front: true });
      L.platforms.push({ x0: x - 14, x1: x, top: 14 }, { x0: x, x1: x + 14, top: 28 }, { x0: x + 14, x1: x + 28, top: 14 });
    }
  }

  /* ----------------------------------------------------------------- sky */
  function sky(w, h, horizon) {
    const c = cv(w, h), g = c.getContext('2d');
    const stops = [[0, [74, 168, 236]], [0.55, [126, 199, 244]], [1, [214, 240, 252]]];
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const bands = 9;
    const colorAt = (t) => {
      for (let i = 1; i < stops.length; i++)
        if (t <= stops[i][0]) {
          const [t0, a] = stops[i - 1], [t1, b] = stops[i], k = (t - t0) / (t1 - t0);
          return a.map((v, j) => Math.round(v + (b[j] - v) * k));
        }
      return stops[stops.length - 1][1];
    };
    const band = [];
    for (let i = 0; i < bands; i++) band.push(colorAt(i / (bands - 1)));
    const img = g.createImageData(c.width, c.height), d = img.data;
    for (let y = 0; y < c.height; y++) {
      const t = Math.min(1, y / Math.max(1, horizon)) * (bands - 1);
      const lo = Math.floor(t), f = t - lo;
      for (let x = 0; x < c.width; x++) {
        const col = band[Math.min(bands - 1, f > bayer[(y % 4) * 4 + (x % 4)] / 16 ? lo + 1 : lo)];
        const i = (y * c.width + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function sun() {
    const g = new P.Px(44, 44);
    g.ellipse(22, 22, 9.5, 9.5, 'e');
    g.ellipse(22, 22, 7.5, 7.5, 'w');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, r0 = 13, r1 = i % 2 ? 17 : 20;
      g.line(22 + Math.cos(a) * r0, 22 + Math.sin(a) * r0, 22 + Math.cos(a) * r1, 22 + Math.sin(a) * r1, 'e', 2);
    }
    return P.toCanvas(g);
  }

  function clouds(seed, n, big) {
    const r = rng(seed), out = [];
    for (let i = 0; i < n; i++) {
      const w = Math.round((big ? 46 : 28) + r() * (big ? 40 : 22)), h = Math.round(w * 0.42);
      const g = new P.Px(w + 4, h + 4);
      const puffs = 4 + Math.floor(r() * 3);
      for (let p = 0; p < puffs; p++) {
        const px = 4 + (p / (puffs - 1)) * (w - 8), rr = h * (0.32 + r() * 0.3);
        g.ellipse(px + 2, h + 2 - rr * 0.9, rr * 1.2, rr, 'w');
      }
      g.rect(4, h - 2, w - 4, 4, 'w');
      g.map((x, y, v) => (v === 'w' && (g.get(x, y + 1) === '.' || g.get(x, y + 2) === '.') ? 'u' : undefined));
      out.push(P.toCanvas(g));
    }
    return out;
  }

  /* ------------------------------------------------------------ skylines */
  function block(g, B, x, w, h, k, o = {}) {
    x = Math.round(x); w = Math.max(3, Math.round(w)); h = Math.round(h);
    rect(g, x, B - h, w, h, k.body);
    rect(g, x + w - 1, B - h, 1, h, k.lit);
    rect(g, x, B - h, 1, h, k.dark);
    let top = B - h;
    if (o.step) {
      rect(g, x + 2, top - o.step, w - 4, o.step, k.body);
      rect(g, x + w - 3, top - o.step, 1, o.step, k.lit);
      top -= o.step;
    }
    if (o.antenna) rect(g, x + Math.floor(w / 2), top - o.antenna, 1, o.antenna, k.dark);
    if (o.tank && w > 7) tank(g, x + 2, B - h, k);
    for (let yy = B - h + 3; yy < B - 2; yy += o.bands ? 2 : 3)
      for (let xx = x + 2; xx < x + w - 2; xx += 2)
        if ((xx * 7 + yy * 13) % 5) rect(g, xx, yy, 1, 1, k.win);
  }
  // Wooden NYC rooftop water tank
  function tank(g, x, top, k) {
    rect(g, x, top - 2, 1, 2, k.dark);
    rect(g, x + 3, top - 2, 1, 2, k.dark);
    rect(g, x, top - 6, 4, 4, k.wood || k.dark);
    rect(g, x + 1, top - 8, 2, 2, k.wood || k.dark);
  }

  function skylineNYC() {
    const W = 1000, B = FAR_H, c = cv(W, FAR_H), g = c.getContext('2d'), r = rng(11);
    const FAR = { body: '#b9cde6', lit: '#d6e5f4', dark: '#a7bfdc', win: '#cadbef', wood: '#b9b2b6' };
    const MID = { body: '#9cb7da', lit: '#c4d8ee', dark: '#88a5cf', win: '#b2c9e6', wood: '#a99d9e' };
    // Midtown, further away
    for (let i = 0; i < 30; i++) block(g, B, 170 + r() * 220, 6 + r() * 12, 24 + r() * 36, FAR, { step: r() < 0.3 ? 4 : 0 });
    // Empire State
    const es = 272;
    [[20, 44], [14, 62], [10, 74], [6, 80], [4, 84]].forEach(([w, h]) => {
      rect(g, es - w / 2, B - h, w, h, FAR.body);
      rect(g, es + w / 2 - 1, B - h, 1, h, FAR.lit);
      for (let xx = es - w / 2 + 2; xx < es + w / 2 - 1; xx += 2) rect(g, xx, B - h + 2, 1, h - 4, FAR.win);
    });
    rect(g, es - 1, B - 92, 2, 8, FAR.dark);
    rect(g, es, B - 99, 1, 7, FAR.dark);
    // Chrysler
    const ch = 318;
    rect(g, ch - 7, B - 58, 14, 58, FAR.body);
    rect(g, ch + 6, B - 58, 1, 58, FAR.lit);
    for (let i = 0; i < 5; i++) {
      const w = 12 - i * 2, y = B - 58 - (i + 1) * 4;
      rect(g, ch - w / 2, y, w, 4, '#e2ebf5');
      for (let j = 1; j < w; j += 2) rect(g, ch - w / 2 + j, y + 2, 1, 2, FAR.dark);
    }
    rect(g, ch, B - 92, 1, 14, '#e2ebf5');
    // 432 Park
    rect(g, 352, B - 96, 5, 96, FAR.body);
    for (let yy = B - 94; yy < B; yy += 3) rect(g, 353, yy, 3, 1, FAR.win);
    // Lower Manhattan, closer
    for (let i = 0; i < 34; i++) block(g, B, 52 + r() * 200, 7 + r() * 14, 18 + r() * 40, MID, { tank: r() < 0.35, antenna: r() < 0.15 ? 5 : 0 });
    block(g, B, 110, 15, 66, MID, { bands: true });
    block(g, B, 170, 16, 72, MID, { bands: true, antenna: 6 });
    // Woolworth
    block(g, B, 212, 12, 44, MID);
    rect(g, 214, B - 58, 8, 14, MID.body);
    rect(g, 221, B - 58, 1, 14, MID.lit);
    for (let i = 0; i < 6; i++) rect(g, 215 + i * 0.5, B - 59 - i, 6 - i, 1, '#a3cbc8');
    rect(g, 217, B - 68, 1, 4, MID.dark);
    // One World Trade
    const wt = 146;
    rect(g, wt - 10, B - 12, 20, 12, MID.body);
    for (let y = 0; y < 76; y++) {
      const w = Math.round(18 - (y / 76) * 8);
      rect(g, wt - Math.ceil(w / 2), B - 12 - y, Math.ceil(w / 2), 1, '#a8c6e8');
      rect(g, wt, B - 12 - y, Math.floor(w / 2), 1, '#cfe1f4');
    }
    rect(g, wt - 4, B - 90, 8, 2, MID.dark);
    rect(g, wt, B - 110, 1, 20, MID.dark);
    // Statue of Liberty on her island
    const sl = 24, GREEN = '#86c7b8';
    rect(g, sl - 16, B - 3, 32, 3, '#9fbfaa');
    rect(g, sl - 5, B - 7, 10, 4, '#b8c3c8');
    rect(g, sl - 3, B - 17, 6, 10, '#c4cdd2');
    rect(g, sl - 2, B - 29, 4, 12, GREEN);
    rect(g, sl - 1, B - 32, 3, 3, GREEN);
    rect(g, sl + 2, B - 38, 1, 9, GREEN);
    rect(g, sl + 1, B - 40, 3, 2, '#ffd65a');
    rect(g, sl - 3, B - 25, 1, 3, GREEN);
    // Brooklyn Bridge: granite tower, gothic arches, cables
    const bb = 398, T = '#cdc6bb', TD = '#b6aea1', CAB = '#8e9db4';
    rect(g, bb - 150, B - 22, 450, 2, '#8a97ad');
    rect(g, bb - 150, B - 20, 450, 1, '#b3bfd0');
    for (const side of [-1, 1]) {
      const span = side < 0 ? 150 : 260;
      let px = bb, py = B - 60;
      for (let i = 1; i <= 120; i++) {
        const t = i / 120, x = bb + side * t * span, y = B - 60 + 36 * Math.sin(t * Math.PI * (side < 0 ? 0.5 : 1));
        line(g, px, py, x, y, CAB);
        if (i % 2 === 0) rect(g, x, y, 1, B - 22 - y, 'rgba(226,234,244,0.8)');
        px = x; py = y;
      }
      for (let i = 1; i <= 5; i++) line(g, bb, B - 58, bb + side * i * 16, B - 22, CAB);
    }
    rect(g, bb - 8, B - 62, 16, 62, T);
    rect(g, bb - 9, B - 64, 18, 2, TD);
    rect(g, bb + 7, B - 62, 1, 62, '#e0dbd2');
    for (const ax of [bb - 5, bb + 2]) {
      rect(g, ax, B - 46, 3, 22, '#cfe6f6');
      rect(g, ax + 1, B - 48, 1, 2, '#cfe6f6');
    }
    rect(g, bb - 8, B - 22, 16, 2, '#8a97ad');
    // Brooklyn beyond the bridge
    for (let i = 0; i < 30; i++) block(g, B, 430 + r() * 560, 8 + r() * 14, 10 + r() * 26, MID, { tank: r() < 0.5 });
    return c;
  }

  function skylineBOS() {
    const W = 1500, B = FAR_H, c = cv(W, FAR_H), g = c.getContext('2d'), r = rng(23);
    const FAR = { body: '#bccfe7', lit: '#d8e6f4', dark: '#a9c0dd', win: '#ccdcef' };
    const MID = { body: '#a1badb', lit: '#c6d9ee', dark: '#8ca8d0', win: '#b5cbe6' };
    const BRICK = { body: '#c9b3b0', lit: '#ddcbc6', dark: '#b39d9b', win: '#d8c6c2' };
    // Background fill along the whole river
    for (let i = 0; i < 70; i++) block(g, B, 100 + r() * 1380, 8 + r() * 14, 14 + r() * 34, FAR, { step: r() < 0.25 ? 3 : 0 });
    // Back Bay brownstones along the water
    for (let x = 120; x < 620; x += 9) block(g, B, x, 9, 9 + ((x * 7) % 5), BRICK);
    // Prudential
    const pr = 330;
    rect(g, pr - 22, B - 10, 44, 10, MID.body);
    block(g, B, pr - 9, 18, 82, MID, { bands: true });
    rect(g, pr - 10, B - 86, 20, 4, MID.lit);
    rect(g, pr - 1, B - 104, 2, 18, MID.dark);
    // 200 Clarendon (the glass Hancock tower)
    const hc = 392;
    rect(g, hc - 7, B - 92, 14, 92, '#a6d0f1');
    for (let y = B - 92; y < B; y += 1) if ((y * 3) % 7 < 2) rect(g, hc - 7 + ((y * 5) % 9), y, 3, 1, '#d6ecfb');
    rect(g, hc + 6, B - 92, 1, 92, '#e2f2fd');
    rect(g, hc - 7, B - 92, 1, 92, '#8fbde4');
    rect(g, hc - 1, B - 92, 1, 92, '#93c1e7');
    // 111 Huntington with its crown
    block(g, B, 268, 14, 60, MID);
    for (let i = 0; i < 7; i++) rect(g, 270 + i, B - 60 - Math.round(Math.sin((i / 6) * Math.PI) * 6), 1, 1, MID.dark);
    // State House dome on Beacon Hill
    const sh = 660;
    rect(g, sh - 18, B - 16, 36, 16, '#d0b7ac');
    for (let xx = sh - 15; xx < sh + 16; xx += 4) rect(g, xx, B - 12, 2, 4, '#e5d8d0');
    for (let y = 0; y < 8; y++) {
      const w = Math.round(Math.sqrt(64 - y * y) * 2);
      rect(g, sh - w / 2, B - 16 - y, w, 1, y < 2 ? '#e8b941' : '#f3cc58');
    }
    rect(g, sh - 1, B - 28, 3, 4, '#e8e3dc');
    rect(g, sh, B - 31, 1, 3, '#f3cc58');
    // Longfellow Bridge (salt-and-pepper towers)
    rect(g, 560, B - 7, 230, 3, '#b7b0a8');
    for (let x = 566; x < 790; x += 22) rect(g, x, B - 4, 12, 4, '#9e978f');
    [600, 640, 710, 750].forEach((x) => {
      rect(g, x, B - 17, 5, 10, '#cfc8be');
      rect(g, x + 1, B - 19, 3, 2, '#b7b0a8');
    });
    // Downtown towers
    for (let i = 0; i < 18; i++) block(g, B, 800 + r() * 260, 10 + r() * 14, 40 + r() * 34, MID, { bands: r() < 0.5, step: r() < 0.3 ? 4 : 0 });
    block(g, B, 840, 16, 78, MID, { bands: true, antenna: 8 });
    block(g, B, 960, 18, 70, MID, { step: 5 });
    // Custom House Tower
    const cu = 905;
    rect(g, cu - 12, B - 14, 24, 14, '#cdc6bb');
    rect(g, cu - 5, B - 66, 10, 52, '#cfc8bd');
    rect(g, cu + 4, B - 66, 1, 52, '#e4dfd6');
    rect(g, cu - 3, B - 62, 6, 5, '#f2eee6');
    rect(g, cu - 1, B - 61, 2, 2, '#9e978f');
    for (let i = 0; i < 6; i++) rect(g, cu - 5 + i, B - 67 - i, 10 - i * 2, 1, '#a7c9c3');
    rect(g, cu, B - 76, 1, 4, '#9e978f');
    // Zakim Bridge
    const zk = [1170, 1300];
    rect(g, 1080, B - 12, 330, 2, '#b8c3d3');
    zk.forEach((zx) => {
      line(g, zx - 7, B, zx, B - 52, '#eef3f9');
      line(g, zx + 7, B, zx, B - 52, '#eef3f9');
      line(g, zx - 6, B, zx + 1, B - 52, '#d8e2ee');
      rect(g, zx, B - 72, 1, 20, '#eef3f9');
      rect(g, zx - 1, B - 70, 1, 16, '#d8e2ee');
      for (let i = 1; i <= 7; i++) {
        line(g, zx, B - 70 + i * 2, zx - i * 11, B - 12, 'rgba(240,246,252,0.85)');
        line(g, zx, B - 70 + i * 2, zx + i * 9, B - 12, 'rgba(240,246,252,0.85)');
      }
    });
    // Bunker Hill Monument
    rect(g, 1420, B - 38, 4, 38, '#d4cec6');
    rect(g, 1421, B - 41, 2, 3, '#d4cec6');
    return c;
  }

  /* ------------------------------------------------- riverbank (Cambridge) */
  function bankLayer(L) {
    const p = PARALLAX.bank;
    const W = Math.ceil(L.len * p + 760), B = BANK_H, c = cv(W, BANK_H), g = c.getContext('2d');
    const at = (wx) => Math.round(wx * p + REF_VIEW * 0.42 * (1 - p));
    const tree = sprite('tree', () => P.PROPS.tree());
    const BRICK = '#b5604a', BRICK_D = '#94493a', TRIM = '#f1ece4', SLATE = '#5d6c7e';

    // Weld Boathouse, first thing on the Cambridge side
    const wb = at(L.citySwitch + 30);
    rect(g, wb, B - 26, 70, 26, BRICK);
    for (let y = B - 24; y < B; y += 3) rect(g, wb, y, 70, 1, BRICK_D);
    for (let i = 0; i < 12; i++) {
      const y = B - 26 - i;
      rect(g, wb - 2 + i * 1.6, y, 74 - i * 3.2, 1, i ? SLATE : '#4a5868');
    }
    rect(g, wb + 30, B - 46, 10, 8, TRIM);
    rect(g, wb + 33, B - 50, 4, 4, '#7fa9b8');
    for (let i = 0; i < 4; i++) {
      rect(g, wb + 6 + i * 16, B - 14, 10, 14, '#3b2f34');
      rect(g, wb + 6 + i * 16, B - 15, 10, 1, TRIM);
    }
    // Harvard's river houses: brick with coloured cupolas
    const hh = at(L.harvard) + 40;
    rect(g, hh - 90, B - 32, 200, 32, BRICK);
    for (let y = B - 28; y < B - 2; y += 7)
      for (let x = hh - 86; x < hh + 106; x += 7) {
        rect(g, x, y, 3, 4, TRIM);
        rect(g, x + 1, y + 1, 1, 2, '#6f8fa8');
      }
    rect(g, hh - 92, B - 34, 204, 2, TRIM);
    const cupola = (x, w, h, col) => {
      rect(g, x - w / 2, B - 32 - h, w, h, BRICK);
      rect(g, x + w / 2 - 1, B - 32 - h, 1, h, '#cf7a62');
      for (let y = B - 32 - h + 4; y < B - 34; y += 6) rect(g, x - 1, y, 2, 3, TRIM);
      rect(g, x - w / 2 - 1, B - 32 - h - 2, w + 2, 2, TRIM);
      rect(g, x - w / 2 + 2, B - 32 - h - 10, w - 4, 8, TRIM);
      for (let i = 0; i < w / 2; i++) rect(g, x - w / 2 + 2 + i, B - 32 - h - 11 - i, w - 4 - i * 2, 1, col);
      rect(g, x, B - 32 - h - 13 - w / 2, 1, 4, '#e8b941');
    };
    cupola(hh - 46, 12, 34, '#c8473b');
    cupola(hh + 18, 14, 44, '#4f86cf');
    cupola(hh + 78, 10, 28, '#f6f6f2');
    // Sycamores along Memorial Drive
    const r = rng(5);
    for (let x = at(L.citySwitch + 260); x < W - 40; x += 120 + Math.round(r() * 70)) {
      if (Math.abs(x - hh) < 140) continue;
      g.drawImage(tree, x - 26, B - 66);
    }
    return c;
  }

  /* ------------------------------------------- near layer (the walkway) */
  function nearLayer(L) {
    const W = L.len, G = NEAR_TOP, c = cv(W, NEAR_TOP + NEAR_BOT), g = c.getContext('2d');
    const S = L.citySwitch;
    // Railings at the back of the walkway
    const railNY = sprite('railNY', () => P.PROPS.railNY());
    const railCam = sprite('railCam', () => P.PROPS.railCam());
    for (let x = 0; x < W; x += 16) g.drawImage(x < S ? railNY : railCam, x, G - 30);
    // Walkway: grey pavers in Brooklyn, red brick in Cambridge
    for (let y = G - 8; y < G + 6; y++) {
      const row = y - (G - 8), h = 3;
      const band = Math.floor(row / h), off = band % 2 ? 4 : 0;
      for (let x = 0; x < W; x++) {
        const ny = x < S;
        const bw = ny ? 9 : 6;
        const joint = row % h === 0 || (x + (ny ? off : band % 2 ? 3 : 0)) % bw === 0;
        let col;
        if (ny) col = joint ? '#9aa1ae' : (x * 13 + band * 7) % 11 === 0 ? '#c5c9d1' : '#b5bac4';
        else col = joint ? '#8e4232' : (x * 7 + band * 5) % 9 === 0 ? '#c97058' : '#b95d47';
        if (row === 0) col = ny ? '#7f8796' : '#6f3427';
        if (row === 1 && !joint) col = ny ? '#c9cdd5' : '#cf7760';
        rect(g, x, y, 1, 1, col);
      }
    }
    // Front curb
    rect(g, 0, G + 6, W, 1, '#f2f2ee');
    rect(g, 0, G + 7, W, 2, '#cbcfd6');
    rect(g, 0, G + 9, W, 1, '#9aa1ae');
    // Grass verge with flowers
    for (let y = G + 10; y < G + NEAR_BOT; y++) {
      const d = y - (G + 10);
      rect(g, 0, y, W, 1, d < 2 ? '#7fcb68' : d < 8 ? '#63b85a' : '#58ad52');
    }
    const r = rng(3), flowers = ['#f6a8c1', '#fff1a6', '#ffffff', '#f07a69'];
    for (let i = 0; i < W / 6; i++) {
      const x = Math.floor(r() * W), y = G + 11 + Math.floor(r() * 10);
      rect(g, x, y, 1, 2, '#3a8a46');
      if (r() < 0.45) rect(g, x, y - 1, 1, 1, flowers[Math.floor(r() * flowers.length)]);
    }
    // Props behind the walking line
    const art = {
      lampNY: sprite('lampNY', () => P.PROPS.lampNY()),
      lampCam: sprite('lampCam', () => P.PROPS.lampCam()),
      trash: sprite('trash', () => P.PROPS.trash())
    };
    L.decor.forEach((d) => {
      if (d.front) return;
      const s = art[d.k];
      g.drawImage(s, Math.round(d.x - s.width / 2), G - 3 - s.height);
    });
    // Chapter signposts
    L.signs.forEach((s) => {
      const sp = P.toCanvas(P.signpost(s.label));
      g.drawImage(sp, Math.round(s.x - sp.width / 2), G - 2 - sp.height);
    });
    // Highway sign on the way north, and a welcome sign in Cambridge
    const hw = P.toCanvas(P.highwaySign(['BOSTON 215 MI', 'I-95 NORTH >']));
    g.drawImage(hw, Math.round(L.highway - hw.width / 2), G - 4 - hw.height);
    const wc = P.toCanvas(P.highwaySign(['CAMBRIDGE']));
    g.drawImage(wc, Math.round(L.citySwitch + 160 - wc.width / 2), G - 4 - wc.height);
    // Landmark stops get a building instead of a pedestal
    const ped = sprite('pedestal', () => P.PROPS.pedestal());
    L.stops.forEach((s) => {
      if (s.landmark === 'school') {
        const sc = sprite('school', () => P.school());
        g.drawImage(sc, Math.round(s.x - 46 - sc.width / 2), G - 5 - sc.height);
      } else if (s.landmark === 'gate') {
        const gt = sprite('gate', () => P.gate());
        g.drawImage(gt, Math.round(s.x - gt.width / 2), G - 5 - gt.height);
      }
      g.drawImage(ped, Math.round(s.x - ped.width / 2), G - 2 - ped.height);
    });
    // End of the road
    const bar = P.toCanvas(P.barrier());
    g.drawImage(bar, L.end + 10, G - 3 - bar.height);
    return c;
  }

  // Props standing on the walking line (drawn behind the character, but at its depth)
  function frontProps(L) {
    const out = [];
    const art = {
      bench: sprite('bench', () => P.PROPS.bench()),
      planter: sprite('planter', () => P.PROPS.planter()),
      crate: sprite('crate', () => P.PROPS.crate())
    };
    L.decor.forEach((d) => {
      if (!d.front) return;
      const s = art[d.k];
      out.push({ img: s, x: Math.round(d.x - s.width / 2), y: -(d.y || 0) - s.height });
    });
    return out;
  }

  /* --------------------------------------------- foreground hedge layer */
  function foreLayer(L) {
    const p = PARALLAX.fore, W = Math.ceil(L.len * p + 760), H = 30, c = cv(W, H), g = c.getContext('2d');
    const r = rng(9);
    const pal = ['#2f7a3d', '#3a8a46', '#4d9f4c'];
    for (let x = -10; x < W; x += 34 + Math.floor(r() * 40)) {
      const w = 26 + r() * 30, h = 10 + r() * 14;
      const b = new P.Px(Math.ceil(w) + 2, Math.ceil(h) + 2);
      b.ellipse(w / 2 + 1, h + 1, w / 2, h, 'G');
      b.ellipse(w / 2 - w / 5, h * 0.95, w / 4, h * 0.65, 'G');
      b.rim();
      for (let i = 0; i < 6; i++) {
        const fx = Math.floor(r() * w), fy = Math.floor(r() * h * 0.7 + h * 0.3);
        if (b.get(fx, fy) !== '.') b.set(fx, fy, ['i', 'e', 'w'][i % 3]);
      }
      b.outline('3');
      g.drawImage(P.toCanvas(b), Math.round(x), H - b.h + 2);
    }
    for (let x = 0; x < W; x += 3) rect(g, x, H - 2 - Math.floor(r() * 3), 1, 3, pal[Math.floor(r() * 3)]);
    rect(g, 0, H - 2, W, 2, '#2f7a3d');
    return c;
  }

  /* ------------------------------------------------------------- export */
  // Shared, cached pieces (the mobile walk uses these without the rest)
  const once = (key, make) => cache[key] || (cache[key] = make());
  const skylines = () => once('skylines', () => ({ nyc: skylineNYC(), bos: skylineBOS() }));
  const sunArt = () => once('sun', sun);
  const cloudArt = () => once('clouds', () => clouds(17, 5, false));

  function build(content) {
    const L = layout(content);
    return {
      L,
      far: skylines(),
      bank: bankLayer(L),
      near: nearLayer(L),
      front: frontProps(L),
      fore: foreLayer(L),
      sun: sunArt(),
      cloudsFar: cloudArt(),
      cloudsNear: clouds(29, 4, true)
    };
  }

  HA.scenery = {
    build, sky, layout, sprite, rng, cv, skylines, sunArt, cloudArt,
    NEAR_TOP, NEAR_BOT, FAR_H, BANK_H, PARALLAX, REF_VIEW
  };
})();
