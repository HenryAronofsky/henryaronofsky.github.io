/* Desktop: the side-scrolling walk.
   Layers are drawn back to front at device resolution, each scaled up from
   its pixel-art canvas, so slow parallax layers glide smoothly instead of
   jumping a whole art pixel at a time. */
(function () {
  'use strict';
  const HA = (window.HA = window.HA || {});

  const T = {
    walk: 92, run: 172, acc: 950, dec: 1300, air: 620,
    gUp: 860, gCut: 1900, gDown: 1250, jump: 268, maxFall: 560,
    coyote: 0.09, buffer: 0.13, near: 50, far: 56
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function create(content) {
    const P = HA.pix, SC = HA.scenery, ui = HA.ui;
    const world = SC.build(content), L = world.L;
    const RM = matchMedia('(prefers-reduced-motion: reduce)');
    const canvas = document.getElementById('world');
    const ctx = canvas.getContext('2d');
    const stage = document.getElementById('stage');
    const titleEl = document.getElementById('title-card');
    const controlsEl = document.getElementById('controls');

    /* ------------------------------------------------------------ art */
    const mk = (g) => P.toCanvas(g);
    const CH = P.buildCharacter();
    const frames = {};
    Object.keys(CH.side).forEach((name) => {
      const f = CH.side[name];
      frames[name] = (Array.isArray(f) ? f : [f]).map((g) => ({ r: mk(g), l: mk(g.flip()) }));
    });
    const ghost = P.toCanvas(CH.side.idle[0], 1, { color: '#ffffff', amount: 1 });
    const icons = {};
    L.stops.forEach((s) => (icons[s.id] = mk(P.icon(s.icon))));
    const A = P.PROPS;
    const pigeonArt = A.pigeon().map((g) => ({ r: mk(g), l: mk(g.flip()) }));
    const birdArt = A.bird().map(mk);
    const droneArt = [mk(A.drone(0)), mk(A.drone(1))];
    const flagArt = [0, 1, 2, 3].map((f) => mk(A.flag('R', f)));
    const boatArt = {
      sailR: mk(A.sailboat('r')), sailB: mk(A.sailboat('b')), sailY: mk(A.sailboat('y')), ferry: mk(A.ferry()),
      shell: [mk(A.shell(0)), mk(A.shell(1))], hydrofoil: mk(A.hydrofoil()), sub: mk(A.sub()), droneBoat: mk(A.droneBoat()),
      raft: mk(A.raft()), tub: mk(A.tub()), rowboat: mk(A.rowboat()), swan: mk(A.swan()), gondola: mk(A.gondola())
    };
    const bargeArt = mk(A.barge()), rocketArt = mk(A.rocket()), flameArt = [mk(A.flame(0)), mk(A.flame(1))];
    const teleArt = [mk(A.telescope(false)), mk(A.telescope(true))], coinArt = mk(A.coin());
    const kongArt = [0, 1, 2].map((p) => mk(A.kong(p)));
    const cthArt = [0, 1].map((f) => mk(A.cthulhu(f)));
    const planeArt = [0, 1].map((f) => ({ r: mk(A.biplane(f)), l: mk(A.biplane(f).flip()) }));

    /* ---------------------------------------------------------- state */
    let S = 4, dpr = 1, k = 4, vw = 0, vh = 0, VW = 0, VH = 0, G = 0, SHORE = 0;
    let skyCanvas = null, waters = [];
    let raf = 0, last = 0, time = 0, running = false;
    const char = { x: L.spawn, y: 0, vx: 0, vy: 0, face: 1, ground: true, plat: null, squat: false, coyote: 0, buffer: 0, jumpHeld: false, dist: 0, land: 0, blinkAt: 2.5, dropUntil: 0 };
    const cam = { x: 0, lead: 0.36 };
    const keys = { left: false, right: false, down: false, run: false };
    let spawnT = 0, spawning = true, autoRun = null, active = null, chapter = null, camStart = 0, chromeOn = false;
    let idleT = 0, feedT = 0, tossT = 0, crumbs = [];
    let particles = [], birds = [], nextFlock = 6, mainZone = 0, guideShown = false, guideGone = false, walked = 0;
    let pigeons = [];
    L.pigeons.forEach((g, gi) => {
      for (let i = 0; i < g.n; i++)
        pigeons.push({ hx: g.x + i * 11 - g.n * 5, x: g.x + i * 11 - g.n * 5, y: 0, vx: 0, vy: 0, face: (i + gi) % 2 ? 1 : -1, fly: false, t: Math.random() * 3, gone: false });
    });
    // Boats for each kind of water: [art, x, depth below the far shore, parallax, speed]
    const FLEET = {
      harbor: [['sailR', 120, 9, 0.22, 5], ['ferry', 560, 20, 0.3, -9], ['sailB', 900, 14, 0.26, -4], ['sailY', 1200, 11, 0.24, 6]],
      charles: [['sailB', 300, 12, 0.24, 5], ['shell', 640, 24, 0.33, 14], ['sailR', 980, 10, 0.22, -4], ['shell', 1260, 20, 0.31, -12]],
      tech: [['hydrofoil', 200, 22, 0.32, 22], ['sub', 640, 26, 0.34, -6], ['droneBoat', 920, 14, 0.26, 12], ['hydrofoil', 1180, 12, 0.24, -18]],
      junk: [['raft', 260, 18, 0.28, 4], ['tub', 660, 24, 0.32, -5], ['rowboat', 1000, 12, 0.24, 6]],
      marble: [['swan', 300, 20, 0.3, 4], ['gondola', 720, 26, 0.34, -6], ['sailR', 1100, 10, 0.22, 5]]
    };
    const boats = [];
    L.zones.forEach((z, zi) => (FLEET[z.style.boats] || []).forEach(([art, x, y, p, v]) => boats.push({ art, x: x + zi * 97, y, p, v, zi })));
    // How much of each zone's backdrop is showing; eased so changes always fade
    let zw = L.zones.map((z, i) => (i ? 0 : 1));
    const techZone = L.zones.findIndex((z) => z.style.sky === 'drones');
    const rocket = { state: 'pad', y: 0, v: 0, wait: 2.5 };
    let smoke = [];
    // The coin-operated viewer at the far left end of the walk
    const TX = L.telescope;
    const TELE = { id: 'telescope', x: TX, kicker: 'Tourist viewer', title: 'Look across the harbor', subtitle: 'Pay 5¢ to use', cta: 'insert 5¢' };
    const scope = { state: 'off', t: 0, used: false, paid: false, cx: 272, cy: 70, vx: 0, vy: 0, zoom: 2, left: 0, aim: null, drag: null, wheel: 0, shown: -1, keys: { left: false, right: false, up: false, down: false, run: false } };
    const scopeHint = document.getElementById('scope-hint');
    const scopeTime = document.getElementById('scope-time');
    let scopeSky = null, maskC = null, maskFull = null;
    const shimmer = [];
    for (let i = 0; i < 90; i++) shimmer.push({ x: Math.random() * 3000, row: Math.random(), ph: Math.random() * 6.28, w: 2 + Math.floor(Math.random() * 3) });

    /* -------------------------------------------------------- sizing */
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = window.innerWidth;
      vh = window.innerHeight;
      // Scale follows the window height only, so narrowing the window just shows
      // less of the walk instead of shrinking the ground (phones get the vertical layout)
      S = clamp(Math.round(vh / 235), 2, 8);
      k = S * dpr;
      VW = Math.ceil(vw / S);
      VH = Math.ceil(vh / S);
      G = VH - 46;
      SHORE = G - 64;
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      ctx.imageSmoothingEnabled = false;
      skyCanvas = SC.sky(VW + 2, SHORE + 4, SHORE);
      waters = L.zones.map((z) => waterGradient(z.style.water[0], z.style.water[1]));
      scopeSky = SC.sky(VW + 2, VH * 2, VH * 2);
      maskC = SC.cv(VW, VH);
      maskFull = null;
      document.documentElement.style.setProperty('--px', S + 'px');
      if (!spawning) camera(1);
      draw();
    }
    function waterGradient(top, bottom) {
      const h = G - 8 - SHORE, c = SC.cv(1, h), g = c.getContext('2d');
      for (let y = 0; y < h; y++) {
        const t = Math.floor((y / h) * 6) / 6;
        g.fillStyle = `rgb(${top.map((v, i) => Math.round(v + (bottom[i] - v) * t)).join(',')})`;
        g.fillRect(0, y, 1, 1);
      }
      return c;
    }

    /* --------------------------------------------------------- drawing */
    const R = (v) => Math.round(v * k);
    function put(img, x, y, alpha) {
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.drawImage(img, R(x), R(y), img.width * k, img.height * k);
      if (alpha !== undefined) ctx.globalAlpha = 1;
    }
    // Draw the visible slice of a wide layer canvas scrolled by camX * p
    function layer(img, p, y, extra = 0) {
      const off = cam.x * p - extra;
      const sx = Math.max(0, Math.floor(off) - 1);
      const sw = Math.min(img.width - sx, VW + 3);
      if (sw <= 0) return;
      ctx.drawImage(img, sx, 0, sw, img.height, R(sx - off), R(y), sw * k, img.height * k);
    }
    function box(x, y, w, h, color, alpha) {
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      ctx.fillStyle = color;
      ctx.fillRect(R(x), R(y), Math.max(1, R(x + w) - R(x)), Math.max(1, R(y + h) - R(y)));
      ctx.globalAlpha = 1;
    }

    function draw() {
      if (!skyCanvas) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (scope.state === 'open' || scope.state === 'view' || scope.state === 'close') return drawScope();
      ctx.drawImage(skyCanvas, 0, 0, skyCanvas.width * k, skyCanvas.height * k);
      // sun and clouds
      put(world.sun, VW * 0.8 - 22 - cam.x * 0.01, 4);
      drawClouds(world.cloudsFar, 0.03, 3, 18, 0.9);
      // far backdrops, cross-fading as you move from one part of the walk to the next
      const farY = SHORE - SC.FAR_H;
      world.far.forEach((f, i) => {
        if (zw[i] < 0.004) return;
        ctx.globalAlpha = Math.min(1, zw[i]);
        layer(f.img, SC.PARALLAX.far, farY, f.origin);
      });
      ctx.globalAlpha = 1;
      drawClouds(world.cloudsNear, 0.06, 6, 34, 0.75);
      drawWater();
      drawBirds();
      // riverbank, walkway, props
      layer(world.bank, SC.PARALLAX.bank, G - 10 - SC.BANK_H);
      layer(world.near, 1, G - SC.NEAR_TOP);
      drawFlags();
      world.front.forEach((f) => {
        if (f.x + f.img.width < cam.x - 2 || f.x > cam.x + VW + 2) return;
        put(f.img, f.x - cam.x, G + f.y);
      });
      drawStops();
      drawTelescope();
      crumbs.forEach((c) => box(c.x - cam.x, G + c.y, c.air ? 1 : 2, 1, '#ecc993'));
      drawPigeons();
      drawChar();
      drawCoin();
      drawParticles();
      layer(world.fore, SC.PARALLAX.fore, VH - 30);
      // the screen goes dark on the way into the viewer, and lightens on the way out
      if (scope.state === 'dark') box(0, 0, VW + 1, VH + 1, '#0b0912', clamp(scope.t / 0.3, 0, 1));
      if (scope.state === 'out') box(0, 0, VW + 1, VH + 1, '#0b0912', clamp(1 - scope.t / 0.35, 0, 1));
    }

    function drawClouds(list, p, y0, spread, alpha) {
      const span = VW + 160;
      list.forEach((c, i) => {
        const base = i * (span / list.length) + i * 37;
        const x = (((base - cam.x * p - time * (2 + i * 0.6)) % span) + span) % span - 80;
        put(c, x, y0 + ((i * 13) % spread), alpha);
      });
    }

    function drawWater() {
      const h = G - 8 - SHORE, y0 = R(SHORE), hh = R(G - 8) - R(SHORE);
      const order = zw.map((w, i) => [w, i]).filter(([w]) => w > 0.004).sort((a, b) => b[0] - a[0]);
      order.forEach(([w, i], n) => {
        ctx.globalAlpha = n === 0 ? 1 : w;
        ctx.drawImage(waters[i], 0, 0, 1, h, 0, y0, canvas.width, hh);
      });
      // wobbly reflections of whatever stands across the river
      const p = SC.PARALLAX.far;
      order.forEach(([w, i]) => {
        const f = world.far[i], img = f.img, off = cam.x * p - f.origin;
        const sx = Math.max(0, Math.floor(off) - 2), sw = Math.min(img.width - sx, VW + 6);
        if (sw <= 0) return;
        for (let r = 0; r < h; r++) {
          const src = SC.FAR_H - 1 - Math.floor(r * 1.15);
          if (src < 0) break;
          const wob = RM.matches ? 0 : Math.round(Math.sin(time * 1.7 + r * 0.6) * (0.4 + r * 0.05));
          ctx.globalAlpha = w * 0.32 * (1 - r / h);
          ctx.drawImage(img, sx, src, sw, 1, R(sx - off + wob), R(SHORE + r), sw * k, k);
        }
      });
      ctx.globalAlpha = 1;
      // sparkles on the water
      shimmer.forEach((s) => {
        const row = Math.floor(s.row * (h - 2)) + 1;
        const pp = 0.25 + (row / h) * 0.5;
        const x = ((s.x - cam.x * pp) % (VW + 40) + VW + 40) % (VW + 40) - 20;
        const tw = Math.sin(time * 2.4 + s.ph);
        if (tw > 0.35) box(x, SHORE + row, s.w, 1, '#ffffff', (tw - 0.35) * 1.1);
      });
      // boats that belong to this stretch of water
      boats.forEach((b) => {
        const w = zw[b.zi];
        if (w < 0.02) return;
        const span = 1400;
        const bx = (((b.x + time * b.v - cam.x * b.p) % span) + span) % span - 100;
        if (bx < -60 || bx > VW + 10) return;
        const art = b.art === 'shell' ? boatArt.shell[Math.floor(time * 2.5) % 2] : boatArt[b.art];
        put(art, bx, SHORE + b.y - art.height + 2, Math.min(1, w));
      });
      drawRocket();
    }

    // A rocket on a floating launch pad in the experience stretch; it lifts off now and then
    function bargeX() {
      const z = L.zones[techZone], p = 0.27;
      const mid = (z.from + Math.min(z.to, L.len)) / 2;
      return mid * p + VW * 0.7 - cam.x * p;
    }
    function drawRocket() {
      if (techZone < 0 || zw[techZone] < 0.02) return;
      const bx = bargeX(), by = SHORE + 17;
      if (bx < -60 || bx > VW + 30) return;
      const a = Math.min(1, zw[techZone]);
      smoke.forEach((s) => {
        const al = a * 0.7 * Math.min(1, s.life / s.max);
        box(bx + s.dx - s.r, s.y - s.r * 0.6, s.r * 2, s.r * 1.2, '#f2f5f8', al);
        box(bx + s.dx - s.r * 0.6, s.y - s.r, s.r * 1.2, s.r * 2, '#f2f5f8', al);
      });
      const top = by - bargeArt.height + 2;
      put(bargeArt, bx, top, a);
      if (rocket.state === 'gone') return;
      const ry = top - rocketArt.height + 2 - rocket.y;
      if (rocket.state === 'launch') put(flameArt[Math.floor(time * 16) % 2], bx + 14, ry + rocketArt.height - 4, a);
      put(rocketArt, bx + 13, ry, a);
    }

    function drawBirds() {
      birds.forEach((b) => {
        if (b.kind === 'drone') put(droneArt[Math.floor(time * 20 + b.ph) % 2], b.x, b.y + Math.sin(time * 3 + b.ph) * 1.5);
        else put(birdArt[Math.floor(time * 6 + b.ph) % 2], b.x, b.y);
      });
    }

    function drawFlags() {
      const h = L.byId.harvard;
      if (!h) return;
      const f = flagArt[Math.floor(time * 5) % 4];
      [h.x - 58, h.x + 46].forEach((fx) => {
        if (fx > cam.x - 20 && fx < cam.x + VW + 20) put(f, fx - cam.x, G - 6 - f.height);
      });
    }

    function stopIconY(s, i) {
      const bob = RM.matches ? 0 : Math.sin(time * 2.2 + i * 1.3) * (s === active ? 2.4 : 1.2);
      return G - 19 - 24 + bob - (s === active ? 2 : 0);
    }
    function drawStops() {
      L.stops.forEach((s, i) => {
        if (s.x < cam.x - 30 || s.x > cam.x + VW + 30) return;
        const y = stopIconY(s, i), x = s.x - cam.x - 12;
        if (s === active) {
          const pulse = 0.3 + Math.sin(time * 4) * 0.1;
          box(x - 2, y + 2, 28, 20, '#fff1a6', pulse * 0.55);
          box(x + 2, y - 2, 20, 28, '#fff1a6', pulse * 0.55);
          box(x + 5, y + 24, 14, G - 16 - (y + 24), '#fff1a6', pulse * 0.35);
        } else if (!ui.visited.has(s.id)) {
          box(x + 10, y - 9 + Math.sin(time * 3 + i) * 1.5, 4, 4, '#ffffff', 0.9);
          box(x + 11, y - 10 + Math.sin(time * 3 + i) * 1.5, 2, 6, '#ffffff', 0.9);
        }
        put(icons[s.id], x, y);
      });
    }

    function drawPigeons() {
      pigeons.forEach((p) => {
        if (p.gone || p.x < cam.x - 20 || p.x > cam.x + VW + 20) return;
        let f;
        if (p.fly || p.arrive) f = pigeonArt[2 + (Math.floor(time * 14) % 2)];
        else f = pigeonArt[Math.sin(p.t * (p.eating ? 9 : 2.3)) > (p.eating ? 0 : 0.6) ? 1 : 0];
        put(p.face > 0 ? f.r : f.l, p.x - cam.x - 5, G - 6 - p.y);
      });
    }

    function charFrame() {
      if (spawning && spawnT > 0.95 && spawnT < 1.15) return frames.land[0];
      if (!char.ground) return char.vy > 30 ? frames.jump[0] : frames.fall[0];
      if (char.land > 0) return frames.land[0];
      if (char.squat) return frames.squat[0];
      if (tossT > 0) return frames.toss[tossT > 0.22 ? 0 : 1];
      const sp = Math.abs(char.vx);
      if (sp > 140) return frames.run[Math.floor(sp > 600 ? time * 18 : char.dist / 12) % 8];
      if (sp > 6) return frames.walk[Math.floor(char.dist / 7) % 8];
      const blink = time > char.blinkAt && time < char.blinkAt + 0.13;
      if (time > char.blinkAt + 0.13) char.blinkAt = time + 2.5 + Math.random() * 3;
      return frames.idle[blink ? 1 : 0];
    }

    function drawChar() {
      const x = char.x - cam.x - 12, y = G - char.y - 33;
      if (spawning) {
        const t = spawnT;
        // beam of light
        if (t < 1.1) {
          const a = t < 0.3 ? t / 0.3 : t > 0.8 ? Math.max(0, (1.1 - t) / 0.3) : 1;
          box(x + 6, 0, 12, G + 2, '#fff7cf', a * 0.35);
          box(x + 9, 0, 6, G + 2, '#ffffff', a * 0.5);
        }
        if (t < 0.35) return;
        const f = frames.idle[0].r;
        const reveal = clamp((t - 0.35) / 0.45, 0, 1);
        const rows = Math.ceil(f.height * reveal);
        ctx.drawImage(f, 0, f.height - rows, f.width, rows, R(x), R(y + f.height - rows), f.width * k, rows * k);
        const white = clamp(1 - (t - 0.55) / 0.4, 0, 1);
        if (white > 0) {
          ctx.globalAlpha = white;
          ctx.drawImage(ghost, 0, f.height - rows, f.width, rows, R(x), R(y + f.height - rows), f.width * k, rows * k);
          ctx.globalAlpha = 1;
        }
        if (t < 0.95) return;
      }
      const f = charFrame();
      put(char.face > 0 ? f.r : f.l, x, y);
    }

    function drawParticles() {
      particles.forEach((p) => {
        const a = clamp(p.life / p.max, 0, 1);
        if (p.kind === 'spark') {
          box(p.x - cam.x - 1, p.y, 3, 1, p.c, a);
          box(p.x - cam.x, p.y - 1, 1, 3, p.c, a);
        } else if (p.kind === 'line') {
          box(p.x - cam.x, p.y, p.w, 1, '#ffffff', a * 0.7);
        } else box(p.x - cam.x, p.y, p.s, p.s, p.c, a * 0.9);
      });
    }

    /* ------------------------------------------------------- particles */
    function dust(x, n, dir) {
      for (let i = 0; i < n; i++)
        particles.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 8, y: G - 2 - char.y - Math.random() * 2, vx: (dir || (Math.random() - 0.5)) * (10 + Math.random() * 25), vy: -(6 + Math.random() * 14), life: 0.5, max: 0.5, s: 2, c: '#f4efe6' });
    }
    function sparks(x, y, n, c) {
      for (let i = 0; i < n; i++)
        particles.push({ kind: 'spark', x, y, vx: (Math.random() - 0.5) * 60, vy: -(20 + Math.random() * 40), life: 0.7, max: 0.7, c: c || (i % 2 ? '#fff1a6' : '#ffffff') });
    }

    /* --------------------------------------------------------- update */
    function update(dt) {
      time += dt;
      if (spawning) {
        spawnT += dt * (RM.matches ? 10 : 1);
        if (spawnT > 0.95 && !char.spawnDust) {
          char.spawnDust = true;
          dust(char.x, 8);
          sparks(char.x, G - 30, 8);
        }
        if (spawnT >= 1.2) {
          spawning = false;
          if (!guideGone) showGuide();
          if (pendingOpen) {
            const id = pendingOpen;
            pendingOpen = null;
            setTimeout(() => open(id), 250);
          }
        }
      } else move(dt);
      updateScope(dt);
      camera(dt);
      const tw = L.weights(cam.x + VW * 0.4);
      zw = zw.map((w, i) => w + (tw[i] - w) * Math.min(1, dt * 2.4));
      updateWorld(dt);
      updateUI();
    }

    function move(dt) {
      const wantL = keys.left, wantR = keys.right;
      let dir = (wantR ? 1 : 0) - (wantL ? 1 : 0);
      if (dir && autoRun) autoRun = null;
      char.squat = keys.down && char.ground && !autoRun;
      const top = keys.run ? T.run : T.walk;
      if (autoRun) {
        const dx = autoRun.x - char.x;
        if (Math.abs(dx) < 1.5 && Math.abs(char.vx) < 40) {
          char.x = autoRun.x;
          char.vx = 0;
          char.face = autoRun.face || char.face;
          const then = autoRun.then;
          autoRun = null;
          dust(char.x, 4, -char.face);
          if (then) then();
        } else {
          const vmax = clamp(autoRun.d0 / 1.15, 230, 1500);
          const want = Math.sign(dx) * Math.min(vmax, Math.sqrt(2 * 2200 * Math.abs(dx)));
          char.vx += clamp(want - char.vx, -3400 * dt, 3400 * dt);
          char.face = Math.sign(dx) || char.face;
        }
      } else if (char.squat) {
        char.vx -= Math.sign(char.vx) * Math.min(Math.abs(char.vx), T.dec * 1.4 * dt);
      } else if (dir) {
        const acc = char.ground ? T.acc : T.air;
        if (Math.sign(char.vx) !== dir) char.vx += dir * T.dec * dt;
        char.vx = clamp(char.vx + dir * acc * dt, -top, top);
        if (Math.abs(char.vx) > top) char.vx = Math.sign(char.vx) * top;
        char.face = dir;
      } else {
        const dec = char.ground ? T.dec : T.air * 0.5;
        char.vx -= Math.sign(char.vx) * Math.min(Math.abs(char.vx), dec * dt);
      }
      // jumping (buffered, with coyote time)
      char.buffer -= dt;
      char.coyote = char.ground ? T.coyote : char.coyote - dt;
      if (char.buffer > 0 && char.coyote > 0) {
        if (keys.down && char.plat) {
          char.dropUntil = time + 0.25;
          char.ground = false;
          char.plat = null;
        } else {
          char.vy = T.jump;
          char.ground = false;
          char.plat = null;
          dust(char.x, 3);
          ui.controls.did('move');
        }
        char.buffer = 0;
        char.coyote = 0;
      }
      if (!char.ground) {
        const g = char.vy > 0 ? (char.jumpHeld ? T.gUp : T.gCut) : T.gDown;
        char.vy = Math.max(-T.maxFall, char.vy - g * dt);
      }
      const ox = char.x, oy = char.y;
      char.x = clamp(char.x + char.vx * dt, 16, L.end + 4);
      if (char.x === 16 || char.x === L.end + 4) char.vx = 0;
      char.dist += Math.abs(char.x - ox);
      walked += Math.abs(char.x - ox);
      if (Math.abs(char.x - ox) > 0 && !autoRun && (keys.left || keys.right)) ui.controls.did('move');
      if (keys.run && Math.abs(char.vx) > T.walk + 10) ui.controls.did('run');
      // vertical: platforms and the ground
      if (!char.ground) {
        char.y += char.vy * dt;
        if (char.vy <= 0) {
          let landed = null;
          if (time > char.dropUntil)
            L.platforms.forEach((pl) => {
              if (char.x > pl.x0 - 4 && char.x < pl.x1 + 4 && oy >= pl.top - 0.01 && char.y <= pl.top) landed = !landed || pl.top > landed.top ? pl : landed;
            });
          if (landed) land(landed.top, landed, oy);
          else if (char.y <= 0) land(0, null, oy);
        }
      } else if (char.plat && (char.x < char.plat.x0 - 4 || char.x > char.plat.x1 + 4)) {
        char.ground = false;
        char.plat = null;
        char.vy = 0;
      }
      char.land = Math.max(0, char.land - dt);
      // dust while running
      if (char.ground && Math.abs(char.vx) > 150 && Math.random() < dt * (Math.abs(char.vx) > 500 ? 40 : 12)) dust(char.x - char.face * 6, 1, -char.face);
      if (Math.abs(char.vx) > 520 && Math.random() < dt * 30)
        particles.push({ kind: 'line', x: cam.x + Math.random() * VW, y: 20 + Math.random() * (G - 30), vx: -char.vx * 0.4, vy: 0, w: 10 + Math.random() * 24, life: 0.25, max: 0.25 });
    }

    function land(y, plat, oy) {
      const fall = oy - y;
      char.y = y;
      char.vy = 0;
      char.ground = true;
      char.plat = plat;
      if (fall > 8) {
        char.land = 0.09;
        dust(char.x, fall > 20 ? 6 : 3);
      }
    }

    function camera(dt) {
      const want = char.face > 0 ? 0.36 : 0.6;
      cam.lead += (want - cam.lead) * Math.min(1, dt * 2.2);
      const target = clamp(char.x - VW * cam.lead, 0, L.len - VW);
      const stiff = autoRun ? 9 : 5;
      cam.x += (target - cam.x) * Math.min(1, dt * stiff);
      if (Math.abs(target - cam.x) > VW * 0.45) cam.x = target - Math.sign(target - cam.x) * VW * 0.45;
      cam.x = clamp(cam.x, 0, Math.max(0, L.len - VW));
    }

    function updateWorld(dt) {
      particles.forEach((p) => {
        p.life -= dt;
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
        if (p.kind === 'spark') p.vy += 60 * dt;
      });
      particles = particles.filter((p) => p.life > 0);
      feed(dt);
      // pigeons: come down for crumbs, scatter when you walk at them
      pigeons.forEach((p) => {
        p.t += dt;
        if (p.gone) {
          if (!p.visitor && Math.abs(char.x - p.hx) > VW && Math.abs(cam.x + VW / 2 - p.hx) > VW) Object.assign(p, { gone: false, fly: false, x: p.hx, y: 0 });
          return;
        }
        const d = Math.abs(char.x - p.x), moving = Math.abs(char.vx) > 6 || !char.ground;
        if (!p.fly && ((d < 40 && moving) || (d < 70 && (Math.abs(char.vx) > 140 || !char.ground)) || d < 7)) {
          p.fly = true;
          p.arrive = false;
          p.eating = false;
          p.face = char.x < p.x ? 1 : -1;
          p.vx = p.face * (50 + Math.random() * 40);
          p.vy = 50 + Math.random() * 30;
        }
        if (p.fly) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 12 * dt;
          if (p.y > G + 20) p.gone = true;
        } else if (p.arrive) {
          // glide down beside the food
          const dx = p.tx - p.x;
          p.face = Math.sign(dx) || p.face;
          p.x += Math.sign(dx) * Math.min(Math.abs(dx), 70 * dt);
          p.y = Math.max(0, p.y - dt * (Math.abs(dx) < 40 ? 70 : 14));
          if (Math.abs(dx) < 1 && p.y <= 0) p.arrive = false;
        } else {
          // peck at the nearest crumb on the ground
          let c = null;
          crumbs.forEach((k) => {
            if (!k.air && Math.abs(k.x - p.x) < 50 && (!c || Math.abs(k.x - p.x) < Math.abs(c.x - p.x))) c = k;
          });
          p.eating = !!c && Math.abs(c.x - p.x) < 3;
          if (c && !p.eating) {
            p.face = Math.sign(c.x - p.x);
            p.x += p.face * 16 * dt;
          } else if (c) c.life = Math.min(c.life, 0.5 + Math.random() * 0.4);
          else if (Math.random() < dt * 0.3) p.face = -p.face;
        }
      });
      pigeons = pigeons.filter((p) => !(p.visitor && p.gone));
      // a flock of birds now and then (delivery drones over the experience stretch)
      const main = zw.indexOf(Math.max(...zw));
      if (main !== mainZone) {
        mainZone = main;
        nextFlock = Math.min(nextFlock, time + 1.5);
      }
      if (time > nextFlock) {
        nextFlock = time + 12 + Math.random() * 10;
        const drone = L.zones[main].style.sky === 'drones';
        const y = 14 + Math.random() * (SHORE - 70);
        for (let i = 0; i < (drone ? 2 : 4); i++)
          birds.push({ kind: drone ? 'drone' : 'bird', x: -20 - i * (drone ? 28 : 9), y: y + (drone ? i * 7 : Math.abs(i - 1.5) * 4), ph: i });
      }
      birds.forEach((b) => (b.x += dt * (b.kind === 'drone' ? 34 : 22)));
      birds = birds.filter((b) => b.x < VW + 20);
      // rocket launches
      if (techZone >= 0 && zw[techZone] > 0.4 && !RM.matches) {
        rocket.wait -= dt;
        if (rocket.state === 'pad' && rocket.wait < 0) {
          rocket.state = 'launch';
          rocket.v = 6;
        } else if (rocket.state === 'launch') {
          rocket.v += 46 * dt;
          rocket.y += rocket.v * dt;
          if (Math.random() < dt * 28) smoke.push({ dx: 18 + (Math.random() - 0.5) * 5, y: SHORE + 16 - 10 - rocket.y + 24, r: 1.5, life: 1.6, max: 1.6 });
          if (rocket.y > SHORE + 60) {
            rocket.state = 'gone';
            rocket.wait = 1.5;
          }
        } else if (rocket.state === 'gone' && rocket.wait < 0) {
          rocket.state = 'pad';
          rocket.y = 0;
          rocket.wait = 2 + Math.random() * 2.5;
        }
      }
      smoke.forEach((s) => {
        s.life -= dt;
        s.r += dt * 3.2;
        s.y += dt * 2;
      });
      smoke = smoke.filter((s) => s.life > 0);
    }

    /* ---------------------------------------------------- crumbs */
    // Stand still for about eight seconds and he starts feeding the pigeons
    function feed(dt) {
      const still = !spawning && !autoRun && char.ground && !char.plat && Math.abs(char.vx) < 1 &&
        !keys.left && !keys.right && !keys.down && !keys.run && !char.jumpHeld && !ui.panel.isOpen() && scope.state === 'off';
      idleT = still ? idleT + dt : 0;
      tossT = Math.max(0, tossT - dt);
      if (idleT > 8) {
        feedT -= dt;
        if (feedT <= 0) {
          feedT = 1.2 + Math.random() * 0.7;
          tossT = 0.45;
          for (let i = 0; i < 5; i++)
            crumbs.push({ x: char.x + char.face * 8, y: -20, vx: char.face * (24 + Math.random() * 46), vy: -(28 + Math.random() * 34), air: true, delay: 0.22, life: 40, land: -3 + Math.floor(Math.random() * 6) });
          callPigeons();
        }
      } else feedT = 0.3;
      crumbs.forEach((c) => {
        if (c.delay > 0) return void (c.delay -= dt);
        if (c.air) {
          c.vy += 200 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          if (c.vy > 0 && c.y >= c.land) {
            c.y = c.land;
            c.air = false;
          }
        } else c.life -= dt;
      });
      crumbs = crumbs.filter((c) => c.life > 0).slice(-40);
    }
    function callPigeons() {
      const here = pigeons.filter((p) => !p.gone && !p.fly && Math.abs(p.x - char.x) < VW * 0.6).length;
      for (let i = here; i < 4; i++) {
        const side = Math.random() < 0.7 ? char.face : -char.face;
        const tx = char.x + side * (14 + Math.random() * 42);
        pigeons.push({ visitor: true, arrive: true, tx, hx: tx, x: char.x + side * (VW * 0.55 + i * 16), y: 60 + Math.random() * 40, vx: 0, vy: 0, face: -side, fly: false, t: Math.random() * 3, gone: false });
      }
    }

    /* ------------------------------------------------- tourist viewer */
    // Walk up, drop in a nickel, and look across the harbor at the NYC skyline
    // through a pair of binoculars. States run in order:
    // off -> coin -> dark -> open -> view -> close -> out -> off
    const SLOT = { x: TX, y: -30 }; // coin slot, relative to the ground line
    const ZOOMS = [2, 3, 4];
    const NYC = () => SC.scopeSkyline();

    function drawTelescope() {
      if (TX + 14 < cam.x || TX - 14 > cam.x + VW) return;
      const art = teleArt[0], x = TX - 8 - cam.x, y = G - 3 - art.height;
      const on = active === TELE;
      if (on) {
        const pulse = 0.3 + Math.sin(time * 4) * 0.1;
        box(x, y, 17, 16, '#fff1a6', pulse * 0.6);
      }
      // the coin plate lights up once paid, and blinks to invite you over
      const lit = (scope.state === 'coin' && scope.paid) || (scope.state !== 'off' && scope.state !== 'coin') || (on && Math.floor(time * 2.5) % 2 === 0);
      put(teleArt[lit ? 1 : 0], x, y);
      // a spinning coin hovers over it until you've had a look
      if (!scope.used && !on && scope.state === 'off') {
        const w = [3, 2, 1, 2][Math.floor(time * 6) % 4];
        const by = y - 7 + (RM.matches ? 0 : Math.sin(time * 3) * 1.5);
        box(x + 8.5 - w / 2, by, w, 3, w === 1 ? '#d8a62b' : '#f8d34a');
        if (w === 3) box(x + 8, by + 1, 1, 1, '#fff1a6');
      }
    }

    function drawCoin() {
      if (scope.state !== 'coin' || scope.t < 0.22 || scope.paid) return;
      const p = clamp((scope.t - 0.22) / 0.33, 0, 1);
      const x0 = char.x - 7, y0 = G - 19, x1 = SLOT.x, y1 = G + SLOT.y;
      const x = x0 + (x1 - x0) * p - cam.x, y = y0 + (y1 - y0) * p - Math.sin(p * Math.PI) * 11;
      if (Math.floor(scope.t * 18) % 2) box(x, y - 1, 1, 3, '#d8a62b');
      else put(coinArt, x - 1, y - 1);
    }

    function useTelescope() {
      if (scope.state !== 'off' || spawning) return;
      ui.bubble.hide();
      const spot = TX + 16; // just to its right
      if (Math.abs(char.x - spot) < 2 && char.ground) insertCoin();
      else walkTo(spot, insertCoin, -1);
    }
    function insertCoin() {
      if (scope.state !== 'off') return;
      onBlur();
      autoRun = null;
      char.vx = 0;
      char.face = -1;
      tossT = 0.45;
      Object.assign(scope, { state: 'coin', t: 0, paid: false, used: true });
      ui.announce('You drop a nickel into the viewer.');
    }
    function setScope(state) {
      scope.state = state;
      scope.t = 0;
    }

    function updateScope(dt) {
      if (scope.state === 'off') return;
      scope.t += dt * (RM.matches ? 3 : 1);
      switch (scope.state) {
        case 'coin':
          if (!scope.paid && scope.t > 0.55) {
            scope.paid = true;
            sparks(SLOT.x, G + SLOT.y, 7, '#f8d34a');
          }
          if (scope.t > 1.05) {
            setScope('dark');
            document.body.classList.add('is-scoping');
          }
          break;
        case 'dark':
          if (scope.t > 0.3) {
            setScope('open');
            Object.assign(scope, { cx: 205, cy: 84, vx: 0, vy: 0, zoom: 2, aim: { x: 280, y: 64 }, left: 45, shown: -1 });
            scopeHint.hidden = false;
            ui.announce('Looking across the harbor at the Manhattan skyline. Arrow keys look around, scroll zooms, E steps away.');
          }
          break;
        case 'open':
          if (scope.t > 0.5) setScope('view');
          break;
        case 'view':
          // like the real thing, your nickel buys a little time
          scope.left -= dt;
          if (Math.ceil(scope.left) !== scope.shown) {
            scope.shown = Math.max(0, Math.ceil(scope.left));
            scopeTime.textContent = `0:${String(scope.shown).padStart(2, '0')}`;
            scopeTime.classList.toggle('is-low', scope.shown <= 5);
          }
          if (scope.left <= 0) leaveScope();
          break;
        case 'close':
          if (scope.t > 0.35) setScope('out');
          break;
        case 'out':
          if (scope.t > 0.35) endScope();
          break;
      }
      if (scope.state === 'open' || scope.state === 'view' || scope.state === 'close') {
        look(dt);
        updateFleet(dt);
        updateCthulhu(dt);
      }
    }

    // swing the viewer around: heavy, so it eases in and out
    function look(dt) {
      const kk = scope.keys, Z = scope.zoom;
      const dx = (kk.right ? 1 : 0) - (kk.left ? 1 : 0), dy = (kk.down ? 1 : 0) - (kk.up ? 1 : 0);
      if (dx || dy || scope.drag) scope.aim = null;
      const speed = (kk.run ? 170 : 80) / Z;
      scope.vx += (dx * speed - scope.vx) * Math.min(1, dt * 5);
      scope.vy += (dy * speed - scope.vy) * Math.min(1, dt * 5);
      scope.cx += scope.vx * dt;
      scope.cy += scope.vy * dt;
      if (scope.aim) {
        scope.cx += (scope.aim.x - scope.cx) * Math.min(1, dt * 2.2);
        scope.cy += (scope.aim.y - scope.cy) * Math.min(1, dt * 2.2);
      }
      clampScope();
    }
    function clampScope() {
      scope.cx = clamp(scope.cx, 10, NYC().width - 10);
      scope.cy = clamp(scope.cy, 18, SC.FAR_H - 6);
    }
    function zoomBy(d) {
      const i = clamp(ZOOMS.indexOf(scope.zoom) + d, 0, ZOOMS.length - 1);
      scope.zoom = ZOOMS[i];
    }
    function leaveScope() {
      if (scope.state !== 'open' && scope.state !== 'view') return;
      setScope('close');
      scope.drag = null;
      Object.keys(scope.keys).forEach((key) => (scope.keys[key] = false));
      scopeHint.hidden = true;
    }
    function endScope() {
      setScope('off');
      scope.drag = null;
      scopeHint.hidden = true;
      document.body.classList.remove('is-scoping');
      canvas.style.cursor = 'default';
      idleT = 0;
    }

    // Two overlapping lenses, sized to the window
    function lens() {
      const r = Math.round(Math.min(VH * 0.45, VW * 0.27));
      const off = Math.round(r * 0.74);
      return { r, a: VW / 2 - off, b: VW / 2 + off, y: VH / 2 };
    }
    // The fully open mask, built once per size at art resolution: black outside the
    // lenses, a stepped shadow just inside the rim, and a glint on the glass
    function buildMask() {
      const c = SC.cv(VW, VH), g = c.getContext('2d'), img = g.createImageData(VW, VH), d = img.data;
      const { r, a, b, y: cy } = lens();
      const ramp = [170, 110, 60, 25];
      for (let y = 0; y < VH; y++)
        for (let x = 0; x < VW; x++) {
          const px = x + 0.5, py = y + 0.5;
          const d1 = r - Math.hypot(px - a, py - cy), d2 = r - Math.hypot(px - b, py - cy);
          const din = Math.max(d1, d2), i = (y * VW + x) * 4;
          let al = 0, col = 11;
          if (din <= 0) al = 255;
          else if (din < 4) al = ramp[Math.floor(din)];
          else
            [[d1, d2, a], [d2, d1, b]].forEach(([di, other, cx]) => {
              const ang = Math.atan2(py - cy, px - cx);
              if (other < 0 && di > 5 && di < 7 && ang > -2.55 && ang < -1.85) {
                al = 70;
                col = 255;
              }
            });
          d[i] = d[i + 1] = col;
          d[i + 2] = col === 11 ? 18 : 255;
          d[i + 3] = al;
        }
      g.putImageData(img, 0, 0);
      return c;
    }
    function drawMask(iris) {
      if (iris >= 1) {
        if (!maskFull) maskFull = buildMask();
        ctx.drawImage(maskFull, 0, 0, VW * k, VH * k);
        return;
      }
      const g = maskC.getContext('2d'), { r, a, b, y } = lens();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#0b0912';
      g.fillRect(0, 0, VW, VH);
      if (iris > 0) {
        g.globalCompositeOperation = 'destination-out';
        [a, b].forEach((cx) => {
          g.beginPath();
          g.arc(cx, y, r * iris, 0, Math.PI * 2);
          g.fill();
        });
      }
      ctx.drawImage(maskC, 0, 0, VW * k, VH * k);
    }

    function putZ(img, x, y, z, alpha) {
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.drawImage(img, R(x), R(y), img.width * z * k, img.height * z * k);
      if (alpha !== undefined) ctx.globalAlpha = 1;
    }
    function drawScope() {
      const img = NYC(), Z = scope.zoom, H = SC.FAR_H;
      const ox = VW / 2 - scope.cx * Z, oy = VH / 2 - scope.cy * Z; // where skyline (0, 0) lands
      const base = oy + H * Z;
      const at = (x) => ox + x * Z; // skyline x -> screen
      // sky, brightening towards the horizon
      ctx.fillStyle = '#4aa8ec';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(scopeSky, 0, R(base - VH * 2), scopeSky.width * k, scopeSky.height * k);
      // clouds drifting behind the towers
      world.cloudsFar.forEach((c, i) => {
        const cx = ((((i * 260 + time * (3 + i)) % 1400) + 1400) % 1400) - 200;
        putZ(c, at(cx), oy + (((i * 17) % 34) - 18) * Z, Z, 0.9);
      });
      // biplanes circling the Empire State: the ones on the far side of their loop go behind it
      fleet.forEach((p) => p.state === 'fly' && !p.front && drawPlane(p, at, oy, Z));
      // the skyline itself (just the visible slice)
      const sx = clamp(Math.floor(-ox / Z) - 1, 0, img.width - 1);
      const sw = Math.min(img.width - sx, Math.ceil(VW / Z) + 3);
      ctx.drawImage(img, sx, 0, sw, H, R(at(sx)), R(oy), sw * Z * k, H * Z * k);
      // blinking light on One World Trade
      if (Math.floor(time * 1.5) % 2) box(at(146), oy + 20 * Z, Z, Z, '#ff5a4a');
      drawKong(at, oy, Z);
      fleet.forEach((p) => p.state === 'fly' && p.front && drawPlane(p, at, oy, Z));
      drawLiberty(at, oy, Z);
      drawCthulhu(at, oy, Z);
      // gulls
      for (let i = 0; i < 3; i++) {
        const gx = ((i * 470 + time * (14 + i * 3)) % 1400) - 200;
        putZ(birdArt[Math.floor(time * 6 + i) % 2], at(gx), oy + (24 + i * 13 + Math.sin(time + i) * 3) * Z, Z);
      }
      // the harbor
      if (base < VH) {
        const wh = waters[0].height;
        ctx.drawImage(waters[0], 0, 0, 1, wh, 0, R(base), canvas.width, R(VH + 1) - R(base));
        const rows = Math.ceil(VH - base);
        for (let r = 0; r < rows; r++) {
          const src = H - 1 - Math.floor((r / Z) * 1.15);
          if (src < 0) break;
          const wob = RM.matches ? 0 : Math.round(Math.sin(time * 1.7 + r * 0.35) * (0.5 + r * 0.03));
          ctx.globalAlpha = 0.3 * (1 - r / rows);
          ctx.drawImage(img, sx, src, sw, 1, R(at(sx) + wob), R(base + r), sw * Z * k, k);
        }
        ctx.globalAlpha = 1;
        shimmer.forEach((s) => {
          const y = base + 2 + s.row * Math.max(0, VH - base - 4);
          const x = ((((s.x * Z) * 0.5 + ox * 0.9) % (VW + 40)) + VW + 40) % (VW + 40) - 20;
          const t2 = Math.sin(time * 2.4 + s.ph);
          if (t2 > 0.35) box(x, y, s.w * Z * 0.6, 1, '#ffffff', (t2 - 0.35) * 1.1);
        });
        [['ferry', 300, 16, -7], ['sailR', 80, 6, 4], ['sailB', 720, 10, -3]].forEach(([name, x0, dep, v]) => {
          const art = boatArt[name], bx = ((((x0 + time * v) % 1200) + 1200) % 1200) - 100;
          putZ(art, at(bx), base + (dep + 2) * Z - art.height * Z, Z);
        });
      }
      // planes Kong has swatted, smoking all the way down into the harbor, and their replacements
      drawWrecks(at, oy, Z);
      // the binocular mask, opening and closing like a shutter
      const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
      const iris = scope.state === 'open' ? ease(scope.t / 0.5) : scope.state === 'close' ? 1 - ease(scope.t / 0.35) : 1;
      drawMask(iris);
    }

    // King Kong on top of the Empire State, swatting at the planes
    const KONG = { x: 270, y: 35, cx: 281, cy: 45 }; // sprite corner (his hand on the mast) and body centre
    // Each plane holds a slot in a loop around the tower. A swatted plane tumbles
    // into the harbor, and a new one flies in from off to the side to take its slot.
    const fleet = [0, 1, 2].map((i) => ({ i, state: 'fly', t: 0, x: 0, y: 0, vx: 0, vy: 0, face: 1, front: false, from: null }));
    let wreckage = [], kongSwat = false, nextHit = 4 + Math.random() * 4;
    function orbit(i) {
      const dir = i === 1 ? -1 : 1, w = (0.5 + i * 0.13) * dir;
      const a = time * w + i * 2.1, rx = 24 + i * 11, ry = 6 + i * 3;
      return {
        x: KONG.cx + 2 + Math.cos(a) * rx, y: 39 + i * 2 + Math.sin(a) * ry,
        face: -Math.sin(a) * dir >= 0 ? 1 : -1, front: Math.sin(a) > 0
      };
    }
    function bits(x, y, n, colors, speed, life) {
      for (let j = 0; j < n; j++)
        wreckage.push({ kind: 'bit', x, y, vx: (Math.random() - 0.5) * speed, vy: -(0.4 + Math.random() * 0.6) * speed, life, max: life, c: colors[j % colors.length] });
    }
    function updateFleet(dt) {
      const H = SC.FAR_H;
      fleet.forEach((p) => {
        p.t += dt;
        if (p.state === 'fly') Object.assign(p, orbit(p.i));
        else if (p.state === 'crash') {
          p.vy += 34 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (Math.random() < dt * 28) wreckage.push({ kind: 'smoke', x: p.x - p.face * 5, y: p.y - 1, vx: (Math.random() - 0.5) * 3, vy: -2, life: 1.6, max: 1.6 });
          if (p.y >= H) {
            bits(p.x, H, 12, ['#ffffff', '#d8eefa', '#ffffff'], 46, 0.9);
            wreckage.push({ kind: 'ring', x: p.x, y: H, life: 1.1, max: 1.1 });
            Object.assign(p, { state: 'gone', t: 0 });
          }
        } else if (p.state === 'gone') {
          if (p.t > 1.6) {
            const side = Math.random() < 0.5 ? -1 : 1;
            p.from = { x: KONG.cx + side * 180, y: 10 + Math.random() * 18 };
            Object.assign(p, { state: 'enter', t: 0, x: p.from.x, y: p.from.y, front: true });
          }
        } else if (p.state === 'enter') {
          const o = orbit(p.i), u = clamp(p.t / 3.2, 0, 1), e = u * u * (3 - 2 * u);
          const nx = p.from.x + (o.x - p.from.x) * e;
          if (Math.abs(nx - p.x) > 0.01) p.face = nx > p.x ? 1 : -1;
          p.x = nx;
          p.y = p.from.y + (o.y - p.from.y) * e;
          if (u >= 1) p.state = 'fly';
        }
      });
      // Kong swipes at whatever buzzes past on his right, and now and then he connects
      const near = fleet.find((p) => p.state === 'fly' && p.front && p.x - KONG.cx > -2 && p.x - KONG.cx < 24 && Math.abs(p.y - KONG.cy) < 12);
      kongSwat = !!near;
      if (near && time > nextHit) {
        Object.assign(near, { state: 'crash', t: 0, vx: 20 + Math.random() * 10, vy: -16, face: 1 });
        bits(near.x, near.y, 8, ['#fff1a6', '#ffffff', '#f28c38'], 50, 0.5);
        nextHit = time + 6 + Math.random() * 7;
      }
      wreckage.forEach((w) => {
        w.life -= dt;
        w.x += (w.vx || 0) * dt;
        w.y += (w.vy || 0) * dt;
        if (w.kind === 'bit') w.vy += 70 * dt;
      });
      wreckage = wreckage.filter((w) => w.life > 0);
    }
    function drawWrecks(at, oy, Z) {
      const sy = (y) => oy + y * Z;
      wreckage.forEach((w) => {
        const a = clamp(w.life / w.max, 0, 1);
        if (w.kind === 'smoke') {
          const r = 1 + (1 - a) * 3;
          box(at(w.x - r), sy(w.y - r * 0.6), r * 2 * Z, r * 1.2 * Z, '#5d5f6b', a * 0.7);
          box(at(w.x - r * 0.6), sy(w.y - r), r * 1.2 * Z, r * 2 * Z, '#5d5f6b', a * 0.7);
        } else if (w.kind === 'ring') {
          const r = 2 + (1 - a) * 12;
          box(at(w.x - r), sy(w.y), r * 2 * Z, Z * 0.5, '#ffffff', a);
        } else box(at(w.x), sy(w.y), Z, Z, w.c, a);
      });
      fleet.forEach((p) => {
        if (p.state === 'enter') drawPlane(p, at, oy, Z);
        if (p.state !== 'crash') return;
        // tumbling, on fire
        const f = planeArt[Math.floor(time * 16) % 2], tumble = Math.floor(p.t * 9) % 2;
        putZ(tumble ? f.l : f.r, at(p.x - 7), sy(p.y - 4 + (tumble ? 1 : 0)), Z);
        if (Math.floor(time * 14) % 2) box(at(p.x - 2), sy(p.y - 2), Z * 2, Z * 2, '#f28c38');
        else box(at(p.x - 1), sy(p.y - 3), Z * 2, Z * 2, '#ffd65a');
      });
    }
    function drawPlane(p, at, oy, Z) {
      const f = planeArt[Math.floor(time * 16 + p.i) % 2], art = p.face > 0 ? f.r : f.l;
      putZ(art, at(p.x - 7), oy + (p.y - 4) * Z, Z);
      // firing at Kong as they close in
      const toKong = KONG.cx - p.x;
      if (p.state !== 'fly' || !p.front || Math.sign(toKong) !== p.face || Math.abs(toKong) < 12 || Math.abs(toKong) > 70) return;
      const nose = p.x + p.face * 7;
      for (let j = 0; j < 3; j++) {
        const d = ((time * 55 + j * 9) % 27) + 2, tx = nose + p.face * d;
        if (Math.abs(tx - p.x) < Math.abs(toKong) - 4) box(at(tx), oy + (p.y + 0.5) * Z, Z * 2, Z * 0.5, '#fff1a6');
      }
      if (Math.floor(time * 12) % 2) box(at(nose), oy + p.y * Z, Z, Z, '#ffd65a');
    }
    function drawKong(at, oy, Z) {
      // swiping at a plane, or beating his chest now and then
      const pose = kongSwat ? 1 : time % 4.5 < 0.9 ? (Math.floor(time * 8) % 2 ? 2 : 0) : 0;
      // the mast he's clinging to, picked out so it reads against the sky
      box(at(272), oy + 30 * Z, Z, 9 * Z, '#7f97bd');
      box(at(271), oy + 38 * Z, Z * 2, 8 * Z, '#8fa8cc');
      if (Math.floor(time * 1.5) % 2) box(at(272), oy + 29 * Z, Z, Z, '#ff5a4a');
      putZ(kongArt[pose], at(KONG.x), oy + KONG.y * Z, Z);
    }
    // Cthulhu, risen from the East River, tearing at the middle of the Brooklyn Bridge
    const CTH = { x: 528, deck: SC.FAR_H - 22 };
    const CARS = ['#d8443a', '#f8d34a', '#4f8ad1', '#ffffff', '#6a7284', '#8e94a0'];
    let slam = 0, slamNext = 2.5, impact = 0, shake = 0, debris = [], rippleT = 0;
    function updateCthulhu(dt) {
      const H = SC.FAR_H;
      // every few seconds a tentacle comes down on the deck
      slam = Math.max(0, slam - dt);
      shake = Math.max(0, shake - dt);
      slamNext -= dt;
      if (slamNext <= 0 && !slam) {
        slam = 0.9;
        impact = 0.27;
        slamNext = 3.5 + Math.random() * 3.5;
      }
      if (impact > 0 && (impact -= dt) <= 0) {
        shake = 0.4;
        for (let j = 0; j < 8; j++)
          debris.push({ x: CTH.x + 10 + Math.random() * 14, y: CTH.deck - 1, vx: (Math.random() - 0.3) * 34, vy: -(12 + Math.random() * 26), c: CARS[j % CARS.length], car: j % 3 !== 2 });
        bits(CTH.x + 16, CTH.deck - 1, 6, ['#b3bfd0', '#8a97ad', '#fff1a6'], 40, 0.5);
      }
      debris.forEach((d) => {
        d.vy += 70 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.y >= H && !d.sunk) {
          d.sunk = true;
          bits(d.x, H, 5, ['#ffffff', '#d8eefa'], 30, 0.7);
          wreckage.push({ kind: 'ring', x: d.x, y: H, life: 0.8, max: 0.8 });
        }
      });
      debris = debris.filter((d) => !d.sunk);
      // the river churns around him
      if ((rippleT -= dt) <= 0) {
        rippleT = 0.7 + Math.random() * 0.6;
        wreckage.push({ kind: 'ring', x: CTH.x + (Math.random() - 0.5) * 30, y: H, life: 1.3, max: 1.3 });
      }
    }
    // a tapering tentacle along a curve out of the water, with suckers down one side
    function tentacle(at, sy, Z, x0, cx, cy, tx, ty, th) {
      const H = SC.FAR_H, N = 90;
      for (let i = 0; i <= N; i++) {
        const t = i / N, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * tx, y = u * u * H + 2 * u * t * cy + t * t * ty;
        const w = Math.max(1, th * (1 - t * 0.7));
        box(at(x - w / 2), sy(y - w / 2), w * Z, w * Z, '#3f7f4a');
        if (i % 10 === 5 && w > 1.6) box(at(x + w / 2 - 0.8), sy(y), Z * 0.6, Z * 0.6, '#b7e3a0');
      }
    }
    function drawCthulhu(at, oy, Z) {
      const sy = (y) => oy + y * Z, H = SC.FAR_H, cx = CTH.x;
      const bob = RM.matches ? 0 : Math.sin(time * 1.3);
      const sway = (sp, ph, a) => (RM.matches ? 0 : Math.sin(time * sp + ph) * a);
      // tentacles reaching up behind the bridge
      tentacle(at, sy, Z, cx - 24, cx - 36, 96, cx - 27 + sway(1.7, 0, 4), 70 + sway(1.7, 1.5, 3), 3.2);
      tentacle(at, sy, Z, cx + 27, cx + 40, 100, cx + 31 + sway(1.4, 1, 5), 77 + sway(1.4, 2.5, 3), 3.2);
      // the great one himself
      const art = cthArt[Math.floor(time * 2.2) % 2];
      putZ(art, at(cx - 21), sy(H - art.height + 1 + bob), Z);
      const glow = 0.35 + Math.sin(time * 3) * 0.25;
      box(at(cx - 5.5), sy(H - 35 + bob), Z * 4, Z * 3, '#fff1a6', glow);
      box(at(cx + 1.5), sy(H - 35 + bob), Z * 4, Z * 3, '#fff1a6', glow);
      // the deck runs in front of his chest, buckling when he hits it
      const dy = shake > 0 ? (Math.floor(time * 30) % 2 ? 1 : 0) : 0;
      box(at(cx - 26), sy(CTH.deck + dy), Z * 52, Z * 2, '#8a97ad');
      box(at(cx - 26), sy(CTH.deck + 2 + dy), Z * 52, Z, '#b3bfd0');
      // claws hooked over the deck
      [cx - 13, cx + 9].forEach((hx) => {
        box(at(hx), sy(CTH.deck - 2.5 + dy), Z * 5, Z * 3, '#3a8a46');
        for (let c = 0; c < 3; c++) box(at(hx + 0.5 + c * 1.6), sy(CTH.deck + 0.5 + dy), Z * 0.8, Z * 2, '#fff4d6');
      });
      // a tentacle wrapped round the front of the deck
      tentacle(at, sy, Z, cx - 19, cx - 31, CTH.deck + 4, cx - 21 + sway(2, 0, 1.5), CTH.deck - 4, 3);
      // the slammer: raised high, then brought down on the roadway
      let tx = cx + 27 + sway(2, 0.5, 2), ty = 64 + sway(2, 0, 4);
      if (slam > 0) {
        const p = 1 - slam / 0.9;
        const down = p < 0.3 ? p / 0.3 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
        const e = down * down * (3 - 2 * down);
        tx += (cx + 15 - tx) * e;
        ty += (CTH.deck - 3 - ty) * e;
      }
      tentacle(at, sy, Z, cx + 19, cx + 36, 98, tx, ty, 3.6);
      // cars and chunks of roadway flung off into the river
      debris.forEach((d) => box(at(d.x), sy(d.y), Z * (d.car ? 2 : 1), Z, d.c));
    }

    // Lady Liberty waves her torch at you
    function drawLiberty(at, oy, Z) {
      const th = 0.25 + (RM.matches ? 0 : Math.sin(time * 4.2) * 0.45), sn = Math.sin(th), cs = Math.cos(th);
      for (let i = 0; i < 10; i++) box(at(Math.round(26 + sn * i)), oy + Math.round(100 - cs * i) * Z, Z, Z, '#86c7b8');
      const tx = Math.round(26 + sn * 10.5), ty = Math.round(100 - cs * 10.5);
      box(at(tx - 1), oy + (ty - 1) * Z, Z * 3, Z * 2, '#ffd65a');
      box(at(tx), oy + (ty - 2) * Z, Z, Z, '#fff1a6');
      const tw = Math.sin(time * 3.1);
      if (tw > 0.4) {
        const fx = at(tx), fy = oy + (ty - 2.5) * Z, a = (tw - 0.4) * 1.6;
        box(fx - Z, fy, Z * 3, Z * 0.5, '#fff8d8', a);
        box(fx + Z * 0.25, fy - Z, Z * 0.5, Z * 2.5, '#fff8d8', a);
      }
    }

    function scopeKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const down = e.type === 'keydown';
      const viewing = scope.state === 'open' || scope.state === 'view';
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault();
        if (down && !e.repeat) leaveScope();
        return;
      }
      if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        if (down && viewing) zoomBy(e.code === 'Minus' || e.code === 'NumpadSubtract' ? -1 : 1);
        return;
      }
      const act = CODES[e.code];
      if (!act || act === 'open') return;
      e.preventDefault();
      if (!viewing && down) return;
      if (act === 'jump') scope.keys.up = down;
      else scope.keys[act] = down;
    }
    function onDragStart(e) {
      if (scope.state !== 'view' && scope.state !== 'open') return;
      scope.drag = { x: e.clientX, y: e.clientY, cx: scope.cx, cy: scope.cy };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
      canvas.style.cursor = 'grabbing';
    }
    function onDrag(e) {
      if (!scope.drag) return;
      const d = S * scope.zoom;
      scope.cx = scope.drag.cx - (e.clientX - scope.drag.x) / d;
      scope.cy = scope.drag.cy - (e.clientY - scope.drag.y) / d;
      scope.aim = null;
      scope.vx = scope.vy = 0;
      clampScope();
    }
    function onDragEnd() {
      if (!scope.drag) return;
      scope.drag = null;
      canvas.style.cursor = 'grab';
    }
    function onWheel(e) {
      if (scope.state !== 'view' && scope.state !== 'open') return;
      e.preventDefault();
      scope.wheel += e.deltaY;
      if (Math.abs(scope.wheel) < 40) return;
      zoomBy(scope.wheel < 0 ? 1 : -1);
      scope.wheel = 0;
    }

    /* ---------------------------------------------------- UI syncing */
    let pendingOpen = null;
    function nearestStop() {
      let best = null, bd = Infinity;
      L.stops.forEach((s) => {
        const d = Math.abs(char.x - s.x);
        if (d < bd) { bd = d; best = s; }
      });
      if (active && Math.abs(char.x - active.x) < T.far) return active;
      return bd < T.near ? best : null;
    }

    function updateUI() {
      // pop-up bubble
      const fast = autoRun && Math.abs(char.vx) > 260;
      const busy = spawning || fast || scope.state !== 'off';
      let s = busy ? null : nearestStop();
      if (!s && !busy && Math.abs(char.x - (TX + 12)) < (active === TELE ? 30 : 24)) s = TELE;
      if (s !== active) {
        active = s;
        if (s) {
          ui.bubble.show(s);
          if (s !== TELE) ui.setVisited(s.id);
          sparks(s.x, G - 36, 6);
        } else ui.bubble.hide();
      }
      if (active) {
        ui.bubble.place((active.x - cam.x) * S, (G - 50) * S);
      }
      // header chapter
      let ch = L.chapters[0];
      L.chapters.forEach((c) => { if (char.x >= c.from) ch = c; });
      if (ch.id !== chapter) {
        chapter = ch.id;
        ui.setChapter(chapter);
      }
      // header and footer slide in once you walk forward from the start
      const forward = char.x > L.spawn + 20;
      if (forward !== chromeOn && !spawning) {
        chromeOn = forward;
        ui.chrome(forward);
      }
      // title card drifts with parallax and fades as you leave
      const dx = cam.x - camStart;
      const fade = clamp(1 - Math.abs(dx) / 200, 0, 1);
      titleEl.style.opacity = fade.toFixed(3);
      titleEl.style.visibility = fade < 0.01 ? 'hidden' : '';
      titleEl.style.transform = `translate(${Math.round(-dx * 0.55 * S)}px, 0)`;
      // controls guide follows its spot in the world
      if (guideShown && !guideGone) {
        const half = controlsEl.offsetWidth / 2;
        const gx = clamp((L.spawn - cam.x) * S, half + 10, Math.max(half + 10, vw - half - 10));
        controlsEl.style.transform = `translate(${Math.round(gx)}px, ${Math.round((G - 38) * S - 8)}px) translate(-50%, -100%)`;
        const done = ui.controls.done;
        if ((done.has('move') && walked > 160) || char.x > L.stops[0].x - 60 || char.x < TX + 40) {
          guideGone = true;
          ui.controls.hide();
        }
      }
    }

    function showGuide() {
      guideShown = true;
      ui.controls.show();
    }

    /* ---------------------------------------------------------- input */
    const CODES = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down',
      ShiftLeft: 'run', ShiftRight: 'run', KeyE: 'open'
    };
    function onKey(e) {
      const act = CODES[e.code];
      const down = e.type === 'keydown';
      if (ui.panel.isOpen()) return;
      if (scope.state !== 'off') return scopeKey(e);
      if (!act || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && el !== document.body && (e.code === 'Space' || e.code === 'Enter') && el.matches('button, a, [tabindex]')) return;
      e.preventDefault();
      ui.controls.key(e.code, down);
      if (act === 'jump') {
        if (down && !e.repeat) char.buffer = T.buffer;
        char.jumpHeld = down;
      } else if (act === 'open') {
        if (down && !e.repeat && active) open(active.id);
      } else keys[act] = down;
    }
    function onBlur() {
      keys.left = keys.right = keys.down = keys.run = false;
      char.jumpHeld = false;
    }

    function worldAt(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / S + cam.x, y: (e.clientY - r.top) / S };
    }
    function hitStop(pt) {
      return L.stops.find((s, i) => Math.abs(pt.x - s.x) < 16 && pt.y > stopIconY(s, i) - 6 && pt.y < G);
    }
    function hitTele(pt) {
      return Math.abs(pt.x - TX) < 10 && pt.y > G - 42 && pt.y < G;
    }
    function onClick(e) {
      if (spawning || scope.state !== 'off') return;
      const pt = worldAt(e);
      if (hitTele(pt)) return useTelescope();
      const s = hitStop(pt);
      if (s) return goTo(s.id, true);
      walkTo(pt.x);
    }
    function onMove(e) {
      if (scope.state !== 'off') canvas.style.cursor = scope.drag ? 'grabbing' : 'grab';
      else {
        const pt = worldAt(e);
        canvas.style.cursor = hitStop(pt) || hitTele(pt) ? 'pointer' : 'default';
      }
    }

    /* -------------------------------------------------- navigation API */
    function standX(s) {
      return s.x - 26;
    }
    function walkTo(x, then, face) {
      x = clamp(x, 16, L.end);
      if (RM.matches) {
        char.x = x;
        char.vx = 0;
        cam.x = clamp(x - VW * 0.36, 0, L.len - VW);
        zw = L.weights(cam.x + VW * 0.4);
        if (face) char.face = face;
        if (then) then();
        return;
      }
      autoRun = { x, then, face, d0: Math.abs(x - char.x) };
    }
    function goTo(id, openAfter) {
      const s = L.byId[id];
      if (!s) return;
      ui.bubble.hide();
      walkTo(standX(s), openAfter ? () => open(id) : null, 1);
    }
    function goChapter(id) {
      const c = L.chapters.find((x) => x.id === id);
      if (!c) return;
      if (id === L.chapters[0].id) walkTo(L.spawn, null, 1);
      else walkTo(standX(L.stops.find((s) => s.chapter === id)), null, 1);
    }
    function open(id) {
      if (id === TELE.id) return useTelescope();
      const s = content.stops.find((x) => x.id === id);
      if (!s) return;
      onBlur();
      ui.panel.open(s);
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* file:// */ }
    }

    /* ------------------------------------------------------------ loop */
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      if (!ui.panel.isOpen()) update(dt);
      draw();
    }
    function play() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function pause() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    /* ----------------------------------------------------------- start */
    // quiet: arriving from the other layout, so stand at the stop without opening it
    function start(hash, quiet) {
      stage.hidden = false;
      resize();
      const s = L.byId[hash];
      const c = L.chapters.find((x) => x.id === hash);
      if (s) {
        char.x = standX(s);
        if (!quiet) pendingOpen = hash;
        else if (spawning) spawnT = 1.2;
      } else if (c && c.id !== L.chapters[0].id) char.x = standX(L.stops.find((x) => x.chapter === c.id));
      cam.lead = 0.36;
      cam.x = clamp(char.x - VW * (char.x === L.spawn ? 0.3 : 0.36), 0, L.len - VW);
      zw = L.weights(cam.x + VW * 0.4);
      camStart = clamp(L.spawn - VW * 0.3, 0, L.len - VW);
      if (char.x !== L.spawn) {
        guideGone = true;
        ui.controls.hide();
      }
      window.addEventListener('resize', resize);
      window.addEventListener('keydown', onKey);
      window.addEventListener('keyup', onKey);
      window.addEventListener('blur', onBlur);
      canvas.addEventListener('click', onClick);
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('pointerdown', onDragStart);
      canvas.addEventListener('pointermove', onDrag);
      canvas.addEventListener('pointerup', onDragEnd);
      canvas.addEventListener('pointercancel', onDragEnd);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      play();
    }

    function stop() {
      pause();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('pointerdown', onDragStart);
      canvas.removeEventListener('pointermove', onDrag);
      canvas.removeEventListener('pointerup', onDragEnd);
      canvas.removeEventListener('pointercancel', onDragEnd);
      canvas.removeEventListener('wheel', onWheel);
      if (scope.state !== 'off') endScope();
      ui.bubble.hide();
      ui.chrome(false);
      active = null;
      chromeOn = false;
      stage.hidden = true;
      let near = L.stops[0];
      L.stops.forEach((st) => { if (Math.abs(st.x - char.x) < Math.abs(near.x - char.x)) near = st; });
      return char.x === L.spawn ? null : near.id;
    }

    return {
      start, stop, play, pause, goTo, goChapter, open,
      debug: () => ({ x: char.x, y: char.y, vx: char.vx, ground: char.ground, spawning, spawnT, cam: cam.x, S, VW, VH, active: active && active.id, chapter, time, scope: scope.state, planes: fleet.map((p) => p.state) })
    };
  }

  HA.side = { create };
})();
