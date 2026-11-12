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
  const PARALLAX = { far: 0.12, bank: 0.6, fore: 1.22 };
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
  const GAP = 124; // between neighbouring stops: one step between their pop-up ranges
  const LEAD = 150; // from a section's sign to its first stop
  const TAIL = 180; // from a section's last stop to the next sign
  const TRAVEL = 380; // Saint Ann's in Brooklyn to Harvard in Cambridge, about a four-second walk

  // How each stretch of the walk looks
  const NYC_WATER = [[126, 178, 210], [70, 128, 172]];
  const ZONES = {
    brooklyn: { far: 'nyc', rail: 'ny', walk: 'pavers', lamp: 'lampNY', water: NYC_WATER, boats: 'harbor', sky: 'birds' },
    cambridge: { far: 'bos', rail: 'cam', walk: 'brick', lamp: 'lampCam', water: [[150, 206, 238], [84, 154, 210]], boats: 'charles', sky: 'birds' },
    tech: { far: 'tech', rail: 'tech', walk: 'tech', lamp: 'lampTech', water: [[118, 206, 222], [38, 116, 168]], boats: 'tech', sky: 'drones' },
    junk: { far: 'junk', rail: 'junk', walk: 'planks', lamp: 'lampJunk', water: [[146, 186, 176], [82, 132, 128]], boats: 'junk', sky: 'birds' },
    marble: { far: 'marble', rail: 'marble', walk: 'marble', lamp: 'lampMarble', water: [[136, 196, 238], [58, 108, 190]], boats: 'marble', sky: 'birds' },
    finish: { far: 'nyc', rail: 'ny', walk: 'pavers', lamp: 'lampNY', water: NYC_WATER, boats: 'harbor', sky: 'birds' }
  };

  function layout(content) {
    const L = { spawn: 170, stops: [], signs: [], decor: [], platforms: [], pigeons: [], chapters: [], zones: [] };
    const label = {};
    content.chapters.forEach((c) => (label[c.id] = c.label));
    L.chapters.push({ id: content.chapters[0].id, x: L.spawn, from: -Infinity });
    let x = L.spawn - 50;
    content.chapters.slice(1).forEach((ch, ci) => {
      const list = content.stops.filter((s) => s.chapter === ch.id);
      if (!list.length) return;
      const finish = ci === content.chapters.length - 2;
      x += ci === 0 ? 120 : TAIL;
      // the last section opens with a finish line, then its own signpost
      if (finish) L.signs.push({ x, chapter: ch.id, finish: true }, { x: x + 76, label: label[ch.id], chapter: ch.id });
      else L.signs.push({ x, label: label[ch.id], chapter: ch.id });
      const chapter = { id: ch.id, from: x - 40 };
      L.chapters.push(chapter);
      x += LEAD;
      list.forEach((s, i) => {
        if (i) x += s.landmark === 'gate' ? TRAVEL : GAP;
        L.stops.push(Object.assign({}, s, { x }));
      });
      chapter.x = L.stops.find((s) => s.chapter === ch.id).x;
    });
    L.len = x + 340;
    L.end = L.len - 16; // walkable right up to the edge, same as the left side
    L.byId = {};
    L.stops.forEach((s) => (L.byId[s.id] = s));

    const first = L.stops[0];
    const gate = L.stops.find((s) => s.landmark === 'gate') || first;
    L.harvard = gate.x;
    L.highway = first.x + 120;
    L.citySwitch = first.x + 200;
    L.welcome = first.x + 252;

    // Zones: where the look of the walk changes
    const sign = (id) => L.signs.find((s) => s.chapter === id);
    const z = [['brooklyn', -Infinity], ['cambridge', L.citySwitch]];
    [['experience', 'tech'], ['portfolio', 'junk'], ['interests', 'marble'], ['contact', 'finish']].forEach(([ch, id]) => {
      if (sign(ch)) z.push([id, sign(ch).x - 36]);
    });
    L.zones = z.map(([id, from], i) => ({ id, from, to: i + 1 < z.length ? z[i + 1][1] : Infinity, style: ZONES[id] }));
    L.zoneAt = (wx) => {
      let k = 0;
      L.zones.forEach((zz, i) => { if (wx >= zz.from) k = i; });
      return k;
    };
    // How much of each zone's backdrop shows at a point; boundaries fade over a stretch
    L.weights = (wx) => {
      const t = L.zones.map((zz, i) => (i === 0 ? 1 : smooth(zz.from - (i === 1 ? 170 : 110), zz.from + (i === 1 ? 150 : 110), wx)));
      return L.zones.map((zz, i) => t[i] * (i + 1 < t.length ? 1 - t[i + 1] : 1));
    };

    // Props only go where nothing else is standing
    const taken = [];
    const free = (a, b) => taken.every(([c, d]) => b < c || a > d);
    const place = (a, b) => free(a, b) && taken.push([a, b]) > 0;
    // A coin-operated viewer at the far left end, looking out at the skyline:
    // the same gap either side of it, to the edge of the world and to the first lamp
    L.telescope = 27;
    taken.push([L.telescope - 10, L.telescope + 10], [L.spawn - 36, L.spawn + 36],[L.highway - 40, L.highway + 40], [L.welcome - 30, L.welcome + 30], [L.end - 10, Infinity]);
    L.stops.forEach((s) => {
      const r = s.landmark === 'church' ? 44 : s.landmark === 'gate' ? 66 : 14;
      taken.push([s.x - r, s.x + r]);
    });
    L.signs.forEach((s) => taken.push([s.x - 38, s.x + 38]));

    // Something to hop on in every other gap between neighbouring stops
    const kinds = { brooklyn: ['bench'], cambridge: ['bench'], tech: ['crates', 'crate'], junk: ['crate', 'crates'], marble: ['planter', 'bench'], finish: ['bench'] };
    const span = { bench: [-15, 15], planter: [-17, 17], crate: [-9, 9], crates: [-16, 30] };
    let ki = 0;
    for (let i = 2; i < L.stops.length; i += 2) {
      const a = L.stops[i - 1], b = L.stops[i];
      if (b.x - a.x > 420 || b.chapter !== a.chapter) continue;
      const mx = Math.round((a.x + b.x) / 2);
      const list = kinds[L.zones[L.zoneAt(mx)].id];
      const kind = list[ki % list.length];
      if (place(mx + span[kind][0], mx + span[kind][1])) {
        addPlatform(L, kind, mx);
        ki++;
      }
    }
    if (place(L.spawn + 47, L.spawn + 77)) addPlatform(L, 'bench', L.spawn + 62);
    if (place(L.spawn - 78, L.spawn - 62)) L.decor.push({ k: 'trash', x: L.spawn - 70 });
    // Street lamps fill what's left, styled for their zone
    for (let lx = 60; lx < L.end - 30; lx += 150)
      for (const dx of [0, 24, -24, 48, -48])
        if (place(lx + dx - 9, lx + dx + 9)) {
          L.decor.push({ k: L.zones[L.zoneAt(lx + dx)].style.lamp, x: lx + dx });
          break;
        }
    // Pigeons that scatter when you walk past
    const fin = sign('contact');
    [L.spawn + 115, first.x + 120, fin ? fin.x + 90 : L.end - 120].forEach((px, i) => L.pigeons.push({ x: px, n: 2 + (i % 2) }));
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
  // A strip of land along the water's edge: promenade (with a few trees) on top
  // of a stone seawall, so the buildings stand on the shore instead of in the river
  function shoreline(g, B, x0, x1, o) {
    const r = rng(o.seed || 5), w = x1 - x0;
    rect(g, x0, B - 5, w, 2, o.land);
    rect(g, x0, B - 5, w, 1, o.top || '#bccbc6');
    rect(g, x0, B - 3, w, 2, o.wall || '#97a1b2');
    rect(g, x0, B - 1, w, 1, o.waterline || '#7f8aa0');
    for (let x = x0 + 2; x < x1 - 3; x += 5 + Math.floor(r() * (o.dense ? 4 : 9))) {
      if (r() < 0.3 && !o.dense) continue;
      rect(g, x + 1, B - 7, 1, 2, '#8f8a86');
      rect(g, x, B - 9, 3, 2, o.tree);
      rect(g, x + 1, B - 10, 1, 1, o.tree);
    }
  }
  // A pier jutting into the river: a long shed on a deck held up by pilings
  function pier(g, B, x, w) {
    rect(g, x, B - 3, w, 1, '#8a93a3');
    for (let px = x + 1; px < x + w; px += 3) rect(g, px, B - 2, 1, 2, '#6f7a8c');
    rect(g, x + 2, B - 9, w - 4, 6, '#bcc6d2');
    rect(g, x + 1, B - 10, w - 2, 1, '#d5dde6');
    rect(g, x + w - 3, B - 9, 1, 6, '#d5dde6');
    for (let dx = x + 4; dx < x + w - 4; dx += 4) rect(g, dx, B - 7, 2, 3, '#9aa6b6');
  }
  // Wooden NYC rooftop water tank
  function tank(g, x, top, k) {
    rect(g, x, top - 2, 1, 2, k.dark);
    rect(g, x + 3, top - 2, 1, 2, k.dark);
    rect(g, x, top - 6, 4, 4, k.wood || k.dark);
    rect(g, x + 1, top - 8, 2, 2, k.wood || k.dark);
  }

  // arm: Lady Liberty's torch arm (left off for the binocular view, which animates it)
  function skylineNYC(arm = true) {
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
    if (arm) {
      rect(g, sl + 2, B - 38, 1, 9, GREEN);
      rect(g, sl + 1, B - 40, 3, 2, '#ffd65a');
    }
    rect(g, sl - 3, B - 25, 1, 3, GREEN);
    // Up the East River, hazy and far off, seen between the two shores
    const far = rng(12);
    for (let x = 392; x < 676; x += 4 + Math.floor(far() * 6)) rect(g, x, B - 4 - Math.floor(far() * 9), 3 + Math.floor(far() * 5), 14, '#c5d7ec');
    rect(g, 392, B - 3, 284, 3, '#b9cbe0');
    // Brooklyn Bridge: two granite towers in the river, gothic arches, cables
    const bb = 398, bk = 658, T = '#cdc6bb', TD = '#b6aea1', CAB = '#8e9db4';
    const DECK0 = 244, DECK1 = 722; // both ends tuck behind a building
    rect(g, DECK0, B - 22, DECK1 - DECK0, 2, '#8a97ad');
    rect(g, DECK0, B - 20, DECK1 - DECK0, 1, '#b3bfd0');
    // main cable, plus a side span off each tower down to its anchorage
    const cable = (x0, x1, f) => {
      let px = x0, py = f(0), last = Math.round(x0);
      for (let i = 1; i <= 120; i++) {
        const t = i / 120, x = x0 + (x1 - x0) * t, y = f(t), col = Math.round(x);
        line(g, px, py, x, y, CAB);
        // a hanger every third column, however long the span
        if (col !== last && col % 3 === 0 && y < B - 23) rect(g, col, y, 1, B - 22 - y, 'rgba(226,234,244,0.8)');
        last = col;
        px = x; py = y;
      }
    };
    cable(bb, bk, (t) => B - 60 + 36 * Math.sin(t * Math.PI));
    cable(bb, DECK0, (t) => B - 60 + 38 * Math.sin((t * Math.PI) / 2));
    cable(bk, DECK1, (t) => B - 60 + 38 * Math.sin((t * Math.PI) / 2));
    for (let i = 1; i <= 5; i++) {
      line(g, bb, B - 58, bb - i * 16, B - 22, CAB);
      line(g, bb, B - 58, bb + i * 16, B - 22, CAB);
      line(g, bk, B - 58, bk - i * 16, B - 22, CAB);
      if (i <= 3) line(g, bk, B - 58, bk + i * 16, B - 22, CAB);
    }
    [bb, bk].forEach((tx) => {
      rect(g, tx - 8, B - 62, 16, 62, T);
      rect(g, tx - 9, B - 64, 18, 2, TD);
      rect(g, tx + 7, B - 62, 1, 62, '#e0dbd2');
      for (const ax of [tx - 5, tx + 2]) {
        rect(g, ax, B - 46, 3, 22, '#cfe6f6');
        rect(g, ax + 1, B - 48, 1, 2, '#cfe6f6');
      }
      rect(g, tx - 8, B - 22, 16, 2, '#8a97ad');
      rect(g, tx - 10, B - 3, 20, 3, TD); // footing in the water
    });
    // Brooklyn (DUMBO and the Heights) across the water
    for (let i = 0; i < 24; i++) block(g, B, 682 + r() * 308, 8 + r() * 14, 10 + r() * 26, MID, { tank: r() < 0.5 });
    // where the bridge comes ashore, it disappears between buildings
    block(g, B, 232, 18, 36, MID, { tank: true });
    block(g, B, 712, 18, 32, MID, { tank: true });
    // The waterfront: a seawall and promenade along each shore, with piers out into the river
    shoreline(g, B, 46, 388, { land: '#a7b6b4', tree: '#93b4a0', seed: 31 });
    shoreline(g, B, 676, W, { land: '#a7b6b4', tree: '#93b4a0', seed: 37 });
    [[64, 22], [124, 16], [296, 26], [744, 20], [866, 24]].forEach(([x, w]) => pier(g, B, x, w));
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
    // the Zakim's deck runs in between buildings at both ends
    block(g, B, 1064, 20, 30, MID, { bands: true });
    block(g, B, 1404, 14, 22, BRICK);
    // The riverbank: the tree-lined Esplanade along Back Bay, then a seawall downtown
    shoreline(g, B, 90, 640, { land: '#9fbf9a', top: '#b7d2ae', tree: '#86b08c', dense: true, seed: 41 });
    shoreline(g, B, 640, 1490, { land: '#a9b6b3', tree: '#93b4a0', seed: 43 });
    pier(g, B, 470, 18); // the boathouse dock
    pier(g, B, 1000, 22);
    // Longfellow Bridge (salt-and-pepper towers), standing out in the river
    rect(g, 560, B - 7, 230, 3, '#b7b0a8');
    for (let x = 566; x < 790; x += 22) rect(g, x, B - 4, 12, 4, '#9e978f');
    [600, 640, 710, 750].forEach((x) => {
      rect(g, x, B - 17, 5, 10, '#cfc8be');
      rect(g, x + 1, B - 19, 3, 2, '#b7b0a8');
    });
    return c;
  }

  /* -------------------------------------------- riverbank (mid distance) */
  function bankLayer(L) {
    const p = PARALLAX.bank;
    const W = Math.ceil(L.len * p + 760), B = BANK_H, c = cv(W, BANK_H), g = c.getContext('2d');
    const at = (wx) => Math.round(wx * p + REF_VIEW * 0.42 * (1 - p));
    const zone = (id) => L.zones.find((z) => z.id === id);
    const tree = sprite('tree', () => P.PROPS.tree());
    const cypress = sprite('cypress', () => P.PROPS.cypress());
    const BRICK = '#b5604a', BRICK_D = '#94493a', TRIM = '#f1ece4', SLATE = '#5d6c7e';

    // Cambridge: Weld Boathouse, Harvard's river houses, sycamores
    const wb = at(L.citySwitch - 10);
    rect(g, wb, B - 26, 70, 26, BRICK);
    for (let y = B - 24; y < B; y += 3) rect(g, wb, y, 70, 1, BRICK_D);
    for (let i = 0; i < 12; i++) rect(g, wb - 2 + i * 1.6, B - 26 - i, 74 - i * 3.2, 1, i ? SLATE : '#4a5868');
    rect(g, wb + 30, B - 46, 10, 8, TRIM);
    rect(g, wb + 33, B - 50, 4, 4, '#7fa9b8');
    for (let i = 0; i < 4; i++) {
      rect(g, wb + 6 + i * 16, B - 14, 10, 14, '#3b2f34');
      rect(g, wb + 6 + i * 16, B - 15, 10, 1, TRIM);
    }
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
    g.drawImage(tree, hh - 150, B - 66);

    // Experience: futuristic kit on the far bank
    const tz = zone('tech');
    if (tz) {
      const x0 = at(tz.from), x1 = at(Math.min(tz.to, L.len));
      for (let x = x0 + 150, i = 0; x < x1 - 20; x += 230, i++) {
        if (i % 3 === 0) turbine(g, x, B);
        else if (i % 3 === 1) dish(g, x, B);
        else lab(g, x - 30, B);
      }
    }
    // Portfolio: a workshop shack, scaffolding and a water tower
    const jz = zone('junk');
    if (jz) {
      const x0 = at(jz.from), x1 = at(Math.min(jz.to, L.len));
      for (let x = x0 + 70, i = 0; x < x1 - 20; x += 200, i++) {
        if (i % 3 === 0) shack(g, x - 25, B, i);
        else if (i % 3 === 1) scaffold(g, x, B);
        else woodTank(g, x, B);
      }
    }
    // Interests: a marble colonnade, statues and cypresses
    const mz = zone('marble');
    if (mz) {
      const x0 = at(mz.from), x1 = at(Math.min(mz.to, L.len));
      for (let x = x0 + 70, i = 0; x < x1 - 60; x += 230, i++) {
        if (i % 2 === 0) colonnade(g, x - 45, B);
        else statue(g, x, B);
        g.drawImage(cypress, x + 50, B - cypress.height);
        g.drawImage(cypress, x + 62, B - cypress.height + 6);
      }
    }
    return c;
  }

  function turbine(g, x, B) {
    rect(g, x - 1, B - 92, 3, 92, '#eef2f6');
    rect(g, x - 1, B - 92, 1, 92, '#cdd6e0');
    rect(g, x - 4, B - 97, 9, 5, '#eef2f6');
    [-90, 30, 150].forEach((deg) => {
      const a = (deg * Math.PI) / 180;
      for (let r = 2; r < 30; r++) rect(g, x + Math.cos(a) * r, B - 95 + Math.sin(a) * r, r < 20 ? 2 : 1, 2, '#f6f8fb');
    });
    rect(g, x - 1, B - 96, 3, 3, '#cdd6e0');
  }
  function dish(g, x, B) {
    rect(g, x - 3, B - 18, 6, 18, '#d5dce6');
    rect(g, x - 8, B - 3, 16, 3, '#c3ccd8');
    for (let y = -10; y <= 10; y++)
      for (let xx = -16; xx <= 16; xx++) {
        const u = (xx * 0.87 + y * 0.5) / 16, v = (-xx * 0.5 + y * 0.87) / 6;
        if (u * u + v * v <= 1) rect(g, x + xx, B - 34 + y, 1, 1, v < -0.3 ? '#ffffff' : '#e3e9f0');
      }
    line(g, x + 2, B - 34, x - 8, B - 50, '#9aa6b6');
    rect(g, x - 10, B - 52, 3, 3, '#7ff3ff');
  }
  function lab(g, x, B) {
    rect(g, x, B - 40, 70, 40, '#bcd9ee');
    for (let xx = x + 5; xx < x + 70; xx += 6) rect(g, xx, B - 40, 1, 40, '#9cc0dc');
    for (let y = B - 34; y < B; y += 7) rect(g, x, y, 70, 1, '#9cc0dc');
    rect(g, x - 2, B - 42, 74, 2, '#e7edf3');
    for (let y = 0; y < 14; y++) {
      const w = Math.round(Math.sqrt(196 - y * y) * 2);
      rect(g, x + 50 - w / 2, B - 43 - y, w, 1, y % 5 === 4 ? '#cfd8e2' : '#eef2f6');
    }
    rect(g, x + 49, B - 56, 2, 12, '#9cc0dc');
  }
  function shack(g, x, B, i) {
    const woods = ['#a86d42', '#b6784a', '#9c6a3e', '#c4875a'];
    for (let xx = 0; xx < 50; xx += 5) rect(g, x + xx, B - 34 + (xx % 3), 5, 34, woods[(xx / 5 + i) % 4]);
    for (let xx = 0; xx < 50; xx += 5) rect(g, x + xx, B - 34, 1, 34, '#7d5131');
    for (let k = 0; k < 10; k++) rect(g, x - 4 + k * 0.4, B - 36 - k, 60 - k * 1.5, 1, k % 2 ? '#a3abb5' : '#8d96a1');
    rect(g, x + 8, B - 20, 10, 20, '#5a3a22');
    rect(g, x + 28, B - 26, 12, 8, '#bfe6fb');
    rect(g, x + 33, B - 26, 1, 8, '#7d5131');
    rect(g, x + 42, B - 52, 3, 10, '#8d96a1');
  }
  function scaffold(g, x, B) {
    const c = '#c99c5e';
    [-16, 16].forEach((dx) => rect(g, x + dx, B - 70, 2, 70, c));
    for (let y = B - 70; y < B; y += 14) {
      rect(g, x - 18, y, 38, 2, '#b07f48');
      line(g, x - 16, y + 2, x + 16, y + 13, c);
    }
    rect(g, x - 6, B - 78, 12, 8, '#d8443a');
  }
  function woodTank(g, x, B) {
    [-8, 8].forEach((dx) => line(g, x + dx, B, x + dx * 0.6, B - 30, '#7d5131'));
    rect(g, x - 11, B - 52, 22, 22, '#a86d42');
    for (let y = B - 50; y < B - 30; y += 5) rect(g, x - 11, y, 22, 1, '#3b3036');
    for (let i = 0; i < 8; i++) rect(g, x - 11 + i * 1.4, B - 53 - i, 22 - i * 2.8, 1, '#7d5131');
  }
  function colonnade(g, x, B) {
    rect(g, x, B - 6, 92, 6, '#e3e1ea');
    for (let i = 0; i < 6; i++) {
      rect(g, x + 5 + i * 16, B - 58, 9, 52, '#f4f3f8');
      rect(g, x + 5 + i * 16, B - 58, 2, 52, '#d8d5e2');
    }
    rect(g, x - 2, B - 66, 96, 8, '#eceaf1');
    rect(g, x - 2, B - 60, 96, 2, '#d8d5e2');
    for (let k = 0; k < 16; k++) rect(g, x - 2 + k * 3, B - 67 - k, 96 - k * 6, 1, '#f4f3f8');
  }
  function statue(g, x, B) {
    rect(g, x - 11, B - 24, 22, 24, '#e9e7ef');
    rect(g, x - 13, B - 26, 26, 3, '#f4f3f8');
    rect(g, x - 4, B - 50, 8, 24, '#f4f3f8');
    rect(g, x - 3, B - 58, 6, 7, '#f4f3f8');
    rect(g, x + 5, B - 64, 2, 38, '#e3e1ea');
    for (let y = 0; y < 14; y++) rect(g, x + 3, B - 40 + y, 7, 1, '#e3e1ea');
    rect(g, x - 7, B - 46, 3, 14, '#f4f3f8');
  }

  /* ------------------------------------------- near layer (the walkway) */
  const WOODS = ['#b6784a', '#a86d42', '#c4875a', '#9c6a3e', '#bb8556'];
  const CURB = {
    pavers: ['#f2f2ee', '#cbcfd6', '#cbcfd6', '#9aa1ae'],
    brick: ['#f2f2ee', '#cbcfd6', '#cbcfd6', '#9aa1ae'],
    tech: ['#6b7790', '#2e3545', '#7ff3ff', '#1f2430'],
    planks: ['#d8a46b', '#8a5a33', '#8a5a33', '#4a3020'],
    marble: ['#ffffff', '#e6e4ec', '#d6d3df', '#bdb9ca']
  };
  const RGB = {};
  const rgb = (h) => RGB[h] || (RGB[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

  // The walking surface and its front curb, material by material
  function walkway(L, g, W, G) {
    const rows = 18, top = G - 8;
    const img = g.createImageData(W, rows), d = img.data;
    const r = rng(77);
    const plank = new Int32Array(W), start = [], seam = new Uint8Array(W);
    for (let x = 0, id = 0; x < W; id++) {
      const w = 5 + Math.floor(r() * 4);
      start[id] = x;
      for (let i = 0; i < w && x < W; i++, x++) plank[x] = id;
      seam[x - 1] = r() < 0.15 ? 2 : 1;
    }
    const vein = new Set();
    for (let i = 0; i < W / 8; i++) {
      let x = Math.floor(r() * W), y = 2 + Math.floor(r() * 12);
      const len = 4 + Math.floor(r() * 9), dir = r() < 0.5 ? 1 : -1;
      for (let k = 0; k < len && y > 1 && y < 14; k++) {
        vein.add(x * 32 + y);
        x++;
        if (r() < 0.45) y += dir;
      }
    }
    for (let row = 0; row < rows; row++)
      for (let x = 0; x < W; x++) {
        const mat = L.zones[L.zoneAt(x + ((row * 5) % 7) - 3)].style.walk;
        let c;
        if (row >= 14) {
          c = CURB[mat][row - 14];
          if (mat === 'planks' && row === 15 && x % 9 === 4) c = '#2a2a33';
        } else if (mat === 'pavers' || mat === 'brick') {
          const ny = mat === 'pavers', band = Math.floor(row / 3);
          const joint = row % 3 === 0 || (x + (band % 2 ? (ny ? 4 : 3) : 0)) % (ny ? 9 : 6) === 0;
          if (ny) c = joint ? '#9aa1ae' : (x * 13 + band * 7) % 11 === 0 ? '#c5c9d1' : '#b5bac4';
          else c = joint ? '#8e4232' : (x * 7 + band * 5) % 9 === 0 ? '#c97058' : '#b95d47';
          if (row === 0) c = ny ? '#7f8796' : '#6f3427';
          else if (row === 1 && !joint) c = ny ? '#c9cdd5' : '#cf7760';
        } else if (mat === 'tech') {
          const sx = x % 24 === 0;
          c = (x + row * 2) % 48 < 3 ? '#454f64' : '#3d4658';
          if (row === 7) c = '#2b3242';
          if (sx) c = '#5fe8f5';
          if ((x % 24 === 5 || x % 24 === 19) && (row === 3 || row === 11)) c = '#8a95ab';
          if (row === 0) c = '#232937';
          else if (row === 1 && !sx) c = '#58627b';
        } else if (mat === 'planks') {
          const id = plank[x], up = id % 9 === 4;
          c = WOODS[(id * 7 + (id >> 2)) % WOODS.length];
          if ((x * 3 + row * 7 + id) % 13 === 0) c = '#94603a';
          if (up && row === 2) c = '#d9a06b';
          if (up && row === 13) c = '#5a3a22';
          if ((row === 3 || row === 11) && x - start[id] === 2) c = '#2a2a33';
          if (seam[x]) c = seam[x] === 2 ? '#24170f' : '#5a3a22';
          if (row === 0) c = '#3b2717';
          else if (row === 1 && !seam[x]) c = '#cf9a68';
        } else {
          const edge = x % 22 === 0;
          c = Math.floor(x / 22) % 3 === 1 ? '#e9e7ef' : '#efeef4';
          if (edge || row === 7) c = '#cfccd8';
          if (vein.has(x * 32 + row)) c = '#c6c1d4';
          if (row === 0) c = '#bdb8ca';
          else if (row === 1 && !edge) c = '#ffffff';
        }
        const v = rgb(c), i = (row * W + x) * 4;
        d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255;
      }
    g.putImageData(img, 0, top);
  }

  // Fences along the back of the walkway
  const RAIL = {
    ny(g, x0, x1, G) {
      const t = sprite('railNY', () => P.PROPS.railNY());
      for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) g.drawImage(t, x, G - 30);
    },
    cam(g, x0, x1, G) {
      const t = sprite('railCam', () => P.PROPS.railCam());
      for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) g.drawImage(t, x, G - 30);
    },
    tech(g, x0, x1, G) {
      const top = G - 30;
      g.fillStyle = 'rgba(196,236,255,0.34)';
      g.fillRect(x0, top + 3, x1 - x0, 16);
      for (let x = Math.ceil(x0 / 32) * 32; x < x1; x += 32)
        for (let i = 0; i < 9; i++) {
          rect(g, x + 9 + i, top + 15 - i, 1, 1, 'rgba(255,255,255,0.6)');
          rect(g, x + 14 + i, top + 17 - i, 1, 1, 'rgba(255,255,255,0.35)');
        }
      rect(g, x0, top, x1 - x0, 2, '#d7dee8');
      rect(g, x0, top + 2, x1 - x0, 1, '#7ff3ff');
      rect(g, x0, top + 19, x1 - x0, 2, '#8d98ab');
      rect(g, x0, top + 21, x1 - x0, 1, '#59637a');
      for (let x = Math.ceil(x0 / 32) * 32; x < x1; x += 32) {
        rect(g, x, top - 2, 2, 24, '#eef2f7');
        rect(g, x + 2, top - 2, 1, 24, '#aab4c3');
        rect(g, x - 1, top - 3, 4, 1, '#c9d1dc');
        rect(g, x, top + 8, 2, 2, '#7ff3ff');
      }
    },
    junk(g, x0, x1, G) {
      const r = rng(Math.floor(x0) + 5), top = G - 30;
      for (let x = x0; x < x1; ) {
        const w = 3 + Math.floor(r() * 4);
        if (r() < 0.1) { x += w; continue; }
        const h = 13 + Math.floor(r() * 9), cut = r();
        const col = WOODS[Math.floor(r() * WOODS.length)];
        for (let k = 0; k < h; k++) {
          const y = G - 8 - h + k;
          let a = x, b = x + w - 1;
          if (cut < 0.3 && k < w) a = x + (w - 1 - k);
          else if (cut < 0.5 && k < 2) { a = x + 1; b = x + w - 2; }
          if (b > a) rect(g, a, y, b - a, 1, col);
          rect(g, Math.max(a, b - 1), y, 1, 1, '#d9a06b');
        }
        rect(g, x, G - 8 - h + 3, 1, h - 3, '#7d5131');
        x += w;
      }
      [top + 6, top + 15].forEach((y0, j) => {
        for (let x = x0 - 10; x < x1; ) {
          const len = 28 + Math.floor(r() * 26), tilt = Math.floor(r() * 3) - 1;
          for (let i = 0; i < len && x + i < x1; i++) {
            const y = y0 + Math.round((tilt * i) / len);
            rect(g, x + i, y, 1, 3, j ? '#9c6a3e' : '#a86d42');
            rect(g, x + i, y, 1, 1, '#c4875a');
            if (i % 9 === 3) rect(g, x + i, y + 1, 1, 1, '#2a2a33');
          }
          x += len + Math.floor(r() * 6);
        }
      });
      for (let x = x0 + 40; x < x1; x += 160) {
        for (let i = 0; i < 14; i++) rect(g, x + i, top + 12 - Math.round(i * 0.5), 1, 3, '#bb8556');
        rect(g, x + 2, top + 12, 1, 1, '#2a2a33');
        rect(g, x + 11, top + 7, 1, 1, '#2a2a33');
      }
    },
    marble(g, x0, x1, G) {
      const top = G - 30;
      rect(g, x0, top, x1 - x0, 1, '#ffffff');
      rect(g, x0, top + 1, x1 - x0, 2, '#eeedf3');
      rect(g, x0, top + 3, x1 - x0, 1, '#cfccd8');
      rect(g, x0, top + 18, x1 - x0, 1, '#ffffff');
      rect(g, x0, top + 19, x1 - x0, 2, '#e6e4ec');
      rect(g, x0, top + 21, x1 - x0, 1, '#bdb9ca');
      const vase = [2, 3, 2, 2, 3, 4, 5, 5, 5, 4, 3, 2, 2, 3];
      for (let x = Math.ceil((x0 - 3) / 7) * 7 + 3; x < x1; x += 7) {
        if ((x - 3) % 49 === 0) continue;
        vase.forEach((w, i) => {
          rect(g, x - Math.floor(w / 2), top + 4 + i, w, 1, '#efeef4');
          rect(g, x - Math.floor(w / 2), top + 4 + i, 1, 1, '#d4d1dd');
        });
      }
      for (let x = Math.ceil((x0 - 3) / 49) * 49 + 3; x < x1; x += 49) {
        rect(g, x - 3, top - 2, 7, 24, '#f2f1f6');
        rect(g, x - 3, top - 2, 1, 24, '#d4d1dd');
        rect(g, x - 4, top - 3, 9, 2, '#ffffff');
        rect(g, x - 2, top - 6, 5, 3, '#efeef4');
        rect(g, x - 1, top - 8, 3, 2, '#efeef4');
      }
    }
  };

  function nearLayer(L) {
    const W = L.len, G = NEAR_TOP, c = cv(W, NEAR_TOP + NEAR_BOT), g = c.getContext('2d');
    // Fences, one style per zone
    L.zones.forEach((z) => {
      const x0 = Math.max(0, Math.floor(z.from)), x1 = Math.min(W, Math.ceil(z.to));
      if (x1 <= x0) return;
      g.save();
      g.beginPath();
      g.rect(x0, 0, x1 - x0, G);
      g.clip();
      RAIL[z.style.rail](g, x0, x1, G);
      g.restore();
    });
    walkway(L, g, W, G);
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
    // Lamps and bins behind the walking line
    L.decor.forEach((d) => {
      if (d.front) return;
      const s = sprite(d.k, () => P.PROPS[d.k]());
      g.drawImage(s, Math.round(d.x - s.width / 2), G - 3 - s.height);
    });
    // Section signs: wooden posts, and a finish line at the end
    L.signs.forEach((s) => {
      const sp = P.toCanvas(s.finish ? P.finishSign() : P.signpost(s.label));
      g.drawImage(sp, Math.round(s.x - sp.width / 2), G - 2 - sp.height);
    });
    // Road signs for the trip north
    const hw = P.toCanvas(P.highwaySign(['BOSTON 215 MI', 'I-95 NORTH >']));
    g.drawImage(hw, Math.round(L.highway - hw.width / 2), G - 4 - hw.height);
    const wc = P.toCanvas(P.highwaySign(['CAMBRIDGE']));
    g.drawImage(wc, Math.round(L.welcome - wc.width / 2), G - 4 - wc.height);
    // Landmarks, then a pedestal at every stop
    const ped = sprite('pedestal', () => P.PROPS.pedestal());
    L.stops.forEach((s) => {
      if (s.landmark === 'church') {
        const ch = sprite('church', () => P.church());
        g.drawImage(ch, Math.round(s.x - ch.width / 2), G - 5 - ch.height);
      } else if (s.landmark === 'gate') {
        const gt = sprite('gate', () => P.gate());
        g.drawImage(gt, Math.round(s.x - gt.width / 2), G - 5 - gt.height);
      }
      g.drawImage(ped, Math.round(s.x - ped.width / 2), G - 2 - ped.height);
    });
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
  const scopeSkyline = () => once('nycScope', () => skylineNYC(false));
  const sunArt = () => once('sun', sun);
  const cloudArt = () => once('clouds', () => clouds(17, 5, false));

  // The far backdrop for each zone: an image plus where its left edge sits
  // in far-layer coordinates (world x * PARALLAX.far)
  function backdrops(L) {
    const p = PARALLAX.far, sk = skylines(), made = {};
    return L.zones.map((z) => {
      const kind = z.style.far;
      if (kind === 'nyc') return { img: sk.nyc, origin: z.from === -Infinity ? 0 : Math.round(z.from * p - 30) };
      if (kind === 'bos') return { img: sk.bos, origin: 0 };
      const origin = Math.round(z.from * p - 110);
      const width = Math.round((Math.min(z.to, L.len) - z.from) * p + 900);
      if (!made[kind]) made[kind] = HA.backdrops[kind](width);
      return { img: made[kind], origin };
    });
  }

  function build(content) {
    const L = layout(content);
    return {
      L,
      far: backdrops(L),
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
    build, sky, layout, backdrops, sprite, rng, cv, skylines, scopeSkyline, sunArt, cloudArt, ZONES,
    NEAR_TOP, NEAR_BOT, FAR_H, BANK_H, PARALLAX, REF_VIEW
  };
})();
