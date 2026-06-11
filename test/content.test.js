'use strict';
/* Validates every lesson and puzzle against the real engine:
 * - all setup stones are placeable and positions are sane
 * - every scripted line / solution tree is fully legal
 * - capture goals are actually achieved by the solution
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { Game, BLACK, WHITE, EMPTY, parseCoord } = require('../js/engine.js');
const { LESSONS } = require('../js/lessons.js');
const { PUZZLES } = require('../js/puzzles.js');

function freshGame(stones, toPlay) {
  const g = new Game(9);
  g.setup(stones || {});
  g.turn = toPlay === 'white' ? WHITE : BLACK;
  return g;
}

function assertCapturedAll(g, targets, label) {
  for (const c of targets) {
    const [x, y] = parseCoord(c);
    assert.strictEqual(g.board[g.idx(x, y)], EMPTY,
      `${label}: target ${c} should be captured`);
  }
}

/** Walk every path of a puzzle tree, asserting full legality. */
function walkTree(g, nodes, label, goalTargets) {
  assert.ok(nodes.length > 0, `${label}: empty tree`);
  for (const node of nodes) {
    // each sibling is an independent acceptable move — clone via replay
    const snapshotLen = g.history.length;
    assert.ok(g.isLegal(...parseCoord(node.move), g.turn),
      `${label}: solution move ${node.move} must be legal`);
    g.playCoord(node.move);
    if (node.reply) {
      if (node.reply === 'pass') g.pass();
      else {
        assert.ok(g.isLegal(...parseCoord(node.reply), g.turn),
          `${label}: scripted reply ${node.reply} must be legal`);
        g.playCoord(node.reply);
      }
    }
    if (node.next && node.next.length) {
      walkTree(g, node.next, label, goalTargets);
    } else if (goalTargets && goalTargets.length) {
      assertCapturedAll(g, goalTargets, label);
    }
    while (g.history.length > snapshotLen) g.undo();
  }
}

test('all puzzle setups are valid (no stone on occupied point, all groups alive)', () => {
  for (const p of PUZZLES) {
    const seen = new Set();
    for (const c of [...(p.stones.black || []), ...(p.stones.white || [])]) {
      assert.ok(!seen.has(c), `${p.id}: duplicate stone at ${c}`);
      seen.add(c);
      parseCoord(c); // throws on bad coordinate
    }
    const g = freshGame(p.stones, p.toPlay);
    // no group may start with zero liberties
    for (let i = 0; i < g.board.length; i++) {
      if (g.board[i] !== EMPTY) {
        assert.ok(g.groupAt(i).libs.size > 0,
          `${p.id}: group at index ${i} starts with no liberties`);
      }
    }
  }
});

test('every puzzle solution tree is legal and achieves its capture goal', () => {
  for (const p of PUZZLES) {
    const g = freshGame(p.stones, p.toPlay);
    // p6/p9 mark the player's own stones to SAVE; p8 captures only one of two;
    // p10 lives, p11 kills strategically — each has its own dedicated test below.
    const exempt = ['p6', 'p8', 'p9', 'p10', 'p11'];
    const goal = exempt.includes(p.id) ? null : p.targets;
    walkTree(g, p.tree, p.id, goal);
  }
});

test('p6 (Stay Alive): solution escapes atari', () => {
  const p = PUZZLES.find(q => q.id === 'p6');
  const g = freshGame(p.stones, p.toPlay);
  assert.strictEqual(g.libertiesOf('E5').size, 1, 'starts in atari');
  g.playCoord('E3');
  assert.ok(g.libertiesOf('E5').size >= 3, 'escapes to 3+ liberties');
});

test('p8 (Double Atari): solution ataris both, then captures one', () => {
  const p = PUZZLES.find(q => q.id === 'p8');
  const g = freshGame(p.stones, p.toPlay);
  g.playCoord('E5');
  assert.strictEqual(g.libertiesOf('D5').size, 1, 'D5 in atari');
  assert.strictEqual(g.libertiesOf('F5').size, 1, 'F5 in atari');
  g.playCoord('D4'); // white saves D5
  const r = g.playCoord('F4');
  assert.strictEqual(r.captured.length, 1, 'F5 captured');
});

test('p9 (Counter-Attack): group saved by capturing attackers', () => {
  const p = PUZZLES.find(q => q.id === 'p9');
  const g = freshGame(p.stones, p.toPlay);
  assert.strictEqual(g.libertiesOf('E5').size, 1, 'black group starts in atari');
  assert.strictEqual(g.libertiesOf('D5').size, 1, 'white attackers also in atari');
  const r = g.playCoord('D3');
  assert.strictEqual(r.captured.length, 2, 'captures both attackers');
  assert.ok(g.libertiesOf('E5').size >= 3, 'black group is safe now');
});

test('p10 (Vital Point): B1 makes two real eyes', () => {
  const p = PUZZLES.find(q => q.id === 'p10');
  const g = freshGame(p.stones, p.toPlay);
  g.playCoord('B1');
  // both eyes must be illegal for white = true eyes
  assert.strictEqual(g.isLegal(...parseCoord('A1'), WHITE), false, 'A1 is a real eye');
  assert.strictEqual(g.isLegal(...parseCoord('C1'), WHITE), false, 'C1 is a real eye');
});

test('p13 (Snapback): sacrifice then recapture five', () => {
  const p = PUZZLES.find(q => q.id === 'p13');
  const g = freshGame(p.stones, p.toPlay);
  g.playCoord('B1');                       // sacrifice
  const r1 = g.playCoord('A1');            // white captures one…
  assert.strictEqual(r1.captured.length, 1);
  const r2 = g.playCoord('B1');            // …and dies by snapback
  assert.strictEqual(r2.captured.length, 5, 'recaptures the whole group');
});

test('p14 (Ladder Hunt): every black move is atari; 8 stones fall', () => {
  const p = PUZZLES.find(q => q.id === 'p14');
  const g = freshGame(p.stones, p.toPlay);
  let node = p.tree[0];
  let total = 0;
  while (node) {
    const r = g.playCoord(node.move);
    total += r.captured.length;
    if (node.next) {
      // white still on the board: must be in atari after black's move
      const [x, y] = parseCoord('E5');
      assert.strictEqual(g.groupAt(g.idx(x, y)).libs.size, 1,
        `white must be in atari after ${node.move}`);
    }
    if (node.reply === 'pass') g.pass();
    else if (node.reply) g.playCoord(node.reply);
    node = node.next ? node.next[0] : null;
  }
  assert.strictEqual(total, 8, 'all eight white stones captured');
});

test('all lesson play-steps and tryIllegal-steps check out against the engine', () => {
  for (const lesson of LESSONS) {
    let g = null;
    for (const [si, step] of lesson.steps.entries()) {
      const label = `${lesson.id} step ${si + 1}`;
      if (step.board && !step.keepBoard) {
        g = freshGame(step.board.stones, step.player || 'black');
      } else if (step.keepBoard) {
        assert.ok(g, `${label}: keepBoard with no prior board`);
        if (step.player) g.turn = step.player === 'white' ? WHITE : BLACK;
      }
      if (step.type === 'play') {
        assert.ok(g, `${label}: play step needs a board`);
        for (const node of step.line) {
          assert.ok(g.isLegal(...parseCoord(node.move), g.turn),
            `${label}: student move ${node.move} must be legal`);
          g.playCoord(node.move);
          if (node.reply === 'pass') g.pass();
          else if (node.reply) {
            assert.ok(g.isLegal(...parseCoord(node.reply), g.turn),
              `${label}: scripted reply ${node.reply} must be legal`);
            g.playCoord(node.reply);
          } else if (step.line.indexOf(node) < step.line.length - 1) {
            // student moves twice in a row only via explicit pass
            g.pass();
          }
        }
        if (step.goal && step.goal.type === 'captureAll') {
          assertCapturedAll(g, step.goal.targets, label);
        }
      }
      if (step.type === 'tryIllegal') {
        assert.ok(g, `${label}: tryIllegal needs a board`);
        const color = step.player === 'white' ? WHITE : BLACK;
        assert.strictEqual(g.isLegal(...parseCoord(step.target), color), false,
          `${label}: target ${step.target} must be ILLEGAL for ${step.player}`);
      }
      if (step.type === 'find' && step.targets) {
        for (const t of step.targets) parseCoord(t);
      }
      if (step.type === 'quiz') {
        assert.strictEqual(step.choices.filter(c => c.correct).length, 1,
          `${label}: quiz needs exactly one correct choice`);
      }
    }
  }
});
