/* ==========================================================================
   GlassTac v3 — Reference-Matched Redesign
   All game logic UNCHANGED. UI hooks updated for new HTML structure.
   ========================================================================== */

(() => {
  'use strict';

  /* ── Constants ────────────────────────────────────────────────────────── */
  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  const LINE_COORDS = {
    '0,1,2':[30,50,270,50],  '3,4,5':[30,150,270,150], '6,7,8':[30,250,270,250],
    '0,3,6':[50,30,50,270],  '1,4,7':[150,30,150,270], '2,5,8':[250,30,250,270],
    '0,4,8':[30,30,270,270], '2,4,6':[270,30,30,270]
  };
  const STORAGE_KEY = 'glasstac_v3';
  const defaultData = {
    settings:{ sound:true, animations:true, theme:'neon', lightBg:false },
    stats:{ played:0, wins:0, losses:0, draws:0, currentStreak:0, bestStreak:0 },
    scores:{ x:0, o:0, draw:0 },
    achievements:{},
    daily:{ date:'', completed:false }
  };

  let data = loadData();
  const state = {
    board: Array(9).fill(''),
    current: 'X',
    mode: 'ai',
    difficulty: 'easy',
    gameOver: false,
    aiThinking: false
  };

  /* ── Persistence ──────────────────────────────────────────────────────── */
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultData);
      const p = JSON.parse(raw);
      return {
        settings:     { ...defaultData.settings,     ...p.settings },
        stats:        { ...defaultData.stats,         ...p.stats },
        scores:       { ...defaultData.scores,        ...p.scores },
        achievements: { ...p.achievements },
        daily:        { ...defaultData.daily,         ...p.daily }
      };
    } catch { return structuredClone(defaultData); }
  }
  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  /* ── DOM refs ─────────────────────────────────────────────────────────── */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const els = {
    // Loading
    loadingScreen: $('#loading-screen'), loaderFill: $('#loader-fill'),
    // App
    app: $('#app'),
    // Screens
    menuScreen:  $('#menu-screen'),
    gameScreen:  $('#game-screen'),
    // Menu controls
    modeBtns:    $$('.mode-btn'),
    diffRow:     $('#difficulty-row'),
    diffBtns:    $$('.diff-btn'),
    playBtn:     $('#play-btn'),
    // HUD
    soundHudBtn: $('#sound-hud-btn'),
    soundIcon:   $('#sound-icon'),
    // Game HUD
    backBtn:        $('#back-btn'),
    turnIndicator:  $('#turn-indicator'),
    turnDot:        $('#turn-dot'),   // tc-dot
    turnText:       $('#turn-text'),
    tcSymbol:       $('#tc-symbol'),
    statsGameBtn:   $('#stats-game-btn'),
    // Scoreboard
    scoreX:    $('#score-x'),    scoreO:    $('#score-o'),    scoreDraw: $('#score-draw'),
    scoreXLabel: $('#score-x-label'), scoreOLabel: $('#score-o-label'),
    scoreXCard:  $('#score-x-card'),  scoreOCard:  $('#score-o-card'),
    sidebarBestStreak: $('#sidebar-best-streak'),
    // Board
    board:       $('#board'), cells: $$('.cell'),
    winline:     $('#winline'), winlineLine: $('#winline-line'),
    streakBanner: $('#streak-banner'),
    // Game actions (right sidebar)
    restartBtn:      $('#restart-btn'),
    newMatchBtn:     $('#new-match-btn'),
    restartMatchBtn: $('#restart-match-btn'),
    // Victory
    victoryOverlay: $('#victory-overlay'),
    victoryPanel:   $('#victory-panel'),
    vcSymbolWrap:   $('#vc-symbol-wrap'),
    victoryIcon:    $('#victory-icon'),    // .vc-symbol
    victoryTitle:   $('#victory-title'),
    victorySub:     $('#victory-subtitle'),
    victoryStreak:  $('#victory-streak'),
    nextRoundBtn:   $('#next-round-btn'),
    vMenuLink:      $('#v-menu-link'),
    confettiCanvas: $('#confetti-canvas'),
    vapFill:        $('#vap-fill'),
    vapCount:       $('#vap-count'),
    // Settings
    settingsBtn:     $('#settings-btn'),
    settingsOverlay: $('#settings-overlay'),
    soundToggle:     $('#sound-toggle'),
    animToggle:      $('#anim-toggle'),
    bgToggle:        $('#bg-toggle'),
    themeSwatches:   $$('.swatch'),
    resetStatsBtn:   $('#reset-stats-btn'),
    // Stats
    statsBtn:       $('#stats-btn'),
    statsOverlay:   $('#stats-overlay'),
    statPlayed:     $('#stat-played'),  statWins:   $('#stat-wins'),
    statLosses:     $('#stat-losses'),  statDraws:  $('#stat-draws'),
    statWinrate:    $('#stat-winrate'), statStreak: $('#stat-streak'),
    statBestStreak: $('#stat-beststreak'),
    // Achievements
    achievementsBtn:     $('#achievements-btn'),
    achievementsOverlay: $('#achievements-overlay'),
    achievementsList:    $('#achievements-list'),
    // Daily
    dailyNavBtn: $('#daily-nav-btn'),
    dailyOverlay: $('#daily-overlay'),
    dcStatus:     $('#dc-status'),
    dcCheck:      $('#dc-check'),
    dcNavLabel:   $('#dc-nav-label'),
    // How to play
    howtoBtn:     $('#howto-btn'),
    howtoOverlay: $('#howto-overlay'),
    // Toast
    achievementToast: $('#achievement-toast'),
    toastName:        $('#toast-name'),
    toastIcon:        $('#toast-icon'),
    // Footer
    footerBestStreak: $('#footer-best-streak'),
    // Stats game screen
    closeBtns: $$('.close-btn'),
    // Background canvas
    bgCanvas: $('#bg-canvas')
  };

  /* ── Achievements definition ──────────────────────────────────────────── */
  const ACHIEVEMENTS = [
    { id:'first_win',  name:'First Victory',  desc:'Win your first game',  icon:'🥇', check:() => data.stats.wins >= 1 },
    { id:'five_wins',  name:'5 Wins',          desc:'Win 5 games total',     icon:'⭐', check:() => data.stats.wins >= 5 },
    { id:'ten_wins',   name:'10 Wins',          desc:'Win 10 games total',    icon:'🌟', check:() => data.stats.wins >= 10 },
    { id:'unbeatable', name:'Unbeatable',       desc:'Beat the Hard AI',      icon:'🛡️', check:() => data.achievements._beatHard === true },
    { id:'streak5',    name:'Win Streak 5',     desc:'Win 5 in a row',        icon:'🔥', check:() => data.stats.bestStreak >= 5 },
    { id:'streak10',   name:'Win Streak 10',    desc:'Win 10 in a row',       icon:'🚀', check:() => data.stats.bestStreak >= 10 }
  ];

  /* ── WebAudio (synthesized, no files) ─────────────────────────────────── */
  let _actx = null;
  function actx() {
    if (!_actx) try { _actx = new (window.AudioContext||window.webkitAudioContext)(); } catch {}
    return _actx;
  }
  function tone(freq, dur, type='sine', vol=.16, delay=0) {
    if (!data.settings.sound) return;
    const ctx = actx(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    o.start(t); g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(.0001, t+dur);
    o.stop(t+dur+.02);
  }
  const SFX = {
    move:  ()=>tone(420,.12,'sine',.15),
    click: ()=>tone(600,.08,'triangle',.12),
    win:   ()=>{ tone(523.25,.15,'triangle',.18,0); tone(659.25,.15,'triangle',.18,.12); tone(783.99,.25,'triangle',.20,.24); },
    lose:  ()=>{ tone(392,.18,'sawtooth',.12,0); tone(311.13,.25,'sawtooth',.12,.15); },
    draw:  ()=>{ tone(330,.15,'square',.10,0); tone(330,.15,'square',.10,.18); }
  };

  /* ── Background particle canvas ───────────────────────────────────────── */
  function initBgParticles() {
    const cv = els.bgCanvas; if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H;
    const COUNT = 55;
    const dots = [];
    function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
    resize(); addEventListener('resize', resize, {passive:true});
    for (let i=0; i<COUNT; i++) dots.push({
      x:Math.random()*innerWidth, y:Math.random()*innerHeight,
      r:Math.random()*1.1+.3, vx:(Math.random()-.5)*.28, vy:(Math.random()-.5)*.28,
      a:Math.random()*.5+.15
    });
    (function tick() {
      ctx.clearRect(0,0,W,H);
      dots.forEach(d => {
        d.x+=d.vx; d.y+=d.vy;
        if(d.x<0) d.x=W; else if(d.x>W) d.x=0;
        if(d.y<0) d.y=H; else if(d.y>H) d.y=0;
        ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,255,157,${d.a})`; ctx.fill();
      });
      requestAnimationFrame(tick);
    })();
  }

  /* ── Loading ──────────────────────────────────────────────────────────── */
  function initLoader() {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random()*22+8;
      if (p >= 100) {
        p = 100; clearInterval(iv);
        els.loaderFill.style.width = '100%';
        setTimeout(() => {
          els.loadingScreen.classList.add('fade-out');
          els.app.classList.remove('hidden');
          requestAnimationFrame(() => els.app.classList.add('show'));
          setTimeout(() => els.loadingScreen.style.display = 'none', 700);
        }, 280);
        return;
      }
      els.loaderFill.style.width = p+'%';
    }, 120);
  }

  /* ── Settings ─────────────────────────────────────────────────────────── */
  function applySettings() {
    els.soundToggle.checked = data.settings.sound;
    els.animToggle.checked  = data.settings.animations;
    els.bgToggle.checked    = data.settings.lightBg;
    document.body.classList.toggle('no-anim', !data.settings.animations);
    document.body.classList.toggle('light-bg', data.settings.lightBg);
    document.body.setAttribute('data-theme', data.settings.theme);
    $$('.swatch').forEach(s => s.classList.toggle('active', s.dataset.theme === data.settings.theme));
    // Update HUD sound icon
    updateSoundIcon();
  }
  function updateSoundIcon() {
    if (!els.soundIcon) return;
    if (data.settings.sound) {
      els.soundIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>';
    } else {
      els.soundIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    }
  }

  /* ── Daily challenge ──────────────────────────────────────────────────── */
  function todayStr() { const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function refreshDaily() {
    if (data.daily.date !== todayStr()) { data.daily.date=todayStr(); data.daily.completed=false; saveData(); }
    if (els.dcStatus) els.dcStatus.textContent = 'Win a match on Hard AI today!';
    if (els.dcCheck) {
      els.dcCheck.textContent = data.daily.completed ? '✓ COMPLETED' : 'Not yet';
      els.dcCheck.style.color = data.daily.completed ? 'var(--em-1)' : 'var(--text-dim)';
    }
    if (els.dcNavLabel) els.dcNavLabel.textContent = data.daily.completed ? 'DAILY ✓' : 'DAILY';
  }
  function checkDaily(outcome) {
    if (state.mode==='ai' && state.difficulty==='hard' && outcome==='win' && !data.daily.completed) {
      data.daily.completed=true; saveData(); refreshDaily();
    }
  }

  /* ── Menu ─────────────────────────────────────────────────────────────── */
  function setupMenu() {
    els.modeBtns.forEach(b => b.addEventListener('click', () => {
      SFX.click();
      els.modeBtns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); state.mode = b.dataset.mode;
      els.diffRow.classList.toggle('hidden-diff', state.mode !== 'ai');
    }));
    els.diffBtns.forEach(b => b.addEventListener('click', () => {
      SFX.click();
      els.diffBtns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); state.difficulty = b.dataset.diff;
    }));
    els.playBtn.addEventListener('click', () => { SFX.click(); showScreen('game'); startNewMatch(); });
  }

  function showScreen(name) {
    els.menuScreen.classList.toggle('active', name==='menu');
    els.gameScreen.classList.toggle('active', name==='game');
  }

  /* ── Score labels ─────────────────────────────────────────────────────── */
  function updateScoreLabels() {
    if (els.scoreXLabel) els.scoreXLabel.textContent = state.mode==='ai' ? 'YOU (X)' : 'P1 (X)';
    if (els.scoreOLabel) els.scoreOLabel.textContent = state.mode==='ai' ? 'AI (O)'  : 'P2 (O)';
    if (els.scoreX)    els.scoreX.textContent    = data.scores.x;
    if (els.scoreO)    els.scoreO.textContent    = data.scores.o;
    if (els.scoreDraw) els.scoreDraw.textContent = data.scores.draw;
    if (els.sidebarBestStreak) els.sidebarBestStreak.textContent = data.stats.bestStreak;
    if (els.footerBestStreak)  els.footerBestStreak.textContent  = data.stats.bestStreak;
  }

  /* ── Game Engine ──────────────────────────────────────────────────────── */
  function startNewMatch() {
    data.scores = {x:0,o:0,draw:0}; saveData();
    updateScoreLabels(); startRound();
  }

  function startRound() {
    state.board = Array(9).fill('');
    state.current = 'X'; state.gameOver = false; state.aiThinking = false;
    els.cells.forEach(c => { c.innerHTML=''; c.className='cell'; });
    hideWinLine();
    if (els.streakBanner) els.streakBanner.textContent = '';
    updateTurnChip();
    updateScoreLabels();
  }

  function updateTurnChip() {
    const isX = state.current === 'X';
    const ti = els.turnIndicator;
    if (!ti) return;
    ti.classList.toggle('x-turn', isX);
    ti.classList.toggle('o-turn', !isX);
    if (els.turnDot) els.turnDot.classList.toggle('o', !isX);
    // Symbol
    if (els.tcSymbol) {
      els.tcSymbol.textContent = isX ? '✕' : '○';
      els.tcSymbol.style.color = isX ? 'var(--x-col)' : 'var(--o-col)';
      els.tcSymbol.style.textShadow = isX ? '0 0 12px var(--x-col)' : '0 0 12px var(--o-col)';
    }
    if (els.turnText) {
      if (state.mode==='ai') els.turnText.textContent = isX ? 'YOUR TURN (X)' : 'AI THINKING…';
      else                   els.turnText.textContent = isX ? 'PLAYER X TURN' : 'PLAYER O TURN';
    }
    // Score card active state
    if (els.scoreXCard) els.scoreXCard.classList.toggle('active-turn', isX  && !state.gameOver);
    if (els.scoreOCard) els.scoreOCard.classList.toggle('active-turn', !isX && !state.gameOver);
  }

  function cellSVG(sym) {
    return sym==='X'
      ? `<svg viewBox="0 0 100 100"><path d="M20,20 L80,80"/><path d="M80,20 L20,80"/></svg>`
      : `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32"/></svg>`;
  }

  function placeMark(i, sym) {
    state.board[i] = sym;
    const c = els.cells[i];
    c.innerHTML = cellSVG(sym);
    c.classList.add('filled', sym==='X' ? 'x-mark' : 'o-mark');
    SFX.move();
  }

  function handleCellClick(i) {
    if (state.gameOver || state.aiThinking) return;
    if (state.board[i]) return;
    if (state.mode==='ai' && state.current!=='X') return;
    placeMark(i, state.current);
    const res = evaluate(state.board);
    if (res) { endRound(res); return; }
    state.current = state.current==='X' ? 'O' : 'X';
    updateTurnChip();
    if (state.mode==='ai' && state.current==='O') {
      state.aiThinking = true; setBoard(false);
      setTimeout(aiMove, state.difficulty==='hard' ? 400 : 290);
    }
  }

  function setBoard(on) {
    els.cells.forEach((c,i) => c.classList.toggle('disabled', !on && !state.board[i]));
  }

  function evaluate(b) {
    for (const [a,bI,c] of WIN_LINES) {
      if (b[a] && b[a]===b[bI] && b[a]===b[c]) return { winner:b[a], line:[a,bI,c] };
    }
    if (b.every(Boolean)) return { winner:'draw', line:null };
    return null;
  }

  /* ── AI ───────────────────────────────────────────────────────────────── */
  const empties = b => { const e=[]; b.forEach((v,i)=>{ if(!v) e.push(i); }); return e; };
  function aiMove() {
    if (state.gameOver) return;
    const idx = state.difficulty==='hard' ? aiHard() : state.difficulty==='medium' ? aiMed() : aiEasy();
    placeMark(idx,'O');
    const res = evaluate(state.board);
    state.aiThinking = false;
    if (res) { endRound(res); return; }
    state.current = 'X'; setBoard(true); updateTurnChip();
  }
  function aiEasy() { const e=empties(state.board); return e[Math.floor(Math.random()*e.length)]; }
  function aiMed() {
    const b=state.board, e=empties(b);
    for(const i of e){ const c=b.slice(); c[i]='O'; if(evaluate(c)?.winner==='O') return i; }
    for(const i of e){ const c=b.slice(); c[i]='X'; if(evaluate(c)?.winner==='X') return i; }
    if(!b[4]) return 4;
    const co=[0,2,6,8].filter(i=>!b[i]); if(co.length) return co[Math.floor(Math.random()*co.length)];
    return e[Math.floor(Math.random()*e.length)];
  }
  function aiHard() {
    let best=-Infinity, mv=null;
    for(const i of empties(state.board)){ const c=state.board.slice(); c[i]='O'; const s=minimax(c,0,false); if(s>best){best=s;mv=i;} }
    return mv;
  }
  function minimax(b,d,maxing) {
    const r=evaluate(b);
    if(r){ if(r.winner==='O') return 10-d; if(r.winner==='X') return d-10; return 0; }
    if(maxing){ let v=-Infinity; for(const i of empties(b)){ const c=b.slice(); c[i]='O'; v=Math.max(v,minimax(c,d+1,false)); } return v; }
    else       { let v= Infinity; for(const i of empties(b)){ const c=b.slice(); c[i]='X'; v=Math.min(v,minimax(c,d+1,true));  } return v; }
  }

  /* ── Round end ────────────────────────────────────────────────────────── */
  function endRound(res) {
    state.gameOver = true; setBoard(false);
    if (res.winner==='draw') { handleDraw(); return; }
    res.line.forEach(i => els.cells[i].classList.add('win-cell'));
    showWinLine(res.line);
    if (res.winner==='X') data.scores.x++; else data.scores.o++;
    saveData(); updateScoreLabels();
    let outcome;
    if (state.mode==='ai') {
      outcome = res.winner==='X' ? 'win' : 'loss';
      updateStats(outcome);
      if (outcome==='win' && state.difficulty==='hard') { data.achievements._beatHard=true; saveData(); }
      checkDaily(outcome==='win' ? 'win' : 'loss');
    } else { updateStats('win'); }
    checkAchievements();
    setTimeout(() => showVictory(res.winner), 560);
  }

  function handleDraw() {
    data.scores.draw++; saveData(); updateScoreLabels();
    updateStats('draw'); SFX.draw(); checkAchievements();
    setTimeout(() => showVictory('draw'), 420);
  }

  function updateStats(outcome) {
    data.stats.played++;
    if (outcome==='win') {
      data.stats.wins++; data.stats.currentStreak++;
      if (data.stats.currentStreak > data.stats.bestStreak) data.stats.bestStreak = data.stats.currentStreak;
    } else if (outcome==='loss') { data.stats.losses++; data.stats.currentStreak=0; }
    else { data.stats.draws++; data.stats.currentStreak=0; }
    saveData();
    if (els.sidebarBestStreak) els.sidebarBestStreak.textContent = data.stats.bestStreak;
    if (els.footerBestStreak)  els.footerBestStreak.textContent  = data.stats.bestStreak;
    // Update streak banner
    if (els.streakBanner && data.stats.currentStreak > 1) {
      els.streakBanner.textContent = `Win Streak! 🔥 ×${data.stats.currentStreak}`;
    }
  }

  /* ── Win line ─────────────────────────────────────────────────────────── */
  function showWinLine(line) {
    const coords = LINE_COORDS[line.join(',')]; if (!coords) return;
    const [x1,y1,x2,y2] = coords;
    const ln = els.winlineLine;
    ln.setAttribute('x1',x1); ln.setAttribute('y1',y1);
    ln.setAttribute('x2',x2); ln.setAttribute('y2',y2);
    ln.classList.remove('show'); void ln.offsetWidth; ln.classList.add('show');
  }
  function hideWinLine() {
    els.winlineLine.classList.remove('show');
    ['x1','y1','x2','y2'].forEach(a=>els.winlineLine.setAttribute(a,0));
  }

  /* ── Victory screen ───────────────────────────────────────────────────── */
  function showVictory(winner) {
    let sym, title, sub, streak='', isWin=false;

    if (winner==='draw') {
      sym='═'; title='DRAW'; sub='Evenly matched — try again!';
    } else if (state.mode==='ai') {
      if (winner==='X') {
        sym='✕'; title='YOU WON!'; sub='Great move!'; isWin=true;
        SFX.win(); launchConfetti();
        if (data.stats.currentStreak>1) streak=`🔥 ${data.stats.currentStreak} win streak!`;
      } else {
        sym='○'; title='DEFEAT'; sub=`The ${cap(state.difficulty)} AI wins`;
        SFX.lose();
      }
    } else {
      sym = winner==='X' ? '✕' : '○';
      title=`PLAYER ${winner} WINS!`; sub='Well played!'; isWin=true;
      SFX.win(); launchConfetti();
    }

    // Update symbol
    if (els.victoryIcon) {
      els.victoryIcon.textContent = sym;
      els.victoryIcon.className = 'vc-symbol' + (winner==='O' ? ' o-sym' : '');
    }
    // Symbol wrap colour
    if (els.vcSymbolWrap) {
      const col = winner==='X' ? 'rgba(109,255,138,.28)' : winner==='O' ? 'rgba(255,95,160,.28)' : 'rgba(255,255,255,.15)';
      const glow = winner==='X' ? 'rgba(109,255,138,.18)' : winner==='O' ? 'rgba(255,95,160,.12)' : 'rgba(255,255,255,.08)';
      els.vcSymbolWrap.style.borderColor = col;
      els.vcSymbolWrap.style.boxShadow = `0 0 40px ${glow},inset 0 1px 0 rgba(255,255,255,.08)`;
    }
    if (els.victoryTitle) {
      els.victoryTitle.textContent = title;
      els.victoryTitle.className = 'vc-title' + (isWin ? ' win-col' : '');
    }
    if (els.victorySub)    els.victorySub.textContent    = sub;
    if (els.victoryStreak) els.victoryStreak.textContent = streak;

    openOverlay(els.victoryOverlay);
  }
  const cap = s => s.charAt(0).toUpperCase()+s.slice(1);

  /* ── Confetti — 45 particles, 75 frames, mobile-optimised ────────────── */
  function launchConfetti() {
    if (!data.settings.animations) return;
    const cv = els.confettiCanvas; if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(devicePixelRatio||1, 2);
    const panel = els.victoryPanel;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    cv.width = rect.width*dpr; cv.height = rect.height*dpr;
    cv.style.width = rect.width+'px'; cv.style.height = rect.height+'px';
    ctx.scale(dpr,dpr);
    const W=rect.width, H=rect.height;
    const cols=['#00FF9D','#7CFFCB','#e879f9','#facc15','#38bdf8'];
    const pts = Array.from({length:45},()=>({
      x:W*.5, y:H*.22,
      vx:(Math.random()-.5)*9, vy:Math.random()*-7-2.5,
      sz:Math.random()*5.5+3.5,
      col:cols[Math.floor(Math.random()*cols.length)],
      rot:Math.random()*360, rs:(Math.random()-.5)*11, g:.2+Math.random()*.09
    }));
    let frame=0; const MAX=75; let raf;
    (function tick(){
      frame++;
      ctx.clearRect(0,0,W,H);
      const alpha = Math.max(1-(frame/MAX)*1.2,0);
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.rot+=p.rs;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha=alpha; ctx.fillStyle=p.col;
        ctx.fillRect(-p.sz*.5,-p.sz*.3,p.sz,p.sz*.55);
        ctx.restore();
      });
      if(frame<MAX){ raf=requestAnimationFrame(tick); }
      else{ ctx.clearRect(0,0,W,H); cancelAnimationFrame(raf); }
    })();
  }

  /* ── Achievements ─────────────────────────────────────────────────────── */
  function checkAchievements() {
    let newUnlock=null;
    ACHIEVEMENTS.forEach(a=>{
      if(!data.achievements[a.id] && a.check()){ data.achievements[a.id]=true; if(!newUnlock) newUnlock=a; }
    });
    if(newUnlock){ saveData(); showToast(newUnlock); }
    renderAchievements();
  }
  function showToast(a) {
    if(els.toastName) els.toastName.textContent = a.name;
    if(els.toastIcon) els.toastIcon.textContent = a.icon;
    els.achievementToast.classList.add('show');
    setTimeout(()=>els.achievementToast.classList.remove('show'), 3400);
  }
  function renderAchievements() {
    if (!els.achievementsList) return;
    els.achievementsList.innerHTML = ACHIEVEMENTS.map(a=>{
      const u = data.achievements[a.id]===true;
      return `<div class="achievement-item ${u?'':'locked'}">
        <div class="ach-icon">${a.icon}</div>
        <div class="ach-text"><strong>${a.name}</strong><span>${a.desc}</span></div>
      </div>`;
    }).join('');
  }

  /* ── Stats ────────────────────────────────────────────────────────────── */
  function renderStats() {
    const s = data.stats;
    if(els.statPlayed)     els.statPlayed.textContent     = s.played;
    if(els.statWins)       els.statWins.textContent       = s.wins;
    if(els.statLosses)     els.statLosses.textContent     = s.losses;
    if(els.statDraws)      els.statDraws.textContent      = s.draws;
    if(els.statWinrate)    els.statWinrate.textContent    = (s.played>0?Math.round(s.wins/s.played*100):0)+'%';
    if(els.statStreak)     els.statStreak.textContent     = s.currentStreak;
    if(els.statBestStreak) els.statBestStreak.textContent = s.bestStreak;
    // Achievement count
    const u = ACHIEVEMENTS.filter(a=>data.achievements[a.id]===true).length;
    const sac = $('#stat-ach-count'); if(sac) sac.textContent = u+'/6';
  }

  /* ── Overlays ─────────────────────────────────────────────────────────── */
  const openOverlay  = o => o && o.classList.add('show');
  const closeOverlay = o => o && o.classList.remove('show');

  function setupOverlays() {
    // Settings
    els.settingsBtn && els.settingsBtn.addEventListener('click',()=>{ SFX.click(); openOverlay(els.settingsOverlay); });
    // Stats — both from menu nav and game screen
    els.statsBtn && els.statsBtn.addEventListener('click',()=>{ SFX.click(); renderStats(); openOverlay(els.statsOverlay); });
    els.statsGameBtn && els.statsGameBtn.addEventListener('click',()=>{ SFX.click(); renderStats(); openOverlay(els.statsOverlay); });
    // Achievements
    els.achievementsBtn && els.achievementsBtn.addEventListener('click',()=>{ SFX.click(); renderAchievements(); openOverlay(els.achievementsOverlay); });
    // Daily
    els.dailyNavBtn && els.dailyNavBtn.addEventListener('click',()=>{ SFX.click(); openOverlay(els.dailyOverlay); });
    // How to play
    els.howtoBtn && els.howtoBtn.addEventListener('click',()=>{ SFX.click(); openOverlay(els.howtoOverlay); });
    // Close buttons
    els.closeBtns.forEach(b=>b.addEventListener('click',()=>{ SFX.click(); closeOverlay(document.getElementById(b.dataset.close)); }));
    // Click-outside-panel to close (not victory)
    [els.settingsOverlay,els.statsOverlay,els.achievementsOverlay,els.dailyOverlay,els.howtoOverlay].forEach(o=>{
      if(o) o.addEventListener('click',e=>{ if(e.target===o) closeOverlay(o); });
    });
    // ESC
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape') [els.settingsOverlay,els.statsOverlay,els.achievementsOverlay,els.dailyOverlay,els.howtoOverlay].forEach(closeOverlay);
    });
  }

  function setupSettingsControls() {
    els.soundToggle && els.soundToggle.addEventListener('change',()=>{ data.settings.sound=els.soundToggle.checked; saveData(); updateSoundIcon(); if(data.settings.sound) SFX.click(); });
    els.animToggle  && els.animToggle.addEventListener('change',()=>{ data.settings.animations=els.animToggle.checked; saveData(); applySettings(); SFX.click(); });
    els.bgToggle    && els.bgToggle.addEventListener('change',()=>{ data.settings.lightBg=els.bgToggle.checked; saveData(); applySettings(); SFX.click(); });
    els.themeSwatches.forEach(sw=>sw.addEventListener('click',()=>{ data.settings.theme=sw.dataset.theme; saveData(); applySettings(); SFX.click(); }));
    els.resetStatsBtn && els.resetStatsBtn.addEventListener('click',()=>{
      SFX.click();
      if(confirm('Reset all statistics, scores, and achievements? This cannot be undone.')) {
        data.stats=structuredClone(defaultData.stats);
        data.scores=structuredClone(defaultData.scores);
        data.achievements={};
        saveData(); updateScoreLabels(); renderStats(); renderAchievements();
      }
    });
    // HUD sound toggle (menu screen)
    els.soundHudBtn && els.soundHudBtn.addEventListener('click',()=>{
      data.settings.sound = !data.settings.sound; saveData(); applySettings();
    });
  }

  /* ── Game controls ────────────────────────────────────────────────────── */
  function setupGameControls() {
    els.backBtn        && els.backBtn.addEventListener('click',()=>{ SFX.click(); showScreen('menu'); });
    els.restartBtn     && els.restartBtn.addEventListener('click',()=>{ SFX.click(); startRound(); });
    els.newMatchBtn    && els.newMatchBtn.addEventListener('click',()=>{ SFX.click(); startNewMatch(); });
    els.restartMatchBtn && els.restartMatchBtn.addEventListener('click',()=>{ SFX.click(); startRound(); });
    els.nextRoundBtn   && els.nextRoundBtn.addEventListener('click',()=>{ SFX.click(); closeOverlay(els.victoryOverlay); startRound(); });
    els.vMenuLink      && els.vMenuLink.addEventListener('click',()=>{ SFX.click(); closeOverlay(els.victoryOverlay); showScreen('menu'); });
  }

  /* ── Board events ─────────────────────────────────────────────────────── */
  function setupBoard() {
    els.cells.forEach((c,i)=>{
      c.addEventListener('click',()=>handleCellClick(i));
      c.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handleCellClick(i); } });
    });
  }

  /* ── Init ─────────────────────────────────────────────────────────────── */
  function init() {
    applySettings();
    setupMenu();
    setupBoard();
    setupGameControls();
    setupOverlays();
    setupSettingsControls();
    refreshDaily();
    renderAchievements();
    updateScoreLabels();
    initBgParticles();
    initLoader();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
