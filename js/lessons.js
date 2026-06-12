/* ============================================================
 * lessons.js — The guided curriculum. Pure data: each lesson is
 * a sequence of interactive steps played on the real engine.
 *
 * Step types:
 *  info       — explanation + optional board/marks, Continue button
 *  find       — click the target point(s); `place` drops a stone
 *  play       — play real moves; `line` is the forced sequence
 *               [{move, reply}] the student must find. `wrongMsg`
 *               explains failures (board resets and they retry).
 *  tryIllegal — click a point the rules forbid; the rejection IS
 *               the lesson.
 *  quiz       — multiple choice.
 * Coordinates: letters A–J (no I), rows 1–9 from the bottom.
 * ============================================================ */
(function (global) {
  'use strict';

  const LESSONS = [

  /* ------------------------------------------------ Lesson 1 */
  {
    id: 'l1', icon: '🌱', xp: 60,
    title: 'The Empty Board',
    subtitle: 'What Go is, and how to make your very first move',
    steps: [
      {
        type: 'info',
        title: 'Welcome, student!',
        text: `Go is the oldest board game still played — over <b>4,000 years</b> old, and still not solved. The rules take minutes to learn; the game takes a lifetime to love.<br><br>The goal is simple: <b>surround more territory than your opponent</b>. Black and White take turns placing stones, and whoever controls more of the board at the end wins.`,
        board: { stones: {} },
      },
      {
        type: 'find', anyEmpty: true, place: 'black',
        title: 'Your first stone',
        text: `Stones are placed on the <b>intersections</b> of the lines — not inside the squares. Go ahead: <b>click anywhere</b> to place your very first stone. Make it count… or don't! There are no wrong first stones today.`,
        success: `A historic moment — your first stone! 🎉 In Go we say a player's first games begin their <i>kifu</i>, their game record.`,
      },
      {
        type: 'info',
        title: 'Stones never move',
        text: `Unlike chess, stones <b>never move</b> once placed. They can only be <b>captured</b> and removed. Think of them less like soldiers marching, and more like building a wall, stone by stone.<br><br>The dotted points you see are <b>star points</b> (<i>hoshi</i>) — just landmarks to help your eyes, like the center circle on a football pitch.`,
        keepBoard: true,
      },
      {
        type: 'quiz',
        title: 'Quick check',
        text: 'Where are Go stones placed?',
        choices: [
          { text: 'On the intersections of the lines', correct: true, explain: 'Exactly. Every line crossing — including edges and corners — is a playable point.' },
          { text: 'Inside the squares', explain: 'That\'s chess thinking! In Go, stones sit on the line crossings.' },
          { text: 'Only on the star points', explain: 'Star points are just landmarks — all 81 intersections are fair game.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------ Lesson 2 */
  {
    id: 'l2', icon: '💨', xp: 70,
    title: 'Liberties — A Stone Breathes',
    subtitle: 'The single most important idea in Go',
    steps: [
      {
        type: 'info',
        title: 'Stones need to breathe',
        text: `Every stone is alive because of the <b>empty points directly next to it</b> — up, down, left, right (never diagonal!). These breathing spaces are called <b>liberties</b>.<br><br>A lone stone in the open has <b>4</b> liberties. Lose them all, and the stone is captured.`,
        board: { stones: { black: ['E5'] } },
      },
      {
        type: 'find', targets: ['E6', 'E4', 'D5', 'F5'],
        title: 'Find the liberties',
        text: `Click <b>all four liberties</b> of this black stone.`,
        board: { stones: { black: ['E5'] } },
        hint: 'Directly above, below, left and right — never diagonal.',
        success: 'All four! Diagonal points don\'t count — stones only connect and breathe along the lines.',
      },
      {
        type: 'find', targets: ['A2', 'B1'],
        title: 'The corner is dangerous',
        text: `Now a stone in the corner. The edge of the board is like a wall — there are no liberties beyond it. Click <b>all</b> of this stone's liberties.`,
        board: { stones: { black: ['A1'] } },
        hint: 'The board edge takes liberties away. Only two remain.',
        success: 'Just two! Corner stones are the easiest to capture — remember that.',
      },
      {
        type: 'info',
        title: 'Stones join forces',
        text: `Stones of the same color on <b>adjacent</b> intersections connect into a single <b>group</b> — they live and die together, sharing all their liberties. Two connected stones in the open have <b>6</b> liberties, not 8: connecting makes stones stronger.`,
        board: { stones: { black: ['E5', 'F5'] } },
        marks: { dot: ['D5', 'E6', 'F6', 'G5', 'F4', 'E4'] },
      },
      {
        type: 'quiz',
        title: 'Quick check',
        text: 'How many liberties does a lone stone on the edge of the board have?',
        board: { stones: { black: ['A5'] } },
        choices: [
          { text: '3', correct: true, explain: 'Right — the edge removes one. Corner stones have only 2, which is why the saying goes: "there is death in the corner".' },
          { text: '4', explain: 'Almost — but one side is the edge of the board. Count again: 3.' },
          { text: '2', explain: 'That would be a corner stone. An edge stone keeps 3.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------ Lesson 3 */
  {
    id: 'l3', icon: '⚔️', xp: 80,
    title: 'Capture!',
    subtitle: 'Take away the last liberty and the stones are yours',
    steps: [
      {
        type: 'info',
        title: 'How capturing works',
        text: `When a stone or group loses its <b>last liberty</b>, it is removed from the board immediately. Captured stones are called <b>prisoners</b> — keep them, they count!<br><br>This white stone has only one liberty left…`,
        board: { stones: { black: ['D5', 'F5', 'E6'], white: ['E5'] } },
        marks: { triangle: ['E5'], dot: ['E4'] },
      },
      {
        type: 'play', player: 'black',
        line: [{ move: 'E4' }],
        goal: { type: 'captureAll', targets: ['E5'] },
        title: 'Your first capture',
        text: `White's stone is gasping. <b>Take its last liberty!</b>`,
        board: { stones: { black: ['D5', 'F5', 'E6'], white: ['E5'] } },
        marks: { triangle: ['E5'] },
        hint: 'Its only remaining liberty is directly below it.',
        wrongMsg: 'Not quite — find White\'s one remaining breathing space.',
        success: 'Captured! 🏆 The stone is removed at once and becomes your prisoner.',
      },
      {
        type: 'play', player: 'black',
        line: [{ move: 'E3' }],
        goal: { type: 'captureAll', targets: ['E5', 'E4'] },
        title: 'Groups fall together',
        text: `A connected group shares its fate. These two white stones share <b>one last liberty</b> — find it, and both fall at once.`,
        board: { stones: { black: ['D5', 'D4', 'F5', 'F4', 'E6'], white: ['E5', 'E4'] } },
        marks: { triangle: ['E5', 'E4'] },
        hint: 'The group breathes through a single point below it.',
        wrongMsg: 'White still breathes — look for the group\'s single shared liberty.',
        success: 'Two prisoners with one move! There is no limit — a hundred stones can fall together if they share a fate.',
      },
      {
        type: 'play', player: 'black',
        line: [{ move: 'A4' }],
        goal: { type: 'captureAll', targets: ['A5'] },
        title: 'Hunting at the edge',
        text: `Remember: the edge gives no liberties. Capture this white stone.`,
        board: { stones: { black: ['A6', 'B5'], white: ['A5'] } },
        marks: { triangle: ['A5'] },
        hint: 'Two of its sides are already covered, one is the void beyond the edge…',
        wrongMsg: 'White still has a liberty on the edge line.',
        success: 'The edge fought on your side — it costs fewer stones to capture there.',
      },
      {
        type: 'quiz',
        title: 'Quick check',
        text: 'What happens at the exact moment a group loses its last liberty?',
        choices: [
          { text: 'It is removed from the board immediately', correct: true, explain: 'Yes — capture is instant and automatic. The points it occupied become free territory to fight over again.' },
          { text: 'It is frozen and cannot move', explain: 'Stones never move anyway! No-liberty groups are removed at once.' },
          { text: 'It survives if it is bigger than 5 stones', explain: 'Size offers no protection — only liberties (and later, eyes) keep groups alive.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------ Lesson 4 */
  {
    id: 'l4', icon: '⚠️', xp: 80,
    title: 'Atari — One Breath Left',
    subtitle: 'Recognize danger, escape it — or accept the loss',
    steps: [
      {
        type: 'info',
        title: 'The warning cry',
        text: `When a group has exactly <b>one liberty left</b>, it is in <b>atari</b> — one move from capture. (Yes, the videogame company is named after this!)<br><br>Your black stone below is in atari. On your turn you can often save it by <b>extending</b> — adding a stone on its last liberty to grow the group and gain new liberties.`,
        board: { stones: { black: ['E5'], white: ['D5', 'E6', 'F5'] } },
        marks: { triangle: ['E5'], dot: ['E4'] },
      },
      {
        type: 'play', player: 'black',
        line: [{ move: 'E4' }],
        goal: { type: 'playAt', points: ['E4'] },
        title: 'Run for your life',
        text: `Your stone has one breath left. <b>Extend</b> to save it!`,
        board: { stones: { black: ['E5'], white: ['D5', 'E6', 'F5'] } },
        marks: { triangle: ['E5'] },
        hint: 'Play on your own last liberty — the group will grow downward and breathe again.',
        wrongMsg: 'While you played elsewhere, White captured your stone! Save it first — play its last liberty.',
        punish: 'E4',
        success: 'Saved! Your two-stone group now has three liberties. Escaping atari by extending is the most common rescue in Go.',
      },
      {
        type: 'quiz',
        title: 'Not every stone can be saved',
        text: 'This black stone is in atari in the corner. Can Black save it by extending to A1?',
        board: { stones: { black: ['B1'], white: ['B2', 'C1'] } },
        marks: { triangle: ['B1'], dot: ['A1'] },
        choices: [
          { text: 'No — A1 would still leave only one liberty', correct: true, explain: 'Right. After A1 the group\'s only liberty is A2 — still atari! Running along the first line is usually doom. A strong player lets small stones go.' },
          { text: 'Yes — extending always works', explain: 'Try counting: after A1, the two stones would breathe only at A2. Still atari! Sometimes saving a stone just feeds the opponent a bigger meal.' },
        ],
      },
      {
        type: 'info',
        title: 'The wisdom of letting go',
        text: `Knowing <i>when not to save</i> a stone is a real skill. Sacrificing a stone or two to build strength elsewhere is often brilliant. As the proverb says: <b>"Sacrifice small to gain big."</b><br><br>Next lesson: the most famous chase in Go — the <b>ladder</b>.`,
      },
    ],
  },

  /* ------------------------------------------------ Lesson 5 */
  {
    id: 'l5', icon: '🪜', xp: 120, badge: 'ladder-master',
    title: 'The Ladder',
    subtitle: 'A relentless zig-zag chase to the edge of the world',
    steps: [
      {
        type: 'info',
        title: 'The chase begins',
        text: `Sometimes a stone in atari tries to run — but every escape move lands it right back in atari. This zig-zag chase is called a <b>ladder</b> (<i>shicho</i>).<br><br>White's marked stones just fled from atari. Your job: <b>keep White in atari every single move</b>, herding the group toward the edge where it must die.`,
        board: { stones: { black: ['E6', 'D5', 'F5', 'D4'], white: ['E5', 'E4'] } },
        marks: { triangle: ['E5', 'E4'] },
      },
      {
        type: 'play', player: 'black',
        line: [
          { move: 'E3', reply: 'F4' },
          { move: 'G4', reply: 'F3' },
          { move: 'F2', reply: 'G3' },
          { move: 'H3', reply: 'G2' },
          { move: 'G1', reply: 'H2' },
          { move: 'H1', reply: 'J2' },
          { move: 'J3', reply: 'pass' },
          { move: 'J1' },
        ],
        goal: { type: 'captureAll', targets: ['E5', 'E4'] },
        title: 'Drive White to the edge!',
        text: `Atari, atari, atari! After each of your moves White will scramble to its last liberty — and you strike again. <b>Always play the liberty that pushes White toward the bottom-right edge.</b> Begin!`,
        board: { stones: { black: ['E6', 'D5', 'F5', 'D4'], white: ['E5', 'E4'] } },
        marks: { triangle: ['E5', 'E4'] },
        hint: 'Of White\'s two liberties, take the one that keeps the chase running diagonally toward the edge — the move that leaves White exactly one escape.',
        wrongMsg: 'White wriggled free! In a ladder, every single move must be atari, herding White toward the edge. Let\'s rewind the chase.',
        success: 'CAPTURED — eight stones! 🎆 You just read out a full ladder. Feel that? That\'s the feeling Go players chase forever.',
      },
      {
        type: 'info',
        title: 'A word of warning',
        text: `Ladders are deadly — <i>if they work</i>. If a friendly white stone had been waiting anywhere on the ladder's diagonal path (a <b>ladder breaker</b>), the chase would have failed catastrophically, leaving you full of holes.<br><br>Hence the ancient proverb: <b>"If you don't know ladders, don't play Go."</b> You, my student, now know ladders.`,
      },
    ],
  },

  /* ------------------------------------------------ Lesson 6 */
  {
    id: 'l6', icon: '♾️', xp: 100, badge: 'ko-fighter',
    title: 'Ko — The Eternal Fight',
    subtitle: 'The rule that forbids forever',
    steps: [
      {
        type: 'info',
        title: 'A curious shape',
        text: `Look at this position. White's marked stone is in atari — you can capture it at the dotted point. But notice the shape: after you capture, <b>your</b> new stone will sit in the exact same trap. This shape is called a <b>ko</b> ("eternity").`,
        board: { stones: { black: ['D5', 'E6', 'F5'], white: ['D4', 'E3', 'F4', 'E5'] } },
        marks: { triangle: ['E5'], dot: ['E4'] },
      },
      {
        type: 'play', player: 'black',
        line: [{ move: 'E4' }],
        goal: { type: 'captureAll', targets: ['E5'] },
        title: 'Take the ko',
        text: `Capture the white stone.`,
        board: { stones: { black: ['D5', 'E6', 'F5'], white: ['D4', 'E3', 'F4', 'E5'] } },
        marks: { triangle: ['E5'] },
        hint: 'Play the dotted point from the previous diagram.',
        wrongMsg: 'Capture the marked stone — take its last liberty.',
        success: 'Captured! But look — your stone at E4 is now in atari itself. Surely White just takes it right back…?',
      },
      {
        type: 'tryIllegal', player: 'white', target: 'E5',
        keepBoard: true,
        title: 'Now be White: take it back!',
        text: `Switch seats — you're White now. Your instinct screams: recapture at the marked point! <b>Try it.</b>`,
        marks: { dot: ['E5'] },
        success: `<b>The board says no!</b> Recapturing instantly would recreate the exact same position — the game could loop forever. The <b>ko rule</b> forbids it: White must play <i>somewhere else</i> first. Only after Black answers may White retake.`,
      },
      {
        type: 'info',
        title: 'Ko threats',
        text: `That "somewhere else" move is a <b>ko threat</b> — ideally a move so scary your opponent must answer it, giving you the right to retake the ko next turn. Ko fights are trades: whoever has more big threats wins the ko.<br><br>Don't worry about mastering ko fights now. Just remember: <b>no instant recapture in a ko — play elsewhere first.</b>`,
      },
      {
        type: 'quiz',
        title: 'Quick check',
        text: 'Why does the ko rule exist?',
        choices: [
          { text: 'To prevent the game repeating forever', correct: true, explain: 'Exactly — without it, two players could recapture the same stone for eternity. Go has rules against eternity!' },
          { text: 'To make capturing harder', explain: 'It\'s not about difficulty — it\'s that instant recapture would recreate the identical position, looping the game forever.' },
          { text: 'To protect corner stones', explain: 'Kos can appear anywhere. The rule exists to prevent infinite repetition of the same position.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------ Lesson 7 */
  {
    id: 'l7', icon: '🚫', xp: 80,
    title: 'Forbidden Points',
    subtitle: 'The no-suicide rule — and its glorious exception',
    steps: [
      {
        type: 'tryIllegal', player: 'black', target: 'E5',
        title: 'A point you cannot play',
        text: `White has built a diamond. The point in the middle has <b>zero liberties</b> for Black — placing a stone there would be instant self-capture. The rules forbid it.<br><br>Don't believe me? <b>Try playing the dotted point.</b>`,
        board: { stones: { white: ['D5', 'F5', 'E4', 'E6'] } },
        marks: { dot: ['E5'] },
        success: `Rejected! A stone may never be placed where its group would end with zero liberties. This is the <b>no-suicide rule</b>. But there is one beautiful exception…`,
      },
      {
        type: 'play', player: 'black',
        line: [{ move: 'E5' }],
        goal: { type: 'captureAll', targets: ['D5', 'F5', 'E4', 'E6'] },
        title: 'The exception: capture first!',
        text: `Same diamond — but now every white stone is itself in atari. <b>Captures are resolved before checking your own liberties.</b> So the "forbidden" point… captures all four stones. Play it!`,
        board: {
          stones: {
            white: ['D5', 'F5', 'E4', 'E6'],
            black: ['C5', 'D4', 'D6', 'E3', 'F4', 'F6', 'G5', 'E7'],
          },
        },
        marks: { dot: ['E5'], triangle: ['D5', 'F5', 'E4', 'E6'] },
        hint: 'The very same center point — this time White\'s stones come off first.',
        wrongMsg: 'Play the center of the diamond — this time it works!',
        success: 'Four prisoners! 💥 Remove the opponent\'s stones first, then check your liberties. Not suicide — a massacre.',
      },
      {
        type: 'quiz',
        title: 'Quick check',
        text: 'When is it legal to play on a point with no liberties?',
        choices: [
          { text: 'When the move captures enemy stones first', correct: true, explain: 'Captures resolve first — if removing enemy stones gives your stone a liberty, the move is legal and usually devastating.' },
          { text: 'Never', explain: 'Almost! If the move captures enemy stones, they come off first — and your stone breathes through the space they leave.' },
          { text: 'When your group is big enough', explain: 'Group size never matters — only whether the move ends with at least one liberty after captures resolve.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------ Lesson 8 */
  {
    id: 'l8', icon: '👁️', xp: 120, badge: 'eye-doctor',
    title: 'Life and Death — Two Eyes',
    subtitle: 'The secret of immortal groups',
    steps: [
      {
        type: 'info',
        title: 'What is an eye?',
        text: `An <b>eye</b> is an empty point completely surrounded by one group's stones. The opponent can't play there — it would be suicide.<br><br>So a group with an eye can never run out of liberties… right? Look at White's corner group below. It has one eye at the marked point. <b>One eye is not enough.</b> Let me show you why.`,
        board: { stones: { white: ['A2', 'B2', 'B1'], black: ['A3', 'B3', 'C2', 'C1'] } },
        marks: { dot: ['A1'] },
      },
      {
        type: 'play', player: 'black',
        line: [{ move: 'A1' }],
        goal: { type: 'captureAll', targets: ['A2', 'B2', 'B1'] },
        title: 'Burst the single eye',
        text: `The eye at A1 is White's <b>last liberty</b> — which means playing inside it is not suicide, it's a capture! <b>Take the eye.</b>`,
        board: { stones: { white: ['A2', 'B2', 'B1'], black: ['A3', 'B3', 'C2', 'C1'] } },
        marks: { dot: ['A1'], triangle: ['A2', 'B2', 'B1'] },
        hint: 'Play inside the eye — it\'s the group\'s last liberty, so the capture exception applies.',
        wrongMsg: 'Play inside White\'s eye — it\'s their last liberty.',
        success: 'The whole group falls. One eye is one liberty — and one liberty can always be taken.',
      },
      {
        type: 'tryIllegal', player: 'white', target: 'A1',
        title: 'Two eyes = immortal',
        text: `Now Black has <b>two eyes</b>, at A1 and C1. For White to capture, White would need to fill <i>both</i> eyes — but playing in either one is suicide, because the other eye remains as a liberty. <b>Try to invade an eye as White.</b>`,
        board: { stones: { black: ['A2', 'B2', 'C2', 'D2', 'D1', 'B1'], white: ['A3', 'B3', 'C3', 'D3', 'E3', 'E2', 'E1'] } },
        marks: { dot: ['A1', 'C1'] },
        success: `Impossible! ✨ Each eye protects the other, forever. <b>A group with two eyes can never be captured.</b> This is the single deepest fact in Go — all life and death flows from it.`,
      },
      {
        type: 'play', player: 'black',
        line: [{ move: 'B1' }],
        goal: { type: 'playAt', points: ['B1'] },
        title: 'Find the vital point',
        text: `Your group below has one big eye space of three points: A1–B1–C1. Big eye spaces can be <b>split into two eyes</b> — if you find the <b>vital point</b>. Choose wisely: play wrong and White will play it, leaving you one eye and dead.`,
        board: { stones: { black: ['A2', 'B2', 'C2', 'D2', 'D1'], white: ['A3', 'B3', 'C3', 'D3', 'E3', 'E2', 'E1'] } },
        marks: { dot: ['A1', 'B1', 'C1'] },
        hint: 'Which single point splits the three-space line into two separate eyes?',
        wrongMsg: 'White instantly played the center of the three spaces — now your group can only ever make one eye. It is dead. Find the point that splits the space in two!',
        punish: 'B1',
        success: 'B1 — the center! Now A1 and C1 are two separate eyes. Your group is immortal. The proverb: "The vital point of three-in-a-row is the center."',
      },
      {
        type: 'quiz',
        title: 'Quick check',
        text: 'Why can a two-eyed group never be captured?',
        choices: [
          { text: 'Filling either eye would be suicide while the other remains', correct: true, explain: 'Perfect understanding. The opponent needs to fill both eyes at once — and nobody can play two moves at the same time.' },
          { text: 'Two eyes make the group too big to surround', explain: 'Size isn\'t the shield — even a tiny group with two eyes is immortal, because each eye makes invading the other illegal.' },
          { text: 'The rules give eye points double liberties', explain: 'No special scoring — it\'s pure logic: playing in either eye is suicide as long as the other eye remains.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------ Lesson 9 */
  {
    id: 'l9', icon: '🗺️', xp: 90,
    title: 'Territory & Winning',
    subtitle: 'How a game of Go actually ends',
    steps: [
      {
        type: 'info',
        title: 'The walls are built',
        text: `Here is a (very tidy!) finished game. Black walled off the left, White the right. Empty points surrounded <i>only</i> by your stones are your <b>territory</b> — one point each.<br><br>The middle column touches both colors, so it belongs to no one. Those neutral points are called <b>dame</b>.`,
        board: {
          stones: {
            black: ['D1','D2','D3','D4','D5','D6','D7','D8','D9'],
            white: ['F1','F2','F3','F4','F5','F6','F7','F8','F9'],
          },
        },
        showTerritory: true,
      },
      {
        type: 'quiz',
        title: 'Count like a pro',
        text: 'How many points of territory does Black have (the empty area left of the wall)?',
        board: {
          stones: {
            black: ['D1','D2','D3','D4','D5','D6','D7','D8','D9'],
            white: ['F1','F2','F3','F4','F5','F6','F7','F8','F9'],
          },
        },
        showTerritory: true,
        choices: [
          { text: '27', correct: true, explain: 'Three columns (A, B, C) of nine = 27. Counting territory at a glance is a skill — you just took the first step.' },
          { text: '36', explain: 'Careful — Black\'s own stones on column D aren\'t territory in this counting, just the empty points: 3 columns × 9 = 27.' },
          { text: '21', explain: 'Count again: columns A, B and C — three full columns of nine points each = 27.' },
        ],
      },
      {
        type: 'info',
        title: 'Komi — White\'s head start',
        text: `Black moves first, which is a real advantage. To keep things fair, White receives bonus points called <b>komi</b> — usually <b>5.5 to 7.5</b> points. The half point means <i>no draws, ever</i>.<br><br>In the position above, both sides have 27 territory — but with a 5.5 komi, <b>White wins by 5.5</b>. First-move advantage, paid for in full!`,
      },
      {
        type: 'info',
        title: 'How a game ends',
        text: `A game of Go ends in the politest way imaginable: when you believe there are no useful moves left, you <b>pass</b>. When both players pass in a row, the game is over.<br><br>Then you remove hopeless ("dead") stones, count territory plus captures, add komi — and bow to the winner. You'll do all of this in the <b>Play</b> tab against the computer!`,
      },
    ],
  },

  /* ------------------------------------------------ Lesson 10 */
  {
    id: 'l10', icon: '🧭', xp: 100, badge: 'graduate',
    title: 'Where to Begin',
    subtitle: 'Opening wisdom: corner is gold, side is silver, center is grass',
    steps: [
      {
        type: 'info',
        title: 'The oldest proverb',
        text: `<b>"Corner is gold, side is silver, center is grass."</b><br><br>Why? Efficiency. To surround territory in the corner, two board edges already work for you — you need few stones. On the side, one edge helps. In the center, you must build every wall yourself. Same territory, triple the work.`,
        board: { stones: { black: ['C3'], white: ['E5'] } },
        marks: { label: { 'C3': '金', 'E5': '草' } },
      },
      {
        type: 'find', targets: ['C3', 'G3', 'C7', 'G7'], any: true,
        title: 'Claim your gold',
        text: `On a 9×9 board, good opening moves sit near the corners on the <b>third line</b> from the edges. <b>Click any one of the four classic corner points.</b>`,
        place: 'black',
        hint: 'Count three lines in from two edges — the four points like C3.',
        success: 'A fine opening! Third-line stones reach for solid territory; fourth-line stones reach for influence. Both are honorable.',
      },
      {
        type: 'quiz',
        title: 'Quick check',
        text: 'What is the best board size for your first real games?',
        choices: [
          { text: '9×9 — fast games, quick lessons', correct: true, explain: 'A 9×9 game takes 10–15 minutes, so you learn from many games fast. Move up to 13×13, then the full 19×19, as you grow.' },
          { text: '19×19 — go big or go home', explain: 'Brave! But a 19×19 game can take over an hour, and early mistakes get buried. Learn fast on 9×9, then graduate up.' },
        ],
      },
      {
        type: 'info',
        title: '🎓 You did it!',
        text: `You now know <b>every rule of Go</b> and the core instincts: liberties, capture, atari, ladders, ko, eyes, life and death, territory, and where to play first.<br><br>Your path from here:<br>① Sharpen your teeth in the <b>Puzzles</b> tab.<br>② Battle the computer in the <b>Play</b> tab.<br>③ Then find human rivals — every Go player on Earth was once exactly where you are.<br><br>One last proverb, the kindest of all: <b>"Lose your first fifty games as quickly as possible."</b> Go lose gloriously. 🏮`,
      },
    ],
  },
  ];

  const GoLessons = { LESSONS };
  global.GoLessons = GoLessons;
  if (typeof module !== 'undefined' && module.exports) module.exports = GoLessons;
})(typeof window !== 'undefined' ? window : globalThis);
