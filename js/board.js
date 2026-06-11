/* ============================================================
 * board.js — Canvas renderer for the goban.
 * Procedural kaya-wood texture, shaded slate & shell stones,
 * smooth place/capture animations, hover ghosts, coordinates,
 * marks (triangle/dot/label/territory/dead) — all DPR-aware.
 * ============================================================ */
(function (global) {
  'use strict';

  const E = global.GoEngine;
  const { BLACK, WHITE, EMPTY, LETTERS } = E;

  class BoardView {
    /**
     * @param canvas  <canvas> element
     * @param opts    { onPlay(x,y), onHover(x,y|null) }
     */
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = opts;
      this.game = null;
      this.interactive = false;
      this.ghostColor = BLACK;
      this.showCoords = true;
      this.marks = {};        // {triangle, dot, label, hl, found, terB, terW, dame, dead}
      this.hover = null;      // {x,y} | null
      this.anims = [];        // {type:'place'|'capture', i, color, t0}
      this.dimmed = false;
      this._raf = null;
      this._grainSeed = 7;

      canvas.addEventListener('pointermove', (e) => this._pointer(e, false));
      canvas.addEventListener('pointerleave', () => { this.hover = null; this.draw(); });
      canvas.addEventListener('pointerdown', (e) => this._pointer(e, true));

      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(canvas.parentElement);
      this.resize();
    }

    setGame(game) { this.game = game; this.draw(); }
    setMarks(marks) { this.marks = marks || {}; this.draw(); }
    clearMarks() { this.marks = {}; this.draw(); }

    resize() {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const px = Math.min(parent.clientWidth, 620);
      if (px < 40) return;
      const dpr = global.devicePixelRatio || 1;
      this.canvas.style.width = px + 'px';
      this.canvas.style.height = px + 'px';
      this.canvas.width = Math.round(px * dpr);
      this.canvas.height = Math.round(px * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cssSize = px;
      this.draw();
    }

    _metrics() {
      const n = this.game ? this.game.size : 9;
      const m = this.cssSize * (this.showCoords ? 0.062 : 0.04) + 8;
      const cell = (this.cssSize - 2 * m) / (n - 1);
      return { n, m, cell, r: cell * 0.47 };
    }

    _toGrid(e) {
      const rect = this.canvas.getBoundingClientRect();
      const { n, m, cell } = this._metrics();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const gx = Math.round((px - m) / cell);
      const gyTop = Math.round((py - m) / cell);
      if (gx < 0 || gyTop < 0 || gx >= n || gyTop >= n) return null;
      // row 1 is at the bottom
      return { x: gx, y: n - 1 - gyTop };
    }

    _pointer(e, isDown) {
      if (!this.interactive || !this.game) return;
      const p = this._toGrid(e);
      if (isDown) {
        if (p && this.opts.onPlay) this.opts.onPlay(p.x, p.y);
      } else {
        const changed = JSON.stringify(p) !== JSON.stringify(this.hover);
        this.hover = p;
        if (changed) this.draw();
      }
    }

    /* ---------------- animations ---------------- */

    animatePlace(i) {
      this.anims.push({ type: 'place', i, t0: performance.now() });
      this._tick();
    }
    animateCapture(indices, color) {
      const t0 = performance.now();
      for (const i of indices) this.anims.push({ type: 'capture', i, color, t0 });
      this._tick();
    }
    shake() {
      this._shakeT0 = performance.now();
      this._tick();
    }
    _tick() {
      if (this._raf) return;
      const loop = () => {
        this._raf = null;
        const now = performance.now();
        this.anims = this.anims.filter(a =>
          now - a.t0 < (a.type === 'capture' ? 320 : 220));
        const shaking = this._shakeT0 && now - this._shakeT0 < 300;
        this.draw();
        if (this.anims.length || shaking) this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    /* ---------------- drawing ---------------- */

    draw() {
      const ctx = this.ctx;
      if (!this.cssSize) return;
      const { n, m, cell, r } = this._metrics();
      const now = performance.now();

      ctx.save();
      ctx.clearRect(0, 0, this.cssSize, this.cssSize);

      // shake (illegal move feedback)
      if (this._shakeT0) {
        const dt = now - this._shakeT0;
        if (dt < 300) {
          const amp = 4 * (1 - dt / 300);
          ctx.translate(Math.sin(dt / 14) * amp, 0);
        } else this._shakeT0 = null;
      }

      this._drawWood(ctx);

      // grid
      ctx.strokeStyle = 'rgba(60,42,20,0.85)';
      ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const v = m + i * cell;
        ctx.beginPath(); ctx.moveTo(m, v); ctx.lineTo(this.cssSize - m, v); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(v, m); ctx.lineTo(v, this.cssSize - m); ctx.stroke();
      }
      // thicker border
      ctx.lineWidth = 2;
      ctx.strokeRect(m, m, (n - 1) * cell, (n - 1) * cell);

      // star points
      ctx.fillStyle = 'rgba(60,42,20,0.9)';
      for (const [sx, sy] of this._stars(n)) {
        ctx.beginPath();
        ctx.arc(m + sx * cell, m + sy * cell, Math.max(2.2, cell * 0.09), 0, 7);
        ctx.fill();
      }

      // coordinates
      if (this.showCoords) {
        ctx.fillStyle = 'rgba(70,50,25,0.75)';
        ctx.font = `600 ${Math.max(9, cell * 0.32)}px Inter, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) {
          const v = m + i * cell;
          ctx.fillText(LETTERS[i], v, m - cell * 0.55 - 2);
          ctx.fillText(LETTERS[i], v, this.cssSize - m + cell * 0.55 + 2);
          const row = String(n - i);
          ctx.fillText(row, m - cell * 0.55 - 2, v);
          ctx.fillText(row, this.cssSize - m + cell * 0.55 + 2, v);
        }
      }

      if (!this.game) { ctx.restore(); return; }
      const board = this.game.board;
      const placeAnim = new Map(); // i -> progress 0..1
      const capAnims = [];
      for (const a of this.anims) {
        const t = (now - a.t0) / (a.type === 'capture' ? 320 : 220);
        if (a.type === 'place') placeAnim.set(a.i, Math.min(1, t));
        else capAnims.push({ ...a, t: Math.min(1, t) });
      }

      // territory shading (under stones)
      this._fillCells(ctx, this.marks.terB, 'rgba(20,20,25,0.45)', n, m, cell);
      this._fillCells(ctx, this.marks.terW, 'rgba(255,252,240,0.55)', n, m, cell);

      // stones
      for (let i = 0; i < board.length; i++) {
        if (board[i] === EMPTY) continue;
        const { px, py } = this._pix(i, n, m, cell);
        let scale = 1;
        if (placeAnim.has(i)) {
          const t = placeAnim.get(i);
          scale = 0.6 + 0.55 * t - 0.15 * t * t; // slight overshoot
        }
        const dead = this.marks.dead && this.marks.dead.has
          ? this.marks.dead.has(i) : false;
        this._stone(ctx, px, py, r * scale, board[i], dead ? 0.45 : 1);
        if (dead) this._cross(ctx, px, py, r * 0.5, board[i] === BLACK ? '#eee' : '#222');
      }

      // capture fade-outs
      for (const a of capAnims) {
        const { px, py } = this._pix(a.i, n, m, cell);
        this._stone(ctx, px, py, r * (1 - a.t * 0.5), a.color, 1 - a.t);
      }

      // last move marker
      const lm = this.game.lastMove;
      if (lm && !lm.pass) {
        const i = this.game.idx(lm.x, lm.y);
        if (board[i] !== EMPTY) {
          const { px, py } = this._pix(i, n, m, cell);
          ctx.strokeStyle = lm.color === BLACK ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.arc(px, py, r * 0.5, 0, 7); ctx.stroke();
        }
      }

      this._drawMarks(ctx, n, m, cell, r);

      // hover ghost
      if (this.interactive && this.hover) {
        const i = this.game.idx(this.hover.x, this.hover.y);
        if (board[i] === EMPTY &&
            this.game.isLegal(this.hover.x, this.hover.y, this.ghostColor)) {
          const { px, py } = this._pix(i, n, m, cell);
          ctx.globalAlpha = 0.45;
          this._stone(ctx, px, py, r, this.ghostColor, 0.45);
          ctx.globalAlpha = 1;
        }
      }

      if (this.dimmed) {
        ctx.fillStyle = 'rgba(20,16,12,0.45)';
        ctx.fillRect(0, 0, this.cssSize, this.cssSize);
      }
      ctx.restore();
    }

    _pix(i, n, m, cell) {
      const x = i % n, y = (i - x) / n;
      return { px: m + x * cell, py: m + (n - 1 - y) * cell };
    }

    _stars(n) {
      if (n === 9) return [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]];
      if (n === 13) return [[3, 3], [9, 3], [3, 9], [9, 9], [6, 6]];
      if (n === 19) {
        const p = [3, 9, 15], out = [];
        for (const a of p) for (const b of p) out.push([a, b]);
        return out;
      }
      return [];
    }

    _drawWood(ctx) {
      const s = this.cssSize;
      const g = ctx.createLinearGradient(0, 0, s * 0.3, s);
      g.addColorStop(0, '#e3b873');
      g.addColorStop(0.45, '#d9a95f');
      g.addColorStop(0.75, '#d4a258');
      g.addColorStop(1, '#c8954c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(0, 0, s, s, 10);
      ctx.fill();
      // grain
      let seed = this._grainSeed;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      ctx.save();
      ctx.clip();
      for (let k = 0; k < 26; k++) {
        const y0 = rnd() * s;
        const amp = 2 + rnd() * 5;
        const alpha = 0.03 + rnd() * 0.05;
        ctx.strokeStyle = `rgba(120,80,30,${alpha})`;
        ctx.lineWidth = 0.8 + rnd() * 1.6;
        ctx.beginPath();
        for (let x = 0; x <= s; x += 8) {
          const y = y0 + Math.sin(x / (60 + 40 * rnd())) * amp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // soft vignette
      const v = ctx.createRadialGradient(s / 2, s / 2, s * 0.42, s / 2, s / 2, s * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(80,45,10,0.18)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, s, s);
      ctx.restore();
    }

    _stone(ctx, px, py, r, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      // shadow
      ctx.beginPath();
      ctx.ellipse(px + r * 0.12, py + r * 0.18, r * 0.95, r * 0.85, 0, 0, 7);
      ctx.fillStyle = 'rgba(40,24,8,0.30)';
      ctx.fill();
      // body
      ctx.beginPath();
      ctx.arc(px, py, r, 0, 7);
      if (color === BLACK) {
        const g = ctx.createRadialGradient(
          px - r * 0.4, py - r * 0.45, r * 0.1, px, py, r * 1.05);
        g.addColorStop(0, '#6e6e72');
        g.addColorStop(0.35, '#2e2e33');
        g.addColorStop(1, '#070708');
        ctx.fillStyle = g;
      } else {
        const g = ctx.createRadialGradient(
          px - r * 0.38, py - r * 0.42, r * 0.12, px, py, r * 1.05);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.55, '#f2f0e8');
        g.addColorStop(1, '#c9c6ba');
        ctx.fillStyle = g;
      }
      ctx.fill();
      // specular highlight
      ctx.beginPath();
      ctx.ellipse(px - r * 0.35, py - r * 0.42, r * 0.28, r * 0.18, -0.6, 0, 7);
      ctx.fillStyle = color === BLACK ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.restore();
    }

    _cross(ctx, px, py, r, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
      ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r);
      ctx.stroke();
    }

    _fillCells(ctx, list, style, n, m, cell) {
      if (!list) return;
      ctx.fillStyle = style;
      for (const i of list) {
        const { px, py } = this._pix(i, n, m, cell);
        ctx.beginPath();
        ctx.roundRect(px - cell * 0.18, py - cell * 0.18, cell * 0.36, cell * 0.36, 3);
        ctx.fill();
      }
    }

    _drawMarks(ctx, n, m, cell, r) {
      const game = this.game;
      const coordPix = (c) => {
        const [x, y] = E.parseCoord(c);
        return this._pix(game.idx(x, y), n, m, cell);
      };
      const onStone = (c) => {
        const [x, y] = E.parseCoord(c);
        return game.board[game.idx(x, y)];
      };
      const mk = this.marks;

      if (mk.dot) {
        for (const c of mk.dot) {
          const { px, py } = coordPix(c);
          const v = onStone(c);
          ctx.fillStyle = v === BLACK ? 'rgba(255,255,255,0.9)'
            : v === WHITE ? 'rgba(0,0,0,0.65)' : 'rgba(178,60,40,0.95)';
          ctx.beginPath(); ctx.arc(px, py, r * 0.28, 0, 7); ctx.fill();
        }
      }
      if (mk.found) {
        for (const c of mk.found) {
          const { px, py } = coordPix(c);
          ctx.strokeStyle = '#2e9e5b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px - r * 0.35, py + r * 0.02);
          ctx.lineTo(px - r * 0.08, py + r * 0.3);
          ctx.lineTo(px + r * 0.38, py - r * 0.28);
          ctx.stroke();
        }
      }
      if (mk.triangle) {
        for (const c of mk.triangle) {
          const { px, py } = coordPix(c);
          const v = onStone(c);
          ctx.strokeStyle = v === BLACK ? 'rgba(255,255,255,0.9)' : 'rgba(178,60,40,0.95)';
          ctx.lineWidth = 2; ctx.lineJoin = 'round';
          const rr = r * 0.52;
          ctx.beginPath();
          ctx.moveTo(px, py - rr);
          ctx.lineTo(px + rr * 0.87, py + rr * 0.5);
          ctx.lineTo(px - rr * 0.87, py + rr * 0.5);
          ctx.closePath(); ctx.stroke();
        }
      }
      if (mk.label) {
        ctx.font = `700 ${r * 0.95}px "Shippori Mincho", serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const [c, ch] of Object.entries(mk.label)) {
          const { px, py } = coordPix(c);
          const v = onStone(c);
          ctx.fillStyle = v === BLACK ? '#fff' : v === WHITE ? '#222' : '#7a3b22';
          ctx.fillText(ch, px, py + 1);
        }
      }
      if (mk.hl) {
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 350);
        for (const c of mk.hl) {
          const { px, py } = coordPix(c);
          ctx.strokeStyle = `rgba(217,119,6,${0.5 + 0.4 * pulse})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(px, py, r * (0.75 + 0.1 * pulse), 0, 7); ctx.stroke();
        }
        this._tickPulse();
      }
    }

    _tickPulse() {
      if (this._pulseRaf) return;
      this._pulseRaf = requestAnimationFrame(() => {
        this._pulseRaf = null;
        if (this.marks.hl && this.marks.hl.length) this.draw();
      });
    }

    destroy() {
      this._ro.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._pulseRaf) cancelAnimationFrame(this._pulseRaf);
    }
  }

  global.GoBoardView = BoardView;
})(typeof window !== 'undefined' ? window : globalThis);
