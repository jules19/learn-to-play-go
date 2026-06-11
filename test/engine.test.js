'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Game, BLACK, WHITE, EMPTY, parseCoord } = require('../js/engine.js');

function at(g, coord) {
  const [x, y] = parseCoord(coord);
  return g.board[g.idx(x, y)];
}

test('coordinates parse with I skipped, row 1 at bottom', () => {
  assert.deepStrictEqual(parseCoord('A1'), [0, 0]);
  assert.deepStrictEqual(parseCoord('J9'), [8, 8]);
  assert.deepStrictEqual(parseCoord('E5'), [4, 4]);
});

test('liberties: center 4, edge 3, corner 2', () => {
  const g = new Game(9);
  g.setup({ black: ['E5', 'A5', 'A1'] });
  assert.strictEqual(g.libertiesOf('E5').size, 4);
  assert.strictEqual(g.libertiesOf('A5').size, 3);
  assert.strictEqual(g.libertiesOf('A1').size, 2);
});

test('group shares liberties', () => {
  const g = new Game(9);
  g.setup({ black: ['E5', 'F5'] });
  assert.strictEqual(g.libertiesOf('E5').size, 6);
});

test('single capture', () => {
  const g = new Game(9);
  g.setup({ black: ['D5', 'F5', 'E6'], white: ['E5'] });
  const r = g.playCoord('E4'); // black captures
  assert.strictEqual(r.captured.length, 1);
  assert.strictEqual(at(g, 'E5'), EMPTY);
  assert.strictEqual(g.captures[BLACK], 1);
});

test('multi-stone capture', () => {
  const g = new Game(9);
  g.setup({ black: ['D5', 'D4', 'F5', 'F4', 'E6'], white: ['E5', 'E4'] });
  const r = g.playCoord('E3');
  assert.strictEqual(r.captured.length, 2);
});

test('suicide is illegal, but capturing into "suicide" point is legal', () => {
  const g = new Game(9);
  // E5 surrounded by healthy white stones -> black E5 illegal
  g.setup({ white: ['D5', 'F5', 'E4', 'E6'] });
  assert.strictEqual(g.isLegal(4, 4, BLACK), false);

  // same ring but every white stone in atari -> black E5 captures all four
  const g2 = new Game(9);
  g2.setup({
    white: ['D5', 'F5', 'E4', 'E6'],
    black: ['C5', 'D4', 'D6', 'E3', 'F4', 'F6', 'G5', 'E7'],
  });
  const r = g2.playCoord('E5');
  assert.strictEqual(r.captured.length, 4);
});

test('ko: immediate recapture forbidden, allowed after exchange elsewhere', () => {
  const g = new Game(9);
  g.setup({
    black: ['D5', 'E6', 'F5'],
    white: ['D4', 'E3', 'F4', 'E5'],
  });
  g.playCoord('E4'); // black captures E5 -> ko
  assert.strictEqual(at(g, 'E5'), EMPTY);
  // white may NOT retake at E5 immediately
  assert.strictEqual(g.isLegal(...parseCoord('E5'), WHITE), false);
  // white plays elsewhere, black answers, now retake is legal
  g.playCoord('G7'); // white
  g.playCoord('G3'); // black
  assert.strictEqual(g.isLegal(...parseCoord('E5'), WHITE), true);
  g.playCoord('E5');
  assert.strictEqual(at(g, 'E4'), EMPTY);
});

test('undo restores board, captures and ko state', () => {
  const g = new Game(9);
  g.setup({ black: ['D5', 'F5', 'E6'], white: ['E5'] });
  g.playCoord('E4');
  assert.strictEqual(g.captures[BLACK], 1);
  g.undo();
  assert.strictEqual(at(g, 'E5'), WHITE);
  assert.strictEqual(at(g, 'E4'), EMPTY);
  assert.strictEqual(g.captures[BLACK], 0);
  assert.strictEqual(g.turn, BLACK);
});

test('two passes end the game', () => {
  const g = new Game(9);
  g.pass(); g.pass();
  assert.strictEqual(g.over, true);
});

test('area scoring with walls and komi', () => {
  const g = new Game(9, 5.5);
  const black = [], white = [];
  for (let r = 1; r <= 9; r++) { black.push('D' + r); white.push('F' + r); }
  g.setup({ black, white });
  const s = g.score();
  // black: 9 stones + 27 territory (A,B,C); white: 9 + 27 + 5.5 komi
  assert.strictEqual(s.black, 36);
  assert.strictEqual(s.white, 41.5);
  assert.strictEqual(s.winner, WHITE);
  assert.strictEqual(s.dame.length, 9); // E column touches both
});

test('scoring honors dead-stone marking', () => {
  const g = new Game(9, 0.5);
  const black = [], white = [];
  for (let r = 1; r <= 9; r++) { black.push('D' + r); white.push('F' + r); }
  g.setup({ black, white, });
  // a doomed white stone deep in black territory
  g.board[g.idx(...parseCoord('B5'))] = WHITE;
  const dead = new Set([g.idx(...parseCoord('B5'))]);
  const s = g.score(dead);
  assert.strictEqual(s.black, 36); // territory intact after removal
});

test('ladder runs to the edge and is captured (lesson 5 line)', () => {
  const g = new Game(9);
  g.setup({ black: ['E6', 'D5', 'F5', 'D4'], white: ['E5', 'E4'] });
  // black ataris, white forced each time
  const line = [
    ['E3', 'F4'], ['G4', 'F3'], ['F2', 'G3'], ['H3', 'G2'],
    ['G1', 'H2'], ['H1', 'J2'],
  ];
  for (const [b, w] of line) {
    g.playCoord(b); // black atari
    const wg = g.groupAt(g.idx(...parseCoord('E5')));
    assert.strictEqual(wg.libs.size, 1, `white must be in atari after ${b}`);
    g.playCoord(w); // white flees
  }
  g.playCoord('J3'); // black: final atari, J1 is suicide for white
  assert.strictEqual(g.isLegal(...parseCoord('J1'), WHITE), false);
  g.pass(); // white cannot escape
  const r = g.playCoord('J1');
  assert.strictEqual(r.captured.length, 8);
});
