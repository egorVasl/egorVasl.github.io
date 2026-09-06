/* ═══════════════════════════════════════════════════════════════════════════
   Vaslix Games — every moving thing on the site.

   One requestAnimationFrame loop drives all of it. A job only runs while its
   element is on screen, the tab is visible, and the visitor has not asked for
   reduced motion — in which case everything is drawn once, at rest, and left
   alone. Nothing here needs a framework.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── the loop ──────────────────────────────────────────────────────────
     Jobs register once. `visible` is maintained by one shared observer, so a
     shelf with six canvases costs one observer, not six. */
  const jobs = [];
  let last = 0, looping = false;

  const seen = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          const job = jobs.find((j) => j.el === e.target);
          if (job) job.visible = e.isIntersecting;
        }
        kick();
      }, { rootMargin: '120px' })
    : null;

  function addJob(el, update, options) {
    const job = Object.assign({ el, update, visible: !seen, every: 0, acc: 0 }, options || {});
    jobs.push(job);
    if (seen) seen.observe(el);
    if (job.draw) job.draw(job);           // a resting frame, before anything moves
    kick();
    return job;
  }

  function kick() {
    if (looping || reduced.matches) return;
    if (!jobs.some((j) => j.visible)) return;
    looping = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.min(64, now - last);
    last = now;
    let alive = false;
    for (const job of jobs) {
      if (!job.visible || document.hidden) continue;
      alive = true;
      if (job.every) {
        job.acc += dt;
        if (job.acc >= job.every) { job.acc = 0; job.update(job, dt); }
      } else {
        job.update(job, dt);
      }
    }
    looping = alive;
    if (alive) requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', kick);
  reduced.addEventListener('change', () => { if (!reduced.matches) kick(); });

  /* ── canvas plumbing ───────────────────────────────────────────────────── */
  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return { ctx: cv.getContext('2d'), w, h, dpr };
  }

  const roundRect = (ctx, x, y, w, h, r) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  const BRAND = ['#4AC8EA', '#4F83F5', '#6C5DD3'];
  const BLOCKS = ['#FF6FA8', '#FF7728', '#4FC3F7', '#5EBC5A', '#B658CC', '#FBC830', '#0FEFD8', '#D74064'];

  /** The abstract motifs behind heroes and shelf panels. */
  const MOTIFS = {
    /* Both vocabularies at once: squares that drift, a few that pair up. */
    brand(state, t) {
      const { ctx, w, h, dpr } = state;
      ctx.clearRect(0, 0, w, h);
      for (const p of state.parts) {
        const x = (p.x + Math.sin(t / 3400 + p.seed) * 14) * dpr;
        const y = (p.y + Math.cos(t / 4100 + p.seed) * 18 + Math.sin(t / 9000) * 6) * dpr;
        const s = p.s * dpr;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        roundRect(ctx, x, y, s, s, s * 0.26);
        ctx.fill();
        ctx.globalAlpha = p.a * 0.5;
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        roundRect(ctx, x, y + s * 0.78, s, s * 0.22, s * 0.12);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    /* Blocklix: a sparse field that settles, then one line lets go. */
    blocks(state, t) {
      const { ctx, w, h, dpr } = state;
      ctx.clearRect(0, 0, w, h);
      const cycle = (t / 5200) % 1;
      for (const p of state.parts) {
        const fall = Math.min(1, Math.max(0, (cycle - p.seed * 0.5) * 3));
        const gone = p.row === state.hotRow ? Math.max(0, (cycle - 0.72) * 3.6) : 0;
        if (gone >= 1) continue;
        const s = p.s * dpr * (1 - gone);
        const x = p.x * dpr + (p.s * dpr - s) / 2;
        const y = (p.y - 26 * (1 - fall)) * dpr + (p.s * dpr - s) / 2;
        ctx.globalAlpha = p.a * fall * (1 - gone);
        ctx.fillStyle = p.c;
        roundRect(ctx, x, y, s, s, s * 0.24);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    /* Gridlix: pairs that close the distance and become one. */
    tiles(state, t) {
      const { ctx, w, h, dpr } = state;
      ctx.clearRect(0, 0, w, h);
      const cycle = (t / 4600) % 1;
      for (const p of state.parts) {
        const k = clamp((cycle - p.seed * 0.35) * 2.2, 0, 1);
        const merged = k > 0.62;
        const x = (p.x + (p.tx - p.x) * k) * dpr;
        const y = (p.y + (p.ty - p.y) * k) * dpr;
        const s = p.s * dpr * (merged && p.lead ? 1.22 : merged ? 0.001 : 1);
        if (s < 1) continue;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        roundRect(ctx, x, y, s, s, s * 0.22);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    /* The audio app: a spectrum breathing, no numbers, no faces. */
    waves(state, t) {
      const { ctx, w, h, dpr } = state;
      ctx.clearRect(0, 0, w, h);
      const bars = state.parts.length;
      for (let i = 0; i < bars; i++) {
        const p = state.parts[i];
        const amp = (Math.sin(t / 900 + i * 0.55) + Math.sin(t / 430 + i * 0.21)) * 0.25 + 0.5;
        const bh = (18 + amp * 90) * dpr;
        const bw = p.s * dpr * 0.5;
        const x = p.x * dpr;
        const y = (h - bh) / 2;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        roundRect(ctx, x, y, bw, bh, bw / 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    /* The word puzzle: a loose grid, a couple of cells lit at a time. */
    letters(state, t) {
      const { ctx, w, h, dpr } = state;
      ctx.clearRect(0, 0, w, h);
      const lit = Math.floor(t / 900) % state.parts.length;
      state.parts.forEach((p, i) => {
        const on = i === lit || i === (lit + 5) % state.parts.length;
        const s = p.s * dpr;
        ctx.globalAlpha = on ? p.a : p.a * 0.32;
        ctx.fillStyle = on ? p.c : 'currentColor';
        ctx.strokeStyle = p.c;
        ctx.lineWidth = 1.4 * dpr;
        roundRect(ctx, p.x * dpr, p.y * dpr, s, s, s * 0.24);
        if (on) ctx.fill(); else ctx.stroke();
      });
      ctx.globalAlpha = 1;
    },
    /* The empty slot: outlines that arrive and leave, holding the space. */
    open(state, t) {
      const { ctx, w, h, dpr } = state;
      ctx.clearRect(0, 0, w, h);
      state.parts.forEach((p, i) => {
        const k = (Math.sin(t / 2600 + i * 1.1) + 1) / 2;
        const s = p.s * dpr;
        ctx.globalAlpha = 0.10 + k * 0.16;
        ctx.strokeStyle = p.c;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.lineWidth = 1.3 * dpr;
        roundRect(ctx, p.x * dpr, p.y * dpr, s, s, s * 0.24);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
  };

  /** Particles are laid out against the element's own size, not the window. */
  function seedMotif(cv, kind) {
    const r = cv.getBoundingClientRect();
    const w = r.width || 320, h = r.height || 320;
    const accent = getComputedStyle(cv).getPropertyValue('--acc').trim() || BRAND[1];
    const parts = [];
    if (kind === 'waves') {
      const n = Math.max(9, Math.round(w / 26));
      for (let i = 0; i < n; i++) {
        parts.push({ x: 14 + i * ((w - 28) / n), s: (w - 28) / n, a: 0.16 + (i % 3) * 0.06, c: accent });
      }
    } else if (kind === 'letters' || kind === 'open') {
      const s = 26, cols = Math.max(3, Math.floor((w - 30) / (s + 8)));
      const rows = Math.max(3, Math.floor((h - 30) / (s + 8)));
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        parts.push({ x: 16 + x * (s + 8), y: 16 + y * (s + 8), s, a: 0.5, c: accent });
      }
    } else if (kind === 'tiles') {
      for (let i = 0; i < 9; i++) {
        const x = rand(Math.max(40, w - 90)), y = rand(Math.max(40, h - 90));
        const lead = i % 2 === 0;
        parts.push({
          x, y, tx: lead ? x : x - 34, ty: lead ? y : y - 12,
          s: 30 + rand(22), a: 0.13 + Math.random() * 0.12, c: accent, lead,
          seed: Math.random(),
        });
      }
    } else if (kind === 'blocks') {
      const s = 26, cols = Math.max(4, Math.floor(w / (s + 6)));
      const rows = Math.max(4, Math.floor(h / (s + 6)));
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (Math.random() > 0.42) continue;
        parts.push({
          x: 8 + x * (s + 6), y: 8 + y * (s + 6), row: y, s,
          a: 0.10 + Math.random() * 0.16, c: pick(BLOCKS), seed: Math.random(),
        });
      }
    } else {
      for (let i = 0; i < 16; i++) {
        parts.push({
          x: rand(Math.max(40, w - 70)), y: rand(Math.max(40, h - 70)),
          s: 22 + rand(44), a: 0.08 + Math.random() * 0.14,
          c: BRAND[i % 3], seed: Math.random() * 6,
        });
      }
    }
    return { parts, hotRow: 2 + rand(3) };
  }

  function initMotifs() {
    for (const cv of $$('canvas[data-motif]')) {
      const kind = cv.dataset.motif in MOTIFS ? cv.dataset.motif : 'brand';
      let state = Object.assign(fitCanvas(cv), seedMotif(cv, kind));
      addJob(cv, () => { state.t = (state.t || 0) + 16; MOTIFS[kind](state, state.t); },
        { draw: () => { state.t = 1200; MOTIFS[kind](state, state.t); } });
      addEventListener('resize', debounce(() => {
        state = Object.assign(fitCanvas(cv), seedMotif(cv, kind), { t: state.t });
        MOTIFS[kind](state, state.t || 1200);
      }, 220));
    }
  }

  function debounce(fn, ms) {
    let id; return function () { clearTimeout(id); id = setTimeout(fn, ms); };
  }

  /* ── boards: the literal demos, on the game pages ──────────────────────── */
  const SHAPES = [
    [[0, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1]], [[0, 1], [1, 0], [1, 1]],
  ];

  /** An 8×8 that plays itself: place a piece, clear what fills up, repeat. */
  function dropBoard(el, size) {
    const n = size || 8;
    el.style.setProperty('--n', n);
    const grid = Array.from({ length: n }, () => Array(n).fill(null));
    const cells = [];
    for (let i = 0; i < n * n; i++) {
      const c = document.createElement('i');
      c.className = 'cell';
      el.appendChild(c);
      cells.push(c);
    }
    const at = (r, c) => cells[r * n + c];

    const paint = (r, c, colour, cls) => {
      const cell = at(r, c);
      cell.className = colour ? 'blk' + (cls ? ' ' + cls : '') : 'cell';
      cell.style.background = colour || '';
    };

    function fits(shape, r, c) {
      return shape.every(([dr, dc]) =>
        r + dr < n && c + dc < n && !grid[r + dr][c + dc]);
    }

    function place() {
      for (let tries = 0; tries < 60; tries++) {
        const shape = pick(SHAPES), r = rand(n), c = rand(n);
        if (!fits(shape, r, c)) continue;
        const colour = pick(BLOCKS);
        for (const [dr, dc] of shape) {
          grid[r + dr][c + dc] = colour;
          paint(r + dr, c + dc, colour, 'pop');
        }
        return true;
      }
      return false;
    }

    function clearFull() {
      const rows = [], cols = [];
      for (let r = 0; r < n; r++) if (grid[r].every(Boolean)) rows.push(r);
      for (let c = 0; c < n; c++) if (grid.every((row) => row[c])) cols.push(c);
      if (!rows.length && !cols.length) return false;
      for (const r of rows) for (let c = 0; c < n; c++) at(r, c).classList.add('clear');
      for (const c of cols) for (let r = 0; r < n; r++) at(r, c).classList.add('clear');
      setTimeout(() => {
        for (const r of rows) for (let c = 0; c < n; c++) { grid[r][c] = null; paint(r, c, null); }
        for (const c of cols) for (let r = 0; r < n; r++) { grid[r][c] = null; paint(r, c, null); }
      }, 380);
      return true;
    }

    /** When nothing fits any more, sweep the board and start over. */
    function reset() {
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (grid[r][c]) at(r, c).classList.add('clear');
      }
      setTimeout(() => {
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { grid[r][c] = null; paint(r, c, null); }
      }, 380);
    }

    for (let i = 0; i < 14; i++) place();
    clearFull();

    return addJob(el, () => {
      if (!place()) { reset(); return; }
      clearFull();
    }, { every: 620, dress: (colours) => {
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (!grid[r][c]) continue;
        const next = colours[(r * n + c) % colours.length];
        grid[r][c] = next;
        at(r, c).style.background = next;
      }
    } });
  }

  const TILE_COLOURS = {
    2: ['#E3F2FD', '#4F83F5'], 4: ['#BBDEFB', '#2196F3'], 8: ['#BBC0FB', '#2136F3'],
    16: ['#9B82FF', '#2A00D2'], 32: ['#8A6BFF', '#FFFFFF'], 64: ['#7B5BF0', '#FFFFFF'],
    128: ['#6C5DD3', '#FFFFFF'], 256: ['#5E4FC7', '#FFFFFF'], 512: ['#5142BB', '#FFFFFF'],
    1024: ['#4437A8', '#FFFFFF'], 2048: ['#FFD84D', '#171B30'],
  };

  /** A 4×4 that plays itself: pick a direction, slide, merge, spawn. */
  function mergeBoard(el, size) {
    const n = size || 4;
    el.style.setProperty('--n', n);
    let grid = Array.from({ length: n }, () => Array(n).fill(0));
    const cells = [];
    for (let i = 0; i < n * n; i++) {
      const c = document.createElement('i');
      el.appendChild(c);
      cells.push(c);
    }

    function render(popped) {
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const cell = cells[r * n + c], v = grid[r][c];
        if (!v) { cell.className = 'tile empty'; cell.textContent = ''; cell.style.background = ''; cell.style.color = ''; continue; }
        const [bg, fg] = TILE_COLOURS[v] || TILE_COLOURS[2048];
        cell.className = 'tile' + (popped && popped.has(r + ',' + c) ? ' pop' : '');
        cell.textContent = v;
        cell.style.background = bg;
        cell.style.color = fg;
      }
    }

    function spawn() {
      const free = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!grid[r][c]) free.push([r, c]);
      if (!free.length) return null;
      const [r, c] = pick(free);
      grid[r][c] = Math.random() < 0.85 ? 2 : 4;
      return r + ',' + c;
    }

    const rotate = (g) => g[0].map((_, i) => g.map((row) => row[i]).reverse());

    function slide(g) {
      let moved = false;
      const next = g.map((row) => {
        const vals = row.filter(Boolean);
        const out = [];
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); i++; }
          else out.push(vals[i]);
        }
        while (out.length < n) out.push(0);
        if (out.some((v, i) => v !== row[i])) moved = true;
        return out;
      });
      return { next, moved };
    }

    function move(dir) {
      let g = grid;
      for (let i = 0; i < dir; i++) g = rotate(g);
      const { next, moved } = slide(g);
      g = next;
      for (let i = dir; i < 4; i++) g = rotate(g);
      if (moved) grid = g;
      return moved;
    }

    grid[rand(n)][rand(n)] = 2;
    spawn();
    render();

    return addJob(el, () => {
      const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      let moved = false;
      for (const d of dirs) if ((moved = move(d))) break;
      if (!moved) { grid = Array.from({ length: n }, () => Array(n).fill(0)); spawn(); spawn(); render(); return; }
      const born = spawn();
      render(new Set(born ? [born] : []));
    }, { every: 780 });
  }

  function initBoards() {
    for (const el of $$('[data-board]')) {
      const kind = el.dataset.board;
      if (kind === 'merge') mergeBoard(el, 4);
      else if (kind === 'nf') dropBoard(el, 5);
      else dropBoard(el, 8);
    }
    for (const el of $$('[data-demo]')) {
      const [kind] = el.dataset.demo.split('-');
      if (kind === 'merge') mergeBoard(el, 3);
      else dropBoard(el, 5);
    }
  }

  /* ── the shelf ─────────────────────────────────────────────────────────── */
  function initRail() {
    const rail = $('.rail');
    if (!rail) return;
    const panels = $$('.panel', rail);
    const dots = $$('.dot');
    const prev = $('[data-rail="prev"]');
    const next = $('[data-rail="next"]');
    const section = rail.closest('.shelf-sec');

    const nearest = () => {
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let best = 0, bestD = Infinity;
      panels.forEach((p, i) => {
        const c = p.offsetLeft + p.offsetWidth / 2;
        const d = Math.abs(c - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    };

    const sync = () => {
      const i = nearest();
      dots.forEach((d, n) => d.setAttribute('aria-current', String(n === i)));
      const accent = getComputedStyle(panels[i]).getPropertyValue('--acc').trim();
      if (accent && section) section.style.setProperty('--acc', accent);
      if (prev) prev.disabled = rail.scrollLeft < 8;
      if (next) next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8;
    };

    const go = (i) => {
      const p = panels[clamp(i, 0, panels.length - 1)];
      if (p) rail.scrollTo({ left: p.offsetLeft - rail.offsetLeft, behavior: reduced.matches ? 'auto' : 'smooth' });
    };

    rail.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    if (prev) prev.addEventListener('click', () => go(nearest() - 1));
    if (next) next.addEventListener('click', () => go(nearest() + 1));
    dots.forEach((d) => d.addEventListener('click', () => go(+d.dataset.go)));
    rail.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(nearest() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(nearest() - 1); }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(panels.length - 1); }
    });

    /* Drag with a pointer, but never steal a click from the panel link. */
    let down = false, startX = 0, startLeft = 0, moved = 0;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      down = true; moved = 0; startX = e.clientX; startLeft = rail.scrollLeft;
    });
    rail.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { rail.classList.add('dragging'); moved = Math.abs(dx); }
      rail.scrollLeft = startLeft - dx;
    });
    const release = () => { down = false; rail.classList.remove('dragging'); };
    rail.addEventListener('pointerup', release);
    rail.addEventListener('pointercancel', release);
    rail.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); moved = 0; } }, true);

    sync();
  }

  /* ── palette picker (Blocklix page) ────────────────────────────────────── */
  function initPalettes() {
    const grid = $('.pal-grid');
    const board = $('[data-dress]');
    const name = $('[data-pal-name]');
    const list = window.VASLIX_PALETTES;
    if (!grid || !board || !list) return;
    const job = jobs.find((j) => j.el === board);

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.pal');
      if (!btn) return;
      const p = list[+btn.dataset.pal];
      $$('.pal', grid).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      board.style.background = `linear-gradient(180deg, ${p.sky[0]}, ${p.sky[p.sky.length - 1] || p.sky[0]})`;
      if (job && job.dress) job.dress(p.blocks);
      if (name) name.textContent = p.name;
    });
  }

  /* ── language ──────────────────────────────────────────────────────────── */
  const DICT = window.VASLIX_I18N || {};
  const LOCALES = Object.keys(DICT);
  const HTML_LANG = { 'pt-BR': 'pt-BR', zh: 'zh-CN' };

  function detectLang() {
    try {
      const saved = localStorage.getItem('vaslix.lang');
      if (saved && DICT[saved]) return saved;
    } catch (e) { /* private mode; fall through to the browser's list */ }
    for (const tag of navigator.languages || [navigator.language || 'en']) {
      const low = String(tag).toLowerCase();
      if (low.startsWith('pt')) return DICT['pt-BR'] ? 'pt-BR' : 'en';
      if (low.startsWith('zh')) return DICT.zh ? 'zh' : 'en';
      const base = low.split('-')[0];
      if (DICT[base]) return base;
    }
    return 'en';
  }

  function applyLang(loc) {
    const table = DICT[loc];
    if (!table) return;
    document.documentElement.lang = HTML_LANG[loc] || loc;
    for (const el of $$('[data-i18n]')) {
      const v = table[el.dataset.i18n];
      if (v === undefined) continue;
      if (/[<&]/.test(v)) el.innerHTML = v; else el.textContent = v;
    }
    for (const el of $$('[data-i18n-attr]')) {
      for (const pair of el.dataset.i18nAttr.split(';')) {
        const [attr, key] = pair.split(':');
        if (table[key] !== undefined) el.setAttribute(attr, table[key]);
      }
    }
    for (const img of $$('[data-badge]')) img.src = `badges/google-play-${loc}.png`;
    const flag = $('[data-lang-flag]'), code = $('[data-lang-code]');
    const item = $(`.lang-menu li[data-lang="${loc}"]`);
    if (item && flag) flag.textContent = $('.lang-flag', item).textContent;
    if (code) code.textContent = loc.toUpperCase();
    $$('.lang-menu li').forEach((li) => li.setAttribute('aria-selected', String(li.dataset.lang === loc)));
    try { localStorage.setItem('vaslix.lang', loc); } catch (e) { /* nothing to do */ }
  }

  function initLang() {
    const wrap = $('.lang-wrap');
    if (!wrap) return;
    const btn = $('.lang-switcher', wrap), menu = $('.lang-menu', wrap);
    const close = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      applyLang(li.dataset.lang);
      close();
    });
    menu.addEventListener('keydown', (e) => {
      const li = e.target.closest('li');
      if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); applyLang(li.dataset.lang); close(); btn.focus(); }
      if (e.key === 'Escape') { close(); btn.focus(); }
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
    applyLang(detectLang());
  }

  /* ── theme: system, light, dark ────────────────────────────────────────── */
  function initTheme() {
    const btn = $('.theme-toggle');
    if (!btn) return;
    const read = () => { try { return localStorage.getItem('vaslix.theme') || 'auto'; } catch (e) { return 'auto'; } };
    let state = read();

    const paint = () => {
      btn.dataset.themeState = state;
      const key = 'nav.theme.' + (state === 'auto' ? 'auto' : state);
      btn.dataset.i18nAttr = 'aria-label:' + key;
      const table = DICT[document.documentElement.lang] || DICT.en || {};
      if (table[key]) btn.setAttribute('aria-label', table[key]);
      if (state === 'auto') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = state;
    };

    const swap = (e) => {
      state = state === 'auto' ? 'light' : state === 'light' ? 'dark' : 'auto';
      try { localStorage.setItem('vaslix.theme', state); } catch (err) { /* nothing to do */ }
      const r = btn.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      document.documentElement.style.setProperty('--reveal-x', x + 'px');
      document.documentElement.style.setProperty('--reveal-y', y + 'px');
      document.documentElement.style.setProperty('--reveal-r',
        Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
      if (document.startViewTransition && !reduced.matches) {
        document.documentElement.classList.add('vt-theme');
        const vt = document.startViewTransition(paint);
        vt.finished.finally(() => document.documentElement.classList.remove('vt-theme'));
      } else {
        document.body.classList.add('theme-flipping');
        paint();
        setTimeout(() => document.body.classList.remove('theme-flipping'), 240);
      }
    };

    btn.addEventListener('click', swap);
    paint();
  }

  /* ── small behaviours ──────────────────────────────────────────────────── */
  function initMenu() {
    const btn = $('.menu-toggle'), menu = $('#mobile-menu');
    if (!btn || !menu) return;
    menu.hidden = true;
    btn.addEventListener('click', () => {
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  function initProgress() {
    const bar = $('.scroll-progress');
    if (!bar) return;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty('--scroll', max > 0 ? clamp(scrollY / max, 0, 1) : 0);
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }

  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduced.matches) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      /* A batch that arrives together is staggered, but the stagger is capped:
         a long page can hand over thirty elements at once, and the thirtieth
         should not wait two seconds to appear. */
      entries.filter((e) => e.isIntersecting).forEach((e, i) => {
        e.target.style.setProperty('--d', Math.min(i, 5));
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /** Counts up once, when the number is first seen. */
  function initCounters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;
    if (!('IntersectionObserver' in window) || reduced.matches) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const target = parseInt(e.target.dataset.count, 10);
        if (!isFinite(target) || target === 0) continue;
        const started = performance.now(), dur = 900;
        const step = (now) => {
          const k = clamp((now - started) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - k, 3);
          e.target.textContent = Math.round(target * eased);
          if (k < 1) requestAnimationFrame(step);
        };
        e.target.textContent = '0';
        requestAnimationFrame(step);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    nums.forEach((n) => io.observe(n));
  }

  /** A button that leans toward the cursor. Pointer devices only. */
  function initMagnetic() {
    if (reduced.matches || !matchMedia('(hover: hover)').matches) return;
    for (const btn of $$('.btn')) {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1) + 'px');
        btn.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.12).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    }
  }

  function initCopy() {
    for (const btn of $$('[data-copy]')) {
      btn.addEventListener('click', async () => {
        const src = $(btn.dataset.copy);
        if (!src) return;
        const label = $('span', btn);
        const table = DICT[document.documentElement.lang] || DICT.en || {};
        try {
          await navigator.clipboard.writeText(src.textContent.trim());
          const before = label.textContent;
          label.textContent = table['press.copied'] || 'Copied';
          setTimeout(() => { label.textContent = before; }, 1800);
        } catch (e) {
          /* Clipboard refused (no permission, insecure origin): select it
             instead so the reader can copy by hand. */
          const range = document.createRange();
          range.selectNodeContents(src);
          const sel = getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
    }
  }

  /* ── go ────────────────────────────────────────────────────────────────── */
  function start() {
    initLang();
    initTheme();
    initMenu();
    initProgress();
    initReveal();
    initCounters();
    initMagnetic();
    initCopy();
    initMotifs();
    initBoards();
    initPalettes();
    initRail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
