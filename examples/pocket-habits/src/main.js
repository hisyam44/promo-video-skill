import './style.css';
const KEY = 'pocket-habits';
const seed = [
  { id: 1, name: 'Morning run', emoji: '🏃', streak: 12, week: [1,1,1,0,1,1,0], done: false },
  { id: 2, name: 'Read 20 pages', emoji: '📚', streak: 5, week: [1,0,1,1,1,0,0], done: false },
  { id: 3, name: 'Drink water', emoji: '💧', streak: 21, week: [1,1,1,1,1,1,0], done: true },
  { id: 4, name: 'Meditate', emoji: '🧘', streak: 3, week: [0,0,1,1,1,0,0], done: false },
];
let habits = JSON.parse(localStorage.getItem(KEY) || 'null') || seed;
const save = () => localStorage.setItem(KEY, JSON.stringify(habits));
const app = document.getElementById('app');

function habitsView() {
  return `<div class="toolbar"><div><h1>Today</h1><p class="sub">${habits.filter(h => h.done).length} of ${habits.length} habits done</p></div>
    <button class="primary" data-testid="new-habit">+ New habit</button></div>
  <div class="habits">${habits.map(h => `
    <div class="habit" data-id="${h.id}">
      <div class="top"><span class="name">${h.name}</span><span class="emoji">${h.emoji}</span></div>
      <div class="streak">🔥 <b>${h.streak}</b> day streak</div>
      <div class="week">${h.week.map(d => `<span class="${d ? 'on' : ''}"></span>`).join('')}</div>
      <button class="check ${h.done ? 'done' : ''}" data-check="${h.id}">${h.done ? '✓ Done today' : 'Check in'}</button>
    </div>`).join('')}</div>`;
}
function statsView() {
  const total = habits.reduce((a, h) => a + h.week.filter(Boolean).length, 0);
  const cells = Array.from({ length: 84 }, (_, i) => { const v = (Math.sin(i * 1.7) + 1) / 2; return `<span style="background:rgba(16,185,129,${(0.12 + v * 0.88).toFixed(2)})"></span>`; }).join('');
  return `<h1>Progress</h1><p class="sub">Your last 12 weeks at a glance</p>
  <div class="stats"><div class="stat"><b>${Math.max(...habits.map(h => h.streak))}</b>Longest streak</div>
  <div class="stat"><b>${total}</b>Check-ins this week</div><div class="stat"><b>${Math.round(total / (habits.length * 7) * 100)}%</b>Completion</div></div>
  <div class="heat">${cells}</div>`;
}
function render() {
  const route = location.hash.replace('#', '') || '/';
  app.innerHTML = `<div class="layout"><nav><div class="brand"><img src="/logo.svg" alt="">Pocket Habits</div>
    <a href="#/" class="${route === '/' ? 'active' : ''}">Today</a><a href="#/stats" class="${route === '/stats' ? 'active' : ''}">Progress</a></nav>
    <main>${route === '/stats' ? statsView() : habitsView()}</main></div>`;
}
app.addEventListener('click', (e) => {
  const c = e.target.closest('[data-check]');
  if (c) { const h = habits.find(x => x.id == c.dataset.check); h.done = !h.done; h.streak += h.done ? 1 : -1; h.week[6] = h.done ? 1 : 0; save(); render(); }
  if (e.target.closest('[data-testid=new-habit]')) openModal();
});
function openModal() {
  const m = document.createElement('div'); m.className = 'modal';
  let emoji = '✨';
  m.innerHTML = `<form><h2 style="margin:0">New habit</h2><input name="title" placeholder="e.g. Stretch for 5 minutes" autofocus />
    <div class="emojis">${['✨','🎸','🥗','✍️','🚲'].map(e => `<button type="button" class="${e === emoji ? 'sel' : ''}">${e}</button>`).join('')}</div>
    <button class="primary" type="submit">Create habit</button></form>`;
  m.querySelectorAll('.emojis button').forEach(b => b.onclick = () => { emoji = b.textContent; m.querySelectorAll('.emojis button').forEach(x => x.classList.toggle('sel', x === b)); });
  m.querySelector('form').onsubmit = (ev) => { ev.preventDefault(); const name = m.querySelector('input').value.trim(); if (!name) return;
    habits.unshift({ id: Date.now(), name, emoji, streak: 0, week: [0,0,0,0,0,0,0], done: false }); save(); m.remove(); render(); };
  m.onclick = (ev) => { if (ev.target === m) m.remove(); };
  document.body.appendChild(m);
}
window.addEventListener('hashchange', render);
render();
