/* ============================================================
 * engine.js — A complete Go rules engine.
 * Captures, suicide rule, positional-superko (ko), passing,
 * undo, and area scoring with dead-stone marking.
 * Works in the browser (window.GoEngine) and in Node (tests).
 * ============================================================ */
(function (global) {
  'use strict';

  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const LETTERS = 'ABCDEFGHJKLMNOPQRST'; // 'I' is skipped by convention

  function other(color) { return color === BLACK ? WHITE : BLACK; }

  /** "E5" -> [4,4]  (x from A, y from 1 at the bottom) */
  function parseCoord(s) {
    const x = LETTERS.indexOf(s[0].toUpperCase());
    const y = parseInt(s.slice(1), 10) - 1;
    if (x < 0 || isNaN(y)) throw new Error('Bad coordinate: ' + s);
    return [x, y];
  }

  /** [4,4] -> "E5" */
  function coordName(x, y) { return LETTERS[x] + (y + 1); }

  class Game {
    constructor(size = 9, komi = 5.5) {
      this.size = size;
      this.komi = komi;
      this.board = new Int8Array(size * size);
      this.turn = BLACK;
      this.captures = { [BLACK]: 0, [WHITE]: 0 }; // stones captured BY each color
      this.passes = 0;
      this.over = false;
      this.lastMove = null;        // {x,y,color} | {pass:true,color} | null
      this.history = [];           // snapshots for undo
      this.positions = new Set([this.posKey(this.board)]);
    }

    idx(x, y) { return y * this.size + x; }
    xy(i) { return [i % this.size, Math.floor(i / this.size)]; }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
    get(x, y) { return this.board[this.idx(x, y)]; }

    posKey(board) { return String.fromCharCode.apply(null, board); }

    neighbors(i) {
      const s = this.size, x = i % s, y = (i - x) / s, out = [];
      if (x > 0) out.push(i - 1);
      if (x < s - 1) out.push(i + 1);
      if (y > 0) out.push(i - s);
      if (y < s - 1) out.push(i + s);
      return out;
    }

    /** Group (chain) containing point i on a given board. */
    groupAt(i, board) {
      board = board || this.board;
      const color = board[i];
      const stones = [i], libs = new Set(), seen = new Set([i]);
      const stack = [i];
      while (stack.length) {
        const p = stack.pop();
        for (const n of this.neighbors(p)) {
          if (board[n] === EMPTY) libs.add(n);
          else if (board[n] === color && !seen.has(n)) {
            seen.add(n); stones.push(n); stack.push(n);
          }
        }
      }
      return { color, stones, libs };
    }

    /** Liberties of the group at coordinate string (e.g. "E5"). */
    libertiesOf(coord) {
      const [x, y] = parseCoord(coord);
      const i = this.idx(x, y);
      if (this.board[i] === EMPTY) return null;
      return this.groupAt(i).libs;
    }

    /**
     * Simulate placing `color` at (x,y).
     * Returns {legal, reason?, board?, captured?} without mutating state.
     */
    tryPlay(x, y, color) {
      if (!this.inBounds(x, y)) return { legal: false, reason: 'off-board' };
      const i = this.idx(x, y);
      if (this.board[i] !== EMPTY) return { legal: false, reason: 'occupied' };

      const board = this.board.slice();
      board[i] = color;
      const enemy = other(color);
      const captured = [];
      for (const n of this.neighbors(i)) {
        if (board[n] === enemy) {
          const g = this.groupAt(n, board);
          if (g.libs.size === 0) {
            for (const s of g.stones) {
              if (board[s] === enemy) { board[s] = EMPTY; captured.push(s); }
            }
          }
        }
      }
      const own = this.groupAt(i, board);
      if (own.libs.size === 0) return { legal: false, reason: 'suicide' };
      const key = this.posKey(board);
      if (this.positions.has(key)) return { legal: false, reason: 'ko' };
      return { legal: true, board, captured, key };
    }

    isLegal(x, y, color) { return this.tryPlay(x, y, color || this.turn).legal; }

    legalMoves(color) {
      color = color || this.turn;
      const out = [];
      for (let i = 0; i < this.board.length; i++) {
        if (this.board[i] !== EMPTY) continue;
        const [x, y] = this.xy(i);
        if (this.tryPlay(x, y, color).legal) out.push(i);
      }
      return out;
    }

    snapshot() {
      return {
        board: this.board.slice(),
        turn: this.turn,
        captures: { [BLACK]: this.captures[BLACK], [WHITE]: this.captures[WHITE] },
        passes: this.passes,
        over: this.over,
        lastMove: this.lastMove,
        addedKey: null,
      };
    }

    /** Play for the current player. Returns {captured:[idx]} or throws. */
    play(x, y) {
      if (this.over) throw new Error('game over');
      const color = this.turn;
      const sim = this.tryPlay(x, y, color);
      if (!sim.legal) {
        const err = new Error(sim.reason);
        err.reason = sim.reason;
        throw err;
      }
      const snap = this.snapshot();
      snap.addedKey = this.positions.has(sim.key) ? null : sim.key;
      this.history.push(snap);
      this.board = sim.board;
      this.positions.add(sim.key);
      this.captures[color] += sim.captured.length;
      this.turn = other(color);
      this.passes = 0;
      this.lastMove = { x, y, color };
      return { captured: sim.captured, color };
    }

    /** Convenience: play a coordinate string like "E5". */
    playCoord(coord) {
      const [x, y] = parseCoord(coord);
      return this.play(x, y);
    }

    pass() {
      if (this.over) throw new Error('game over');
      const snap = this.snapshot();
      this.history.push(snap);
      this.lastMove = { pass: true, color: this.turn };
      this.turn = other(this.turn);
      this.passes += 1;
      if (this.passes >= 2) this.over = true;
    }

    undo() {
      const snap = this.history.pop();
      if (!snap) return false;
      if (snap.addedKey) this.positions.delete(snap.addedKey);
      this.board = snap.board;
      this.turn = snap.turn;
      this.captures = snap.captures;
      this.passes = snap.passes;
      this.over = snap.over;
      this.lastMove = snap.lastMove;
      return true;
    }

    /** Place setup stones without turn/ko bookkeeping (for lessons & puzzles). */
    setup(stones) {
      for (const [colorName, coords] of Object.entries(stones || {})) {
        const color = colorName === 'black' ? BLACK : WHITE;
        for (const c of coords) {
          const [x, y] = parseCoord(c);
          this.board[this.idx(x, y)] = color;
        }
      }
      this.positions = new Set([this.posKey(this.board)]);
    }

    /**
     * Area scoring. `dead` is a Set of indices of stones agreed dead.
     * Returns {black, white, terB, terW, dame, result, winner, margin}
     */
    score(dead) {
      dead = dead || new Set();
      const board = this.board.slice();
      for (const i of dead) board[i] = EMPTY;

      const terB = [], terW = [], dame = [];
      const seen = new Set();
      for (let i = 0; i < board.length; i++) {
        if (board[i] !== EMPTY || seen.has(i)) continue;
        // flood-fill the empty region, note bordering colors
        const region = [i], stack = [i], borders = new Set();
        seen.add(i);
        while (stack.length) {
          const p = stack.pop();
          for (const n of this.neighbors(p)) {
            if (board[n] === EMPTY) {
              if (!seen.has(n)) { seen.add(n); region.push(n); stack.push(n); }
            } else borders.add(board[n]);
          }
        }
        if (borders.size === 1) {
          (borders.has(BLACK) ? terB : terW).push(...region);
        } else dame.push(...region);
      }
      let stonesB = 0, stonesW = 0;
      for (let i = 0; i < board.length; i++) {
        if (board[i] === BLACK) stonesB++;
        else if (board[i] === WHITE) stonesW++;
      }
      const black = stonesB + terB.length;
      const white = stonesW + terW.length + this.komi;
      const margin = Math.abs(black - white);
      const winner = black > white ? BLACK : WHITE;
      const result = black > white
        ? `Black wins by ${margin}` : `White wins by ${margin}`;
      return { black, white, terB, terW, dame, result, winner, margin };
    }
  }

  const GoEngine = { Game, EMPTY, BLACK, WHITE, parseCoord, coordName, other, LETTERS };
  global.GoEngine = GoEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = GoEngine;
})(typeof window !== 'undefined' ? window : globalThis);
