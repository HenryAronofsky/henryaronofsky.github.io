/* Pixel art for the site.
   Everything here is drawn into "letter grids" first: one character is one
   palette colour and "." is transparent. Shapes are drawn with a tiny kit
   (rects, ellipses, lines, polygons), shaded and outlined automatically, and
   only turned into canvases when the page needs them. The character is posed
   in code (legs and arms are drawn from joint positions), so every animation
   frame stays consistent. */
(function () {
  'use strict';
  const HA = (window.HA = window.HA || {});

  /* ------------------------------------------------------------ palette */
  const PAL = {
    o: '#2a2035',
    w: '#ffffff', W: '#e8edf4', x: '#c3cad6', X: '#98a1b1', z: '#6a7284', Z: '#474c5d', k: '#1d1a28',
    C: '#fff4d6', s: '#f8d3b7', S: '#e6ab8b', Q: '#c2705f',
    j: '#a46c43', h: '#7b4a2b', H: '#53301b',
    u: '#bfe6fb', U: '#6db7ea', c: '#86b6ee', b: '#4f8ad1', B: '#386bb0', d: '#284f8c',
    v: '#3a4d94', V: '#232e5e',
    1: '#f07a69', r: '#d8443a', R: '#a32d2e',
    e: '#fff1a6', y: '#f8d34a', Y: '#d8a62b', a: '#f28c38', A: '#c25f22',
    2: '#a6e38f', g: '#63b85a', G: '#3a8a46', 3: '#285e36',
    4: '#93e6dc', t: '#3fbfb2', T: '#278a86',
    i: '#f6a8c1', I: '#d9708f', p: '#a57ad8', P: '#7350a6',
    f: '#ecc993', F: '#c99c5e', m: '#b6784a', M: '#7d5131',
    n: '#8e94a0', N: '#6e7480', q: '#4f5460',
    5: '#8b5a47', 6: '#6a3f32', 7: '#a9765f', 8: '#3b4458', 9: '#7ff3ff'
  };

  // Lighter / darker neighbour of each colour, for automatic rim shading
  // (light comes from the sun at the top right of the scene).
  const RIM = {
    w: ['w', 'W'], W: ['w', 'x'], x: ['W', 'X'], X: ['x', 'z'], z: ['X', 'Z'], Z: ['z', 'k'], k: ['Z', 'k'],
    C: ['w', 'f'], s: ['C', 'S'], S: ['s', 'Q'],
    j: ['f', 'h'], h: ['j', 'H'], H: ['h', 'k'],
    u: ['w', 'U'], U: ['u', 'b'], c: ['u', 'b'], b: ['c', 'B'], B: ['b', 'd'], d: ['B', 'V'],
    v: ['b', 'V'], V: ['v', 'k'],
    1: ['i', 'r'], r: ['1', 'R'], R: ['r', 'H'],
    e: ['w', 'y'], y: ['e', 'Y'], Y: ['y', 'A'], a: ['y', 'A'], A: ['a', 'R'],
    2: ['w', 'g'], g: ['2', 'G'], G: ['g', '3'], 3: ['G', 'k'],
    4: ['w', 't'], t: ['4', 'T'], T: ['t', 'V'],
    i: ['C', 'I'], I: ['i', 'P'], p: ['i', 'P'], P: ['p', 'V'],
    f: ['C', 'F'], F: ['f', 'M'], m: ['f', 'M'], M: ['m', 'H'],
    n: ['x', 'N'], N: ['n', 'q'], q: ['N', 'k'],
    5: ['7', '6'], 6: ['5', 'H'], 7: ['f', '5'], 8: ['z', 'k'], 9: ['w', 't']
  };

  /* --------------------------------------------------------- pixel grid */
  class Px {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.d = new Array(w * h).fill('.');
    }
    static from(rows) {
      const g = new Px(Math.max(...rows.map((r) => r.length)), rows.length);
      rows.forEach((r, y) => {
        for (let x = 0; x < r.length; x++) g.d[y * g.w + x] = r[x];
      });
      return g;
    }
    clone() {
      const g = new Px(this.w, this.h);
      g.d = this.d.slice();
      return g;
    }
    get(x, y) {
      return x < 0 || y < 0 || x >= this.w || y >= this.h ? '.' : this.d[y * this.w + x];
    }
    set(x, y, c) {
      x = Math.floor(x);
      y = Math.floor(y);
      if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
      return this;
    }
    rect(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
      return this;
    }
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.set(x, y, c);
        }
      return this;
    }
    line(x0, y0, x1, y1, c, t = 1) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      const o = Math.floor((t - 1) / 2);
      let err = dx + dy, x = x0, y = y0;
      for (;;) {
        this.rect(x - o, y - o, t, t, c);
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
      }
      return this;
    }
    poly(pts, c) {
      let minY = Infinity, maxY = -Infinity;
      pts.forEach((p) => { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
      for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
          if ((y0 <= yc && yc < y1) || (y1 <= yc && yc < y0)) xs.push(x0 + ((yc - y0) * (x1 - x0)) / (y1 - y0));
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2)
          for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) this.set(x, y, c);
      }
      return this;
    }
    blit(src, ox = 0, oy = 0) {
      for (let y = 0; y < src.h; y++)
        for (let x = 0; x < src.w; x++) {
          const v = src.d[y * src.w + x];
          if (v !== '.') this.set(ox + x, oy + y, v);
        }
      return this;
    }
    // Replace colours of pixels that pass a test: fn(x, y, colour) -> colour | undefined
    map(fn) {
      const src = this.d.slice();
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          const v = fn(x, y, src[y * this.w + x]);
          if (v) this.d[y * this.w + x] = v;
        }
      return this;
    }
    recolor(table) {
      return this.map((x, y, v) => table[v]);
    }
    // 1px outline around everything that is not transparent
    outline(c = 'o') {
      const src = this.d.slice(), w = this.w, h = this.h;
      const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] !== '.' && src[y * w + x] !== c;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (src[y * w + x] !== '.') continue;
          if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) this.d[y * w + x] = c;
        }
      return this;
    }
    // Light the top/right edge of every shape and shade its bottom/left edge
    rim(only) {
      const src = this.d.slice(), w = this.w, h = this.h;
      const open = (x, y) => {
        const v = x < 0 || y < 0 || x >= w || y >= h ? '.' : src[y * w + x];
        return v === '.' || v === 'o';
      };
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const v = src[y * w + x], r = RIM[v];
          if (!r || (only && only.indexOf(v) < 0)) continue;
          if (open(x, y - 1) || open(x + 1, y)) this.d[y * w + x] = r[0];
          else if (open(x, y + 1) || open(x - 1, y)) this.d[y * w + x] = r[1];
        }
      return this;
    }
    flip() {
      const g = new Px(this.w, this.h);
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) g.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
      return g;
    }
    // Bounding box of the visible pixels
    bounds() {
      let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++)
          if (this.d[y * this.w + x] !== '.') {
            x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          }
      return x1 < 0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    }
  }

  /* ---------------------------------------------------------- character */
  // Frames are 24 x 35. Standing feet (the bottom outline row) sit on row 33.
  const FW = 24, FH = 35, FEET = 33, ANKLE = 30;

  const HEAD_SIDE = [
    '...oooooo....',
    '.oohhhjjhoo..',
    'ohhhhhjjhhho.',
    'ohhhhhhhhhhho',
    'oHhhhhhhhhsso',
    'oHhhossssssso',
    'oHhoSszzzszzz',
    'oHhoSXXoXXXoX',
    '.ohossXXXsXXX',
    '..ossssssssso',
    '..osssssssQso',
    '...oooooooo..'
  ];
  const TORSO_SIDE = [
    '...osSo...',
    '.oBbcccbo.',
    'oBBbbcdcbo',
    'oBBbbbdbco',
    'oBBbbbubco',
    'oBBbbbdbco',
    'oBBbbbubbo',
    'oBBbbbdbbo',
    'oHHHHHYHHo',
    'onnnnnnnno',
    'oNnnnnnnno'
  ];
  const HEAD_FRONT = [
    '...oooooo...',
    '.oohhjjhhoo.',
    'ohhhjjhhhhho',
    'ohhhhhhhhhho',
    'ohhhhhhhhhho',
    'oHhhssssshHo',
    'oSzzzsszzzSo',
    'oSXoXXXXoXSo',
    'osXXXssXXXso',
    '.osssssssso.',
    '.osssQQssso.',
    '..oooooooo..'
  ];
  const HEAD_BACK = [
    '...oooooo...',
    '.oohhjjhhoo.',
    'ohhhjjhhhhho',
    'ohhhhhhhhhho',
    'ohhhhhhhhhho',
    'oHhhhhhhhhHo',
    'oSHhhhhhhHSo',
    'oSHhhhhhhHSo',
    'oHHHhhhhHHHo',
    '.oHHHHHHHHo.',
    '.ossSSSSsso.',
    '..oooooooo..'
  ];
  const TORSO_FRONT = [
    '....osSo....',
    'oBbbcccccbbo',
    'oBbbbcdcbbbo',
    'oBbbbbdbbbbo',
    'oBbbbbubbbbo',
    'oBbbbbdbbbbo',
    'oBbbbbubbbbo',
    'oBbbbbdbbbbo',
    'oHHHHHYHHHHo',
    'onnnnnnnnnno',
    'oNnnnnnnnnNo'
  ];
  const TORSO_BACK = [
    '....oSSo....',
    'oBbbbccbbbbo',
    'oBBBBBBBBBBo',
    'oBbbbbbbbbbo',
    'oBbbbbbbbbbo',
    'oBbbbbbbbbbo',
    'oBbbbbbbbbbo',
    'oBbbbbbbbbbo',
    'oHHHHHHHHHHo',
    'onnnnnnnnnno',
    'oNnnnnnnnnNo'
  ];
  const SHOE = {
    flat: ['Wwwww.', 'XXXXXX'],
    toe: ['....w.', 'Wwwwww', 'XXXX..'],
    heel: ['Ww....', '.Wwww.', '..XXXX'],
    front: ['Wwww', 'XXXX'],
    back: ['WwwW', 'XXXX']
  };
  const FAR = { w: 'x', W: 'X', X: 'z', n: 'N', N: 'q', b: 'B', B: 'd', c: 'B', s: 'S' };

  const blink = (rows) => rows.map((r) => r.replace(/XoX/g, 'XSX'));
  const PARTS = {
    headSide: Px.from(HEAD_SIDE), headSideBlink: Px.from(blink(HEAD_SIDE)),
    headFront: Px.from(HEAD_FRONT), headFrontBlink: Px.from(blink(HEAD_FRONT)),
    headBack: Px.from(HEAD_BACK),
    torsoSide: Px.from(TORSO_SIDE), torsoFront: Px.from(TORSO_FRONT), torsoBack: Px.from(TORSO_BACK)
  };

  // Two-bone inverse kinematics: the joint between a and b, bent towards dir (+1 = +x)
  function ik(a, b, l1, l2, dir) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 0.001;
    if (d >= l1 + l2 || !dir) return [Math.round(a[0] + (dx * l1) / (l1 + l2)), Math.round(a[1] + (dy * l1) / (l1 + l2))];
    const t = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - t * t));
    let nx = -dy / d, ny = dx / d;
    if (nx * dir < 0 || (nx === 0 && ny * dir < 0)) { nx = -nx; ny = -ny; }
    return [Math.round(a[0] + (dx * t) / d + nx * h), Math.round(a[1] + (dy * t) / d + ny * h)];
  }

  // Shade the leftmost pixel of each row of a limb (its side away from the sun)
  function shadeLeft(g, fill, shade) {
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (g.get(x, y) === fill) { g.set(x, y, shade); break; }
  }

  function leg(hip, ankle, near, shoe, bend = 1) {
    const g = new Px(FW, FH);
    const knee = ik(hip, ankle, 3.6, 3.6, bend);
    g.line(hip[0], hip[1], knee[0], knee[1], 'n', 3);
    g.line(knee[0], knee[1], ankle[0], ankle[1], 'n', 3);
    shadeLeft(g, 'n', 'N');
    const s = Px.from(SHOE[shoe]);
    const sx = shoe === 'front' || shoe === 'back' ? ankle[0] - 1 : ankle[0] - 1;
    g.blit(s, sx, ankle[1] + 1);
    if (!near) g.recolor(FAR);
    return g.outline();
  }

  function arm(sh, hand, near, bend = -1) {
    const g = new Px(FW, FH);
    const el = ik(sh, hand, 3, 3.4, bend);
    g.line(sh[0], sh[1], el[0], el[1], 'b', 2);
    g.line(el[0], el[1], hand[0], hand[1], 'b', 2);
    shadeLeft(g, 'b', 'B');
    g.map((x, y, v) => ((v === 'b' || v === 'B') && Math.hypot(x - hand[0], y - hand[1]) < 1.6 ? 'c' : undefined));
    g.rect(hand[0], hand[1], 2, 2, 's');
    g.set(hand[0], hand[1] + 1, 'S');
    if (!near) g.recolor(FAR);
    return g.outline();
  }

  /* Side view, facing right.
     p = { dy, dx: body offset; nf, ff: near/far ankle; ns, fs: shoes;
           nh, fh: near/far hand; blink } */
  function sidePose(p) {
    const g = new Px(FW, FH);
    const dx = p.dx || 0, dy = p.dy || 0;
    const hipN = [13 + dx, 23 + dy], hipF = [10 + dx, 23 + dy];
    const shN = [11 + dx, 15 + dy], shF = [10 + dx, 15 + dy];
    g.blit(arm(shF, p.fh || [10 + dx, 21 + dy], false, p.fb || -1));
    g.blit(leg(hipF, p.ff, false, p.fs || 'flat'));
    g.blit(leg(hipN, p.nf, true, p.ns || 'flat'));
    g.blit(PARTS.torsoSide, 7 + dx, 13 + dy);
    g.blit(p.blink ? PARTS.headSideBlink : PARTS.headSide, 5 + dx + (p.hx || 0), 1 + dy + (p.hy || 0));
    g.blit(arm(shN, p.nh || [11 + dx, 21 + dy], true, p.nb || -1));
    return g;
  }

  /* Front / back view (walking towards / away from the camera).
     p = { dy, lf, rf: left/right ankle; lh, rh: hands; blink } */
  function facePose(p, back) {
    const g = new Px(FW, FH);
    const dy = p.dy || 0;
    const shoe = back ? 'back' : 'front';
    const legs = [leg([9, 23 + dy], p.lf, true, shoe, 0), leg([14, 23 + dy], p.rf, true, shoe, 0)];
    legs.forEach((l) => g.blit(l));
    g.blit(back ? PARTS.torsoBack : PARTS.torsoFront, 6, 13 + dy);
    g.blit(back ? PARTS.headBack : p.blink ? PARTS.headFrontBlink : PARTS.headFront, 6, 1 + dy);
    g.blit(arm([4, 15 + dy], p.lh, true, 0));
    g.blit(arm([18, 15 + dy], p.rh, true, 0));
    return g;
  }

  // Procedural gait: ph in [0, 1) is the near leg's phase.
  function gait(ph, k) {
    const TAU = Math.PI * 2;
    const foot = (q, hipX) => {
      const c = Math.cos(q * TAU), s = Math.sin(q * TAU);
      const lift = Math.round(k.lift * Math.max(0, -s));
      const shoe = lift ? 'flat' : c > 0.6 ? 'toe' : c < -0.6 ? 'heel' : 'flat';
      return { at: [Math.round(hipX + k.stride * c), ANKLE - lift], shoe };
    };
    const n = foot(ph, 13 + k.lean), f = foot(ph + 0.5, 10 + k.lean);
    const c = Math.cos(ph * TAU), s = Math.abs(Math.sin(ph * TAU));
    const dy = s > 0.6 ? -k.bob : 0;
    const dx = k.lean;
    let nh, fh;
    if (k.run) {
      nh = [11 + dx + Math.round(-3.5 * c) + 1, 19 + dy - Math.round(Math.max(0, -c) * 2)];
      fh = [10 + dx + Math.round(3.5 * c) + 1, 19 + dy - Math.round(Math.max(0, c) * 2)];
    } else {
      nh = [11 + dx - Math.round(k.swing * c), 21 + dy - (Math.abs(c) > 0.7 ? 1 : 0)];
      fh = [10 + dx + Math.round(k.swing * c), 21 + dy - (Math.abs(c) > 0.7 ? 1 : 0)];
    }
    return { dx, dy, nf: n.at, ns: n.shoe, ff: f.at, fs: f.shoe, nh, fh, nb: k.run ? -1 : -1, fb: -1 };
  }

  function buildCharacter() {
    const stand = { nf: [13, ANKLE], ff: [10, ANKLE] };
    const side = {
      idle: [sidePose(stand), sidePose(Object.assign({ blink: true }, stand))],
      walk: [],
      run: [],
      jump: sidePose({ nf: [15, 27], ns: 'flat', ff: [9, 31], fs: 'heel', nh: [17, 13], fh: [5, 17] }),
      fall: sidePose({ nf: [15, 29], ff: [9, 30], fs: 'heel', nh: [18, 11], fh: [5, 11] }),
      squat: sidePose({ dy: 5, nf: [15, ANKLE], ff: [10, ANKLE], nh: [16, 25], fh: [12, 26] }),
      land: sidePose({ dy: 2, nf: [14, ANKLE], ff: [10, ANKLE], nh: [13, 23], fh: [9, 23] }),
      // tossing crumbs: reach into a pocket, then throw
      toss: [sidePose(Object.assign({ nh: [9, 22] }, stand)), sidePose(Object.assign({ nh: [18, 14] }, stand))]
    };
    for (let i = 0; i < 8; i++) {
      side.walk.push(sidePose(gait(i / 8, { stride: 3, lift: 2, swing: 2.5, bob: 1, lean: 0 })));
      side.run.push(sidePose(gait(i / 8, { stride: 5, lift: 3, swing: 0, bob: 1, lean: 1, run: true })));
    }
    const front = {
      idle: [
        facePose({ lf: [9, ANKLE], rf: [14, ANKLE], lh: [4, 21], rh: [18, 21] }),
        facePose({ lf: [9, ANKLE], rf: [14, ANKLE], lh: [4, 21], rh: [18, 21], blink: true })
      ],
      walk: [
        facePose({ lf: [9, 31], rf: [14, 28], lh: [4, 22], rh: [18, 20] }),
        facePose({ dy: -1, lf: [9, ANKLE], rf: [14, ANKLE - 1], lh: [4, 21], rh: [18, 21] }),
        facePose({ lf: [9, 28], rf: [14, 31], lh: [4, 20], rh: [18, 22] }),
        facePose({ dy: -1, lf: [9, ANKLE - 1], rf: [14, ANKLE], lh: [4, 21], rh: [18, 21] })
      ]
    };
    const back = {
      idle: [facePose({ lf: [9, ANKLE], rf: [14, ANKLE], lh: [4, 21], rh: [18, 21] }, true)],
      walk: [
        facePose({ lf: [9, 28], rf: [14, 31], lh: [4, 22], rh: [18, 20] }, true),
        facePose({ dy: -1, lf: [9, ANKLE - 1], rf: [14, ANKLE], lh: [4, 21], rh: [18, 21] }, true),
        facePose({ lf: [9, 31], rf: [14, 28], lh: [4, 20], rh: [18, 22] }, true),
        facePose({ dy: -1, lf: [9, ANKLE], rf: [14, ANKLE - 1], lh: [4, 21], rh: [18, 21] }, true)
      ]
    };
    return { side, front, back, size: { w: FW, h: FH, feet: FEET } };
  }

  /* --------------------------------------------------------------- icons */
  // 24 x 24. Each draws its shapes; outlines are added afterwards. An icon can
  // return a function that draws details after the outline (glows, beams).
  const ICONS = {
    gear(g) {
      for (let y = 0; y < 24; y++)
        for (let x = 0; x < 24; x++) {
          const dx = x + 0.5 - 12, dy = y + 0.5 - 12, r = Math.hypot(dx, dy);
          const R = Math.cos(Math.atan2(dy, dx) * 8) > 0.2 ? 10.6 : 8.3;
          if (r <= R && r >= 4.3) g.set(x, y, 'y');
        }
      g.rim();
    },
    book(g) {
      g.poly([[0.5, 8], [12, 6.5], [23.5, 8], [23.5, 21.5], [12, 20.5], [0.5, 21.5]], 'R');
      g.poly([[2, 6.5], [11.5, 5], [11.5, 19], [2, 20]], 'W');
      g.poly([[12.5, 5], [22, 6.5], [22, 20], [12.5, 19]], 'W');
      g.rim();
      for (let i = 0; i < 5; i++) {
        g.line(4, 9 + 2 * i, 9, 8 + 2 * i, 'x');
        g.line(15, 8 + 2 * i, 20, 9 + 2 * i, 'x');
      }
      g.line(12, 5, 12, 19, 'X');
      g.rect(18, 2, 2, 7, 'r');
      g.set(18, 9, 'r');
    },
    cap(g) {
      g.poly([[6.5, 10], [17.5, 10], [17.5, 17], [12, 18.5], [6.5, 17]], 'Z');
      g.poly([[12, 2.5], [23.5, 8.5], [12, 14.5], [0.5, 8.5]], 'Z');
      g.rim();
      g.rect(11, 8, 2, 1, 'y');
      g.line(13, 8, 20, 10, 'y');
      g.line(20, 10, 20, 15, 'y');
      g.rect(19, 15, 3, 4, 'y');
      g.rect(20, 16, 1, 3, 'Y');
    },
    printer(g) {
      g.rect(2, 2, 20, 3, 'Z');
      g.rect(2, 2, 3, 18, 'Z');
      g.rect(19, 2, 3, 18, 'Z');
      g.rect(1, 19, 22, 4, 'Z');
      g.rect(6, 16, 12, 2, 'X');
      g.rect(8, 11, 8, 5, 'a');
      g.rect(5, 7, 14, 1, 'x');
      g.rect(9, 5, 6, 4, 'r');
      g.rim();
      g.rect(11, 9, 2, 2, 'k');
      g.rect(10, 13, 1, 2, 'A');
      g.rect(13, 13, 1, 2, 'A');
      g.set(4, 21, 'g');
      g.set(6, 21, 'y');
    },
    rov(g) {
      g.ellipse(4, 5, 1.6, 1.6, 'u');
      g.ellipse(7.5, 2, 1.1, 1.1, 'u');
      g.rect(5, 7, 12, 3, 'y');
      g.rect(3, 9, 16, 8, 'y');
      g.rect(0, 11, 4, 4, 'Z');
      g.ellipse(19, 13, 3.5, 3.5, 'u');
      g.line(15, 17, 18, 20, 'z', 2);
      g.rim();
      g.rect(6, 12, 8, 1, 'Y');
      g.rect(6, 15, 8, 1, 'Y');
      g.rect(7, 8, 2, 1, 'r');
      g.set(20, 12, 'w');
      g.line(18, 20, 21, 20, 'Z');
      g.line(18, 21, 20, 23, 'Z');
      g.rect(1, 10, 1, 6, 'z');
    },
    chalkboard(g) {
      g.line(5, 18, 3, 23, 'M', 2);
      g.line(18, 18, 20, 23, 'M', 2);
      g.rect(1, 2, 22, 17, 'm');
      g.rim();
      g.rect(3, 4, 18, 12, 'G');
      g.ellipse(8, 10, 3.6, 3.6, 'W');
      g.ellipse(8, 10, 2.2, 2.2, 'G');
      [[8, 5], [8, 14], [3, 10], [12, 10]].forEach(([x, y]) => g.set(x, y, 'W'));
      g.line(14, 7, 19, 7, 'W');
      g.line(14, 10, 18, 10, 'W');
      g.line(14, 13, 17, 13, 'x');
      g.rect(3, 16, 18, 2, 'M');
      g.rect(15, 15, 3, 1, 'w');
    },
    chart(g) {
      g.rect(1, 2, 22, 15, 'Z');
      g.rect(10, 17, 4, 3, 'z');
      g.rect(6, 20, 12, 2, 'Z');
      g.rim();
      g.rect(3, 4, 18, 11, 'v');
      g.rect(5, 11, 2, 3, 't');
      g.rect(8, 9, 2, 5, 'g');
      g.rect(11, 8, 2, 6, 'y');
      g.rect(14, 9, 2, 5, 'a');
      g.rect(17, 6, 2, 8, '1');
      g.line(5, 9, 18, 4, 'w');
    },
    microscope(g) {
      g.rect(3, 20, 17, 3, 'Z');
      g.rect(14, 8, 4, 12, 'W');
      g.line(8, 4, 13, 12, 'W', 4);
      g.rect(5, 1, 6, 3, 'Z');
      g.rect(4, 15, 11, 2, 'z');
      g.rim();
      g.rect(11, 12, 3, 3, 'Z');
      g.ellipse(16, 13, 1.6, 1.6, 'b');
      g.rect(6, 14, 5, 1, 'u');
    },
    laptop(g) {
      g.rect(3, 2, 18, 14, 'Z');
      g.poly([[1, 16], [23, 16], [24, 20], [0, 20]], 'x');
      g.rim();
      g.rect(5, 4, 14, 10, 'k');
      g.line(9, 6, 7, 9, 'g');
      g.line(7, 9, 9, 12, 'g');
      g.line(13, 6, 11, 12, 'y');
      g.line(15, 6, 17, 9, 'g');
      g.line(17, 9, 15, 12, 'g');
      for (let x = 3; x < 21; x += 2) g.set(x, 18, 'X');
    },
    code(g) {
      g.line(9, 4, 3, 12, 'p', 3);
      g.line(3, 12, 9, 20, 'p', 3);
      g.line(15, 4, 21, 12, 'p', 3);
      g.line(21, 12, 15, 20, 'p', 3);
      g.line(14, 3, 10, 21, 'y', 2);
      g.rim();
    },
    sailboat(g) {
      g.poly([[11, 2], [11, 16.5], [2.5, 16.5]], 'w');
      g.poly([[13, 5], [13, 16.5], [20.5, 16.5]], 'W');
      g.rect(12, 1, 1, 17, 'M');
      g.poly([[1.5, 17], [22.5, 17], [19, 21], [5, 21]], 'r');
      g.rim();
      g.rect(13, 1, 3, 2, 'y');
      for (let x = 0; x < 24; x++) g.set(x, 22 + (x % 6 < 3 ? 0 : 1), 'U');
    },
    robot(g) {
      g.line(8, 6, 6, 2, 'k');
      g.rect(4, 6, 14, 11, 'y');
      g.poly([[17, 10], [23, 12], [23, 18], [16, 18]], 'X');
      g.rim();
      g.rect(7, 6, 2, 11, 'k');
      g.rect(11, 6, 2, 11, 'k');
      g.rect(14, 8, 3, 3, 'w');
      g.set(15, 9, 'k');
      g.ellipse(7, 18.5, 3, 3, 'k');
      g.ellipse(15, 18.5, 3, 3, 'k');
      g.set(6, 18, 'x');
      g.set(14, 18, 'x');
      return (h) => h.set(6, 1, 'r');
    },
    bee(g) {
      g.ellipse(9, 6, 4, 3.2, 'u');
      g.ellipse(14, 5, 3.6, 3.2, 'W');
      g.ellipse(10.5, 14, 8.5, 6.5, 'y');
      g.ellipse(19.5, 12, 3.5, 3.5, 'k');
      g.rim();
      g.map((x, y, v) => ('eyYA'.includes(v) && ((x >= 7 && x <= 8) || (x >= 11 && x <= 12)) ? 'k' : undefined));
      g.set(20, 11, 'w');
      g.line(20, 8, 22, 5, 'k');
      g.line(18, 8, 18, 5, 'k');
      g.poly([[0, 14.5], [2.5, 13], [2.5, 16]], 'k');
    },
    synth(g) {
      g.rect(0, 5, 3, 15, 'M');
      g.rect(21, 5, 3, 15, 'M');
      g.rect(3, 6, 18, 6, 'Z');
      g.rect(3, 12, 18, 7, 'w');
      g.rim();
      g.ellipse(6, 9, 1.6, 1.6, 'x');
      g.ellipse(10, 9, 1.6, 1.6, 'x');
      g.ellipse(14, 9, 1.6, 1.6, 'x');
      g.rect(16, 8, 4, 2, 'g');
      [5, 8, 11, 14, 17].forEach((x) => g.rect(x, 12, 1, 7, 'X'));
      [4, 7, 13, 16].forEach((x) => g.rect(x, 12, 2, 4, 'k'));
    },
    scope(g) {
      g.rect(1, 3, 22, 18, 'x');
      g.rect(3, 21, 3, 2, 'Z');
      g.rect(18, 21, 3, 2, 'Z');
      g.rim();
      g.rect(3, 5, 12, 12, 'k');
      for (let x = 4; x < 15; x += 3) for (let y = 6; y < 17; y += 3) g.set(x, y, 'Z');
      g.line(3, 14, 6, 7, 'y');
      g.line(6, 7, 6, 14, 'y');
      g.line(6, 14, 10, 7, 'y');
      g.line(10, 7, 10, 14, 'y');
      g.line(10, 14, 14, 7, 'y');
      g.ellipse(18.5, 7.5, 1.7, 1.7, 'Z');
      g.ellipse(18.5, 12.5, 1.7, 1.7, 'Z');
      g.rect(17, 16, 2, 1, 'r');
      g.set(20, 16, 'g');
    },
    jelly(g) {
      [[7, 0, 'p'], [10, 1.6, 'i'], [14, 3.1, 'p'], [17, 4.7, 'i']].forEach(([x0, ph, c]) => {
        for (let y = 12; y < 23; y++) g.set(x0 + Math.round(Math.sin(y * 0.75 + ph)), y, c);
      });
      g.line(11, 12, 10, 19, 'I', 2);
      g.line(13, 12, 14, 18, 'I', 2);
      for (let y = 2; y <= 12; y++)
        for (let x = 2; x < 22; x++) {
          const dx = (x + 0.5 - 12) / 9.5, dy = (y + 0.5 - 12.5) / 10;
          if (dx * dx + dy * dy <= 1) g.set(x, y, 'i');
        }
      g.rim();
      for (let x = 4; x < 21; x += 3) g.set(x, 12, 'I');
      g.ellipse(9, 8.5, 1.6, 1.1, 'p');
      g.ellipse(15, 8.5, 1.6, 1.1, 'p');
      g.set(7, 5, 'w');
      g.set(8, 4, 'w');
    },
    bass(g) {
      g.ellipse(12, 17.5, 6.8, 5.3, 'm');
      g.ellipse(12, 11, 5.2, 4.2, 'm');
      g.rect(8, 13, 8, 3, 'm');
      g.rim();
      g.rect(11, 2, 2, 12, 'k');
      g.ellipse(12, 1.5, 1.7, 1.7, 'M');
      [[10, 3], [13, 3], [10, 5], [13, 5]].forEach(([x, y]) => g.set(x, y, 'x'));
      g.line(9, 14, 9, 17, 'H');
      g.line(15, 14, 15, 17, 'H');
      g.rect(10, 18, 4, 1, 'f');
      g.rect(11, 19, 2, 3, 'k');
      g.rect(12, 3, 1, 15, 'X');
      g.rect(12, 22, 1, 2, 'X');
    },
    sparkplug(g) {
      g.rect(10, 0, 4, 2, 'X');
      g.rect(9, 2, 6, 9, 'W');
      g.rect(6, 11, 12, 4, 'Z');
      g.rect(8, 15, 8, 2, 'x');
      g.rect(9, 17, 6, 5, 'X');
      g.rim();
      [4, 6, 8].forEach((y) => g.rect(9, y, 6, 1, 'x'));
      [17, 19].forEach((y) => g.line(9, y + 1, 14, y, 'z'));
      g.rect(10, 12, 1, 2, 'z');
      g.rect(14, 12, 1, 2, 'z');
      g.rect(11, 22, 2, 1, 'Z');
      g.rect(13, 22, 2, 2, 'Z');
      return (h) => {
        h.set(17, 21, 'y'); h.set(18, 20, 'y'); h.set(19, 21, 'e'); h.set(20, 20, 'y');
        h.set(6, 20, 'y'); h.set(5, 21, 'e'); h.set(4, 20, 'y');
      };
    },
    car(g) {
      g.poly([[0, 13], [5, 12], [8, 8], [16, 8], [19.5, 12], [24, 13], [24, 18], [0, 18]], 'r');
      g.rim();
      g.poly([[9, 9], [12, 9], [12, 12], [7, 12]], 'u');
      g.poly([[13, 9], [15.5, 9], [18, 12], [13, 12]], 'u');
      g.rect(1, 15, 22, 1, 'R');
      g.ellipse(6, 18.5, 3, 3, 'k');
      g.ellipse(18, 18.5, 3, 3, 'k');
      g.ellipse(6, 18.5, 1.3, 1.3, 'x');
      g.ellipse(18, 18.5, 1.3, 1.3, 'x');
      g.rect(22, 13, 2, 2, 'e');
      g.rect(0, 16, 2, 1, 'x');
      g.rect(22, 16, 2, 1, 'x');
    },
    wrench(g) {
      g.line(5, 21, 13, 10, 'r', 3);
      g.poly([[10, 3], [20, 3], [20, 7], [15, 7], [15, 9], [10, 9]], 'X');
      g.rect(9, 11, 7, 2, 'X');
      g.rim();
      g.ellipse(13, 10, 2.4, 1.5, 'z');
      g.line(5, 21, 7, 18, 'R');
    },
    hammer(g) {
      g.line(5, 22, 14, 8, 'm', 3);
      g.poly([[11.3, 1.7], [21.4, 8.1], [18.7, 12.3], [8.6, 5.9]], 'Z');
      g.rim();
      g.line(5, 22, 7, 19, 'M', 2);
    },
    spotlight(g) {
      g.rect(0, 1, 24, 2, 'z');
      g.line(6, 3, 6, 6, 'k', 2);
      g.poly([[2, 8], [12, 6], [14, 15], [4, 17]], 'Z');
      g.line(2, 9, 2, 18, 'k');
      g.line(2, 18, 6, 18, 'k');
      g.rim();
      g.ellipse(13.5, 10.8, 1.6, 4, 'y');
      return (h) => {
        h.poly([[15, 8], [24, 3], [24, 23], [15, 14]], 'e');
        h.set(13, 9, 'w');
      };
    },
    masks(g) {
      g.ellipse(15, 9, 6.5, 7.5, 'y');
      g.ellipse(9, 13.5, 6.5, 7.5, 'W');
      g.rim();
      g.line(5, 12, 6, 11, 'k');
      g.line(7, 11, 8, 12, 'k');
      g.line(10, 12, 11, 11, 'k');
      g.line(12, 11, 13, 12, 'k');
      g.line(6, 16, 8, 18, 'k');
      g.line(8, 18, 10, 18, 'k');
      g.line(10, 18, 12, 16, 'k');
      g.line(14, 5, 16, 6, 'k');
      g.line(19, 5, 17, 6, 'k');
      g.line(14, 12, 16, 10, 'k');
      g.line(16, 10, 18, 12, 'k');
      g.line(3, 20, 1, 23, 'r', 2);
      g.line(21, 15, 23, 19, 'r', 2);
    },
    notes(g) {
      g.poly([[8, 5], [21, 2], [21, 6], [8, 9]], 'v');
      g.rect(8, 6, 2, 12, 'v');
      g.rect(19, 3, 2, 12, 'v');
      g.ellipse(6, 18.5, 3.5, 2.6, 'v');
      g.ellipse(17, 15.5, 3.5, 2.6, 'v');
      g.rim();
    },
    mailbox(g) {
      g.rect(10, 14, 4, 10, 'M');
      g.rect(3, 7, 16, 8, 'U');
      g.ellipse(11, 7.5, 8, 3.5, 'U');
      g.rim();
      g.rect(3, 6, 2, 9, 'b');
      g.rect(1, 9, 3, 2, 'W');
      g.line(19, 4, 19, 11, 'r');
      g.rect(19, 3, 4, 3, 'r');
    },
    envelope(g) {
      g.rect(1, 5, 22, 15, 'W');
      g.rim();
      g.line(1, 5, 12, 13, 'x');
      g.line(22, 5, 12, 13, 'x');
      g.line(1, 19, 9, 12, 'x');
      g.line(22, 19, 15, 12, 'x');
      g.rect(10, 11, 2, 2, 'r');
      g.rect(13, 11, 2, 2, 'r');
      g.rect(10, 12, 5, 2, 'r');
      g.rect(11, 14, 3, 1, 'r');
      g.set(12, 15, 'r');
    }
  };

  Object.assign(ICONS, {
    speaker(g) {
      g.rect(3, 1, 15, 21, 'Z');
      g.rect(4, 22, 3, 2, 'k');
      g.rect(14, 22, 3, 2, 'k');
      g.rim();
      g.ellipse(10.5, 14.5, 5.6, 5.6, 'k');
      g.ellipse(10.5, 14.5, 4.2, 4.2, 'z');
      g.ellipse(10.5, 14.5, 1.8, 1.8, 'X');
      g.ellipse(10.5, 5.5, 2.4, 2.4, 'k');
      g.set(10, 5, 'X');
      g.set(15, 2, 'g');
      return (h) => {
        [[19, 10, 15], [21, 8, 17]].forEach(([x, y0, y1]) => {
          h.set(x, y0, 'b');
          for (let y = y0 + 1; y < y1; y++) h.set(x + 1, y, 'b');
          h.set(x, y1, 'b');
        });
      };
    },
    games(g) {
      g.poly([[1, 9], [8, 6], [15, 9], [8, 12]], 'w');
      g.poly([[1, 9], [8, 12], [8, 21], [1, 18]], 'W');
      g.poly([[8, 12], [15, 9], [15, 18], [8, 21]], 'x');
      g.rect(15, 19, 8, 3, 'r');
      g.poly([[16, 19], [18, 11], [20, 11], [22, 19]], 'r');
      g.ellipse(19, 8.5, 2.6, 2.6, 'r');
      g.rect(17, 11, 4, 1, 'r');
      g.rim();
      [[8, 9], [3, 12], [6, 17], [10, 14], [13, 12], [10, 18], [13, 16]].forEach(([x, y]) => g.set(x, y, 'k'));
    }
  });

  // Company logos for the Experience stops, redrawn as pixel art from each
  // organisation's real mark.
  Object.assign(ICONS, {
    // Divergent 3D: a grey downward triangle with a green blade in the corner
    divergent(g) {
      g.poly([[1, 1], [16, 1], [14.5, 3.5], [5.5, 3.5], [12, 16.5], [18.5, 7.5], [20.5, 5.5], [12, 23]], 'X');
      g.poly([[8, 4.5], [17, 1.5], [23, 0.5], [14, 15.5], [18, 5.5]], 'g');
      g.rim();
    },
    // Harvard Microrobotics Lab: the Veritas shield on a RoboBee's wings and
    // three pairs of legs. Hand-placed left half, mirrored for the right.
    microlab(g) {
      const half = [
        '............',
        '............',
        '............',
        'ww..........',
        'wwww........',
        '.wxxww......',
        '..wwxxww....',
        '...wwwxrrrrr',
        '....wwwrrrrr',
        '..WWW..rwwwr',
        '.WWWW..rwwwr',
        '..WW...rrrrr',
        '.......rrrww',
        '...WWWWrrrww',
        '..W....rrrrr',
        '.W..WWWWrrrr',
        'W..W.....rrr',
        '..W...WWWWrr',
        '..W..W.....r',
        '.W...W......',
        '....W.......',
        '....W.......'
      ];
      g.blit(Px.from(half.map((r) => r + [...r].reverse().join(''))));
      g.rim('r');
    },
    // Harvard-Radcliffe Dramatic Club: big white HR / DC on a red oval that
    // leans down to the right
    hrdc(g) {
      const a = 0.62, ca = Math.cos(a), sa = Math.sin(a);
      for (let y = 0; y < 24; y++)
        for (let x = 0; x < 24; x++) {
          const dx = x + 0.5 - 12.5, dy = y + 0.5 - 12.5;
          const u = (dx * ca + dy * sa) / 12.5, v = (-dx * sa + dy * ca) / 9.3;
          if (u * u + v * v <= 1) g.set(x, y, 'r');
        }
      g.rim();
      const letters = {
        H: ['xx.xx', 'xx.xx', 'xxxxx', 'xx.xx', 'xx.xx', 'xx.xx'],
        R: ['xxxx.', 'xx.xx', 'xx.xx', 'xxxx.', 'xx.xx', 'xx.xx'],
        D: ['xxxx.', 'xx.xx', 'xx.xx', 'xx.xx', 'xx.xx', 'xxxx.'],
        C: ['.xxxx', 'xx...', 'xx...', 'xx...', 'xx...', '.xxxx']
      };
      [['H', 4, 4], ['R', 10, 4], ['D', 6, 12], ['C', 12, 12]].forEach(([ch, ox, oy]) =>
        letters[ch].forEach((row, y) => [...row].forEach((p, x) => p === 'x' && g.get(ox + x, oy + y) !== '.' && g.set(ox + x, oy + y, 'w'))));
    },
    // Nanotronics: the red bow-tie "N"
    nanotronics(g) {
      g.poly([[4, 6], [8.5, 6], [12, 12], [4, 23]], 'r');
      g.poly([[20, 1], [20, 18], [15.5, 18], [12, 12]], 'r');
      g.rim();
    }
  });

  function icon(name) {
    const g = new Px(24, 24);
    const after = ICONS[name](g);
    g.outline();
    if (after) after(g);
    return g;
  }

  // The favicon / logo gear, drawn for an exact pixel size
  function gearIcon(size) {
    const g = new Px(size, size), c = size / 2;
    const outer = size * 0.44, inner = size * 0.335, hole = size * 0.16;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
        const R = Math.cos(Math.atan2(dy, dx) * 8) > 0.2 ? outer : inner;
        if (r <= R && r >= hole) g.set(x, y, 'y');
      }
    g.rim();
    return g.outline();
  }

  /* --------------------------------------------------------------- props */
  const PROPS = {
    pedestal() {
      const g = new Px(18, 14);
      g.rect(0, 0, 18, 3, 'x');
      g.rect(2, 3, 14, 8, 'X');
      g.rect(1, 11, 16, 3, 'x');
      g.rim();
      g.rect(6, 5, 6, 4, 'z');
      return g.outline();
    },
    bench() {
      const g = new Px(28, 13);
      g.rect(1, 0, 26, 2, 'G');
      g.rect(1, 3, 26, 2, 'G');
      g.rect(0, 7, 28, 2, 'G');
      g.rim();
      g.rect(3, 0, 2, 13, 'k');
      g.rect(23, 0, 2, 13, 'k');
      g.rect(3, 9, 22, 1, 'k');
      return g.outline();
    },
    lampNY() {
      const g = new Px(11, 50);
      g.rect(3, 43, 5, 7, 'Z');
      g.rect(4, 10, 3, 34, 'Z');
      g.rect(2, 40, 7, 2, 'Z');
      g.rect(1, 2, 9, 2, 'k');
      g.rect(2, 4, 7, 6, 'e');
      g.rect(5, 0, 1, 2, 'k');
      g.rim('Z');
      g.rect(5, 4, 1, 6, 'k');
      return g.outline();
    },
    lampCam() {
      const g = new Px(11, 50);
      g.rect(3, 44, 5, 6, 'k');
      g.rect(4, 12, 3, 33, 'k');
      g.ellipse(5.5, 7, 4, 5, 'e');
      g.rect(3, 1, 5, 2, 'k');
      g.rect(5, 0, 1, 1, 'k');
      g.rect(3, 11, 5, 2, 'k');
      g.rim('e');
      return g.outline();
    },
    tree() {
      const g = new Px(52, 66);
      g.rect(23, 40, 6, 26, 'M');
      g.line(26, 44, 16, 34, 'M', 3);
      g.line(26, 42, 36, 32, 'M', 3);
      g.ellipse(26, 22, 19, 15, 'g');
      g.ellipse(12, 30, 11, 9, 'g');
      g.ellipse(40, 30, 11, 9, 'g');
      g.ellipse(26, 11, 13, 10, 'g');
      g.ellipse(18, 36, 8, 5, 'g');
      g.ellipse(34, 36, 8, 5, 'g');
      g.rim();
      // dapple
      for (let i = 0; i < 70; i++) {
        const x = (i * 37) % 52, y = (i * 23) % 44;
        if (g.get(x, y) === 'g') g.set(x, y, i % 3 ? 'G' : '2');
      }
      g.rim('M');
      return g.outline();
    },
    crate() {
      const g = new Px(14, 14);
      g.rect(0, 0, 14, 14, 'm');
      g.rim();
      g.line(2, 2, 11, 11, 'M', 2);
      g.line(11, 2, 2, 11, 'M', 2);
      g.rect(0, 0, 14, 1, 'f');
      return g.outline();
    },
    planter() {
      const g = new Px(30, 16);
      g.rect(0, 7, 30, 9, 'x');
      for (let i = 0; i < 9; i++) g.ellipse(2 + i * 3.3, 6 - (i % 2), 2.6, 2.6, 'g');
      g.rim();
      [[4, 3, 'r'], [10, 4, 'y'], [15, 2, 'i'], [21, 4, 'r'], [26, 3, 'y']].forEach(([x, y, c]) => g.rect(x, y, 2, 2, c));
      g.rect(0, 9, 30, 1, 'X');
      return g.outline();
    },
    trash() {
      const g = new Px(12, 18);
      g.rect(0, 0, 12, 18, 'z');
      g.rim();
      for (let y = 2; y < 18; y += 3) g.rect(1, y, 10, 1, 'Z');
      for (let x = 2; x < 12; x += 3) g.rect(x, 1, 1, 16, 'Z');
      g.rect(0, 0, 12, 2, 'X');
      return g.outline();
    },
    // Coin-operated tourist viewer: a round head with two round eyepieces
    // set into the top, the coin slot below them, on a post and a base.
    // lit: the eyepieces and coin plate glow once a coin is in.
    telescope(lit) {
      const g = new Px(17, 37);
      g.rect(5, 33, 7, 1, 't'); // base
      g.rect(3, 34, 11, 2, 't');
      g.rect(7, 15, 3, 18, 'z'); // post
      g.rect(5, 13, 7, 2, 'Z'); // collar
      g.ellipse(8.5, 7.5, 7, 6.5, 't'); // the round head
      g.rim();
      const EYE = ['.ZZZ.', 'ZkkkZ', 'ZkkkZ', 'ZkkkZ', '.ZZZ.'];
      [2, 10].forEach((ex) => {
        g.blit(Px.from(EYE), ex, 3);
        g.set(ex + 3, 4, lit ? 'e' : 'u'); // glint on the glass
      });
      g.rect(6, 9, 5, 3, lit ? 'e' : 'y'); // coin plate
      g.rect(8, 9, 1, 3, 'k'); // slot
      g.rect(8, 16, 1, 16, 'X'); // shine on the post
      return g.outline();
    },
    // King Kong, hanging off the Empire State with one hand on the mast.
    // pose 0: arm down, 1: swiping at a plane, 2: beating his chest
    kong(pose) {
      const g = new Px(21, 20), o = 1;
      g.rect(7, 13 + o, 3, 4, '6'); // legs
      g.rect(12, 13 + o, 3, 4, '6');
      g.rect(6, 16 + o, 4, 2, '6');
      g.rect(12, 16 + o, 4, 2, '6');
      g.ellipse(11, 10 + o, 5, 4.5, '6'); // body
      g.ellipse(12, 4.5 + o, 3.5, 3.5, '6'); // head
      g.line(7, 8 + o, 2, 3 + o, '6', 2); // gripping the mast
      if (pose === 1) {
        g.line(15, 8 + o, 18, 2 + o, '6', 2);
        g.rect(17, 0 + o, 3, 2, '6');
      } else if (pose !== 2) g.line(15, 8 + o, 17, 13 + o, '6', 2);
      g.rim();
      g.rect(10, 4 + o, 5, 3, '7'); // face
      g.rect(10, 3 + o, 5, 1, '6');
      g.set(11, 4 + o, 'k').set(13, 4 + o, 'k');
      g.rect(11, 6 + o, 3, 1, pose === 2 ? 'R' : '5');
      g.ellipse(11, 11 + o, 2.5, 2, '7'); // chest
      if (pose === 2) g.line(15, 8 + o, 12, 10 + o, '6', 2);
      return g.outline();
    },
    // Cthulhu, rising out of the river: bat wings, a squid head with glowing
    // eyes and a beard of face tentacles. f: wing beat / tentacle wiggle frame.
    // The bottom row sits at the waterline.
    cthulhu(f) {
      const g = new Px(42, 46), tip = f ? 6 : 1;
      g.poly([[17, 18], [3, tip], [1, tip + 12], [5, tip + 9], [7, tip + 16], [11, tip + 12], [16, 26]], '3');
      g.poly([[25, 18], [39, tip], [41, tip + 12], [37, tip + 9], [35, tip + 16], [31, tip + 12], [26, 26]], '3');
      g.line(17, 18, 3, tip, 'G').line(16, 20, 7, tip + 15, 'G');
      g.line(25, 18, 39, tip, 'G').line(26, 20, 35, tip + 15, 'G');
      g.ellipse(21, 33, 8.5, 13, 'g'); // body
      g.ellipse(21, 12, 7, 8.5, 'g'); // head
      g.rim('g');
      for (let y = 28; y < 45; y += 3) g.rect(19, y, 4, 1, 'G'); // belly
      g.rect(16, 11, 3, 2, 'y').set(16, 11, 'e'); // eyes
      g.rect(23, 11, 3, 2, 'y').set(23, 11, 'e');
      const w = f ? 1 : -1;
      [17, 19, 21, 23, 25].forEach((x, i) => {
        const s = i % 2 ? w : -w;
        g.line(x, 16, x + s, 21, 'G').line(x + s, 21, x, 24, 'G');
      });
      return g.outline();
    },
    // A little 1930s biplane, facing right; f flips the propeller blur
    biplane(f) {
      const g = new Px(14, 8);
      g.rect(1, 2, 2, 2, 'x'); // tail fin
      g.rect(1, 4, 10, 2, 'x'); // fuselage
      g.rect(4, 1, 6, 1, 'c'); // upper wing
      g.rect(4, 6, 6, 1, 'c'); // lower wing
      g.rim();
      g.set(5, 2, 'z').set(8, 2, 'z').set(5, 3, 'z').set(8, 3, 'z'); // struts
      g.set(7, 3, 'M'); // the pilot
      g.rect(11, 4, 1, 2, 'z');
      g.rect(12, f ? 1 : 3, 1, f ? 6 : 2, 'k'); // propeller
      return g.outline();
    },
    coin() {
      const g = new Px(3, 3);
      g.rect(0, 0, 3, 3, 'y');
      g.set(0, 0, '.').set(2, 0, '.').set(0, 2, '.').set(2, 2, '.');
      g.set(1, 1, 'e');
      return g;
    },
    railNY() {
      const g = new Px(16, 22);
      g.rect(0, 0, 16, 2, 'k');
      g.rect(0, 18, 16, 2, 'k');
      for (let x = 2; x < 16; x += 3) g.rect(x, 2, 1, 16, 'Z');
      g.rect(0, 0, 2, 22, 'k');
      g.rect(0, 20, 16, 2, 'Z');
      return g;
    },
    railCam() {
      const g = new Px(16, 22);
      g.rect(0, 12, 16, 10, 'x');
      g.rect(0, 12, 16, 1, 'W');
      g.rect(15, 13, 1, 9, 'X');
      g.rect(0, 17, 16, 1, 'X');
      g.rect(0, 1, 16, 1, 'k');
      for (let x = 1; x < 16; x += 3) {
        g.rect(x, 1, 1, 11, 'k');
        g.set(x, 0, 'k');
      }
      return g;
    },
    pigeon() {
      // 0 stand, 1 peck, 2 wings up, 3 wings down
      const base = () => {
        const g = new Px(10, 8);
        g.ellipse(4.5, 5, 3.5, 2.2, 'X');
        g.rect(0, 4, 2, 2, 'z');
        return g;
      };
      const stand = base();
      stand.ellipse(7, 2.5, 1.7, 1.7, 'x');
      stand.set(7, 4, 't');
      stand.set(6, 4, 'p');
      stand.set(7, 2, 'k');
      stand.set(9, 3, 'a');
      stand.rect(4, 7, 1, 1, 'a');
      stand.rect(6, 7, 1, 1, 'a');
      const peck = base();
      peck.ellipse(8, 5.5, 1.6, 1.6, 'x');
      peck.set(8, 5, 'k');
      peck.set(9, 7, 'a');
      peck.set(7, 4, 't');
      peck.rect(4, 7, 1, 1, 'a');
      const up = base();
      up.ellipse(7.5, 3.5, 1.6, 1.6, 'x');
      up.set(9, 4, 'a');
      up.line(3, 4, 1, 0, 'x', 2);
      up.line(5, 4, 6, 0, 'W', 2);
      const down = base();
      down.ellipse(7.5, 3.5, 1.6, 1.6, 'x');
      down.set(9, 4, 'a');
      down.line(2, 6, 0, 7, 'x', 2);
      down.line(5, 6, 6, 7, 'W', 1);
      return [stand, peck, up, down].map((g) => g.outline());
    },
    bird() {
      return [
        Px.from(['Z.....Z', '.Z...Z.', '..ZZZ..']),
        Px.from(['.......', '.ZZZZZ.', 'Z.....Z'])
      ];
    },
    sailboat(c) {
      const g = new Px(16, 20);
      g.poly([[7, 1], [7, 15], [1, 15]], 'w');
      g.poly([[9, 4], [9, 15], [14.5, 15]], 'W');
      g.rect(8, 0, 1, 16, 'M');
      g.poly([[0, 15.5], [16, 15.5], [13.5, 19], [2.5, 19]], c || 'r');
      g.rim();
      return g.outline();
    },
    shell(frame) {
      const g = new Px(40, 9);
      g.poly([[0, 6], [40, 6], [37, 8], [3, 8]], 'W');
      for (let i = 0; i < 4; i++) {
        const x = 8 + i * 7;
        g.rect(x, 3, 2, 3, 'r');
        g.set(x, 2, 's');
        g.set(x + 1, 2, 's');
        const ox = frame ? -2 : 2;
        g.line(x + 1, 5, x + 1 + ox, 8, 'X');
      }
      g.set(34, 4, 'b');
      g.set(34, 3, 's');
      return g.outline();
    },
    flag(c, frame) {
      const g = new Px(14, 34);
      g.rect(0, 0, 2, 34, 'z');
      for (let y = 0; y < 7; y++)
        for (let x = 2; x < 13; x++) {
          const wave = Math.round(Math.sin(x * 0.7 + frame * 1.6) * 0.8);
          if (y + wave >= 1 && y + wave < 8) g.set(x, y + wave + 1, c);
        }
      g.rim();
      return g.outline();
    },

    /* lamps for each part of the walk */
    lampTech() {
      const g = new Px(12, 50);
      g.rect(2, 45, 7, 5, 'x');
      g.rect(4, 6, 3, 40, 'W');
      g.rect(4, 4, 8, 3, 'W');
      g.rim('Wx');
      g.rect(6, 7, 6, 1, '9');
      g.rect(5, 14, 1, 24, '9');
      return g.outline();
    },
    lampJunk() {
      const g = new Px(16, 50);
      g.line(4, 49, 5, 6, 'M', 3);
      g.line(5, 6, 13, 5, 'm', 2);
      g.line(7, 12, 5, 9, 'm');
      g.rim('mM');
      g.rect(12, 7, 1, 3, 'k');
      g.rect(10, 10, 5, 8, 'k');
      g.rect(11, 11, 3, 6, 'e');
      [[4, 20], [5, 33], [6, 6], [11, 5]].forEach(([x, y]) => g.set(x, y, 'k'));
      return g.outline();
    },
    lampMarble() {
      const g = new Px(12, 50);
      g.rect(0, 44, 12, 6, 'W');
      g.rect(1, 41, 10, 3, 'W');
      g.rect(3, 15, 6, 26, 'W');
      g.rect(1, 12, 10, 3, 'W');
      g.rect(2, 9, 8, 3, 'Y');
      g.ellipse(6, 6, 3.6, 3.6, 'e');
      g.rim('WYe');
      [4, 6].forEach((x) => g.rect(x, 16, 1, 24, 'x'));
      return g.outline();
    },
    cypress() {
      const g = new Px(14, 46);
      g.rect(6, 38, 2, 8, 'M');
      g.ellipse(7, 21, 5.5, 19, 'G');
      g.rim();
      for (let i = 0; i < 30; i++) {
        const x = 2 + ((i * 7) % 10), y = 4 + ((i * 11) % 34);
        if (g.get(x, y) === 'G') g.set(x, y, i % 2 ? '3' : 'g');
      }
      return g.outline();
    },

    /* boats for each stretch of water */
    hydrofoil() {
      const g = new Px(28, 13);
      g.line(7, 7, 6, 12, 'Z');
      g.line(20, 7, 21, 12, 'Z');
      g.rect(3, 12, 6, 1, 'Z');
      g.rect(18, 12, 6, 1, 'Z');
      g.poly([[0, 3], [23, 3], [27.5, 6], [3, 8]], 'W');
      g.rect(8, 0, 10, 3, 'W');
      g.rim('W');
      g.rect(15, 1, 3, 2, 'u');
      for (let x = 4; x < 21; x += 3) g.rect(x, 4, 2, 1, 'b');
      g.rect(2, 6, 21, 1, '9');
      return g.outline();
    },
    sub() {
      const g = new Px(32, 9);
      g.ellipse(16, 9, 15.5, 3.5, 'Z');
      g.rect(11, 2, 8, 5, 'Z');
      g.rect(14, 0, 3, 1, 'X');
      g.rect(14, 1, 1, 1, 'X');
      g.rim('ZX');
      g.rect(12, 4, 6, 1, 'y');
      return g.outline();
    },
    droneBoat() {
      const g = new Px(16, 8);
      g.poly([[0, 4], [13, 4], [16, 6], [2, 7.5]], 'k');
      g.rect(5, 1, 5, 3, 'Z');
      g.rect(7, 0, 1, 1, 'X');
      g.rim('kZ');
      g.rect(1, 5, 13, 1, 'a');
      return g.outline();
    },
    barge() {
      const g = new Px(36, 8);
      g.poly([[0, 2], [36, 2], [34, 7], [2, 7]], 'z');
      g.rect(0, 1, 36, 2, 'X');
      g.rim('zX');
      g.rect(14, 1, 8, 1, 'y');
      for (let x = 3; x < 34; x += 6) g.set(x, 5, 'Z');
      return g.outline();
    },
    rocket() {
      const g = new Px(10, 26);
      g.poly([[5, 0], [8, 6], [2, 6]], 'r');
      g.rect(2, 6, 6, 15, 'W');
      g.poly([[2, 15], [0, 21], [2, 21]], 'r');
      g.poly([[8, 15], [10, 21], [8, 21]], 'r');
      g.rect(3, 21, 4, 2, 'Z');
      g.rim('rW');
      g.ellipse(5, 10, 1.5, 1.5, 'b');
      g.rect(2, 14, 6, 1, 'x');
      return g.outline();
    },
    flame(f) {
      const g = new Px(8, 13);
      const len = f ? 12 : 9;
      g.poly([[1, 0], [7, 0], [4, len]], 'a');
      g.poly([[2.5, 0], [5.5, 0], [4, len - 4]], 'e');
      return g;
    },
    drone(f) {
      const g = new Px(15, 6);
      g.rect(5, 2, 5, 3, 'Z');
      g.rect(1, 2, 13, 1, 'Z');
      g.rect(2, 1, 1, 1, 'Z');
      g.rect(12, 1, 1, 1, 'Z');
      g.rect(f ? 0 : 1, 0, f ? 5 : 3, 1, 'x');
      g.rect(f ? 10 : 11, 0, f ? 5 : 3, 1, 'x');
      g.set(7, 4, '9');
      return g.outline();
    },
    raft() {
      const g = new Px(28, 20);
      g.rect(1, 15, 26, 3, 'm');
      for (let x = 1; x < 27; x += 5) g.rect(x, 15, 1, 3, 'M');
      g.ellipse(5, 17, 3, 2, 'r');
      g.ellipse(22, 17, 3, 2, 'b');
      g.rect(12, 1, 1, 14, 'M');
      g.poly([[13, 2], [24, 5], [22, 13], [13, 12]], 'U');
      g.rim('mUrb');
      g.rect(12, 0, 3, 1, 'r');
      return g.outline();
    },
    tub() {
      const g = new Px(22, 16);
      g.poly([[1, 9], [21, 9], [19, 15], [3, 15]], 'W');
      g.rect(0, 8, 22, 2, 'W');
      g.rect(10, 1, 1, 8, 'k');
      g.poly([[4, 3], [10, 0], [17, 3]], 'r');
      g.rim('Wr');
      g.rect(3, 15, 2, 1, 'Y');
      g.rect(17, 15, 2, 1, 'Y');
      g.ellipse(16, 7, 1.6, 1.4, 'y');
      g.set(18, 7, 'a');
      return g.outline();
    },
    rowboat() {
      const g = new Px(24, 8);
      g.poly([[0, 2], [24, 2], [20, 7], [3, 7]], 'm');
      g.rim('m');
      g.rect(6, 3, 3, 2, 'F');
      g.rect(15, 4, 2, 2, 'R');
      g.line(10, 2, 4, 7, 'M');
      g.line(14, 2, 20, 7, 'M');
      return g.outline();
    },
    swan() {
      const g = new Px(30, 20);
      g.poly([[2, 12], [26, 12], [23, 18], [5, 18]], 'X');
      g.poly([[16, 4], [27, 9], [26, 13], [14, 13]], 'w');
      g.line(25, 9, 26, 2, 'w', 2);
      g.ellipse(25.5, 2, 2, 1.6, 'w');
      g.rect(3, 9, 10, 2, 'G');
      g.rect(3, 6, 1, 3, 'G');
      g.rect(12, 6, 1, 3, 'G');
      g.rim('wXG');
      g.set(27, 2, 'a');
      g.set(28, 2, 'a');
      g.set(25, 1, 'k');
      return g.outline();
    },
    gondola() {
      const g = new Px(34, 18);
      g.poly([[0, 10], [6, 14], [28, 14], [34, 8], [32, 16], [4, 17]], 'k');
      g.rect(31, 6, 2, 3, 'x');
      g.rect(9, 6, 3, 6, 'w');
      for (let y = 7; y < 12; y += 2) g.rect(9, y, 3, 1, 'r');
      g.rect(9, 3, 3, 3, 's');
      g.rect(8, 2, 5, 1, 'f');
      g.line(13, 6, 18, 16, 'M');
      g.rim('kw');
      return g.outline();
    },
    ferry() {
      const g = new Px(38, 14);
      g.poly([[0, 7], [36, 7], [38, 9], [34, 13], [3, 13]], 'W');
      g.rect(6, 2, 24, 5, 'W');
      g.rect(10, 0, 14, 2, 'W');
      g.rim('W');
      g.rect(1, 10, 35, 2, 'b');
      for (let x = 8; x < 29; x += 3) g.rect(x, 4, 2, 2, 'u');
      g.rect(26, 0, 2, 2, 'Z');
      return g.outline();
    }
  };

  // Wooden chapter signpost with a label
  function signpost(label) {
    const t = text(label, 'C');
    const w = t.w + 10, h = 11;
    const g = new Px(w + 6, h + 26);
    g.rect(Math.floor(w / 2), h, 4, 26, 'M');
    g.poly([[0, 0], [w, 0], [w + 5, h / 2], [w, h], [0, h]], 'm');
    g.rim();
    g.outline();
    g.blit(t, 5, 3);
    return g;
  }

  // Green highway sign
  function highwaySign(lines) {
    const ts = lines.map((l) => text(l, 'w'));
    const w = Math.max(...ts.map((t) => t.w)) + 10, h = ts.length * 8 + 5;
    const g = new Px(w, h + 30);
    g.rect(6, h, 3, 30, 'X');
    g.rect(w - 9, h, 3, 30, 'X');
    g.rect(0, 0, w, h, 'G');
    g.rect(1, 1, w - 2, 1, 'w');
    g.rect(1, h - 2, w - 2, 1, 'w');
    g.rect(1, 1, 1, h - 2, 'w');
    g.rect(w - 2, 1, 1, h - 2, 'w');
    ts.forEach((t, i) => g.blit(t, Math.floor((w - t.w) / 2), 4 + i * 8));
    return g.outline();
  }

  // Harvard-style brick gate with an iron arch
  function gate() {
    const W = 84, H = 60, g = new Px(W, H);
    const pillar = (x) => {
      g.rect(x, 14, 14, 46, 'r');
      for (let y = 16; y < 60; y += 3) {
        g.rect(x, y, 14, 1, 'R');
        for (let i = (y % 6 === 1 ? 2 : 5); i < 14; i += 6) g.rect(x + i, y - 2, 1, 2, 'R');
      }
      g.rect(x - 1, 10, 16, 4, 'W');
      g.rect(x + 3, 6, 8, 4, 'W');
      g.ellipse(x + 7, 4, 3, 3, 'W');
    };
    for (let x = 17; x < 67; x++) {
      const t = (x - 17) / 49;
      const top = Math.round(20 - Math.sin(t * Math.PI) * 12);
      g.set(x, top, 'k');
      g.set(x, top + 1, 'k');
      if ((x - 17) % 4 === 0) g.rect(x, top, 1, 60 - top, 'k');
    }
    g.rect(17, 36, 50, 1, 'k');
    g.rect(17, 58, 50, 2, 'k');
    pillar(3);
    pillar(67);
    g.rim('rRW');
    g.outline();
    const t = text('HARVARD', 'y');
    g.rect(42 - Math.ceil(t.w / 2) - 2, 13, t.w + 4, 9, 'k');
    g.blit(t, 42 - Math.ceil(t.w / 2), 15);
    return g;
  }

  // St. Ann & the Holy Trinity, Brooklyn Heights: Gothic Revival brownstone
  // with a central tower that lost its spire in 1906 (now flat-topped).
  function church() {
    const W = 76, H = 134, g = new Px(W, H);
    const pal = ['b', 'v', 'r', 'y', 't', 'b', 'p', 'c'];
    const glass = (x, y) => g.set(x, y, pal[(x * 3 + y * 5) % pal.length]);
    // pointed-arch opening, filled pixel by pixel
    const lancet = (x0, y0, w, h, fill) => {
      for (let y = 0; y < h; y++) {
        const inset = Math.max(0, Math.floor(w / 2) - 1 - y);
        for (let x = inset; x < w - inset; x++) fill(x0 + x, y0 + y);
      }
    };
    g.poly([[6, 72], [37.5, 40], [69, 72]], 'Z');
    g.rect(3, 70, 23, 64, '5');
    g.rect(50, 70, 23, 64, '5');
    g.poly([[1, 72], [26, 60], [26, 72]], 'Z');
    g.poly([[49, 60], [74, 72], [49, 72]], 'Z');
    g.rect(26, 14, 24, 120, '5');
    g.rect(24, 10, 28, 4, '7');
    for (let x = 25; x < 51; x += 4) g.rect(x, 7, 2, 3, '5');
    [24, 48].forEach((x) => {
      g.rect(x, 3, 4, 11, '5');
      g.rect(x + 1, 0, 2, 3, '5');
    });
    [22, 50].forEach((x) => {
      g.rect(x, 56, 4, 78, '6');
      g.rect(x + 1, 52, 2, 4, '6');
    });
    [0, 72].forEach((x) => {
      g.rect(x, 74, 4, 60, '6');
      g.rect(x + 1, 63, 2, 11, '5');
      g.rect(x + 1, 61, 1, 2, '5');
    });
    g.rim('567Z');
    [29, 42].forEach((x) => lancet(x, 18, 5, 16, (px, py) => g.set(px, py, py % 2 ? 'k' : 'Z')));
    g.ellipse(38, 45.5, 5, 5, '7');
    g.ellipse(38, 45.5, 3.6, 3.6, 'b');
    g.rect(37, 42, 2, 8, '6');
    g.rect(34, 45, 8, 1, '6');
    lancet(32, 53, 12, 22, glass);
    [35, 40].forEach((x) => g.rect(x, 58, 1, 17, '6'));
    g.rect(32, 64, 12, 1, '6');
    lancet(30, 104, 16, 30, (px, py) => g.set(px, py, '7'));
    lancet(32, 107, 12, 27, (px, py) => g.set(px, py, 'H'));
    g.rect(37, 111, 2, 23, 'k');
    [7, 64].forEach((x) => lancet(x, 100, 5, 28, glass));
    g.rect(29, 131, 18, 3, 'x');
    g.outline();
    // the school's name on a sign band across the front
    const t = text("SAINT ANN'S", 'y');
    const pw = t.w + 14, px = Math.round(38 - pw / 2);
    g.rect(px - 1, 77, pw + 2, 14, '7');
    g.rect(px, 78, pw, 12, 'k');
    g.blit(t, px + 7, 82);
    return g;
  }

  // Chequered finish-line banner
  function finishSign() {
    const W = 64, g = new Px(W, 46);
    g.rect(3, 4, 3, 42, 'X');
    g.rect(W - 6, 4, 3, 42, 'X');
    g.rect(2, 2, 5, 2, 'x');
    g.rect(W - 7, 2, 5, 2, 'x');
    g.rect(0, 6, W, 15, 'w');
    for (let y = 6; y < 21; y += 3)
      for (let x = 0; x < W; x += 3) if ((x / 3 + (y - 6) / 3) % 2 === 0) g.rect(x, y, 3, 3, 'k');
    g.outline();
    const t = text('FINISH', 'k');
    g.rect(32 - Math.ceil(t.w / 2) - 3, 8, t.w + 6, 11, 'w');
    g.blit(t, 32 - Math.ceil(t.w / 2), 11);
    return g;
  }

  /* ---------------------------------------------------------------- font */
  // 3x5 capitals (a few glyphs are wider). Used for signs painted in the world.
  const FONT = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
    6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
    "'": ['#', '#', '.', '.', '.'], '.': ['.', '.', '.', '.', '#'], '!': ['#', '#', '#', '.', '#'],
    '-': ['...', '...', '###', '...', '...'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
    '>': ['#..', '##.', '###', '##.', '#..'], '<': ['..#', '.##', '###', '.##', '..#'],
    ' ': ['..', '..', '..', '..', '..']
  };
  function text(str, color) {
    const glyphs = str.toUpperCase().split('').map((ch) => FONT[ch] || FONT[' ']);
    const w = glyphs.reduce((s, gl) => s + gl[0].length + 1, -1);
    const g = new Px(Math.max(1, w), 5);
    let x = 0;
    glyphs.forEach((gl) => {
      gl.forEach((row, y) => {
        for (let i = 0; i < row.length; i++) if (row[i] === '#') g.set(x + i, y, color);
      });
      x += gl[0].length + 1;
    });
    return g;
  }

  /* ------------------------------------------------------------ canvases */
  const RGB = {};
  function rgbOf(c) {
    if (!RGB[c]) {
      const h = PAL[c];
      RGB[c] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    }
    return RGB[c];
  }
  // Grid -> canvas. Optional tint mixes every pixel towards a colour (for haze).
  function toCanvas(px, scale = 1, tint) {
    const t = document.createElement('canvas');
    t.width = px.w;
    t.height = px.h;
    const tctx = t.getContext('2d');
    const img = tctx.createImageData(px.w, px.h);
    let tr, tg, tb;
    if (tint) {
      tr = parseInt(tint.color.slice(1, 3), 16);
      tg = parseInt(tint.color.slice(3, 5), 16);
      tb = parseInt(tint.color.slice(5, 7), 16);
    }
    for (let i = 0; i < px.d.length; i++) {
      const v = px.d[i];
      if (v === '.' || !PAL[v]) continue;
      let [r, g, b] = rgbOf(v);
      if (tint) {
        r += (tr - r) * tint.amount;
        g += (tg - g) * tint.amount;
        b += (tb - b) * tint.amount;
      }
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    if (scale === 1) return t;
    const c = document.createElement('canvas');
    c.width = px.w * scale;
    c.height = px.h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(t, 0, 0, c.width, c.height);
    return c;
  }

  const iconURLs = {};
  // Data URL of an icon at a given scale, for <img> tags in the interface
  function iconURL(name, scale = 4) {
    const key = name + '@' + scale;
    if (!iconURLs[key]) iconURLs[key] = toCanvas(name === 'logo' ? gearIcon(32) : icon(name), scale).toDataURL();
    return iconURLs[key];
  }

  HA.pix = {
    PAL, Px, ICON_NAMES: Object.keys(ICONS),
    buildCharacter, icon, gearIcon, PROPS, signpost, highwaySign, gate, church, finishSign, text,
    toCanvas, iconURL
  };
})();
