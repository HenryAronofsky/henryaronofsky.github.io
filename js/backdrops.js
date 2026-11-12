/* Backdrops: the far scenery across the river for the experience, portfolio
   and interests stretches of the walk. Each is drawn once as pixel art (one
   letter per palette colour, like the sprites) and then hazed towards the sky
   so it reads as distant. New York and Boston are in scenery.js. */
(function () {
  'use strict';
  const HA = (window.HA = window.HA || {});
  const P = HA.pix, Px = P.Px;
  const H = 130; // same height as the skylines; everything stands on the bottom row
  const HAZE = { color: '#d3ebf9', amount: 0.36 };

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  }

  function gear(g, cx, cy, r, teeth, c, hole) {
    for (let y = Math.floor(cy - r - 4); y <= cy + r + 4; y++)
      for (let x = Math.floor(cx - r - 4); x <= cx + r + 4; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
        const R = Math.cos(Math.atan2(dy, dx) * teeth) > 0.15 ? r + 3 : r;
        if (d <= R && d >= hole) g.set(x, y, c);
      }
  }
  // pointed-top stake / plank
  function stake(g, x, w, h, c) {
    g.rect(x, H - h + 3, w, h - 3, c);
    g.poly([[x, H - h + 3], [x + w / 2, H - h], [x + w, H - h + 3]], c);
  }

  // Lay objects out left to right until the width is full
  function pack(g, list, width, seed, gapMin, gapMax) {
    const r = rng(seed);
    let x = 6, i = 0;
    while (x < width) {
      const o = list[i++ % list.length];
      o.draw(g, Math.round(x + o.w / 2), r);
      x += o.w + gapMin + Math.floor(r() * (gapMax - gapMin));
    }
  }

  /* ------------------------------------------- experience: tools + circuits */
  const TECH = [
    { w: 24, draw(g, x) { // giant open-end wrench, standing up
      const top = H - 98;
      g.rect(x - 3, top + 16, 7, 82, 'x');
      g.ellipse(x + 0.5, top + 9, 10, 10, 'x');
      g.rect(x - 3, top - 2, 7, 10, '.');
      g.ellipse(x + 0.5, H - 6, 6, 6, 'x');
      g.ellipse(x + 0.5, H - 6, 3, 3, '.');
    } },
    { w: 46, draw(g, x) { // 3D printer
      g.rect(x - 22, H - 86, 4, 76, 'Z');
      g.rect(x + 18, H - 86, 4, 76, 'Z');
      g.rect(x - 23, H - 90, 46, 5, 'Z');
      g.rect(x - 18, H - 70, 36, 2, 'x');
      g.rect(x - 5, H - 75, 10, 9, 'r');
      g.rect(x - 1, H - 66, 2, 3, 'k');
      g.rect(x - 9, H - 38, 18, 14, 'a');
      g.rect(x - 5, H - 34, 3, 3, '.');
      g.rect(x + 2, H - 34, 3, 3, '.');
      g.rect(x - 18, H - 24, 36, 3, 'X');
      g.rect(x - 24, H - 12, 48, 4, 'Z');
    } },
    { w: 60, draw(g, x) { // big gear with cut-outs
      gear(g, x, H - 36, 25, 11, 'z', 7);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.ellipse(x + Math.cos(a) * 15, H - 36 + Math.sin(a) * 15, 4.5, 4.5, '.');
      }
      g.ellipse(x, H - 36, 9, 9, 'X');
      g.ellipse(x, H - 36, 4, 4, '.');
    } },
    { w: 16, draw(g, x) { // screwdriver
      const top = H - 92;
      g.rect(x - 4, top, 8, 26, 'r');
      for (let i = 0; i < 3; i++) g.rect(x - 2 + i * 2, top + 3, 1, 20, 'R');
      g.rect(x - 3, top + 26, 6, 3, 'X');
      g.rect(x - 1, top + 29, 3, 58, 'x');
      g.rect(x, H - 5, 1, 5, 'x');
    } },
    { w: 34, draw(g, x) { // vernier caliper
      g.rect(x, H - 104, 6, 104, 'x');
      for (let y = H - 100; y < H - 4; y += 3) g.rect(x + 1, y, y % 9 === 0 ? 3 : 2, 1, 'Z');
      g.poly([[x - 17, H - 104], [x, H - 104], [x, H - 95], [x - 12, H - 95]], 'x');
      g.rect(x - 14, H - 76, 23, 10, 'X');
      g.poly([[x - 14, H - 76], [x - 20, H - 76], [x - 14, H - 70]], 'X');
      g.ellipse(x + 8, H - 62, 3, 3, 'Z');
    } },
    { w: 28, draw(g, x) { // chip
      g.rect(x - 12, H - 44, 24, 34, 'Z');
      for (let y = H - 41; y < H - 12; y += 4) {
        g.rect(x - 14, y, 2, 2, 'x');
        g.rect(x + 12, y, 2, 2, 'x');
      }
      g.rect(x - 8, H - 30, 16, 1, 'X');
      g.rect(x - 8, H - 26, 12, 1, 'X');
      g.ellipse(x - 7, H - 39, 1.6, 1.6, 'x');
    } },
    { w: 50, draw(g, x) { // industrial robot arm
      g.rect(x - 14, H - 18, 26, 8, 'a');
      g.ellipse(x - 1, H - 20, 9, 5, 'a');
      g.line(x - 1, H - 22, x + 10, H - 68, 'a', 7);
      g.ellipse(x + 10, H - 68, 5, 5, 'Z');
      g.line(x + 10, H - 68, x + 31, H - 84, 'a', 6);
      g.ellipse(x + 31, H - 84, 3.5, 3.5, 'Z');
      g.line(x + 32, H - 82, x + 36, H - 74, 'Z', 2);
      g.line(x + 30, H - 82, x + 28, H - 73, 'Z', 2);
    } },
    { w: 14, draw(g, x) { // capacitor
      g.rect(x - 6, H - 44, 12, 34, 'b');
      g.ellipse(x, H - 44, 6, 2.5, 'x');
      g.rect(x + 2, H - 42, 3, 32, 'c');
      g.rect(x + 3, H - 36, 1, 2, 'w');
      g.rect(x + 3, H - 28, 1, 2, 'w');
    } },
    { w: 42, draw(g, x) { // microscope (Nanotronics makes these smart)
      g.rect(x - 18, H - 14, 34, 6, 'Z');
      g.rect(x + 6, H - 64, 9, 50, 'W');
      g.line(x - 10, H - 98, x + 2, H - 56, 'W', 8);
      g.rect(x - 16, H - 106, 10, 8, 'Z');
      g.rect(x - 14, H - 42, 26, 4, 'z');
      g.rect(x - 3, H - 54, 6, 8, 'Z');
      g.ellipse(x + 11, H - 46, 4, 4, 'b');
    } },
    { w: 52, draw(g, x) { // dashboard monitor (factory data)
      g.rect(x - 3, H - 26, 6, 14, 'z');
      g.rect(x - 13, H - 13, 26, 4, 'Z');
      g.rect(x - 25, H - 66, 50, 40, 'Z');
      g.rect(x - 22, H - 63, 44, 32, 'v');
      [['t', 10], ['g', 16], ['y', 12], ['a', 22], ['1', 26]].forEach(([c, h], i) => g.rect(x - 18 + i * 8, H - 33 - h, 5, h, c));
      g.line(x - 18, H - 46, x + 18, H - 60, 'w');
    } },
    { w: 22, draw(g, x) { // radio mast
      g.line(x - 8, H - 10, x, H - 116, 'Z');
      g.line(x + 8, H - 10, x, H - 116, 'Z');
      for (let y = H - 100; y < H - 12; y += 12) {
        const hw = Math.round(((y - (H - 116)) / 106) * 8);
        g.line(x - hw, y, x + hw, y + 12, 'Z');
      }
      g.ellipse(x + 5, H - 76, 5, 7, 'W');
      g.rect(x - 1, H - 119, 2, 3, 'r');
    } },
    { w: 26, draw(g, x) { // multimeter with probes
      g.rect(x - 11, H - 50, 22, 40, 'y');
      g.rect(x - 8, H - 46, 16, 10, 'k');
      g.rect(x - 6, H - 43, 2, 4, 'g');
      g.rect(x - 2, H - 43, 2, 4, 'g');
      g.rect(x + 2, H - 43, 2, 4, 'g');
      g.ellipse(x, H - 25, 6, 6, 'Z');
      g.line(x - 4, H - 10, x - 14, H - 2, 'r', 2);
      g.line(x + 4, H - 10, x + 13, H - 3, 'k', 2);
    } }
  ];

  function tech(width) {
    const g = new Px(width, H);
    const r = rng(41);
    // circuit traces climbing into the sky behind everything
    for (let x = 14; x < width; x += 38 + Math.floor(r() * 30)) {
      const y1 = H - 40 - Math.floor(r() * 60), dx = Math.floor(r() * 26) - 13, y2 = y1 - 10 - Math.floor(r() * 18);
      g.line(x, H - 8, x, y1, 'Y');
      g.line(x, y1, x + dx, y1, 'Y');
      g.line(x + dx, y1, x + dx, y2, 'Y');
      g.ellipse(x + dx + 0.5, y2 + 0.5, 2.6, 2.6, 'y');
      g.set(x + dx, y2, '.');
    }
    // the circuit board shoreline
    g.rect(0, H - 10, width, 10, 'g');
    for (let x = 0; x < width; x += 1) {
      if (x % 23 < 15) g.set(x, H - 7, 'Y');
      if ((x + 9) % 31 < 20) g.set(x, H - 4, 'Y');
    }
    for (let x = 5; x < width; x += 13) g.rect(x, H - 8, 2, 2, 'y');
    pack(g, TECH, width, 7, 6, 18);
    g.rim();
    g.outline();
    // blueprint grid in the sky, faint, behind the drawing
    const c = HA.scenery.cv(width, H), ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let x = 0; x < width; x += 12) ctx.fillRect(x, 0, 1, H - 10);
    for (let y = 6; y < H - 10; y += 12) ctx.fillRect(0, y, width, 1);
    ctx.drawImage(P.toCanvas(g, 1, HAZE), 0, 0);
    return c;
  }

  /* ------------------------------------- portfolio: the things I've built */
  const JUNK = [
    { w: 46, draw(g, x) { // BumbleBee
      g.rect(x - 17, H - 36, 30, 20, 'y');
      g.rect(x - 11, H - 36, 4, 20, 'k');
      g.rect(x - 3, H - 36, 4, 20, 'k');
      g.poly([[x + 13, H - 32], [x + 24, H - 27], [x + 24, H - 15], [x + 11, H - 15]], 'X');
      g.ellipse(x - 10, H - 11, 6, 6, 'k');
      g.ellipse(x + 7, H - 11, 6, 6, 'k');
      g.ellipse(x - 10, H - 11, 2, 2, 'x');
      g.ellipse(x + 7, H - 11, 2, 2, 'x');
      g.line(x - 13, H - 36, x - 17, H - 46, 'k');
      g.rect(x - 18, H - 48, 3, 2, 'r');
      g.rect(x + 5, H - 32, 5, 5, 'w');
      g.rect(x + 7, H - 30, 2, 2, 'k');
    } },
    { w: 32, draw(g, x) { // the scratch-built double bass
      g.ellipse(x, H - 26, 14, 13, 'm');
      g.ellipse(x, H - 52, 11, 10, 'm');
      g.rect(x - 9, H - 46, 18, 10, 'm');
      g.rect(x - 2, H - 112, 4, 60, 'k');
      g.ellipse(x, H - 114, 3.5, 3.5, 'M');
      [[-4, 108], [3, 108], [-4, 104], [3, 104]].forEach(([dx, dy]) => g.set(x + dx, H - dy, 'x'));
      g.line(x - 6, H - 44, x - 6, H - 34, 'H');
      g.line(x + 6, H - 44, x + 6, H - 34, 'H');
      g.rect(x - 4, H - 30, 8, 2, 'f');
      g.rect(x - 1, H - 26, 2, 10, 'k');
      g.rect(x, H - 108, 1, 80, 'X');
      g.rect(x, H - 13, 1, 13, 'X');
    } },
    { w: 48, draw(g, x) { // synth on a stand with the oscilloscope on top
      g.line(x - 16, H, x + 16, H - 26, 'Z', 2);
      g.line(x + 16, H, x - 16, H - 26, 'Z', 2);
      g.rect(x - 23, H - 33, 46, 7, 'w');
      for (let i = 0; i < 12; i++) if (i % 7 !== 2 && i % 7 !== 6) g.rect(x - 21 + i * 4, H - 33, 2, 4, 'k');
      g.rect(x - 23, H - 39, 46, 6, 'Z');
      for (let i = 0; i < 5; i++) g.ellipse(x - 18 + i * 6, H - 36, 1.5, 1.5, 'x');
      g.rect(x - 12, H - 62, 26, 23, 'x');
      g.rect(x - 10, H - 60, 16, 16, 'k');
      g.line(x - 10, H - 47, x - 6, H - 57, 'y');
      g.line(x - 6, H - 57, x - 6, H - 47, 'y');
      g.line(x - 6, H - 47, x - 1, H - 57, 'y');
      g.line(x - 1, H - 57, x - 1, H - 47, 'y');
      g.line(x - 1, H - 47, x + 5, H - 57, 'y');
      g.ellipse(x + 9, H - 56, 1.8, 1.8, 'Z');
      g.ellipse(x + 9, H - 49, 1.8, 1.8, 'Z');
    } },
    { w: 42, draw(g, x) { // jellyfish tank on a table
      g.rect(x - 20, H - 30, 40, 3, 'm');
      g.rect(x - 18, H - 27, 3, 27, 'M');
      g.rect(x + 15, H - 27, 3, 27, 'M');
      g.rect(x - 15, H - 64, 30, 34, 'u');
      g.rect(x - 15, H - 64, 30, 2, 'x');
      g.rect(x - 15, H - 64, 2, 34, 'x');
      g.rect(x + 13, H - 64, 2, 34, 'x');
      g.ellipse(x - 1, H - 50, 6, 5, 'i');
      g.rect(x - 7, H - 49, 14, 5, 'u');
      [[-5, 0], [-2, 1], [1, 0], [4, 1]].forEach(([dx, ph]) => {
        for (let y = H - 47; y < H - 36; y++) g.set(x + dx + Math.round(Math.sin(y * 0.8 + ph)), y, 'p');
      });
      g.rect(x - 4, H - 70, 8, 6, 'Z');
      g.rect(x + 6, H - 35, 11, 5, 'b');
    } },
    { w: 66, draw(g, x) { // '51 Pontiac with the hood up
      g.poly([[x - 32, H - 12], [x - 31, H - 21], [x - 20, H - 25], [x - 12, H - 35], [x + 8, H - 35], [x + 15, H - 25], [x + 30, H - 23], [x + 33, H - 12]], 'c');
      g.poly([[x + 14, H - 25], [x + 26, H - 44], [x + 29, H - 42], [x + 19, H - 24]], 'c');
      g.rect(x - 10, H - 33, 8, 7, 'u');
      g.rect(x, H - 33, 7, 7, 'u');
      g.rect(x - 32, H - 14, 66, 2, 'x');
      g.ellipse(x - 19, H - 11, 6.5, 6.5, 'k');
      g.ellipse(x + 20, H - 11, 6.5, 6.5, 'k');
      g.ellipse(x - 19, H - 11, 4, 4, 'w');
      g.ellipse(x + 20, H - 11, 4, 4, 'w');
      g.ellipse(x - 19, H - 11, 2, 2, 'x');
      g.ellipse(x + 20, H - 11, 2, 2, 'x');
      g.rect(x - 30, H - 20, 60, 1, 'W');
    } },
    { w: 46, draw(g, x) { // engine hoist with a V8 hanging off it
      g.line(x - 16, H, x - 2, H - 84, 'a', 3);
      g.line(x + 12, H, x - 2, H - 84, 'a', 3);
      g.line(x - 2, H - 84, x + 20, H - 78, 'a', 3);
      g.rect(x + 19, H - 76, 1, 26, 'Z');
      g.rect(x + 10, H - 50, 20, 15, 'Z');
      g.rect(x + 8, H - 52, 6, 4, 'r');
      g.rect(x + 26, H - 52, 6, 4, 'r');
      g.ellipse(x + 20, H - 53, 6, 2, 'x');
      g.rect(x - 18, H - 3, 34, 3, 'a');
    } },
    { w: 46, draw(g, x) { // plumbing: pipes, valves and a gauge
      g.rect(x - 20, H - 74, 5, 74, 'x');
      g.rect(x + 4, H - 96, 5, 96, 'a');
      g.rect(x - 20, H - 74, 29, 5, 'x');
      g.rect(x + 4, H - 56, 20, 5, 'a');
      g.rect(x + 19, H - 56, 5, 56, 'a');
      [[x - 20, H - 74], [x + 4, H - 74], [x + 4, H - 56], [x + 19, H - 56]].forEach(([px, py]) => g.rect(px - 1, py - 1, 7, 7, 'X'));
      g.ellipse(x - 8, H - 82, 6, 6, 'r');
      g.ellipse(x - 8, H - 82, 3, 3, '.');
      g.ellipse(x + 15, H - 38, 6, 6, 'w');
      g.line(x + 15, H - 38, x + 18, H - 42, 'k');
    } },
    { w: 24, draw(g, x) { // ladder
      g.line(x - 9, H, x + 3, H - 94, 'm', 2);
      g.line(x - 1, H, x + 11, H - 94, 'm', 2);
      for (let i = 1; i < 11; i++) {
        const t = i / 11, y = H - 94 * t;
        g.line(x - 9 + 12 * t, y, x - 1 + 12 * t, y, 'm');
      }
    } },
    { w: 44, draw(g, x) { // fence stakes and a sledgehammer
      for (let i = 0; i < 6; i++) stake(g, x - 20 + i * 7, 4, 22 + ((i * 5) % 9), 'm');
      g.rect(x - 22, H - 16, 44, 2, 'M');
      g.line(x + 18, H, x + 8, H - 34, 'M', 2);
      g.rect(x + 3, H - 39, 11, 6, 'Z');
    } },
    { w: 42, draw(g, x) { // sawhorse, toolbox and saw
      g.line(x - 16, H, x - 10, H - 22, 'm', 2);
      g.line(x - 4, H, x - 10, H - 22, 'm', 2);
      g.line(x + 16, H, x + 10, H - 22, 'm', 2);
      g.line(x + 4, H, x + 10, H - 22, 'm', 2);
      g.rect(x - 18, H - 24, 36, 3, 'm');
      g.rect(x - 12, H - 36, 18, 12, 'r');
      g.rect(x - 6, H - 40, 6, 2, 'k');
      g.poly([[x + 8, H - 24], [x + 20, H - 46], [x + 23, H - 44], [x + 12, H - 24]], 'x');
      g.rect(x + 19, H - 50, 5, 6, 'M');
    } },
    { w: 36, draw(g, x) { // janky lookout tower made of planks
      g.line(x - 14, H, x - 6, H - 88, 'm', 2);
      g.line(x + 14, H, x + 6, H - 88, 'm', 2);
      for (let y = H - 80; y < H - 4; y += 16) {
        const hw = 6 + ((y - (H - 88)) / 88) * 8;
        g.line(x - hw, y, x + hw, y + 14, 'm');
        g.line(x + hw, y, x - hw, y + 14, 'm');
      }
      g.rect(x - 11, H - 92, 22, 4, 'F');
      g.rect(x - 1, H - 108, 1, 16, 'M');
      g.poly([[x, H - 108], [x + 10, H - 105], [x, H - 102]], 'r');
    } },
    { w: 32, draw(g, x) { // wheelbarrow
      g.poly([[x - 14, H - 20], [x + 10, H - 20], [x + 6, H - 10], [x - 10, H - 10]], 'G');
      g.ellipse(x + 8, H - 6, 5, 5, 'k');
      g.line(x - 10, H - 12, x - 18, H - 2, 'M', 2);
      g.line(x - 14, H - 18, x - 22, H - 16, 'M', 2);
    } }
  ];

  function junk(width) {
    const g = new Px(width, H);
    const r = rng(17);
    // scrap piles along the far bank
    for (let x = 0; x < width; x += 11 + Math.floor(r() * 12)) {
      const k = r();
      if (k < 0.2) {
        g.ellipse(x, H - 4, 5, 4, 'k');
        g.ellipse(x, H - 4, 2, 2, 'Z');
      } else if (k < 0.7) g.rect(x - 5, H - 9, 10, 9, k < 0.5 ? 'm' : 'F');
      else g.poly([[x - 6, H], [x, H - 8], [x + 7, H]], 'X');
    }
    pack(g, JUNK, width, 5, 4, 14);
    g.rim();
    g.outline();
    return P.toCanvas(g, 1, HAZE);
  }

  /* --------------------------------------------- interests: marble + music */
  const MARBLE = [
    { w: 92, draw(g, x) { // marble proscenium, red curtains, spotlight
      g.rect(x - 46, H - 92, 11, 92, 'W');
      g.rect(x + 35, H - 92, 11, 92, 'W');
      g.rect(x - 47, H - 100, 94, 8, 'W');
      g.poly([[x - 48, H - 100], [x, H - 116], [x + 48, H - 100]], 'W');
      g.rect(x - 35, H - 92, 70, 82, 'k');
      g.poly([[x - 35, H - 92], [x - 14, H - 92], [x - 27, H - 52], [x - 35, H - 12]], 'r');
      g.poly([[x + 35, H - 92], [x + 14, H - 92], [x + 27, H - 52], [x + 35, H - 12]], 'r');
      g.rect(x - 35, H - 92, 70, 8, 'r');
      for (let i = 0; i < 7; i++) g.ellipse(x - 30 + i * 10, H - 84, 5, 3, 'r');
      for (let y = H - 84; y < H - 12; y += 2) for (let xx = x - 10 + ((y / 2) % 2); xx < x + 10; xx += 2) g.set(xx, y, 'e');
      g.rect(x - 40, H - 12, 80, 4, 'M');
      for (let xx = x - 34; xx < x + 35; xx += 6) g.set(xx, H - 13, 'e');
      for (let xx = x - 40; xx < x + 40; xx += 8) g.rect(xx, H - 98, 2, 1, 'x');
    } },
    { w: 72, draw(g, x) { // giant marble chess pieces
      // king
      g.rect(x - 34, H - 6, 20, 6, 'W');
      g.poly([[x - 31, H - 6], [x - 27, H - 50], [x - 21, H - 50], [x - 17, H - 6]], 'W');
      g.rect(x - 30, H - 54, 12, 4, 'W');
      g.rect(x - 25, H - 64, 2, 10, 'W');
      g.rect(x - 28, H - 61, 8, 2, 'W');
      // knight
      g.rect(x - 8, H - 6, 20, 6, 'W');
      g.poly([[x - 5, H - 6], [x + 10, H - 6], [x + 8, H - 26], [x + 12, H - 40], [x + 4, H - 52], [x - 8, H - 44], [x - 4, H - 36], [x + 2, H - 36], [x - 5, H - 20]], 'W');
      g.set(x + 3, H - 45, 'k');
      // pawn
      g.rect(x + 18, H - 5, 14, 5, 'W');
      g.poly([[x + 20, H - 5], [x + 23, H - 24], [x + 27, H - 24], [x + 30, H - 5]], 'W');
      g.ellipse(x + 25, H - 28, 5, 5, 'W');
      for (let i = 0; i < 6; i++) g.line(x - 30 + i * 9, H - 2 - i * 7, x - 26 + i * 9, H - 6 - i * 7, 'x');
    } },
    { w: 64, draw(g, x) { // grand piano, lid up
      g.poly([[x - 30, H - 30], [x + 22, H - 30], [x + 30, H - 25], [x + 26, H - 20], [x - 30, H - 20]], 'k');
      g.poly([[x - 30, H - 31], [x + 20, H - 31], [x - 26, H - 60]], 'k');
      g.line(x - 6, H - 31, x - 10, H - 46, 'Z');
      [x - 26, x + 2, x + 22].forEach((lx) => g.rect(lx, H - 20, 3, 20, 'k'));
      g.rect(x - 34, H - 30, 5, 4, 'w');
      g.rect(x - 40, H - 16, 12, 3, 'k');
      g.rect(x - 38, H - 13, 2, 13, 'k');
      g.rect(x - 32, H - 13, 2, 13, 'k');
    } },
    { w: 30, draw(g, x) { // upright bass
      g.ellipse(x, H - 26, 13, 12, 'm');
      g.ellipse(x, H - 50, 10, 9, 'm');
      g.rect(x - 8, H - 45, 16, 10, 'm');
      g.rect(x - 2, H - 106, 4, 56, 'k');
      g.ellipse(x, H - 108, 3.5, 3.5, 'M');
      g.line(x - 5, H - 42, x - 5, H - 33, 'H');
      g.line(x + 5, H - 42, x + 5, H - 33, 'H');
      g.rect(x - 4, H - 29, 8, 2, 'f');
      g.rect(x, H - 104, 1, 78, 'X');
      g.rect(x, H - 13, 1, 13, 'X');
    } },
    { w: 34, draw(g, x) { // pair of dice
      g.poly([[x - 16, H - 22], [x - 7, H - 27], [x + 2, H - 22], [x - 7, H - 17]], 'w');
      g.poly([[x - 16, H - 22], [x - 7, H - 17], [x - 7, H - 2], [x - 16, H - 7]], 'W');
      g.poly([[x - 7, H - 17], [x + 2, H - 22], [x + 2, H - 7], [x - 7, H - 2]], 'x');
      g.poly([[x + 3, H - 12], [x + 10, H - 16], [x + 17, H - 12], [x + 10, H - 8]], 'w');
      g.poly([[x + 3, H - 12], [x + 10, H - 8], [x + 10, H], [x + 3, H - 4]], 'W');
      g.poly([[x + 10, H - 8], [x + 17, H - 12], [x + 17, H - 4], [x + 10, H]], 'x');
      [[-7, 22], [-12, 14], [-10, 9], [-4, 14], [-1, 9], [10, 12], [6, 5], [14, 6]].forEach(([dx, dy]) => g.set(x + dx, H - dy, 'k'));
    } },
    { w: 58, draw(g, x) { // drum kit
      g.ellipse(x, H - 16, 13, 13, 'W');
      g.ellipse(x, H - 16, 10, 10, 'r');
      g.ellipse(x, H - 16, 7, 7, 'W');
      g.ellipse(x - 13, H - 34, 7, 4, 'W');
      g.ellipse(x + 13, H - 34, 7, 4, 'W');
      g.line(x - 24, H, x - 24, H - 46, 'Z');
      g.line(x - 32, H - 46, x - 16, H - 46, 'y', 1);
      g.line(x - 31, H - 44, x - 17, H - 44, 'y', 1);
      g.line(x + 24, H, x + 22, H - 56, 'Z');
      g.line(x + 13, H - 58, x + 31, H - 54, 'y', 2);
      g.rect(x + 16, H - 22, 9, 6, 'W');
    } },
    { w: 40, draw(g, x) { // comedy and tragedy on a marble column
      g.rect(x - 8, H - 56, 16, 56, 'W');
      for (let i = 0; i < 4; i++) g.rect(x - 6 + i * 4, H - 54, 1, 50, 'x');
      g.rect(x - 11, H - 60, 22, 4, 'W');
      g.ellipse(x - 6, H - 72, 9, 11, 'W');
      g.ellipse(x + 8, H - 76, 9, 11, 'y');
      g.line(x - 11, H - 76, x - 9, H - 78, 'k');
      g.line(x - 4, H - 78, x - 2, H - 76, 'k');
      g.line(x - 11, H - 68, x - 6, H - 64, 'k');
      g.line(x - 6, H - 64, x - 1, H - 68, 'k');
      g.line(x + 4, H - 82, x + 6, H - 80, 'k');
      g.line(x + 12, H - 82, x + 10, H - 80, 'k');
      g.line(x + 4, H - 70, x + 8, H - 73, 'k');
      g.line(x + 8, H - 73, x + 12, H - 70, 'k');
      g.line(x - 15, H - 64, x - 19, H - 56, 'r', 2);
    } },
    { w: 28, draw(g, x) { // saxophone on its stand
      g.line(x + 4, H - 92, x + 4, H - 40, 'Y', 5);
      g.ellipse(x - 1, H - 37, 8, 6, 'Y');
      g.ellipse(x - 1, H - 39, 4, 3, '.');
      g.poly([[x - 9, H - 38], [x - 6, H - 52], [x - 13, H - 56], [x - 15, H - 50]], 'Y');
      g.line(x + 4, H - 92, x + 10, H - 100, 'Y', 2);
      g.rect(x + 10, H - 102, 2, 3, 'k');
      for (let y = H - 86; y < H - 46; y += 7) g.set(x + 6, y, 'A');
      g.line(x - 8, H, x + 1, H - 28, 'Z');
      g.line(x + 10, H, x + 1, H - 28, 'Z');
    } },
    { w: 42, draw(g, x) { // sailing: a sailboat on a marble plinth
      g.rect(x - 16, H - 16, 32, 16, 'W');
      g.rect(x - 18, H - 18, 36, 3, 'W');
      g.poly([[x - 17, H - 26], [x + 17, H - 26], [x + 12, H - 19], [x - 12, H - 19]], 'r');
      g.rect(x, H - 72, 2, 46, 'M');
      g.poly([[x - 1, H - 70], [x - 1, H - 28], [x - 16, H - 28]], 'w');
      g.poly([[x + 3, H - 64], [x + 3, H - 28], [x + 15, H - 28]], 'W');
    } },
    { w: 34, draw(g, x) { // trumpet on a stand
      g.line(x - 4, H, x + 2, H - 30, 'Z');
      g.line(x + 8, H, x + 2, H - 30, 'Z');
      g.line(x - 14, H - 38, x + 8, H - 38, 'Y', 2);
      g.line(x - 12, H - 33, x + 6, H - 33, 'Y', 2);
      g.poly([[x + 8, H - 41], [x + 16, H - 45], [x + 16, H - 30], [x + 8, H - 34]], 'Y');
      [x - 4, x, x + 4].forEach((vx) => g.rect(vx, H - 44, 2, 6, 'y'));
      g.line(x - 14, H - 38, x - 12, H - 33, 'Y', 2);
    } },
    { w: 18, draw(g, x) { // vintage microphone
      g.line(x - 7, H, x, H - 8, 'Z');
      g.line(x + 7, H, x, H - 8, 'Z');
      g.rect(x, H - 74, 1, 66, 'Z');
      g.ellipse(x + 0.5, H - 80, 4, 6, 'X');
      for (let y = H - 84; y < H - 76; y += 2) g.rect(x - 2, y, 5, 1, 'x');
    } },
    { w: 14, draw(g, x) { // marble column
      g.rect(x - 7, H - 4, 14, 4, 'W');
      g.rect(x - 5, H - 84, 10, 80, 'W');
      g.rect(x - 7, H - 88, 14, 4, 'W');
      for (let i = 0; i < 3; i++) g.rect(x - 3 + i * 3, H - 82, 1, 76, 'x');
    } }
  ];

  function marble(width) {
    const g = new Px(width, H);
    const r = rng(23);
    pack(g, MARBLE, width, 11, 6, 16);
    // music floating up between everything
    for (let x = 30; x < width; x += 50 + Math.floor(r() * 40)) {
      const y = 12 + Math.floor(r() * 50);
      g.ellipse(x, y + 10, 3, 2.2, 'v');
      g.rect(x + 2, y, 1, 10, 'v');
      if (r() < 0.5) {
        g.ellipse(x + 9, y + 8, 3, 2.2, 'v');
        g.rect(x + 11, y - 2, 1, 10, 'v');
        g.rect(x + 2, y, 10, 2, 'v');
      } else g.line(x + 3, y, x + 6, y + 4, 'v');
    }
    g.rim();
    g.outline();
    return P.toCanvas(g, 1, HAZE);
  }

  HA.backdrops = { tech, junk, marble };
})();
