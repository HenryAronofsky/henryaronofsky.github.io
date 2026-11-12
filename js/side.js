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
    const shimmer = [];
    for (let i = 0; i < 90; i++) shimmer.push({ x: Math.random() * 3000, row: Math.random(), ph: Math.random() * 6.28, w: 2 + Math.floor(Math.random() * 3) });

    /* -------------------------------------------------------- sizing */
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = window.innerWidth;
      vh = window.innerHeight;
      S = clamp(Math.round(vh / 235), 2, 8);
      S = Math.max(2, Math.min(S, Math.floor(vw / 300)));
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
      crumbs.forEach((c) => box(c.x - cam.x, c.y, c.air ? 1 : 2, 1, '#ecc993'));
      drawPigeons();
      drawChar();
      drawParticles();
      layer(world.fore, SC.PARALLAX.fore, VH - 30);
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
        !keys.left && !keys.right && !keys.down && !keys.run && !char.jumpHeld && !ui.panel.isOpen();
      idleT = still ? idleT + dt : 0;
      tossT = Math.max(0, tossT - dt);
      if (idleT > 8) {
        feedT -= dt;
        if (feedT <= 0) {
          feedT = 1.2 + Math.random() * 0.7;
          tossT = 0.45;
          for (let i = 0; i < 5; i++)
            crumbs.push({ x: char.x + char.face * 8, y: G - 20, vx: char.face * (24 + Math.random() * 46), vy: -(28 + Math.random() * 34), air: true, delay: 0.22, life: 40, land: G - 3 + Math.floor(Math.random() * 6) });
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
      const s = spawning || fast ? null : nearestStop();
      if (s !== active) {
        active = s;
        if (s) {
          ui.bubble.show(s);
          ui.setVisited(s.id);
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
        const gx = Math.max(controlsEl.offsetWidth + 10, (L.spawn - 18 - cam.x) * S);
        controlsEl.style.transform = `translate(${Math.round(gx)}px, ${Math.round((G - 12) * S)}px) translate(-100%, -100%)`;
        const done = ui.controls.done;
        if ((done.has('move') && walked > 160) || char.x > L.stops[0].x - 60) {
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
    function onClick(e) {
      if (spawning) return;
      const pt = worldAt(e);
      const s = hitStop(pt);
      if (s) return goTo(s.id, true);
      walkTo(pt.x);
    }
    function onMove(e) {
      canvas.style.cursor = hitStop(worldAt(e)) ? 'pointer' : 'default';
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
      debug: () => ({ x: char.x, y: char.y, vx: char.vx, ground: char.ground, spawning, spawnT, cam: cam.x, S, VW, VH, active: active && active.id, chapter, time })
    };
  }

  HA.side = { create };
})();
