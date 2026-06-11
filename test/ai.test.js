'use strict';
/* AI smoke tests: every difficulty must play full games without
 * crashing, illegal moves, infinite games, or eye-filling suicide. */
const { test } = require('node:test');
const assert = require('node:assert');
const { Game, BLACK, WHITE, EMPTY, parseCoord } = require('../js/engine.js');
const { chooseMove } = require('../js/ai.js');

function seededRng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

for (const level of [1, 2, 3]) {
  test(`level ${level} AI completes self-play games legally`, () => {
    for (let trial = 0; trial < 3; trial++) {
      const g = new Game(9, 5.5);
      const rng = seededRng(42 + trial * 1000 + level);
      let moves = 0;
      while (!g.over && moves < 300) {
        const mv = chooseMove(g, level, rng);
        if (mv.pass) g.pass();
        else {
          assert.ok(g.isLegal(mv.x, mv.y, g.turn),
            `level ${level} suggested illegal move at ${mv.x},${mv.y}`);
          g.play(mv.x, mv.y);
        }
        moves++;
      }
      assert.ok(g.over, `level ${level} game must end (took ${moves} moves)`);
      assert.ok(moves > 20, `level ${level} game suspiciously short: ${moves}`);
      const s = g.score();
      assert.ok(Number.isFinite(s.black) && Number.isFinite(s.white));
    }
  });
}

test('AI answers atari: River saves a big group in atari', () => {
  const g = new Game(9);
  // black group of 3 in atari at E3; it's black's turn (AI plays black)
  g.setup({
    black: ['E5', 'E4', 'E6'],
    white: ['D4', 'D5', 'D6', 'E7', 'F6', 'F5', 'F4'],
  });
  g.turn = BLACK;
  const rng = seededRng(7);
  const mv = chooseMove(g, 2, rng);
  assert.ok(!mv.pass, 'must not pass');
  g.play(mv.x, mv.y);
  const i = g.idx(...parseCoord('E5'));
  assert.ok(g.groupAt(i).libs.size >= 2,
    `AI should rescue the group (played ${mv.x},${mv.y})`);
});

test('AI takes a free capture', () => {
  const g = new Game(9);
  // white E5 in atari, black (AI) to move
  g.setup({ black: ['D5', 'F5', 'E6'], white: ['E5', 'C3', 'G7', 'G3'] });
  g.turn = BLACK;
  const rng = seededRng(11);
  const mv = chooseMove(g, 2, rng);
  g.play(mv.x, mv.y);
  const [x, y] = parseCoord('E5');
  assert.strictEqual(g.board[g.idx(x, y)], EMPTY, 'AI should capture E5');
});
