// Neon Dodge: a small canvas arcade game used to try out the promo-video skill.
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);

  // Seedable RNG (?seed=123) so runs can be repeated.
  let seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener('resize', resize);
  resize();

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Enter' && state.mode !== 'play') start();
    if (e.code === 'Space') { e.preventDefault(); dash(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  // Touch: hold the left/right half of the screen to move, swipe up to dash, tap to start.
  let touchDir = 0, touchY0 = null;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    if (state.mode !== 'play') { start(); return; }
    touchDir = t.clientX < W / 2 ? -1 : 1; touchY0 = t.clientY;
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    touchDir = t.clientX < W / 2 ? -1 : 1;
    if (touchY0 !== null && touchY0 - t.clientY > 60) { dash(); touchY0 = null; }
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => { if (!e.touches.length) touchDir = 0; });
  canvas.addEventListener('mousedown', () => { if (state.mode !== 'play') start(); else dash(); });

  const state = { mode: 'title', t: 0, score: 0, best: Number(localStorage.getItem('neon-best') || 0), shake: 0 };
  const player = { x: 0, y: 0, vx: 0, r: 16, dash: 0, cooldown: 0, trail: [] };
  let blocks = [], orbs = [], particles = [], stars = [];

  for (let i = 0; i < 140; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2 });

  function start() {
    state.mode = 'play'; state.t = 0; state.score = 0;
    player.x = W / 2; player.y = H - 90; player.vx = 0; player.dash = 0; player.cooldown = 0; player.trail = [];
    blocks = []; orbs = []; particles = [];
  }

  function dash() {
    if (state.mode !== 'play' || player.cooldown > 0) return;
    const dir = keys.has('ArrowLeft') || keys.has('KeyA') || touchDir < 0 ? -1 : 1;
    player.vx = dir * 1400; player.dash = 0.18; player.cooldown = 0.6;
    burst(player.x, player.y, '#22d3ee', 18);
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, s = 80 + rand() * 320;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + rand() * 0.4, color });
    }
  }

  function update(dt) {
    state.t += dt;
    for (const s of stars) { s.y += dt * 0.05 * s.z * (state.mode === 'play' ? 3 : 1); if (s.y > 1) s.y -= 1; }
    particles = particles.filter((p) => (p.life -= dt) > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
    state.shake = Math.max(0, state.shake - dt * 3);
    if (state.mode !== 'play') return;

    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const target = ((right - left) || touchDir) * Math.max(520, W * 1.1);
    if (player.dash > 0) player.dash -= dt; else player.vx += (target - player.vx) * Math.min(1, dt * 12);
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.x = Math.max(player.r, Math.min(W - player.r, player.x + player.vx * dt));
    player.trail.push({ x: player.x, y: player.y }); if (player.trail.length > 14) player.trail.shift();

    const level = 1 + state.t / 12;
    if (rand() < dt * 2.2 * level) {
      const w = 40 + rand() * 110;
      blocks.push({ x: rand() * (W - w), y: -40, w, h: 22 + rand() * 18, vy: 180 + rand() * 160 * level, hue: rand() < 0.5 ? 300 : 190 });
    }
    if (rand() < dt * 0.9) orbs.push({ x: 30 + rand() * (W - 60), y: -20, vy: 160 + rand() * 80, phase: rand() * 6 });

    for (const b of blocks) b.y += b.vy * dt;
    for (const o of orbs) o.y += o.vy * dt;
    blocks = blocks.filter((b) => b.y < H + 60);
    orbs = orbs.filter((o) => o.y < H + 40);

    for (const o of orbs) {
      if (Math.hypot(o.x - player.x, o.y - player.y) < player.r + 14) {
        o.y = H + 100; state.score += 50; burst(o.x, o.y - 0, '#fde047', 22);
      }
    }
    if (player.dash <= 0) {
      for (const b of blocks) {
        const cx = Math.max(b.x, Math.min(player.x, b.x + b.w));
        const cy = Math.max(b.y, Math.min(player.y, b.y + b.h));
        if (Math.hypot(cx - player.x, cy - player.y) < player.r) { gameOver(); return; }
      }
    }
    state.score += dt * 10;
  }

  function gameOver() {
    state.mode = 'over'; state.shake = 1;
    burst(player.x, player.y, '#f472b6', 60);
    state.best = Math.max(state.best, Math.floor(state.score));
    localStorage.setItem('neon-best', String(state.best));
  }

  function glowRect(x, y, w, h, color) {
    ctx.shadowColor = color; ctx.shadowBlur = 24; ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.shadowBlur = 0;
  }

  function text(str, x, y, size, color, weight = 800) {
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20;
    ctx.fillText(str, x, y); ctx.shadowBlur = 0;
  }

  function draw() {
    const sx = (Math.random() - 0.5) * state.shake * 18, sy = (Math.random() - 0.5) * state.shake * 18;
    ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0620'); g.addColorStop(1, '#05050c');
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);

    for (const s of stars) { ctx.fillStyle = `rgba(160,200,255,${s.z * 0.7})`; ctx.fillRect(s.x * W, s.y * H, s.z * 2.2, s.z * 2.2); }
    ctx.strokeStyle = 'rgba(34,211,238,.08)'; ctx.lineWidth = 1;
    const off = (state.t * 120) % 60;
    for (let y = H * 0.55 + off; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    for (const b of blocks) glowRect(b.x, b.y, b.w, b.h, `hsl(${b.hue} 95% 62%)`);
    for (const o of orbs) {
      const r = 10 + Math.sin(state.t * 6 + o.phase) * 2;
      ctx.shadowColor = '#fde047'; ctx.shadowBlur = 28; ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 1.6); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
    ctx.globalAlpha = 1;

    if (state.mode === 'play') {
      player.trail.forEach((p, i) => { ctx.globalAlpha = (i / player.trail.length) * 0.35; glowRect(p.x - player.r, p.y - player.r, player.r * 2, player.r * 2, '#22d3ee'); });
      ctx.globalAlpha = 1;
      glowRect(player.x - player.r, player.y - player.r, player.r * 2, player.r * 2, player.dash > 0 ? '#ffffff' : '#22d3ee');
      ctx.textAlign = 'left'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#e0f7ff';
      ctx.fillText(`SCORE ${Math.floor(state.score)}`, 28, 44);
      ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(224,247,255,.6)'; ctx.fillText(`BEST ${state.best}`, W - 28, 44);
    } else if (state.mode === 'title') {
      text('NEON DODGE', W / 2, H / 2 - 30, Math.min(110, W / 9), '#22d3ee');
      text('Press Enter to play', W / 2, H / 2 + 40, 28, '#f472b6', 600);
      text('←  →  move     SPACE  dash', W / 2, H / 2 + 90, 18, 'rgba(224,247,255,.7)', 500);
    } else {
      text('GAME OVER', W / 2, H / 2 - 30, Math.min(96, W / 10), '#f472b6');
      text(`Score ${Math.floor(state.score)}  ·  Best ${state.best}`, W / 2, H / 2 + 30, 30, '#e0f7ff', 600);
      text('Press Enter to retry', W / 2, H / 2 + 80, 22, '#22d3ee', 500);
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Handy hook for scripted captures: window.neonDodge.state / start().
  window.neonDodge = { state, start, player };
})();
