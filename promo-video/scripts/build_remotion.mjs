#!/usr/bin/env node
// Create or refresh the Remotion project for a storyboard.
//
//   node build_remotion.mjs promo/storyboard.json [--out promo/remotion] [--no-install] [--reset-template]
//
// 1. Syncs templates/remotion into <out>. Template files you haven't edited are updated to the
//    latest skill version; files you edited are kept (pass --reset-template to overwrite them).
// 2. Runs `npm install` when node_modules is missing or package.json changed.
// 3. Copies every referenced asset into public/assets and writes public/storyboard.json with
//    paths rewritten and media/device fields filled in (size, phone/tablet + status bar from
//    captures/manifest.json, screen-edge colours for the status bar).
// 4. Generates src/fonts.generated.ts for the brand fonts (any Google Font).
//
// Then:  cd promo/remotion && npx remotion still Promo ../out/check.png --frame 90 && npm run render

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(SKILL_DIR, 'templates', 'remotion');
const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const sbPath = path.resolve(argv.find((a) => a.endsWith('.json')) || 'promo/storyboard.json');
const sbDir = path.dirname(sbPath);
const outDir = path.resolve(flag('out') || path.join(sbDir, 'remotion'));
const warn = (m) => console.error(`warning: ${m}`);

// ---------------------------------------------------------------- 1. template sync

const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name === '.DS_Store') return [];
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}
const stateFile = path.join(outDir, '.template-state.json');
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
let packageChanged = false;
const kept = [];
fs.mkdirSync(outDir, { recursive: true });
for (const rel of listFiles(TEMPLATE)) {
  if (rel === path.join('public', 'storyboard.json')) continue; // written below
  const from = path.join(TEMPLATE, rel);
  const to = path.join(outDir, rel);
  const tplHash = sha(from);
  if (fs.existsSync(to)) {
    const cur = sha(to);
    if (cur === tplHash) { state[rel] = tplHash; continue; }
    const untouched = state[rel] && cur === state[rel];
    // fonts.generated.ts is ours to regenerate; never treat it as a user edit.
    if (!untouched && !has('reset-template') && rel !== path.join('src', 'fonts.generated.ts')) { kept.push(rel); continue; }
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  state[rel] = tplHash;
  if (rel === 'package.json') packageChanged = true;
}
if (kept.length) warn(`kept your edited copies of: ${kept.join(', ')} (the skill template has changed; use --reset-template to take the new version)`);

// ---------------------------------------------------------------- 2. install

const nodeModules = path.join(outDir, 'node_modules');
if ((!fs.existsSync(nodeModules) || packageChanged) && !has('no-install')) {
  console.error('[build] npm install (first run downloads ~250 MB)…');
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: outDir, stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) { console.error('npm install failed'); process.exit(1); }
}

// Share Playwright's chrome-headless-shell with Remotion instead of downloading another one.
function sharedBrowser() {
  try {
    const req = createRequire(path.join(SKILL_DIR, 'package.json'));
    const pwCore = path.dirname(req.resolve('playwright-core/package.json'));
    const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(pwCore, '.local-browsers'),
      path.join(process.env.HOME || '', 'Library', 'Caches', 'ms-playwright'), path.join(process.env.HOME || '', '.cache', 'ms-playwright'),
      path.join(process.env.LOCALAPPDATA || '', 'ms-playwright')].filter(Boolean);
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse();
      for (const d of dirs) {
        for (const sub of fs.readdirSync(path.join(root, d))) {
          for (const exe of ['chrome-headless-shell', 'chrome-headless-shell.exe']) {
            const p = path.join(root, d, sub, exe);
            if (fs.existsSync(p)) return p;
          }
        }
      }
    }
  } catch {}
  return null;
}
const browserExe = sharedBrowser();
fs.writeFileSync(path.join(outDir, 'remotion.browser.json'), JSON.stringify({ executable: browserExe }, null, 2) + '\n');
if (!browserExe) warn('Playwright headless shell not found; Remotion will download its own Chrome (~570 MB) on first render');

// ---------------------------------------------------------------- 3. assets + media metadata

const pub = path.join(outDir, 'public');
fs.mkdirSync(path.join(pub, 'assets'), { recursive: true });
const sb = JSON.parse(fs.readFileSync(sbPath, 'utf8'));
const copied = new Map();
const asset = (p) => {
  if (!p || /^https?:/.test(p)) return p;
  const abs = path.resolve(sbDir, p);
  if (copied.has(abs)) return copied.get(abs);
  if (!fs.existsSync(abs)) throw new Error(`Asset not found: ${p} (looked for ${abs})`);
  let name = path.basename(abs).replace(/[^\w.-]/g, '_');
  const taken = new Set(copied.values());
  for (let i = 2; taken.has(`assets/${name}`); i++) name = name.replace(/(\.\w+)$/, `-${i}$1`);
  fs.copyFileSync(abs, path.join(pub, 'assets', name));
  copied.set(abs, `assets/${name}`);
  return `assets/${name}`;
};

const probe = (abs) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', abs], { encoding: 'utf8' });
  try { const j = JSON.parse(r.stdout); return { width: j.streams[0].width, height: j.streams[0].height, duration: Number(j.format?.duration) || null }; } catch { return {}; }
};

// Average colour of the top / bottom edge of the media: drives the status bar + home indicator.
const edgeColor = (abs, at, edge) => {
  const crop = edge === 'top' ? 'crop=iw:ih*0.012:0:0' : 'crop=iw:ih*0.012:0:ih*0.988';
  const args = ['-v', 'error', ...(/\.(mp4|webm|mov|m4v)$/i.test(abs) ? ['-ss', String(at)] : []), '-i', abs, '-frames:v', '1', '-vf', `${crop},scale=1:1:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'];
  const r = spawnSync('ffmpeg', args, { maxBuffer: 1024 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < 3) return undefined;
  return '#' + [...r.stdout.subarray(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('');
};

// captures/manifest.json entries keyed by absolute file path.
const manifests = new Map();
const captureInfo = (abs) => {
  const mf = path.join(path.dirname(abs), 'manifest.json');
  if (!manifests.has(mf)) {
    let m = null;
    try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch {}
    manifests.set(mf, m);
  }
  const m = manifests.get(mf);
  const c = m?.captures?.find((x) => path.basename(x.file) === path.basename(abs));
  if (!c) return null;
  const dev = m.devices?.[c.device];
  return { ...c, viewportWidth: dev?.viewport?.width };
};

const media = (m, sceneDur, label) => {
  if (!m.src) return m;
  const abs = path.resolve(sbDir, m.src);
  const out = { ...m, src: asset(m.src) };
  const p = probe(abs);
  if (p.width) { out.mediaWidth = p.width; out.mediaHeight = p.height; }
  if (p.duration && sceneDur && p.duration - (m.from ?? 0) < sceneDur - 0.05) {
    warn(`${label}: ${m.src} has ${Math.max(0, p.duration - (m.from ?? 0)).toFixed(2)}s after from=${m.from ?? 0} but the scene lasts ${sceneDur}s; it will freeze at the end`);
  }
  const info = captureInfo(abs);
  const kind = info?.deviceKind;
  if (kind === 'phone' || kind === 'tablet') {
    if (!m.frame) out.frame = kind; // phone captures get a phone frame unless the scene says otherwise
    if (!m.deviceStyle && info.deviceStyle) out.deviceStyle = info.deviceStyle;
    if (m.statusBarRatio == null && info.viewportWidth) out.statusBarRatio = (info.statusBar || 0) / info.viewportWidth;
  }
  // Sample the edges at the start, middle and end of the part of the clip the scene shows and
  // keep the most common colour, so a brief modal/backdrop doesn't tint the whole scene.
  const span = Math.max(0.2, Math.min(sceneDur ?? 3, (p.duration ?? 99) - (m.from ?? 0)) - 0.2);
  const times = /\.(mp4|webm|mov|m4v)$/i.test(abs) ? [0.1, span / 2, span].map((t) => (m.from ?? 0) + t) : [0];
  const mode = (edge) => {
    const seen = times.map((t) => edgeColor(abs, t, edge)).filter(Boolean);
    const near = (a, b) => [1, 3, 5].every((i) => Math.abs(parseInt(a.substr(i, 2), 16) - parseInt(b.substr(i, 2), 16)) < 12);
    return seen.find((c) => seen.filter((x) => near(x, c)).length >= 2) ?? seen[1] ?? seen[0];
  };
  out.topColor ??= mode('top');
  out.bottomColor ??= mode('bottom');
  return out;
};

const meta = { ...sb.meta };
if (meta.logo) meta.logo = asset(meta.logo);
if (meta.music) meta.music = typeof meta.music === 'string' ? asset(meta.music) : { ...meta.music, src: asset(meta.music.src) };
const scenes = (sb.scenes || []).map((s, i) => {
  let o = media({ ...s }, s.duration ?? 3, `scene ${i}`);
  if (s.devices) o.devices = s.devices.map((d, k) => media({ ...d }, s.duration ?? 3, `scene ${i} device ${k}`));
  if (s.badges) o.badges = s.badges.map(asset);
  if (s.voiceover) o.voiceover = asset(s.voiceover);
  return o;
});
fs.writeFileSync(path.join(pub, 'storyboard.json'), JSON.stringify({ meta, scenes }, null, 2) + '\n');

// ---------------------------------------------------------------- 4. fonts

async function writeFonts() {
  const brand = meta.brand || {};
  const wanted = [brand.font || 'Inter', brand.headingFont || brand.font || 'Inter'];
  const req = createRequire(path.join(outDir, 'package.json'));
  let available = null;
  try {
    const mod = await import(pathToFileURL(req.resolve('@remotion/google-fonts')).href);
    available = (mod.getAvailableFonts || mod.default?.getAvailableFonts)();
  } catch (e) { warn(`could not read @remotion/google-fonts (${e.message.split('\n')[0]}); using Inter`); }
  const pick = async (family) => {
    const hit = available?.find((f) => f.fontFamily.toLowerCase() === String(family).toLowerCase());
    if (!hit) { if (available) warn(`font "${family}" is not a Google Font known to Remotion; using Inter`); return { importName: 'Inter', weights: ['400', '500', '600', '700', '800'] }; }
    let weights = ['400', '500', '600', '700', '800'];
    try {
      const fm = await import(pathToFileURL(req.resolve(`@remotion/google-fonts/${hit.importName}`)).href);
      const info = (fm.getInfo || fm.default?.getInfo)();
      const have = Object.keys(info.fonts?.normal || {});
      const inter = weights.filter((w) => have.includes(w));
      weights = inter.length ? inter : have;
    } catch {}
    return { importName: hit.importName, weights };
  };
  const body = await pick(wanted[0]);
  const heading = await pick(wanted[1]);
  const same = body.importName === heading.importName;
  const line = (n, f) => `import { loadFont as ${n} } from '@remotion/google-fonts/${f.importName}';`;
  const call = (n, f) => `${n}('normal', { weights: ${JSON.stringify(f.weights)}, subsets: ['latin'] }).fontFamily`;
  const src = [
    '// Generated by build_remotion.mjs from the storyboard brand fonts. Do not edit by hand.',
    line('loadBody', body),
    ...(same ? [] : [line('loadHeading', heading)]),
    '',
    `const body = ${call('loadBody', body)};`,
    `const heading = ${same ? 'body' : call('loadHeading', heading)};`,
    'export const fonts = { body, heading };',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'src', 'fonts.generated.ts'), src);
  return { body: body.importName, heading: heading.importName };
}
const fontInfo = fs.existsSync(nodeModules) ? await writeFonts() : { body: 'Inter (run without --no-install to resolve brand fonts)' };

fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');

const fps = meta.fps ?? 30;
const T = meta.transition ?? 0.5;
const total = scenes.reduce((a, s, i) => a + (s.duration ?? 3) - (i === 0 || s.transition === 'cut' ? 0 : T), 0);
const rel = path.relative(process.cwd(), outDir) || '.';
console.log(JSON.stringify({
  project: rel,
  size: `${meta.width ?? 1920}x${meta.height ?? 1080}@${fps}`,
  duration: Number(total.toFixed(2)),
  device: meta.device ?? 'desktop',
  scenes: scenes.map((s, i) => `${i}: ${s.type}${s.frame ? ` [${s.frame}]` : ''} ${s.duration ?? 3}s`),
  fonts: fontInfo,
  assets: [...copied.values()],
  next: [`cd ${rel}`, 'npx remotion still Promo ../out/check.png --frame 90', 'npm run render   # or render:vertical / render:square / render:landscape'],
}, null, 2));
