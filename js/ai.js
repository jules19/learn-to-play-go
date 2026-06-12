/* ============================================================
 * ai.js — A beginner-friendly heuristic Go AI for 9×9 play.
 * Three personalities:
 *   1 "Pebble"  — gentle & a little random; great first opponent
 *   2 "River"   — solid fundamentals: captures, defends, extends
 *   3 "Mountain"— River + 1-ply lookahead at candidate moves
 * It is intentionally human-ish: it values captures, answers
 * atari, avoids self-atari, respects eyes and likes the 3rd line.
 * ============================================================ */
(function (global) {
  'use strict';

  const E = global.GoEngine || require('./engine.js');
  const { BLACK, WHITE, EMPTY, other } = E;

  /** Is `i` a true-ish eye for `color` on this board? */
  function isEye(game, board, i, color) {
    for (const n of game.neighbors(i)) {
      if (board[n] !== color) return false;
    }
    // diagonals: allow at most one non-friendly (edge-aware)
    const s = game.size, x = i % s, y = (i - x) / s;
    let bad = 0, total = 0;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= s || ny >= s) continue;
      total++;
      const v = board[ny * s + nx];
      if (v !== color && v !== EMPTY) bad++;
    }
    return total === 4 ? bad === 0 : bad === 0; // strict on edge too
  }

  function groupsInAtari(game, board, color) {
    const seen = new Set(), out = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== color || seen.has(i)) continue;
      const g = game.groupAt(i, board);
      g.stones.forEach(s => seen.add(s));
      if (g.libs.size === 1) out.push(g);
    }
    return out;
  }

  /** Score one candidate move for `color`. Higher = better. */
  function scoreMove(game, i, color, level, rng) {
    const sim = game.tryPlay(i % game.size, Math.floor(i / game.size), color);
    if (!sim.legal) return -Infinity;
    const enemy = other(color);
    let score = 0;

    // never fill your own eyes
    if (isEye(game, game.board, i, color)) return -Infinity;

    // captures are wonderful
    score += sim.captured.length * 12;

    // how does our new group breathe?
    const own = game.groupAt(i, sim.board);
    if (own.libs.size === 1) {
      // self-atari is awful unless it captured something big (snapback-ish)
      if (sim.captured.length === 0) return -60;
      score -= 8;
    }
    score += Math.min(own.libs.size, 4) * 1.5;

    // did this move rescue a group of ours that was in atari?
    for (const g of groupsInAtari(game, game.board, color)) {
      const stillDying = g.stones.some(s =>
        sim.board[s] === color && game.groupAt(s, sim.board).libs.size <= 1);
      if (!stillDying) score += 9 + g.stones.length * 2;
    }

    // does it put enemy groups in atari (without self-atari)?
    if (own.libs.size >= 2) {
      const counted = new Set();
      for (const n of game.neighbors(i)) {
        if (sim.board[n] === enemy && !counted.has(n)) {
          const g = game.groupAt(n, sim.board);
          g.stones.forEach(s => counted.add(s));
          if (g.libs.size === 1) score += 5 + g.stones.length;
          else if (g.libs.size === 2) score += 2;
        }
      }
    }

    // positional taste
    const s = game.size, x = i % s, y = (i - x) / s;
    const line = Math.min(x, y, s - 1 - x, s - 1 - y) + 1;
    if (line === 1) score -= 3;
    else if (line === 2) score += 0.5;
    else if (line === 3) score += 2;
    else if (line === 4) score += 1.5;

    // play near the action (last move), and near friendly stones early
    if (game.lastMove && !game.lastMove.pass) {
      const d = Math.abs(x - game.lastMove.x) + Math.abs(y - game.lastMove.y);
      score += Math.max(0, 4 - d) * 0.8;
    }
    let nearFriend = 0, nearEnemy = 0;
    for (const n of game.neighbors(i)) {
      if (game.board[n] === color) nearFriend++;
      if (game.board[n] === enemy) nearEnemy++;
    }
    score += nearEnemy * 0.7 + nearFriend * 0.3;
    if (nearFriend === 4) score -= 4; // dumpling!

    // randomness gives each personality its temperament
    const jitter = level === 1 ? 7 : level === 2 ? 1.6 : 0.8;
    score += rng() * jitter;

    // Pebble sometimes daydreams and misses captures
    if (level === 1 && sim.captured.length > 0 && rng() < 0.35) {
      score -= sim.captured.length * 10;
    }
    return score;
  }

  /**
   * Choose a move for game.turn.
   * Returns {pass:true} or {x, y}.
   */
  function chooseMove(game, level, rng) {
    rng = rng || Math.random;
    const color = game.turn;
    const enemy = other(color);
    const cands = [];
    for (let i = 0; i < game.board.length; i++) {
      if (game.board[i] !== EMPTY) continue;
      const sc = scoreMove(game, i, color, level, rng);
      if (sc > -Infinity) cands.push({ i, sc });
    }
    if (!cands.length) return { pass: true };
    cands.sort((a, b) => b.sc - a.sc);

    // Mountain peeks one move ahead on its top candidates
    if (level >= 3) {
      const top = cands.slice(0, 8);
      for (const c of top) {
        const x = c.i % game.size, y = Math.floor(c.i / game.size);
        const sim = game.tryPlay(x, y, color);
        // worst thing the enemy can do to the stone we just played?
        const g = game.groupAt(c.i, sim.board);
        if (g.libs.size === 1 && sim.captured.length === 0) c.sc -= 15;
        else if (g.libs.size === 2) {
          // can enemy capture us in a ladder-ish way? cheap proxy: atari us
          c.sc -= 2;
        }
      }
      top.sort((a, b) => b.sc - a.sc);
      cands.splice(0, top.length, ...top);
    }

    const best = cands[0];
    // pass when nothing is worth anything and the game is long
    const moveCount = game.history.length;
    const threshold = level === 1 ? -2 : 1.2;
    if (best.sc < threshold && moveCount > game.size * game.size * 0.6) {
      return { pass: true };
    }
    // opponent passed: pass back politely if we're ahead on a raw count,
    // or if nothing on the board is worth playing anymore
    if (game.passes === 1 && moveCount > 12) {
      const s = game.score();
      const mine = color === BLACK ? s.black : s.white;
      const theirs = color === BLACK ? s.white : s.black;
      if (mine > theirs || best.sc < 3) return { pass: true };
    }
    return { x: best.i % game.size, y: Math.floor(best.i / game.size) };
  }

  const LEVELS = [
    { id: 1, name: 'Pebble', emoji: '🪨', blurb: 'Gentle and dreamy. Perfect for your very first games.' },
    { id: 2, name: 'River', emoji: '🌊', blurb: 'Calm but precise — punishes forgotten liberties.' },
    { id: 3, name: 'Mountain', emoji: '⛰️', blurb: 'Patient and stern. Reads one move ahead of you.' },
  ];

  const GoAI = { chooseMove, LEVELS, isEye };
  global.GoAI = GoAI;
  if (typeof module !== 'undefined' && module.exports) module.exports = GoAI;
})(typeof window !== 'undefined' ? window : globalThis);
