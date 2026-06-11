/* ============================================================
 * app.js — The Way of Go application shell.
 * Views: Learn (lesson player) · Puzzles · Play (vs AI) · Guide.
 * Progress, XP/ranks, badges, confetti, toasts, proverbs.
 * ============================================================ */
(function () {
  'use strict';

  const { Game, BLACK, WHITE, EMPTY, parseCoord, coordName, other } = GoEngine;
  const Sound = GoSound;

  /* =================== progress & ranks =================== */

  const STORE_KEY = 'way-of-go-progress-v1';

  const progress = Object.assign({
    xp: 0,
    lessons: {},      // id -> true
    puzzles: {},      // id -> true
    badges: {},       // id -> true
    games: 0, wins: 0,
    bestWinLevel: 0,
    puzzleStreak: 0,
    sound: true,
  }, load());

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); }

  const RANKS = [
    [0, '30 kyu'], [80, '28 kyu'], [200, '26 kyu'], [350, '24 kyu'],
    [520, '22 kyu'], [700, '20 kyu'], [900, '18 kyu'], [1150, '16 kyu'],
    [1400, '14 kyu'], [1700, '12 kyu'], [2000, '10 kyu'],
  ];

  function rankInfo(xp) {
    let cur = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i][0]) { cur = RANKS[i]; next = RANKS[i + 1] || null; }
    }
    return { name: cur[1], cur: cur[0], next: next ? next[0] : null, nextName: next ? next[1] : null };
  }

  function addXP(n, why) {
    const before = rankInfo(progress.xp).name;
    progress.xp += n;
    save();
    renderTopbar();
    if (why) toast(`+${n} XP — ${why}`);
    const after = rankInfo(progress.xp);
    if (after.name !== before) {
      Sound.fanfare();
      confetti(140);
      toast(`🏮 Rank up! You are now ${after.name}!`);
    }
  }

  const BADGES = [
    { id: 'first-stone', emoji: '🌱', name: 'First Stone', desc: 'Place your very first stone' },
    { id: 'first-capture', emoji: '⚔️', name: 'First Blood', desc: 'Capture your first stone' },
    { id: 'ladder-master', emoji: '🪜', name: 'Ladder Master', desc: 'Read out a full ladder' },
    { id: 'ko-fighter', emoji: '♾️', name: 'Ko Fighter', desc: 'Understand the ko rule' },
    { id: 'eye-doctor', emoji: '👁️', name: 'Eye Doctor', desc: 'Master life & death basics' },
    { id: 'graduate', emoji: '🎓', name: 'Graduate', desc: 'Complete every lesson' },
    { id: 'puzzle-5', emoji: '🧩', name: 'Puzzler', desc: 'Solve 5 puzzles' },
    { id: 'puzzle-all', emoji: '👑', name: 'Tsumego Royalty', desc: 'Solve every puzzle' },
    { id: 'streak-3', emoji: '🔥', name: 'On Fire', desc: 'Solve 3 puzzles first-try in a row' },
    { id: 'first-game', emoji: '🥋', name: 'Gladiator', desc: 'Finish a game against the computer' },
    { id: 'beat-pebble', emoji: '🪨', name: 'Pebble Skipper', desc: 'Defeat Pebble' },
    { id: 'beat-river', emoji: '🌊', name: 'River Crosser', desc: 'Defeat River' },
    { id: 'beat-mountain', emoji: '⛰️', name: 'Mountain Mover', desc: 'Defeat Mountain' },
    { id: 'snapback', emoji: '🪤', name: 'Trapper', desc: 'Solve the snapback puzzle' },
  ];

  function award(id) {
    if (progress.badges[id]) return;
    const b = BADGES.find(x => x.id === id);
    if (!b) return;
    progress.badges[id] = true;
    save();
    Sound.fanfare();
    badgeToast(b);
    confetti(80);
  }

  /* =================== small UI helpers =================== */

  const $ = (sel, el) => (el || document).querySelector(sel);

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function toast(msg, ms) {
    const t = el('div', 'toast', msg);
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, ms || 2600);
  }

  function badgeToast(b) {
    const t = el('div', 'toast badge-toast',
      `<span class="badge-emoji">${b.emoji}</span><span><b>Badge earned: ${b.name}</b><br><small>${b.desc}</small></span>`);
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 3600);
  }

  /* ------- confetti ------- */
  const confettiCanvas = $('#confetti');
  const cctx = confettiCanvas.getContext('2d');
  let confettiBits = [], confettiRaf = null;

  function confetti(n) {
    confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight;
    const colors = ['#d99a2b', '#e8b75c', '#c25540', '#5fa86b', '#efe7d8', '#7eb8d4'];
    for (let i = 0; i < (n || 90); i++) {
      confettiBits.push({
        x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.3,
        vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.2,
        s: 4 + Math.random() * 6, rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.25,
        c: colors[(Math.random() * colors.length) | 0],
      });
    }
    if (!confettiRaf) confettiLoop();
  }
  function confettiLoop() {
    confettiRaf = requestAnimationFrame(confettiLoop);
    cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiBits = confettiBits.filter(b => b.y < innerHeight + 30);
    if (!confettiBits.length) {
      cancelAnimationFrame(confettiRaf); confettiRaf = null; return;
    }
    for (const b of confettiBits) {
      b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.vy += 0.04;
      cctx.save();
      cctx.translate(b.x, b.y); cctx.rotate(b.rot);
      cctx.fillStyle = b.c;
      cctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.6);
      cctx.restore();
    }
  }

  /* ------- proverbs ------- */
  const PROVERBS = [
    'Lose your first fifty games as quickly as possible.',
    'Corner is gold, side is silver, center is grass.',
    'If you don\'t know ladders, don\'t play Go.',
    'Your opponent\'s good move is your good move.',
    'Sacrifice small to gain big.',
    'The vital point of three is the center.',
    'Don\'t follow proverbs blindly.',
    'There is death in the corner.',
    'A rich man should not pick quarrels.',
    'Play urgent moves before big moves.',
    'One stone cannot fight a war.',
    'Even a moron connects against a peep.',
  ];
  function rotateProverb() {
    $('#proverb').textContent = PROVERBS[(Math.random() * PROVERBS.length) | 0];
  }

  /* =================== topbar =================== */

  function renderTopbar() {
    const r = rankInfo(progress.xp);
    $('#rankLabel').textContent = r.name;
    $('#xpText').textContent = `${progress.xp} XP`;
    const pct = r.next === null ? 100
      : Math.round(((progress.xp - r.cur) / (r.next - r.cur)) * 100);
    $('#xpFill').style.width = pct + '%';
    $('#rankChip').title = r.next === null
      ? 'You have reached the top of the beginner ladder!'
      : `${r.next - progress.xp} XP to ${r.nextName}`;
    $('#soundBtn').classList.toggle('muted', !progress.sound);
    $('#soundBtn').textContent = progress.sound ? '🔊' : '🔇';
  }

  $('#soundBtn').addEventListener('click', () => {
    progress.sound = !progress.sound;
    Sound.enabled = progress.sound;
    save(); renderTopbar();
    if (progress.sound) Sound.pop();
  });

  $('#badgesBtn').addEventListener('click', showBadges);
  $('#brandHome').addEventListener('click', () => switchView('learn'));

  function showBadges() {
    const back = el('div', 'modal-back');
    const earned = Object.keys(progress.badges).length;
    const modal = el('div', 'modal',
      `<h2>🏅 Achievements <small style="color:var(--ink-faint);font-size:.8rem">(${earned}/${BADGES.length})</small></h2>`);
    const grid = el('div', 'badge-grid');
    for (const b of BADGES) {
      const got = progress.badges[b.id];
      grid.appendChild(el('div', 'badge-item' + (got ? '' : ' locked'),
        `<div class="be">${b.emoji}</div><h4>${b.name}</h4><p>${b.desc}</p>`));
    }
    modal.appendChild(grid);
    back.appendChild(modal);
    back.addEventListener('click', (e) => { if (e.target === back) back.remove(); });
    document.body.appendChild(back);
  }

  /* =================== view routing =================== */

  const viewEl = $('#view');
  let activeBoard = null;   // BoardView to destroy on view switch
  let aiTimer = null;

  function clearView() {
    if (activeBoard) { activeBoard.destroy(); activeBoard = null; }
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    viewEl.innerHTML = '';
    viewEl.style.animation = 'none';
    void viewEl.offsetWidth;
    viewEl.style.animation = '';
  }

  function switchView(name, arg) {
    clearView();
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.view === name));
    rotateProverb();
    if (name === 'learn') arg ? renderLesson(arg) : renderLearnHome();
    else if (name === 'puzzles') arg ? renderPuzzle(arg) : renderPuzzlesHome();
    else if (name === 'play') renderPlay();
    else if (name === 'guide') renderGuide();
  }

  $('#tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) switchView(tab.dataset.view);
  });

  /* =================== Learn home =================== */

  function renderLearnHome() {
    const done = GoLessons.LESSONS.filter(l => progress.lessons[l.id]).length;
    viewEl.appendChild(el('div', 'view-head', `
      <h1>The Path 📖</h1>
      <p>Ten short lessons, from your first stone to opening wisdom.
      Every lesson is hands-on — you'll learn by playing real moves on a real board.
      ${done ? `<b>${done}/${GoLessons.LESSONS.length} complete.</b>` : 'Begin at the beginning.'}</p>`));
    const grid = el('div', 'card-grid');
    GoLessons.LESSONS.forEach((l, i) => {
      const done = progress.lessons[l.id];
      const c = el('div', 'card' + (done ? ' done' : ''), `
        <span class="card-num">${['一','二','三','四','五','六','七','八','九','十'][i]}</span>
        <span class="card-icon">${l.icon}</span>
        <h3>${l.title}</h3>
        <p>${l.subtitle}</p>
        <span class="xp-tag">⚡ ${l.xp} XP</span>
        ${done ? '<span class="done-mark">✓ complete</span>' : ''}`);
      c.addEventListener('click', () => switchView('learn', l));
      grid.appendChild(c);
    });
    viewEl.appendChild(grid);
  }

  /* =================== Lesson player =================== */

  function renderLesson(lesson) {
    let stepIdx = 0;
    let game = null;
    let attempts = 0;
    let found = new Set();
    let lineIdx = 0;
    let busy = false;

    const layout = el('div', 'activity');
    const boardWrap = el('div', 'board-wrap');
    const canvas = document.createElement('canvas');
    boardWrap.appendChild(canvas);
    const side = el('div', 'side-panel');
    layout.append(boardWrap, side);
    viewEl.appendChild(layout);

    const board = new GoBoardView(canvas, { onPlay: handleClick });
    activeBoard = board;

    function step() { return lesson.steps[stepIdx]; }

    function setupBoardForStep(s) {
      if (s.board && !s.keepBoard) {
        game = new Game(9);
        game.setup(s.board.stones || {});
        game.turn = s.player === 'white' ? WHITE : BLACK;
      } else if (s.keepBoard && game) {
        if (s.player) game.turn = s.player === 'white' ? WHITE : BLACK;
      } else if (!game) {
        game = new Game(9);
      }
      board.setGame(game);
      const marks = Object.assign({}, s.marks);
      if (s.showTerritory) {
        const sc = game.score();
        marks.terB = sc.terB; marks.terW = sc.terW;
      }
      board.setMarks(marks);
      board.interactive = ['find', 'play', 'tryIllegal'].includes(s.type);
      board.ghostColor = s.player === 'white' ? WHITE : BLACK;
      board.dimmed = false;
    }

    function renderStep() {
      const s = step();
      attempts = 0; found = new Set(); lineIdx = 0; busy = false;
      setupBoardForStep(s);

      side.innerHTML = '';
      const crumb = el('button', 'crumb', '← All lessons');
      crumb.addEventListener('click', () => switchView('learn'));
      side.appendChild(crumb);

      const dots = el('div', 'step-dots');
      lesson.steps.forEach((_, i) => {
        dots.appendChild(el('span',
          'step-dot' + (i === stepIdx ? ' now' : i < stepIdx ? ' past' : '')));
      });
      side.appendChild(dots);

      const card = el('div', 'panel-card', `
        <div class="lesson-name">${lesson.icon} ${lesson.title} — step ${stepIdx + 1} of ${lesson.steps.length}</div>
        <h2>${s.title}</h2>
        <div class="sensei">
          <div class="sensei-face">🐢</div>
          <div class="sensei-bubble" id="senseiMsg">${s.text || ''}</div>
        </div>
        <div class="controls" id="stepControls"></div>`);
      side.appendChild(card);
      const controls = $('#stepControls', card);

      if (s.type === 'info') {
        const btn = el('button', 'btn primary', stepIdx === lesson.steps.length - 1 ? 'Finish lesson ✓' : 'Continue →');
        btn.addEventListener('click', advance);
        controls.appendChild(btn);
      }
      if (s.type === 'quiz') {
        const box = el('div', 'choices');
        s.choices.forEach((ch) => {
          const b = el('button', 'choice', ch.text);
          b.addEventListener('click', () => {
            if (busy) return;
            box.querySelectorAll('.choice').forEach(x => x.disabled = true);
            b.classList.add(ch.correct ? 'correct' : 'incorrect');
            b.appendChild(el('span', 'explain', ch.explain));
            if (ch.correct) {
              busy = true;
              Sound.success();
              addXP(10, 'correct answer');
              const btn = el('button', 'btn primary',
                stepIdx === lesson.steps.length - 1 ? 'Finish lesson ✓' : 'Continue →');
              btn.addEventListener('click', advance);
              controls.appendChild(btn);
            } else {
              Sound.error();
              setTimeout(() => {
                box.querySelectorAll('.choice').forEach(x => {
                  if (!x.classList.contains('incorrect')) x.disabled = false;
                });
              }, 700);
            }
          });
          box.appendChild(b);
        });
        card.insertBefore(box, controls);
      }
      if (s.type === 'find' || s.type === 'play' || s.type === 'tryIllegal') {
        const hintBtn = el('button', 'btn subtle', '💡 Hint');
        hintBtn.addEventListener('click', () => showHint(s));
        if (s.hint || s.type === 'tryIllegal') controls.appendChild(hintBtn);
      }
    }

    function sensei(msg, kind) {
      const bubble = $('#senseiMsg');
      if (!bubble) return;
      bubble.innerHTML = msg;
      bubble.className = 'sensei-bubble' + (kind ? ' ' + kind : '');
      bubble.style.animation = 'none'; void bubble.offsetWidth; bubble.style.animation = '';
    }

    function showHint(s) {
      if (s.hint) sensei('💡 ' + s.hint);
      const m = Object.assign({}, board.marks);
      if (s.type === 'find' && s.targets) {
        m.hl = s.targets.filter(t => !found.has(t));
      } else if (s.type === 'play' && s.line[lineIdx]) {
        m.hl = [s.line[lineIdx].move];
      } else if (s.type === 'tryIllegal') {
        m.hl = [s.target];
      }
      board.setMarks(m);
    }

    function showContinue(label) {
      const controls = $('#stepControls');
      if (!controls || controls.querySelector('.btn.primary')) return;
      const btn = el('button', 'btn primary',
        label || (stepIdx === lesson.steps.length - 1 ? 'Finish lesson ✓' : 'Continue →'));
      btn.addEventListener('click', advance);
      controls.prepend(btn);
    }

    function advance() {
      stepIdx++;
      if (stepIdx >= lesson.steps.length) return completeLesson();
      renderStep();
    }

    function completeLesson() {
      const firstTime = !progress.lessons[lesson.id];
      progress.lessons[lesson.id] = true;
      save();
      if (firstTime) {
        addXP(lesson.xp, `lesson complete: ${lesson.title}`);
        confetti(120);
        Sound.fanfare();
        if (lesson.badge) award(lesson.badge);
        if (GoLessons.LESSONS.every(l => progress.lessons[l.id])) award('graduate');
      }
      switchView('learn');
      toast(`${lesson.icon} "${lesson.title}" complete!`);
    }

    /* ------- board interaction per step type ------- */

    function handleClick(x, y) {
      const s = step();
      if (busy) return;
      const coord = coordName(x, y);

      if (s.type === 'find') {
        const isTarget = s.anyEmpty
          ? game.board[game.idx(x, y)] === EMPTY
          : (s.targets.includes(coord) && !found.has(coord));
        if (isTarget) {
          found.add(coord);
          if (s.place) {
            try {
              game.turn = s.place === 'white' ? WHITE : BLACK;
              game.play(x, y);
              board.animatePlace(game.idx(x, y));
              Sound.stone();
              if (lesson.id === 'l1') award('first-stone');
            } catch { return; }
          } else {
            Sound.pop();
          }
          const m = Object.assign({}, board.marks);
          m.found = [...(m.found || []), coord];
          delete m.hl;
          board.setMarks(m);
          const need = s.anyEmpty || s.any ? 1 : s.targets.length;
          if (found.size >= need) {
            busy = true;
            Sound.success();
            sensei(s.success || 'Well done!', 'success');
            addXP(10, null);
            showContinue();
          }
        } else {
          attempts++;
          board.shake(); Sound.error();
          if (attempts >= 3) showHint(s);
        }
        return;
      }

      if (s.type === 'tryIllegal') {
        if (coord === s.target) {
          // the engine must reject this — that's the point
          board.shake(); Sound.error();
          busy = true;
          setTimeout(() => {
            Sound.success();
            sensei(s.success, 'success');
            addXP(15, null);
            showContinue();
          }, 450);
        } else {
          sensei('Click the marked point — I promise the board won\'t break.', null);
          board.shake();
        }
        return;
      }

      if (s.type === 'play') {
        const expected = s.line[lineIdx];
        if (coord === expected.move) {
          let res;
          try { res = game.play(x, y); } catch { board.shake(); Sound.error(); return; }
          board.animatePlace(game.idx(x, y));
          Sound.stone();
          if (res.captured.length) {
            board.animateCapture(res.captured, other(res.color));
            Sound.capture(res.captured.length);
            award('first-capture');
          }
          board.setMarks(Object.assign({}, board.marks, { hl: [] }));
          lineIdx++;
          const reply = expected.reply;
          if (reply && reply !== 'pass') {
            busy = true;
            setTimeout(() => {
              const r2 = game.play(...parseCoord(reply));
              board.animatePlace(game.idx(...parseCoord(reply)));
              Sound.stone();
              if (r2.captured.length) {
                board.animateCapture(r2.captured, other(r2.color));
                Sound.capture(r2.captured.length);
              }
              busy = false;
              board.draw();
              checkPlayDone(s);
            }, 480);
          } else {
            if (reply === 'pass') game.pass();
            checkPlayDone(s);
          }
        } else {
          // wrong move
          attempts++;
          let legal = true;
          try { game.play(x, y); } catch { legal = false; }
          if (!legal) { board.shake(); Sound.error(); return; }
          board.animatePlace(game.idx(x, y));
          Sound.stone();
          busy = true;
          const punish = s.punish;
          setTimeout(() => {
            if (punish) {
              try {
                const pr = game.play(...parseCoord(punish));
                board.animatePlace(game.idx(...parseCoord(punish)));
                if (pr.captured.length) {
                  board.animateCapture(pr.captured, other(pr.color));
                  Sound.capture(pr.captured.length);
                }
                board.draw();
              } catch { /* position may not allow the scripted punish */ }
            }
            sensei(s.wrongMsg || 'Not that one — let\'s try again.', 'error');
            Sound.error();
            setTimeout(() => {
              setupBoardForStep(s);
              lineIdx = 0;
              busy = false;
              if (attempts >= 2) showHint(s);
            }, punish ? 1500 : 900);
          }, punish ? 500 : 200);
        }
      }
    }

    function checkPlayDone(s) {
      if (lineIdx < s.line.length) return;
      let ok = true;
      if (s.goal && s.goal.type === 'captureAll') {
        ok = s.goal.targets.every(c => {
          const [x, y] = parseCoord(c);
          return game.board[game.idx(x, y)] === EMPTY;
        });
      }
      if (ok) {
        busy = true;
        board.interactive = false;
        Sound.success();
        sensei(s.success || 'Beautifully done!', 'success');
        addXP(15, null);
        showContinue();
      }
    }

    renderStep();
  }

  /* =================== Puzzles =================== */

  function renderPuzzlesHome() {
    const done = GoPuzzles.PUZZLES.filter(p => progress.puzzles[p.id]).length;
    viewEl.appendChild(el('div', 'view-head', `
      <h1>The Dojo 🧩</h1>
      <p>Tsumego — Go puzzles — are how every player on Earth sharpens their reading.
      One position, one goal, no mercy. ${done ? `<b>${done}/${GoPuzzles.PUZZLES.length} solved.</b>` : 'Start with one star.'}</p>`));
    const grid = el('div', 'card-grid');
    for (const p of GoPuzzles.PUZZLES) {
      const done = progress.puzzles[p.id];
      const c = el('div', 'card' + (done ? ' done' : ''), `
        <span class="card-icon">${done ? '✅' : '🧩'}</span>
        <h3>${p.title}</h3>
        <p>${p.intro}</p>
        <div class="stars">${'★'.repeat(p.stars)}${'☆'.repeat(3 - p.stars)}</div>
        ${done ? '<span class="done-mark">solved</span>' : ''}`);
      c.addEventListener('click', () => switchView('puzzles', p));
      grid.appendChild(c);
    }
    viewEl.appendChild(grid);
  }

  function renderPuzzle(p) {
    let game, nodes, firstTry = true, solved = false, busy = false;

    const layout = el('div', 'activity');
    const boardWrap = el('div', 'board-wrap');
    const canvas = document.createElement('canvas');
    boardWrap.appendChild(canvas);
    const side = el('div', 'side-panel');
    layout.append(boardWrap, side);
    viewEl.appendChild(layout);

    const board = new GoBoardView(canvas, { onPlay: handleClick });
    activeBoard = board;

    const crumb = el('button', 'crumb', '← All puzzles');
    crumb.addEventListener('click', () => switchView('puzzles'));
    side.appendChild(crumb);

    const card = el('div', 'panel-card', `
      <div class="lesson-name">🧩 Puzzle — ${'★'.repeat(p.stars)}</div>
      <h2>${p.title}</h2>
      <div class="sensei">
        <div class="sensei-face">🐢</div>
        <div class="sensei-bubble" id="senseiMsg">${p.intro}<br><small style="color:var(--ink-faint)">${p.toPlay === 'black' ? 'Black' : 'White'} to play.</small></div>
      </div>
      <div class="controls" id="pzControls"></div>`);
    side.appendChild(card);
    const controls = $('#pzControls', card);

    const hintBtn = el('button', 'btn subtle', '💡 Hint');
    hintBtn.addEventListener('click', () => {
      sensei('💡 ' + p.hint);
      firstTry = false;
    });
    const resetBtn = el('button', 'btn', '↺ Reset');
    resetBtn.addEventListener('click', reset);
    controls.append(hintBtn, resetBtn);

    function sensei(msg, kind) {
      const bubble = $('#senseiMsg');
      bubble.innerHTML = msg;
      bubble.className = 'sensei-bubble' + (kind ? ' ' + kind : '');
    }

    function reset() {
      if (solved) return;
      game = new Game(9);
      game.setup(p.stones);
      game.turn = p.toPlay === 'white' ? WHITE : BLACK;
      nodes = p.tree;
      busy = false;
      board.setGame(game);
      board.setMarks({ triangle: p.targets });
      board.interactive = true;
      board.ghostColor = game.turn;
    }

    function fail(msg) {
      Sound.error();
      sensei(msg || 'Hmm — that lets your opponent off the hook. Look again. ↺', 'error');
      firstTry = false;
      busy = true;
      setTimeout(() => { reset(); }, 1100);
    }

    function succeed() {
      solved = true;
      busy = true;
      board.interactive = false;
      Sound.success();
      sensei(p.success, 'success');
      const firstSolve = !progress.puzzles[p.id];
      progress.puzzles[p.id] = true;
      if (firstTry) {
        progress.puzzleStreak = (progress.puzzleStreak || 0) + 1;
        if (progress.puzzleStreak >= 3) award('streak-3');
      } else progress.puzzleStreak = 0;
      save();
      if (firstSolve) {
        addXP(15 + p.stars * 10, `puzzle solved: ${p.title}`);
        confetti(70);
      } else toast('Solved again — still got it!');
      if (p.id === 'p13') award('snapback');
      if (p.id === 'p14') award('ladder-master');
      const doneCount = GoPuzzles.PUZZLES.filter(q => progress.puzzles[q.id]).length;
      if (doneCount >= 5) award('puzzle-5');
      if (doneCount === GoPuzzles.PUZZLES.length) award('puzzle-all');

      const idx = GoPuzzles.PUZZLES.indexOf(p);
      const next = GoPuzzles.PUZZLES[idx + 1];
      if (next) {
        const nb = el('button', 'btn primary', `Next puzzle: ${next.title} →`);
        nb.addEventListener('click', () => switchView('puzzles', next));
        controls.prepend(nb);
      } else {
        const nb = el('button', 'btn primary', 'Back to the dojo →');
        nb.addEventListener('click', () => switchView('puzzles'));
        controls.prepend(nb);
      }
    }

    function handleClick(x, y) {
      if (busy || solved) return;
      const coord = coordName(x, y);
      const node = nodes.find(n => n.move === coord);
      if (!node) {
        // legal-but-wrong move: show it briefly, then reset
        try { game.play(x, y); } catch { board.shake(); Sound.error(); return; }
        board.animatePlace(game.idx(x, y));
        Sound.stone();
        fail();
        return;
      }
      const res = game.play(x, y);
      board.animatePlace(game.idx(x, y));
      Sound.stone();
      if (res.captured.length) {
        board.animateCapture(res.captured, other(res.color));
        Sound.capture(res.captured.length);
        award('first-capture');
      }
      const finish = () => {
        if (node.next && node.next.length) {
          nodes = node.next;
          board.ghostColor = game.turn;
          busy = false;
        } else succeed();
      };
      if (node.reply) {
        busy = true;
        setTimeout(() => {
          if (node.reply === 'pass') {
            toast('Opponent passes — no escape!');
            game.pass();
          } else {
            const r2 = game.play(...parseCoord(node.reply));
            board.animatePlace(game.idx(...parseCoord(node.reply)));
            Sound.stone();
            if (r2.captured.length) {
              board.animateCapture(r2.captured, other(r2.color));
              Sound.capture(r2.captured.length);
            }
          }
          board.draw();
          finish();
        }, 500);
      } else finish();
    }

    reset();
  }

  /* =================== Play vs AI =================== */

  function renderPlay() {
    let level = 1, humanColor = BLACK;

    viewEl.appendChild(el('div', 'view-head', `
      <h1>The Arena ⚔️</h1>
      <p>A real 9×9 game, scored like the pros (area scoring, komi 5.5).
      Pick your opponent — each has a personality. Finish games to earn XP;
      defeat all three to claim their badges.</p>`));

    const setup = el('div', 'panel-card vs-setup');
    setup.innerHTML = `<h2>Choose your opponent</h2>`;
    const lvlBox = el('div', 'level-cards');
    GoAI.LEVELS.forEach(L => {
      const c = el('div', 'level-card' + (L.id === level ? ' sel' : ''), `
        <div class="lv-emoji">${L.emoji}</div><h3>${L.name}</h3><p>${L.blurb}</p>`);
      c.addEventListener('click', () => {
        level = L.id;
        lvlBox.querySelectorAll('.level-card').forEach((x, i) =>
          x.classList.toggle('sel', GoAI.LEVELS[i].id === level));
      });
      lvlBox.appendChild(c);
    });
    setup.appendChild(lvlBox);

    setup.appendChild(el('h2', null, 'Choose your color'));
    const colorBox = el('div', 'color-pick');
    const mkColor = (color, label) => {
      const o = el('button', 'color-opt' + (color === humanColor ? ' sel' : ''),
        `<span class="stone-dot ${color === BLACK ? 'b' : 'w'}"></span>${label}`);
      o.addEventListener('click', () => {
        humanColor = color;
        colorBox.querySelectorAll('.color-opt').forEach(x => x.classList.remove('sel'));
        o.classList.add('sel');
      });
      return o;
    };
    colorBox.append(mkColor(BLACK, 'Black — you move first'), mkColor(WHITE, 'White — you get komi'));
    setup.appendChild(colorBox);

    const startBtn = el('button', 'btn primary', 'Begin the game ⚔️');
    startBtn.addEventListener('click', () => startGame(level, humanColor));
    setup.appendChild(startBtn);
    viewEl.appendChild(setup);
  }

  function startGame(level, humanColor) {
    clearView();
    const L = GoAI.LEVELS.find(x => x.id === level);
    const game = new Game(9, 5.5);
    const aiColor = other(humanColor);
    let phase = 'play';            // play | mark | done
    const dead = new Set();
    let notes = [];

    const layout = el('div', 'activity');
    const boardWrap = el('div', 'board-wrap');
    const canvas = document.createElement('canvas');
    boardWrap.appendChild(canvas);
    const side = el('div', 'side-panel');
    layout.append(boardWrap, side);
    viewEl.appendChild(layout);

    const board = new GoBoardView(canvas, { onPlay: handleClick });
    activeBoard = board;
    board.setGame(game);
    board.interactive = true;
    board.ghostColor = humanColor;

    const crumb = el('button', 'crumb', '← New opponent');
    crumb.addEventListener('click', () => switchView('play'));
    side.appendChild(crumb);

    const status = el('div', 'game-status');
    side.appendChild(status);

    const noteCard = el('div', 'panel-card');
    noteCard.innerHTML = `
      <div class="lesson-name">${L.emoji} vs ${L.name}</div>
      <div class="commentary" id="commentary"></div>
      <div class="controls" id="gameControls"></div>`;
    side.appendChild(noteCard);
    const commentary = $('#commentary', noteCard);
    const controls = $('#gameControls', noteCard);

    const passBtn = el('button', 'btn', '🤲 Pass');
    const undoBtn = el('button', 'btn', '↶ Undo');
    const resignBtn = el('button', 'btn danger', '🏳 Resign');
    controls.append(passBtn, undoBtn, resignBtn);

    passBtn.addEventListener('click', () => {
      if (phase !== 'play' || game.turn !== humanColor) return;
      game.pass();
      note(`You pass.`);
      board.draw();
      if (game.over) return enterScoring();
      aiMove();
    });
    undoBtn.addEventListener('click', () => {
      if (phase !== 'play' || game.turn !== humanColor) return;
      game.undo(); game.undo();
      board.draw();
      note('Took back your last move.');
      renderStatus();
    });
    resignBtn.addEventListener('click', () => {
      if (phase === 'done') return;
      phase = 'done';
      board.interactive = false;
      finishGame(null, true);
    });

    function note(msg, kind) {
      notes.push({ msg, kind });
      if (notes.length > 12) notes.shift();
      commentary.innerHTML = notes
        .map(n => `<div class="note ${n.kind || ''}">${n.msg}</div>`).join('');
      commentary.scrollTop = commentary.scrollHeight;
    }

    function renderStatus(thinking) {
      const colorName = (c) => c === BLACK ? 'Black' : 'White';
      let turnHtml;
      if (phase === 'play') {
        turnHtml = game.turn === humanColor
          ? `<span class="turn-tag">Your move (${colorName(humanColor)})</span>`
          : `<span class="turn-tag thinking">${L.name} is thinking…</span>`;
      } else if (phase === 'mark') {
        turnHtml = `<span class="turn-tag">Mark dead stones</span>`;
      } else turnHtml = `<span class="turn-tag">Game over</span>`;
      status.innerHTML = `
        ${turnHtml}
        <div class="cap-counts">
          <span class="cap-item"><span class="stone-dot b"></span>${game.captures[BLACK]} captured</span>
          <span class="cap-item"><span class="stone-dot w"></span>${game.captures[WHITE]} captured</span>
        </div>`;
    }

    /* ---- gameplay ---- */

    function coach(afterColor, res) {
      // friendly commentary based on real engine facts
      if (res && res.captured.length && afterColor === humanColor) {
        note(`You captured ${res.captured.length} stone${res.captured.length > 1 ? 's' : ''}! 🎉`, 'good');
        award('first-capture');
      }
      if (res && res.captured.length && afterColor === aiColor) {
        note(`${L.name} captured ${res.captured.length} of your stones.`, 'warn');
      }
      // warn about own groups in atari
      const seen = new Set();
      for (let i = 0; i < game.board.length; i++) {
        if (game.board[i] !== humanColor || seen.has(i)) continue;
        const g = game.groupAt(i);
        g.stones.forEach(s => seen.add(s));
        if (g.libs.size === 1 && game.turn === humanColor) {
          const [x, y] = game.xy(g.stones[0]);
          note(`⚠️ Your group near ${coordName(x, y)} is in atari — one liberty left!`, 'warn');
          break;
        }
      }
    }

    function handleClick(x, y) {
      if (phase === 'mark') return toggleDead(x, y);
      if (phase !== 'play' || game.turn !== humanColor) return;
      let res;
      try { res = game.play(x, y); }
      catch (err) {
        board.shake(); Sound.error();
        if (err.reason === 'ko') note('Ko! You must play elsewhere before retaking.', 'warn');
        else if (err.reason === 'suicide') note('That point would leave your stone with no liberties.', 'warn');
        return;
      }
      board.animatePlace(game.idx(x, y));
      Sound.stone();
      if (res.captured.length) {
        board.animateCapture(res.captured, aiColor);
        Sound.capture(res.captured.length);
      }
      coach(humanColor, res);
      renderStatus();
      aiMove();
    }

    function aiMove() {
      if (game.over) return enterScoring();
      renderStatus(true);
      aiTimer = setTimeout(() => {
        if (phase !== 'play' || game.over) return;
        const mv = GoAI.chooseMove(game, level);
        if (mv.pass) {
          game.pass();
          note(`${L.name} passes.`);
          if (game.over) { board.draw(); return enterScoring(); }
        } else {
          const res = game.play(mv.x, mv.y);
          board.animatePlace(game.idx(mv.x, mv.y));
          Sound.stone();
          if (res.captured.length) {
            board.animateCapture(res.captured, humanColor);
            Sound.capture(res.captured.length);
          }
          coach(aiColor, res);
        }
        board.draw();
        renderStatus();
      }, 420 + Math.random() * 500);
    }

    /* ---- scoring ---- */

    function enterScoring() {
      phase = 'mark';
      board.interactive = true;
      note('Both players passed — time to count! Click any group that is hopelessly dead to remove it, then confirm.');
      controls.innerHTML = '';
      const confirmBtn = el('button', 'btn primary', 'Confirm score ✓');
      const resumeBtn = el('button', 'btn', '← Keep playing');
      controls.append(confirmBtn, resumeBtn);
      confirmBtn.addEventListener('click', () => finishGame(game.score(dead), false));
      resumeBtn.addEventListener('click', () => {
        phase = 'play';
        game.over = false; game.passes = 0;
        dead.clear();
        board.setMarks({});
        controls.innerHTML = '';
        controls.append(passBtn, undoBtn, resignBtn);
        renderStatus();
        if (game.turn !== humanColor) aiMove();
      });
      updateScorePreview();
      renderStatus();
    }

    function toggleDead(x, y) {
      const i = game.idx(x, y);
      if (game.board[i] === EMPTY) return;
      const g = game.groupAt(i);
      const isDead = dead.has(i);
      for (const s of g.stones) isDead ? dead.delete(s) : dead.add(s);
      Sound.pop();
      updateScorePreview();
    }

    function updateScorePreview() {
      const sc = game.score(dead);
      board.setMarks({ terB: sc.terB, terW: sc.terW, dead });
      status.innerHTML = `
        <span class="turn-tag">Counting…</span>
        <div class="cap-counts">
          <span class="cap-item"><span class="stone-dot b"></span>${sc.black}</span>
          <span class="cap-item"><span class="stone-dot w"></span>${sc.white} (komi 5.5)</span>
        </div>`;
    }

    function finishGame(sc, resigned) {
      phase = 'done';
      board.interactive = false;
      controls.innerHTML = '';
      const again = el('button', 'btn primary', 'Play again ⚔️');
      again.addEventListener('click', () => switchView('play'));
      controls.append(again);

      let humanWon;
      let headline;
      if (resigned) {
        humanWon = false;
        headline = `You resigned. ${L.name} takes the game — every loss is a lesson.`;
      } else {
        humanWon = sc.winner === humanColor;
        headline = `<b>${sc.result}.</b> ` + (humanWon
          ? `You defeated ${L.name}! 🏆`
          : `${L.name} wins this one — rematch?`);
        const scoreCard = el('div', 'panel-card score-panel', `
          <h2>Final count</h2>
          <div class="score-row"><span>● Black (stones + territory)</span><span>${sc.black}</span></div>
          <div class="score-row"><span>○ White (stones + territory + komi)</span><span>${sc.white}</span></div>
          <div class="score-row total"><span>${sc.result}</span><span>${humanWon ? '🏆' : ''}</span></div>`);
        side.insertBefore(scoreCard, noteCard);
      }
      note(headline, humanWon ? 'good' : undefined);
      renderStatus();

      const firstGame = progress.games === 0;
      progress.games++;
      if (humanWon) {
        progress.wins++;
        progress.bestWinLevel = Math.max(progress.bestWinLevel, level);
      }
      save();
      award('first-game');
      addXP(resigned ? 15 : 40, resigned ? 'a game finished' : 'a game scored');
      if (humanWon) {
        confetti(150); Sound.fanfare();
        addXP([0, 50, 90, 140][level], `victory over ${L.name}!`);
        award(['', 'beat-pebble', 'beat-river', 'beat-mountain'][level]);
      }
      if (firstGame && !humanWon) {
        toast('"Lose your first fifty games as quickly as possible." — you\'re on your way!', 4200);
      }
    }

    renderStatus();
    note(`${L.emoji} ${L.name} bows. <i>"Onegaishimasu — please teach me."</i>`);
    if (game.turn !== humanColor) aiMove();
  }

  /* =================== Guide =================== */

  function renderGuide() {
    viewEl.appendChild(el('div', 'view-head', `
      <h1>The Lantern 🏮</h1>
      <p>Everything worth remembering, in one quiet place.</p>`));
    const g = el('div', 'guide', `
      <section>
        <h2>The rules on one hand 🖐</h2>
        <ul>
          <li><b>1.</b> Black and White alternate placing stones on empty intersections. Stones never move.</li>
          <li><b>2.</b> A stone or group with no liberties (adjacent empty points) is captured and removed.</li>
          <li><b>3.</b> No suicide: you may not end your move with your own group at zero liberties — unless the move captures first.</li>
          <li><b>4.</b> Ko: you may not recreate the previous board position. Play elsewhere first.</li>
          <li><b>5.</b> Two consecutive passes end the game. Count territory + stones; White adds komi. Most points wins.</li>
        </ul>
      </section>
      <section>
        <h2>Instincts to grow 🌱</h2>
        <ul>
          <li>Count liberties constantly — yours and theirs. Atari is a fire alarm.</li>
          <li>Corners first, then sides, then center.</li>
          <li>Two eyes = unconditional life. One eye = a countdown.</li>
          <li>Don't cling to doomed stones — sacrifice small to gain big.</li>
          <li>Stay connected. Cut your opponent. ("Cut first, think later" is only half a joke.)</li>
        </ul>
      </section>
      <section>
        <h2>Glossary 📜</h2>
        <dl class="gloss">
          <dt>Atari</dt><dd>A group reduced to its final liberty — capture is threatened next move.</dd>
          <dt>Dame</dt><dd>Neutral empty points that belong to neither player.</dd>
          <dt>Eye</dt><dd>An empty point fully surrounded by one group — the opponent cannot play there.</dd>
          <dt>Geta (net)</dt><dd>A loose capturing move that covers every escape route at once.</dd>
          <dt>Hoshi</dt><dd>The marked "star points" — handy landmarks and common opening moves.</dd>
          <dt>Joseki</dt><dd>Established sequences of fair play in the corners. Learn them later — understand them, don't memorize.</dd>
          <dt>Kifu</dt><dd>A game record. Reviewing your games is the fastest way to improve.</dd>
          <dt>Ko</dt><dd>A repeating-capture shape governed by the no-repetition rule.</dd>
          <dt>Komi</dt><dd>White's compensation for moving second — usually 5.5–7.5 points.</dd>
          <dt>Moku</dt><dd>A point of territory.</dd>
          <dt>Sente / Gote</dt><dd>A move that demands an answer (keeping initiative) / a move that doesn't.</dd>
          <dt>Tsumego</dt><dd>Life-and-death puzzles — the push-ups of Go.</dd>
          <dt>Tenuki</dt><dd>Playing elsewhere, ignoring the local fight. Sometimes the strongest move on the board.</dd>
        </dl>
      </section>
      <section>
        <h2>Etiquette 🙇</h2>
        <ul>
          <li>Greet your opponent: <i>"onegaishimasu"</i> (please teach me) to start, <i>"arigatou gozaimashita"</i> to finish.</li>
          <li>Place stones decisively; never hover or take moves back (the Undo button is training wheels — real boards have none).</li>
          <li>Win with grace, lose with curiosity. Review the game together if you can.</li>
        </ul>
      </section>
      <section>
        <h2>Where to go next 🗺</h2>
        <ul>
          <li><a href="https://online-go.com" target="_blank" rel="noopener">OGS (online-go.com)</a> — play humans of every level, free, in the browser.</li>
          <li><a href="https://www.gokgs.com" target="_blank" rel="noopener">KGS</a> — a classic server with a teaching tradition.</li>
          <li><a href="https://senseis.xmp.net" target="_blank" rel="noopener">Sensei's Library</a> — the great encyclopedia of Go.</li>
          <li>Search for a local Go club — Go players adore beginners. Truly.</li>
        </ul>
      </section>`);
    viewEl.appendChild(g);
  }

  /* =================== boot =================== */

  Sound.enabled = progress.sound !== false;
  renderTopbar();
  rotateProverb();
  switchView('learn');
})();
