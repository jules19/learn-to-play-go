/* ============================================================
 * puzzles.js — The puzzle collection (tsumego for beginners).
 *
 * Each puzzle is solved by following its solution `tree`:
 * an array of acceptable moves at each depth. A node may have
 * a scripted opponent `reply` ('pass' allowed) and a `next`
 * array of follow-up nodes. Reaching a leaf = solved.
 * All trees are verified by automated tests against the engine.
 * ============================================================ */
(function (global) {
  'use strict';

  const PUZZLES = [
    {
      id: 'p1', stars: 1, title: 'First Capture', toPlay: 'black',
      intro: 'The marked white stone has a single liberty left. Take it.',
      stones: { black: ['D5', 'F5', 'E6'], white: ['E5'] },
      targets: ['E5'],
      tree: [{ move: 'E4' }],
      hint: 'Count White\'s liberties: above ✗, left ✗, right ✗ …',
      success: 'Clean and simple — your first prisoner of many.',
    },
    {
      id: 'p2', stars: 1, title: 'Double Trouble', toPlay: 'black',
      intro: 'Two stones, one fate. Capture the marked white group.',
      stones: { black: ['D5', 'D4', 'F5', 'F4', 'E6'], white: ['E5', 'E4'] },
      targets: ['E5', 'E4'],
      tree: [{ move: 'E3' }],
      hint: 'Connected stones share all their liberties — find the last one.',
      success: 'Both stones fall together. Group capture!',
    },
    {
      id: 'p3', stars: 1, title: 'Edge of the World', toPlay: 'black',
      intro: 'The board edge is a wall with no air behind it. Capture the marked stone.',
      stones: { black: ['A6', 'B5'], white: ['A5'] },
      targets: ['A5'],
      tree: [{ move: 'A4' }],
      hint: 'An edge stone has only three liberties to begin with…',
      success: 'The edge did half the work for you.',
    },
    {
      id: 'p4', stars: 1, title: 'Corner Trap', toPlay: 'black',
      intro: 'In the corner, stones have only two liberties. Finish this one off.',
      stones: { black: ['B1'], white: ['A1'] },
      targets: ['A1'],
      tree: [{ move: 'A2' }],
      hint: 'One liberty is already gone. Where is the other?',
      success: '"There is death in the corner," says the proverb.',
    },
    {
      id: 'p5', stars: 1, title: 'Sweep the First Line', toPlay: 'black',
      intro: 'Two white stones cling to the first line. Capture the marked group.',
      stones: { black: ['A1', 'B2', 'C2', 'D2'], white: ['B1', 'C1'] },
      targets: ['B1', 'C1'],
      tree: [{ move: 'D1' }],
      hint: 'The pair breathes through a single point on the edge.',
      success: 'Crawling on the first line rarely ends well — for them.',
    },
    {
      id: 'p6', stars: 1, title: 'Stay Alive', toPlay: 'black',
      intro: 'Now defend! Your marked stones are in atari. Save them.',
      stones: { black: ['E5', 'E4'], white: ['D5', 'D4', 'F5', 'F4', 'E6'] },
      targets: ['E5', 'E4'],
      tree: [{ move: 'E3' }],
      hint: 'Extend onto your last liberty — the group grows and breathes again.',
      success: 'From one liberty to three. Escape successful!',
    },
    {
      id: 'p7', stars: 2, title: 'Pick Your Prey', toPlay: 'black',
      intro: 'Two white groups are in atari — but you only get one move. Capture the marked (bigger) one.',
      stones: {
        black: ['D5', 'D4', 'F5', 'F4', 'E6', 'B8', 'A7', 'C7'],
        white: ['E5', 'E4', 'B7'],
      },
      targets: ['E5', 'E4'],
      tree: [{ move: 'E3' }],
      hint: 'When two fish are on the line, land the bigger one.',
      success: 'Two prisoners beat one. Always count before you capture.',
    },
    {
      id: 'p8', stars: 2, title: 'Double Atari', toPlay: 'black',
      intro: 'Find the one move that puts BOTH marked white stones in atari. White can only save one…',
      stones: { black: ['C5', 'D6', 'F6', 'G5'], white: ['D5', 'F5'] },
      targets: ['F5'],
      tree: [{ move: 'E5', reply: 'D4', next: [{ move: 'F4' }] }],
      hint: 'Look for the point between the two stones.',
      success: 'A fork! White saved one stone; the other is yours. Double atari is one of Go\'s sweetest moves.',
    },
    {
      id: 'p9', stars: 2, title: 'Counter-Attack', toPlay: 'black',
      intro: 'Your marked stones are in atari, and extending fails. The best defense is…?',
      stones: {
        black: ['C5', 'C4', 'D6', 'E5', 'E4'],
        white: ['D5', 'D4', 'E6', 'F5', 'F4', 'E2', 'F3'],
      },
      targets: ['E5', 'E4'],
      tree: [{ move: 'D3' }],
      hint: 'Look at White\'s two attacking stones on the D-column. How many liberties do THEY have?',
      success: '…a good offense! Capturing the attackers rescued your group and won two prisoners.',
    },
    {
      id: 'p10', stars: 2, title: 'The Vital Point', toPlay: 'black',
      intro: 'Your group has one eye space of three points. Make it live!',
      stones: {
        black: ['A2', 'B2', 'C2', 'D2', 'D1'],
        white: ['A3', 'B3', 'C3', 'D3', 'E3', 'E2', 'E1'],
      },
      targets: [],
      tree: [{ move: 'B1' }],
      hint: 'Split the three-space line into two separate eyes with a single stone.',
      success: 'Two eyes — immortal. "The vital point of three is the center."',
    },
    {
      id: 'p11', stars: 2, title: 'Strike the Center', toPlay: 'black',
      intro: 'White\'s group has a three-point eye space on the top edge. Kill it before it lives!',
      stones: {
        black: ['B9', 'B8', 'C7', 'D7', 'E7', 'F7', 'G7', 'H8', 'H9'],
        white: ['C9', 'C8', 'D8', 'E8', 'F8', 'G8', 'G9'],
      },
      targets: ['C9', 'C8', 'D8', 'E8', 'F8', 'G8', 'G9'],
      tree: [{ move: 'E9' }],
      hint: 'The same vital point that makes a group live… kills it from the other side.',
      success: 'White can never make two eyes now. Even if White captures your stone, only one eye remains — the group is dead where it stands.',
    },
    {
      id: 'p12', stars: 3, title: 'The Net', toPlay: 'black',
      intro: 'The marked stone wants to run — a ladder won\'t work here. Cast a net (geta) instead: a loose move that blocks every escape.',
      stones: { black: ['D5', 'E6', 'F6', 'D3'], white: ['E5'] },
      targets: ['E5'],
      tree: [{
        move: 'F4', reply: 'E4',
        next: [{
          move: 'E3', reply: 'D4',
          next: [{ move: 'C4', reply: 'F5', next: [{ move: 'G5' }] }],
        }],
      }],
      hint: 'Don\'t touch the stone — play the diagonal point below-right that covers both escape routes.',
      success: 'The net closes! Every escape White tried just shortened its own breath. The geta is wiser than the chase.',
    },
    {
      id: 'p13', stars: 3, title: 'Snapback!', toPlay: 'black',
      intro: 'White\'s corner group looks safe with two liberties. Sacrifice a stone to set the trap…',
      stones: {
        black: ['A3', 'B3', 'C3', 'D2', 'D1'],
        white: ['A2', 'B2', 'C2', 'C1'],
      },
      targets: ['A2', 'B2', 'C2', 'C1'],
      tree: [{ move: 'B1', reply: 'A1', next: [{ move: 'B1' }] }],
      hint: 'Throw a stone INSIDE White\'s space — yes, into atari. When White captures it, count White\'s liberties again…',
      success: 'SNAPBACK! 🪤 White captured one stone — and in doing so reduced itself to one liberty. You recapture five. The most satisfying trick in Go.',
    },
    {
      id: 'p14', stars: 3, title: 'Ladder Hunt', toPlay: 'black',
      intro: 'The full chase, no training wheels: capture the marked white stones in a ladder. Every move must be atari!',
      stones: { black: ['E6', 'D5', 'F5', 'D4'], white: ['E5', 'E4'] },
      targets: ['E5', 'E4'],
      tree: [{
        move: 'E3', reply: 'F4', next: [{
          move: 'G4', reply: 'F3', next: [{
            move: 'F2', reply: 'G3', next: [{
              move: 'H3', reply: 'G2', next: [{
                move: 'G1', reply: 'H2', next: [{
                  move: 'H1', reply: 'J2', next: [{
                    move: 'J3', reply: 'pass', next: [{ move: 'J1' }],
                  }],
                }],
              }],
            }],
          }],
        }],
      }],
      hint: 'Herd White toward the bottom-right corner. At each step, take the liberty that leaves White only one way to run.',
      success: 'Eight stones captured at the edge of the world. You have mastered the ladder. 🪜👑',
    },
  ];

  const GoPuzzles = { PUZZLES };
  global.GoPuzzles = GoPuzzles;
  if (typeof module !== 'undefined' && module.exports) module.exports = GoPuzzles;
})(typeof window !== 'undefined' ? window : globalThis);
