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

  /**
   * Blocklix's own numbers, read out of the game rather than guessed. The
   * clear is a wave, not a blink: each cell along the line starts 30 ms after
   * the one before it and takes 200 ms to go, so a full line takes 410.
   */
  const BX = { settle: 190, cell: 200, stagger: 30, beam: 230, tick: 700 };

  /**
   * An 8×8 that plays itself. `role` decides what it is trying to show:
   * 'free' plays the game, and the three step demos each demonstrate the one
   * move their caption names — a step captioned Clear that never clears is
   * not a demo, it is decoration.
   */
  function dropBoard(el, size, role) {
    const n = size || 8;
    el.style.setProperty('--n', n);
    el.classList.add('bx');

    const grid = Array.from({ length: n }, () => Array(n).fill(null));
    const cells = [];
    for (let i = 0; i < n * n; i++) {
      const c = document.createElement('i');
      c.className = 'cell';
      el.appendChild(c);
      cells.push(c);
    }
    const beams = document.createElement('div');
    beams.className = 'bx-beams';
    el.appendChild(beams);
    const at = (r, c) => cells[r * n + c];

    function paint(r, c, colour) {
      const cell = at(r, c);
      cell.className = colour ? 'blk' : 'cell';
      cell.style.backgroundColor = colour || '';
      cell.style.removeProperty('animation-delay');
    }

    const fits = (shape, r, c) => shape.every(([dr, dc]) =>
      r + dr < n && c + dc < n && !grid[r + dr][c + dc]);

    /** Which lines a shape at (r,c) would complete — the game checks first. */
    function wouldClear(shape, r, c) {
      const test = grid.map((row) => row.map(Boolean));
      for (const [dr, dc] of shape) test[r + dr][c + dc] = true;
      let lines = 0;
      for (let i = 0; i < n; i++) {
        if (test[i].every(Boolean)) lines++;
        if (test.every((row) => row[i])) lines++;
      }
      return lines;
    }

    /**
     * How good a drop is. Completed lines dominate; short of that, a drop is
     * worth what it does to the fullest row and column it touches, cubed so
     * that finishing a line beats spreading over three. Placing at random —
     * which is what this demo used to do — completes a line roughly never, so
     * the clear animation was something almost nobody ever saw.
     */
    function scoreOf(shape, r, c) {
      const test = grid.map((row) => row.map(Boolean));
      for (const [dr, dc] of shape) test[r + dr][c + dc] = true;
      let lines = 0, fill = 0;
      for (let i = 0; i < n; i++) {
        let row = 0, col = 0;
        for (let j = 0; j < n; j++) { if (test[i][j]) row++; if (test[j][i]) col++; }
        if (row === n) lines++;
        if (col === n) lines++;
        if (row < n) fill += Math.pow(row / n, 3);
        if (col < n) fill += Math.pow(col / n, 3);
      }
      return lines * 12 + fill;
    }

    function place(quiet) {
      let best = null, bestScore = -Infinity;
      for (let tries = 0; tries < 120; tries++) {
        const shape = pick(SHAPES), r = rand(n), c = rand(n);
        if (!fits(shape, r, c)) continue;
        if (quiet && wouldClear(shape, r, c)) continue;   // the Drop step never clears
        const score = scoreOf(shape, r, c) + Math.random() * 0.5;
        if (score > bestScore) { bestScore = score; best = [shape, r, c]; }
      }
      if (!best) return false;
      const [shape, r, c] = best;
      const colour = pick(BLOCKS);            // a piece is one colour, as in the game
      const clearing = wouldClear(shape, r, c) > 0;
      for (const [dr, dc] of shape) {
        grid[r + dr][c + dc] = colour;
        paint(r + dr, c + dc, colour);
        // The landing pop does not play on a drop that clears lines — the game
        // skips it too, and the clear reads better without it.
        if (!clearing) at(r + dr, c + dc).classList.add('is-landing');
      }
      if (!clearing) setTimeout(() => {
        for (const [dr, dc] of shape) at(r + dr, c + dc).classList.remove('is-landing');
      }, BX.settle + 30);
      return true;
    }

    /** A bar of light down the line, ahead of the cells going out. */
    function beam(kind, i) {
      const b = document.createElement('span');
      b.className = 'bx-beam bx-beam-' + kind;
      b.style.setProperty('--i', i);
      beams.appendChild(b);
      setTimeout(() => b.remove(), BX.beam + 40);
    }

    function clearFull() {
      const rows = [], cols = [];
      for (let r = 0; r < n; r++) if (grid[r].every(Boolean)) rows.push(r);
      for (let c = 0; c < n; c++) if (grid.every((row) => row[c])) cols.push(c);
      if (!rows.length && !cols.length) return 0;

      /* Delay per cell: a row runs left to right, a column top to bottom, and
         a cell on both leaves with whichever wave reaches it first. */
      const delay = new Map();
      const mark = (r, c, d) => {
        const key = r + ',' + c;
        delay.set(key, Math.min(delay.has(key) ? delay.get(key) : Infinity, d));
      };
      for (const r of rows) for (let c = 0; c < n; c++) mark(r, c, c * BX.stagger);
      for (const c of cols) for (let r = 0; r < n; r++) mark(r, c, r * BX.stagger);

      for (const r of rows) beam('row', r);
      for (const c of cols) beam('col', c);

      let last = 0;
      for (const [key, d] of delay) {
        const [r, c] = key.split(',').map(Number);
        const cell = at(r, c);
        cell.style.animationDelay = d + 'ms';
        cell.classList.add('is-clearing');
        last = Math.max(last, d);
      }
      const total = last + BX.cell;
      setTimeout(() => {
        for (const key of delay.keys()) {
          const [r, c] = key.split(',').map(Number);
          grid[r][c] = null;
          paint(r, c, null);
        }
      }, total);
      return total;
    }

    /** Everything goes out on a diagonal, and the board starts again. */
    function sweep() {
      let last = 0;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (!grid[r][c]) continue;
        const cell = at(r, c), d = (r + c) * 14;
        cell.style.animationDelay = d + 'ms';
        cell.classList.add('is-clearing');
        last = Math.max(last, d);
      }
      setTimeout(() => {
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { grid[r][c] = null; paint(r, c, null); }
      }, last + BX.cell);
      return last + BX.cell;
    }

    /** Put a block down without a piece around it, for the scripted steps. */
    function seed(r, c, colour, delay) {
      grid[r][c] = colour;
      paint(r, c, colour);
      const cell = at(r, c);
      cell.style.animationDelay = delay + 'ms';
      cell.classList.add('is-entering');
      setTimeout(() => {
        cell.classList.remove('is-entering');
        cell.style.removeProperty('animation-delay');
      }, delay + 400);
    }

    /**
     * Set up one line — or a line and a column crossing it — with a single
     * hole left in it, so the next drop is the one that completes it.
     */
    let hole = null;
    function arrange(cross) {
      const r = rand(n), c = rand(n);
      let i = 0;
      for (let j = 0; j < n; j++) if (j !== c) seed(r, j, pick(BLOCKS), (i++) * 45);
      if (cross) {
        for (let j = 0; j < n; j++) if (j !== r) seed(j, c, pick(BLOCKS), (i++) * 45);
      } else {
        for (let k = 0; k < Math.max(2, n - 2); k++) {          // a little company
          const rr = rand(n), cc = rand(n);
          if (rr !== r && !grid[rr][cc]) seed(rr, cc, pick(BLOCKS), (i++) * 45);
        }
      }
      hole = [r, c];
      // long enough that the last block has finished arriving before it goes
      return i * 45 + 560;
    }

    /* The job ticks with a frame delta, not with its own interval, so a wait
       is kept as a deadline rather than counted down. */
    let until = 0, phase = 0;
    const wait = (ms) => { until = performance.now() + ms; };

    /** The scripted steps: build, complete, admire, wipe, repeat. */
    function scripted(cross) {
      if (phase === 0) { wait(arrange(cross)); phase = 1; return; }
      if (phase === 1) {
        const [r, c] = hole;
        grid[r][c] = pick(BLOCKS);
        paint(r, c, grid[r][c]);
        wait(clearFull() + 260);
        phase = 2;
        return;
      }
      wait(sweep() + 200);
      phase = 0;
    }

    if (role === 'clear' || role === 'combo') {
      wait(300);
    } else {
      // The game opens with a diagonal sweep across the board; so does this.
      for (let i = 0; i < Math.round(n * n * 0.22); i++) place(role === 'drop');
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (!grid[r][c]) continue;
        const cell = at(r, c);
        cell.classList.remove('is-landing');
        cell.style.animationDelay = Math.round((r + c) / (2 * n - 2) * 308) + 'ms';
        cell.classList.add('is-entering');
        setTimeout(() => {
          cell.classList.remove('is-entering');
          cell.style.removeProperty('animation-delay');
        }, 640);
      }
      wait(700);
    }

    return addJob(el, () => {
      if (performance.now() < until) return;
      if (role === 'clear') return scripted(false);
      if (role === 'combo') return scripted(true);
      if (role === 'drop') {                    // this step is about the landing
        if (!place(true)) { wait(sweep() + 200); return; }
        wait(0);
        return;
      }
      if (!place()) { wait(sweep() + 200); return; }
      wait(clearFull());
    }, { every: BX.tick, dress: (colours) => {
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (!grid[r][c]) continue;
        const next = colours[(r * n + c) % colours.length];
        grid[r][c] = next;
        at(r, c).style.backgroundColor = next;
      }
    } });
  }

  /** Gridlix's real table. 32 and up were invented here before; they are not now. */
  const TILE_COLOURS = {
    2: ['#E3F2FD', '#4F83F5'], 4: ['#BBDEFB', '#2196F3'], 8: ['#BBC0FB', '#2136F3'],
    16: ['#9B82FF', '#2A00D2'], 32: ['#FFCBA3', '#C95820'], 64: ['#C8E6C9', '#20C997'],
    128: ['#FFF9C4', '#FBC02D'], 256: ['#F8BBFB', '#F321EF'], 512: ['#FFBCBC', '#F32121'],
    1024: ['#35D0FF', '#FFFFFF'],
  };
  /** 2048 and above is a gradient with white numerals and a coloured glow. */
  const TILE_HIGH = {
    2048: ['#4B9FE5', '#4023C5', '#4B67E5'], 4096: ['#63E5C9', '#2C60D5', '#63C6E5'],
    8192: ['#AF61E4', '#D22C90', '#E361E4'], 16384: ['#E6D75C', '#62D428', '#C1E65C'],
  };

  /**
   * Gridlix's own numbers. The order is the point: the slide finishes, the
   * number flips, and only then — after a deliberate 60 ms of nothing — the
   * merged tile pops. Reading them off the game is what stops this looking
   * like a web page pretending to be a game.
   */
  const MERGE = {
    slide: 140, ghostHold: 60, ghostFade: 80, ghostLinger: 20,
    popDelay: 200, pop: 147, spawnDelay: 140, spawn: 220, tick: 820,
  };

  /**
   * A 4×4 that plays itself. Tiles are absolutely positioned and travel by
   * transform, because that is what makes it read as one board rather than a
   * grid being repainted: the eye follows a tile from where it was to where it
   * went. The box slides, the face inside it scales — one transform cannot run
   * a transition and a keyframe at the same time.
   */
  function mergeBoard(el, size, role) {
    const n = size || 4;
    el.style.setProperty('--n', n);
    el.classList.add('mb');

    const cells = document.createElement('div');
    cells.className = 'mb-cells';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const well = document.createElement('i');
      well.className = 'mb-cell';
      well.style.setProperty('--r', r);
      well.style.setProperty('--c', c);
      cells.appendChild(well);
    }
    const layer = document.createElement('div');
    layer.className = 'mb-tiles';
    el.append(cells, layer);

    let tiles = [], busy = false;

    const place = (t) => {
      t.el.style.setProperty('--r', t.r);
      t.el.style.setProperty('--c', t.c);
    };

    function paint(t) {
      const high = TILE_HIGH[t.v];
      const [bg, fg] = TILE_COLOURS[t.v] || [];
      t.face.textContent = t.v;
      t.el.classList.toggle('is-high', Boolean(high));
      if (high) {
        t.face.style.background = `linear-gradient(180deg, ${high[0]}, ${high[1]})`;
        t.face.style.color = '#FFFFFF';
        t.face.style.boxShadow = `0 4px 14px ${high[2]}66`;
      } else {
        t.face.style.background = bg || '#F5F6FA';
        t.face.style.color = fg || '#2D3142';
        t.face.style.removeProperty('box-shadow');
      }
    }

    function add(r, c, v, how) {
      const box = document.createElement('div');
      box.className = 'mb-tile';
      const face = document.createElement('span');
      face.className = 'mb-face';
      box.appendChild(face);
      layer.appendChild(box);
      const t = { r, c, v, el: box, face };
      place(t); paint(t);
      // A tile is born where it belongs. Without this it would inherit the
      // transition and slide in diagonally from the board's top-left corner.
      box.style.transition = 'none';
      requestAnimationFrame(() => requestAnimationFrame(() => box.style.removeProperty('transition')));
      tiles.push(t);
      if (how) {
        face.classList.add(how);
        setTimeout(() => face.classList.remove(how), (how === 'is-new' ? MERGE.spawn : 700) + 60);
      }
      return t;
    }

    const occupied = () => {
      const g = Array.from({ length: n }, () => Array(n).fill(null));
      for (const t of tiles) g[t.r][t.c] = t;
      return g;
    };

    function spawn() {
      const g = occupied(), free = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!g[r][c]) free.push([r, c]);
      if (!free.length) return null;
      const [r, c] = pick(free);
      return add(r, c, Math.random() < 0.9 ? 2 : 4, 'is-new');
    }

    /**
     * Where everything ends up, worked out before anything moves. Directions
     * are 0 left, 1 up, 2 right, 3 down; each line is read from the wall the
     * tiles travel towards, so the first tile met survives a merge and the
     * second slides on top of it and goes.
     */
    function plan(dir) {
      const g = occupied();
      const horizontal = dir === 0 || dir === 2;
      const reverse = dir === 2 || dir === 3;
      const moves = [], merges = [];
      let moved = false;

      for (let line = 0; line < n; line++) {
        const seq = [];
        for (let i = 0; i < n; i++) {
          const idx = reverse ? n - 1 - i : i;
          const t = horizontal ? g[line][idx] : g[idx][line];
          if (t) seq.push(t);
        }
        let out = 0;
        for (let i = 0; i < seq.length; i++, out++) {
          const t = seq[i];
          let eaten = null;
          if (i + 1 < seq.length && seq[i + 1].v === t.v) { eaten = seq[i + 1]; i++; }
          const idx = reverse ? n - 1 - out : out;
          const r = horizontal ? line : idx;
          const c = horizontal ? idx : line;
          if (t.r !== r || t.c !== c) moved = true;
          moves.push([t, r, c]);
          if (eaten) { moves.push([eaten, r, c]); merges.push([t, eaten]); moved = true; }
        }
      }
      return { moves, merges, moved };
    }

    function sweep(refill) {
      busy = true;
      tiles.forEach((t, i) => {
        t.face.style.animationDelay = (i * 24) + 'ms';
        t.face.classList.add('is-going');
      });
      const done = tiles.length * 24 + 220;
      setTimeout(() => {
        for (const t of tiles) t.el.remove();
        tiles = [];
        if (refill) { spawn(); spawn(); }
        busy = false;
      }, done);
      return done;
    }

    /**
     * Carry out a planned swipe on the game's own clock: slide, flip the
     * number, retire the ghost, and only then pop. `andSpawn` is false for the
     * scripted steps, where a stray new tile would just be noise.
     */
    function apply(p, andSpawn) {
      busy = true;
      for (const [, eaten] of p.merges) eaten.el.classList.add('is-ghost');
      for (const [t, r, c] of p.moves) { t.r = r; t.c = c; place(t); }

      setTimeout(() => {                                   // slide is over
        for (const [survivor] of p.merges) { survivor.v *= 2; paint(survivor); }
        if (andSpawn) spawn();
      }, MERGE.slide);

      setTimeout(() => {
        for (const [, eaten] of p.merges) {
          eaten.el.remove();
          const i = tiles.indexOf(eaten);
          if (i > -1) tiles.splice(i, 1);
        }
      }, MERGE.slide + MERGE.ghostLinger);

      setTimeout(() => {                                   // and only now, the pop
        for (const [survivor] of p.merges) {
          survivor.face.classList.add('is-merged');
          setTimeout(() => survivor.face.classList.remove('is-merged'), MERGE.pop + 40);
        }
        busy = false;
      }, MERGE.popDelay);
    }

    /** The whole game, played to merge as often as it can. */
    function free() {
      /* Prefer the swipe that merges the most. A demo that picks a direction
         at random shuffles tiles around and rarely builds anything, which
         shows the board without showing the game. */
      let p = null, best = -1;
      for (const d of [0, 1, 2, 3]) {
        const q = plan(d);
        if (!q.moved) continue;
        const score = q.merges.length * 2 + Math.random();
        if (score > best) { best = score; p = q; }
      }
      if (!p) { sweep(true); return; }
      apply(p, true);
    }

    let until = 0, phase = 0, ladder = 2;
    const wait = (ms) => { until = performance.now() + ms; };
    const spots = () => {
      const all = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) all.push([r, c]);
      return all.sort(() => Math.random() - 0.5);
    };

    /** Swipe: one direction moves everything at once, and nothing merges. */
    function driveSwipe() {
      if (phase === 0) {
        const free3 = spots();
        [2, 4, 8].forEach((v, i) => add(free3[i][0], free3[i][1], v, 'is-new'));
        wait(MERGE.spawn + 260); phase = 1; return;
      }
      let p = null, best = -1;
      for (const d of [0, 1, 2, 3]) {
        const q = plan(d);
        if (!q.moved || q.merges.length) continue;
        const n0 = q.moves.filter(([t, r, c]) => t.r !== r || t.c !== c).length;
        if (n0 > best) { best = n0; p = q; }
      }
      if (!p) { wait(sweep(false) + 160); phase = 0; return; }
      apply(p, false);
      wait(MERGE.slide + 420);
    }

    /**
     * Merge: two equal tiles, one swipe, one number. The pair doubles each
     * cycle so the step also shows what merging is for.
     */
    function driveMerge(top) {
      if (phase === 0) {
        const r = rand(n), c = rand(n - 1);
        add(r, c, ladder, 'is-new');
        add(r, c + 1, ladder, 'is-new');
        wait(MERGE.spawn + 300); phase = 1; return;
      }
      if (phase === 1) {
        const p = plan(0);
        if (p.moved) apply(p, false);
        wait(MERGE.popDelay + MERGE.pop + 420); phase = 2; return;
      }
      wait(sweep(false) + 160);
      ladder = ladder >= top ? 2 : ladder * 2;
      phase = 0;
    }

    if (role === 'swipe' || role === 'merge' || role === 'target') {
      if (role === 'target') ladder = 64;
      wait(260);
    } else {
      // The game opens with a diagonal cascade; so does this.
      const seeds = spots().slice(0, 2);
      for (const [r, c] of seeds) {
        const t = add(r, c, 2, 'is-entering');
        t.face.style.animationDelay = (160 + (r + c) * 50) + 'ms';
      }
    }

    return addJob(el, () => {
      if (busy || performance.now() < until) return;
      if (role === 'swipe') return driveSwipe();
      if (role === 'merge') return driveMerge(64);
      if (role === 'target') return driveMerge(1024);
      free();
    }, { every: MERGE.tick });
  }

  function initBoards() {
    for (const el of $$('[data-board]')) {
      const kind = el.dataset.board;
      if (kind === 'merge') mergeBoard(el, 4);
      else if (kind === 'nf') dropBoard(el, 5);
      else dropBoard(el, 8);
    }
    /* The three steps under "how it plays" are captioned, and each one now
       demonstrates the move its caption names rather than all three running
       the same loop. */
    const MERGE_STEPS = ['swipe', 'merge', 'target'];
    const DROP_STEPS = ['drop', 'clear', 'combo'];
    for (const el of $$('[data-demo]')) {
      const [kind, i] = el.dataset.demo.split('-');
      const step = Math.max(1, Math.min(3, +i || 1)) - 1;
      if (kind === 'merge') mergeBoard(el, 3, MERGE_STEPS[step]);
      else dropBoard(el, 5, DROP_STEPS[step]);
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
      // The header only earns its edge once the page has actually moved.
      document.body.classList.toggle('scrolled', scrollY > 8);
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

  /**
   * The contents mark the section being read. A long policy is navigated by
   * scrolling as much as by clicking, and a list of ten identical links that
   * never responds to where you are is a list you stop trusting.
   */
  function initDocToc() {
    const links = $$('.doc-toc-list a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const seen = new Set();
    const mark = () => {
      // The topmost section still on screen is the one being read.
      let current = null;
      for (const id of byId.keys()) if (seen.has(id)) { current = id; break; }
      for (const [id, a] of byId) a.setAttribute('aria-current', String(id === current));
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target.id); else seen.delete(e.target.id);
      }
      mark();
    }, { rootMargin: `-${document.querySelector('.nav')?.offsetHeight || 64}px 0px -55% 0px` });
    for (const id of byId.keys()) {
      const sec = document.getElementById(id);
      if (sec) io.observe(sec);
    }
  }

  /**
   * The shelf panels lean toward the pointer and carry a soft light under it.
   * Pointer devices only, and never when the reader has asked for less motion:
   * a card that tilts on a phone just fights the scroll.
   */
  function initTilt() {
    if (reduced.matches || !matchMedia('(hover: hover)').matches) return;
    for (const card of $$('.panel')) {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((.5 - y) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--px', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--py', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
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

  /**
   * Press and focus, drawn as one ring.
   *
   * The browser's own highlight is a rectangle in its own blue, and it knows
   * nothing about a pill, a circle or a card. This copies the target's box and
   * each of its four corners onto a single layer above the page, so the light
   * traces the shape of the thing that was actually pressed. It follows the
   * target while it is lit, which matters here: a button sinks when pressed
   * and leans toward the cursor, and the ring has to go with it.
   */
  function initPressRing() {
    const SEL = 'a[href], button, summary, [role="button"], [role="listbox"] li, ' +
                '.panel, input, select, textarea';
    const PAD = 3;

    const ring = document.createElement('div');
    ring.className = 'press-ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.appendChild(document.createElement('i'));
    document.body.appendChild(ring);
    // Tells the stylesheet the ring is live, so the fallback outline stands down.
    document.documentElement.classList.add('has-ring');

    let target = null, held = false, raf = 0;

    /** A corner of the ring is the target's corner plus the gap it sits out at. */
    const grow = (v) => String(v).split(' ')
      .map((part) => (part.endsWith('px') ? (parseFloat(part) + PAD).toFixed(1) + 'px' : part))
      .join(' ');

    function corners(el) {
      const cs = getComputedStyle(el);
      ring.style.setProperty('--c1', grow(cs.borderTopLeftRadius));
      ring.style.setProperty('--c2', grow(cs.borderTopRightRadius));
      ring.style.setProperty('--c3', grow(cs.borderBottomRightRadius));
      ring.style.setProperty('--c4', grow(cs.borderBottomLeftRadius));
    }

    function place() {
      if (!target) return;
      const r = target.getBoundingClientRect();
      if (!r.width && !r.height) { hide(); return; }
      ring.style.setProperty('--rx', (r.left - PAD).toFixed(1) + 'px');
      ring.style.setProperty('--ry', (r.top - PAD).toFixed(1) + 'px');
      ring.style.setProperty('--rw', (r.width + PAD * 2).toFixed(1) + 'px');
      ring.style.setProperty('--rh', (r.height + PAD * 2).toFixed(1) + 'px');
    }

    function follow() {
      if (!target) { raf = 0; return; }
      place();
      raf = requestAnimationFrame(follow);
    }

    function show(el, pressed) {
      target = el;
      ring.classList.toggle('press', !!pressed);
      corners(el);
      place();
      // The lit class lands a frame later, so the scale has something to run from.
      requestAnimationFrame(() => { if (target === el) ring.classList.add('on'); });
      if (!raf) raf = requestAnimationFrame(follow);
    }

    function hide() {
      target = null;
      held = false;
      ring.classList.remove('on');
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    const hit = (node) => {
      const el = node && node.closest ? node.closest(SEL) : null;
      if (!el || el.disabled || el.hasAttribute('data-no-ring')) return null;
      return el;
    };

    document.addEventListener('pointerdown', (e) => {
      const el = hit(e.target);
      if (!el) { hide(); return; }
      held = true;
      show(el, true);
    }, true);

    const release = () => {
      held = false;
      // A keyboard ring outlives the pointer; a press does not.
      if (ring.classList.contains('press')) hide();
    };
    addEventListener('pointerup', release, true);
    addEventListener('pointercancel', release, true);

    document.addEventListener('focusin', (e) => {
      const el = hit(e.target);
      if (!el) { if (!held) hide(); return; }
      let visible = true;
      try { visible = el.matches(':focus-visible'); } catch (err) { /* older engine */ }
      if (visible) show(el, false);
      else if (!held) hide();
    });
    document.addEventListener('focusout', () => { if (!held) hide(); });

    // Scrolling ends a press — the finger was going somewhere else. A keyboard
    // ring just keeps up with its target.
    addEventListener('scroll', () => {
      if (!target) return;
      if (ring.classList.contains('press')) hide(); else place();
    }, { passive: true, capture: true });
    addEventListener('resize', place);
  }

  /* ── go ────────────────────────────────────────────────────────────────── */
  function start() {
    initLang();
    initTheme();
    initMenu();
    initPressRing();
    initProgress();
    initReveal();
    initCounters();
    initMagnetic();
    initCopy();
    initTilt();
    initDocToc();
    initMotifs();
    initBoards();
    initPalettes();
    initRail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
