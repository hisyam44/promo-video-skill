import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { fonts } from './fonts.generated';
import { DeviceFrame, geometry, inkOn, StoreBadge, type FrameSpec } from './devices';
import type { Brand, FrameKind, Media, Scene, Storyboard } from './types';

const DEFAULT_BRAND: Required<Brand> = {
  primary: '#7c5cff',
  secondary: '#22d3ee',
  background: '#08080f',
  surface: '#12121c',
  text: '#f5f6fb',
  muted: '#a3a8bd',
  font: 'Inter',
  headingFont: 'Inter',
};

// Default status-bar heights (CSS px / screen width) when a capture didn't record one.
const STATUS_RATIO = { phone: { ios: 59 / 393, android: 32 / 412 }, tablet: { ios: 24 / 820, android: 28 / 800 } };

const src = (p?: string) => (!p ? '' : /^https?:\/\//.test(p) ? p : staticFile(p));
const isVideo = (p?: string) => /\.(mp4|webm|mov|m4v)$/i.test(p ?? '');

// Frames each scene overlaps the previous one (0 for the first scene and for hard cuts).
const overlap = (sb: Storyboard, i: number, fps: number) =>
  i === 0 || sb.scenes[i].transition === 'cut' ? 0 : Math.round((sb.meta.transition ?? 0.5) * fps);

export const totalFrames = (sb: Storyboard, fps: number) =>
  Math.max(1, sb.scenes.reduce((acc, s, i) => acc + Math.round((s.duration ?? 3) * fps) - overlap(sb, i, fps), 0));

type Ctx = { brand: Required<Brand>; W: number; H: number; portrait: boolean; meta: Storyboard['meta'] };
const BrandCtx = React.createContext<Ctx>(null as unknown as Ctx);
const useBrand = () => React.useContext(BrandCtx);

// ------------------------------------------------------------------ text blocks

const Words: React.FC<{ text: string; delay?: number; size: number; weight?: number; stagger?: number; align?: 'center' | 'left' }> = ({ text, delay = 0, size, weight = 800, stagger = 3, align = 'center' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand } = useBrand();
  return (
    <h1 style={{ fontFamily: fonts.heading, fontSize: size, fontWeight: weight, lineHeight: 1.04, letterSpacing: '-0.035em', color: brand.text, margin: 0, textAlign: align }}>
      {text.split(/\s+/).map((w, i) => {
        const p = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 200, mass: 0.6 } });
        return <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 50}px)`, marginRight: '0.26em' }}>{w}</span>;
      })}
    </h1>
  );
};

const FadeUp: React.FC<{ delay?: number; children: React.ReactNode; distance?: number }> = ({ delay = 0, children, distance = 24 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)` }}>{children}</div>;
};

const Badge: React.FC<{ text: string }> = ({ text }) => {
  const { brand } = useBrand();
  return (
    <div style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 999, fontSize: 22, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: brand.primary, background: `${brand.primary}22`, border: `1px solid ${brand.primary}77` }}>
      {text}
    </div>
  );
};

const Head: React.FC<{ s: Scene; align?: 'center' | 'left' }> = ({ s, align = 'center' }) => {
  const { brand, portrait } = useBrand();
  if (!s.heading && !s.subheading && !s.badge) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: align === 'center' ? 'center' : 'flex-start', textAlign: align }}>
      {s.badge && <FadeUp delay={3}><Badge text={s.badge} /></FadeUp>}
      {s.heading && <Words text={s.heading} size={portrait ? 82 : 74} weight={750} delay={5} align={align} />}
      {s.subheading && (
        <FadeUp delay={13}>
          <p style={{ fontSize: portrait ? 38 : 32, color: brand.muted, margin: 0, maxWidth: 1300, lineHeight: 1.35 }}>{s.subheading}</p>
        </FadeUp>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ media + frames

const frameKind = (m: Media, meta: Storyboard['meta'], fallback: FrameKind = 'browser'): FrameKind =>
  m.frame ?? (meta.device === 'phone' ? 'phone' : meta.device === 'tablet' ? 'tablet' : fallback);

const specFor = (m: Media, meta: Storyboard['meta'], fallback?: FrameKind): FrameSpec => {
  const kind = frameKind(m, meta, fallback);
  const style = m.deviceStyle ?? meta.deviceStyle ?? 'ios';
  const ar = m.mediaWidth && m.mediaHeight ? m.mediaWidth / m.mediaHeight : kind === 'phone' ? 393 / 793 : kind === 'tablet' ? 820 / 1156 : 16 / 10;
  const statusBarRatio = meta.statusBar === false || (kind !== 'phone' && kind !== 'tablet') ? 0 : m.statusBarRatio ?? STATUS_RATIO[kind][style];
  return { kind, style, ar, statusBarRatio, topColor: m.topColor, bottomColor: m.bottomColor, bodyColor: meta.deviceColor, homeIndicator: meta.homeIndicator, url: meta.url };
};

const MediaFill: React.FC<{ m: Media }> = ({ m }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const z = m.zoom ?? {};
  const scale = z.from || z.to ? interpolate(frame, [0, durationInFrames], [z.from ?? 1, z.to ?? 1.12], { easing: Easing.inOut(Easing.sin), extrapolateRight: 'clamp' }) : 1;
  const [fx, fy] = z.focus ?? [0.5, 0.5];
  const style: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: m.frame === 'none' ? `${fx * 100}% ${fy * 100}%` : 'top center', transform: `scale(${scale})`, transformOrigin: `${fx * 100}% ${fy * 100}%` };
  if (isVideo(m.src)) return <OffthreadVideo src={src(m.src)} muted trimBefore={Math.round((m.from ?? 0) * fps)} style={style} />;
  return <Img src={src(m.src)} style={style} />;
};

// A framed piece of media that springs in. Phones/tablets also hover gently.
const Framed: React.FC<{ m: Media; maxW: number; maxH: number; delay?: number; fallback?: FrameKind }> = ({ m, maxW, maxH, delay = 3, fallback }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, meta } = useBrand();
  const spec = specFor(m, meta, fallback);
  const g = geometry(spec, maxW, maxH);
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.9 } });
  const { durationInFrames } = useVideoConfig();
  const device = spec.kind === 'phone' || spec.kind === 'tablet';
  const float = device ? Math.sin((frame / fps) * 1.4) * 6 : 0;
  // Phones/tablets: zoom moves the camera onto the whole device (zooming the screen content
  // would push the app's edges under the bezel). Browser/plain frames zoom into the UI.
  const z = m.zoom;
  const camera = device && z ? interpolate(frame, [0, durationInFrames], [z.from ?? 1, z.to ?? 1.1], { easing: Easing.inOut(Easing.sin), extrapolateRight: 'clamp' }) : 1;
  const origin = device && z?.focus ? `${z.focus[0] * 100}% ${z.focus[1] * 100}%` : '50% 50%';
  return (
    <DeviceFrame spec={spec} g={g} surface={brand.surface} muted={brand.muted} glow={brand.primary}
      style={{ opacity: p, transformOrigin: origin, transform: `translateY(${(1 - p) * 80 + float}px) scale(${(0.94 + 0.06 * p) * camera})` }}>
      <MediaFill m={device ? { ...m, zoom: undefined } : m} />
    </DeviceFrame>
  );
};

const isTall = (m: Media, meta: Storyboard['meta']) => {
  const spec = specFor(m, meta);
  return (spec.kind === 'phone' || spec.kind === 'tablet') && spec.ar < 1;
};

// ------------------------------------------------------------------ scenes

const Center: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 28 }) => {
  const { portrait } = useBrand();
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: portrait ? 90 : 110, gap }}>{children}</AbsoluteFill>;
};

const Logo: React.FC<{ size: number; delay?: number }> = ({ size, delay = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { meta, brand } = useBrand();
  if (!meta.logo) return null;
  const p = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 } });
  return <Img src={src(meta.logo)} style={{ width: size, height: size, objectFit: 'contain', transform: `scale(${p}) rotate(${(1 - p) * -8}deg)`, filter: `drop-shadow(0 20px 50px ${brand.primary}77)` }} />;
};

const TitleScene: React.FC<{ s: Scene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { portrait, brand, meta } = useBrand();
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.04]);
  return (
    <Center>
      <div style={{ transform: `scale(${drift})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {s.logo !== false && <Logo size={portrait ? 200 : 170} />}
        {s.kicker && <FadeUp delay={6}><Badge text={s.kicker} /></FadeUp>}
        <Words text={s.heading ?? meta.title ?? ''} size={portrait ? 120 : 132} delay={9} />
        {s.subheading && <FadeUp delay={22}><p style={{ fontSize: portrait ? 44 : 40, color: brand.muted, margin: 0, maxWidth: 1300 }}>{s.subheading}</p></FadeUp>}
      </div>
    </Center>
  );
};

const TextScene: React.FC<{ s: Scene }> = ({ s }) => {
  const { portrait, brand } = useBrand();
  return (
    <Center>
      <Words text={s.heading ?? ''} size={portrait ? 120 : 132} delay={4} />
      {s.subheading && <FadeUp delay={18}><p style={{ fontSize: portrait ? 44 : 40, color: brand.muted, margin: 0 }}>{s.subheading}</p></FadeUp>}
    </Center>
  );
};

const MediaScene: React.FC<{ s: Scene }> = ({ s }) => {
  const { W, H, portrait, meta } = useBrand();
  if (frameKind(s, meta) === 'none') {
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ overflow: 'hidden' }}><MediaFill m={{ ...s, zoom: s.zoom ?? { from: 1, to: 1.06 } }} /></AbsoluteFill>
        <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.25) 38%, transparent 60%)' }} />
        <div style={{ position: 'absolute', left: portrait ? 80 : 110, right: portrait ? 80 : 110, bottom: portrait ? 140 : 90 }}><Head s={s} align="left" /></div>
      </AbsoluteFill>
    );
  }
  const hasHead = !!(s.heading || s.subheading || s.badge);
  const pad = portrait ? 90 : 110;
  // Tall device on a landscape canvas: text left, device right (App Store style).
  if (!portrait && hasHead && isTall(s, meta)) {
    return (
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 110, padding: pad }}>
        <div style={{ flex: '0 0 40%' }}><Head s={s} align="left" /></div>
        <Framed m={s} maxW={W * 0.42} maxH={H * 0.88} />
      </AbsoluteFill>
    );
  }
  const headH = hasHead ? (portrait ? 330 : 220) : 0;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: `${pad * 0.7}px ${pad}px`, gap: portrait ? 56 : 40 }}>
      <Head s={s} />
      <Framed m={s} maxW={W * (portrait ? 0.86 : 0.8)} maxH={H - headH - pad * (hasHead ? 1.4 : 1.6)} />
    </AbsoluteFill>
  );
};

// 2-4 devices side by side (app-store style screenshot row).
const GalleryScene: React.FC<{ s: Scene }> = ({ s }) => {
  const { W, H, portrait } = useBrand();
  const list = (s.devices ?? []).slice(0, 4);
  const n = Math.max(1, list.length);
  const hasHead = !!(s.heading || s.subheading || s.badge);
  const pad = portrait ? 80 : 110;
  const gap = portrait ? 36 : 60;
  const wrap = portrait && n > 3;
  const rows = wrap ? 2 : 1;
  const perRow = wrap ? Math.ceil(n / 2) : n;
  const maxH = (H - (hasHead ? (portrait ? 330 : 220) : 0) - pad * 1.5 - gap * (rows - 1)) / rows;
  const maxW = (W * (portrait ? 0.92 : 0.86) - gap * (perRow - 1)) / perRow;
  const center = (n - 1) / 2;
  if (portrait && n === 3) {
    // Fan: big centre phone, two smaller ones tucked behind it, so a 9:16 frame stays full.
    const big = { w: W * 0.5, h: (H - (hasHead ? 330 : 0) - pad * 1.6) };
    return (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: `${pad * 0.7}px ${pad}px`, gap: 56 }}>
        <Head s={s} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: W }}>
          {[0, 2, 1].map((i) => {
            const m = list[i];
            const side = i === 1 ? 0 : i === 0 ? -1 : 1;
            return (
              <div key={i} style={{ position: side ? 'absolute' : 'relative', zIndex: side ? 1 : 2, transform: `translateX(${side * W * 0.27}px) scale(${side ? 0.8 : 1}) rotate(${side * 4}deg)`, opacity: side ? 0.9 : 1 }}>
                <Framed m={{ ...m, frame: m.frame ?? s.frame }} maxW={big.w} maxH={big.h * 0.92} delay={side ? 10 : 3} fallback="phone" />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: `${pad * 0.7}px ${pad}px`, gap: portrait ? 56 : 44 }}>
      <Head s={s} />
      <div style={{ display: 'flex', flexWrap: wrap ? 'wrap' : 'nowrap', gap, alignItems: 'center', justifyContent: 'center', maxWidth: W * 0.94 }}>
        {list.map((m, i) => {
          const lift = !wrap && n >= 3 && Math.abs(i - center) < 0.6 ? -24 : 0;
          return (
            <div key={i} style={{ transform: `translateY(${lift}px)` }}>
              <Framed m={{ ...m, frame: m.frame ?? s.frame }} maxW={maxW} maxH={maxH} delay={4 + i * 5} fallback="phone" />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const FeaturesScene: React.FC<{ s: Scene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { W, H, portrait, brand, meta } = useBrand();
  const items = s.items ?? [];
  const step = Math.min(0.45 * fps, (durationInFrames - 1.5 * fps) / Math.max(1, items.length));
  const list = (
    <div style={{ display: portrait || s.src ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: 'repeat(2, minmax(0, 560px))', gap: 22, marginTop: s.src ? 0 : 30, textAlign: 'left' }}>
      {items.map((it, k) => {
        const text = typeof it === 'string' ? it : it.text;
        const icon = typeof it === 'object' && it.icon ? it.icon : '✦';
        const p = spring({ frame: frame - 0.55 * fps - k * step, fps, config: { damping: 200 } });
        return (
          <div key={k} style={{ opacity: p, transform: `translateX(${(1 - p) * -40}px)`, display: 'flex', alignItems: 'center', gap: 20, fontSize: portrait ? 40 : 34, fontWeight: 550, color: brand.text, padding: '20px 26px', borderRadius: 18, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' }}>
            <span style={{ flex: 'none', width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 26, color: brand.background, background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})` }}>{icon}</span>
            <span>{text}</span>
          </div>
        );
      })}
    </div>
  );
  if (!s.src) return <Center><Head s={s} />{list}</Center>;
  const pad = portrait ? 90 : 110;
  const tall = isTall(s, meta);
  return (
    <AbsoluteFill style={{ flexDirection: portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: portrait ? 60 : 80, padding: pad }}>
      <div style={{ flex: portrait ? 'none' : tall ? '0 0 46%' : '0 0 38%', display: 'flex', flexDirection: 'column', gap: 36, alignItems: portrait ? 'center' : 'flex-start' }}>
        <Head s={s} align={portrait ? 'center' : 'left'} />
        {list}
      </div>
      <Framed m={s} maxW={portrait ? W * 0.88 : tall ? W * 0.36 : W * 0.5} maxH={portrait ? H * 0.42 : tall ? H * 0.86 : H - pad * 2.2} delay={9} />
    </AbsoluteFill>
  );
};

const CtaScene: React.FC<{ s: Scene }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, brand, meta, W, H } = useBrand();
  const btnIn = spring({ frame: frame - 0.8 * fps, fps, config: { damping: 10, mass: 0.5 } });
  const pulse = frame > 1.5 * fps ? 1 + 0.03 * (1 - Math.cos(((frame - 1.5 * fps) / (0.9 * fps)) * Math.PI * 2)) : 1;
  const u = s.url ?? meta.url;
  const stores = s.stores ?? meta.stores ?? [];
  const badgeH = portrait ? 96 : 84;
  const side = !!s.src && !portrait;
  const text = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: side ? 'flex-start' : 'center', textAlign: side ? 'left' : 'center', gap: 28 }}>
      {s.logo !== false && <Logo size={120} />}
      <Words text={s.heading ?? 'Try it now'} size={portrait ? 110 : s.src ? 104 : 132} delay={6} align={side ? 'left' : 'center'} />
      {s.subheading && <FadeUp delay={16}><p style={{ fontSize: portrait ? 44 : 40, color: brand.muted, margin: 0 }}>{s.subheading}</p></FadeUp>}
      {s.button && (
        <div style={{ marginTop: 18, padding: '26px 60px', borderRadius: 999, fontSize: portrait ? 44 : 38, fontWeight: 750, color: inkOn(brand.primary), background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`, boxShadow: `0 24px 70px -18px ${brand.primary}`, opacity: btnIn, transform: `scale(${btnIn * pulse})` }}>
          {s.button}
        </div>
      )}
      {(stores.length > 0 || (s.badges ?? []).length > 0) && (
        <FadeUp delay={22}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', justifyContent: side ? 'flex-start' : 'center', marginTop: 10 }}>
            {stores.map((st) => <StoreBadge key={st} store={st} height={badgeH} />)}
            {(s.badges ?? []).map((b) => <Img key={b} src={src(b)} style={{ height: badgeH }} />)}
          </div>
        </FadeUp>
      )}
      {u && <FadeUp delay={30}><div style={{ fontSize: portrait ? 36 : 30, color: brand.muted }}>{u}</div></FadeUp>}
    </div>
  );
  if (!s.src) return <Center>{text}</Center>;
  // CTA beside a device showing the app (mobile apps).
  return (
    <AbsoluteFill style={{ flexDirection: portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: portrait ? 50 : 110, padding: portrait ? 80 : 110 }}>
      {portrait && text}
      <Framed m={s} maxW={portrait ? W * 0.62 : W * 0.36} maxH={portrait ? H * 0.5 : H * 0.86} delay={4} />
      {!portrait && text}
    </AbsoluteFill>
  );
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { brand, W, H } = useBrand();
  const k = frame / durationInFrames;
  const size = Math.max(W, H) * 0.75;
  const blob = (color: string, x: number, y: number, o: number): React.CSSProperties => ({ position: 'absolute', width: size, height: size, borderRadius: '50%', background: color, filter: `blur(${size * 0.13}px)`, opacity: o, transform: `translate(${x}px, ${y}px)` });
  return (
    <AbsoluteFill style={{ background: brand.background, overflow: 'hidden' }}>
      <div style={blob(brand.primary, -W * 0.25 + k * W * 0.27, -H * 0.45 + k * H * 0.18, 0.2)} />
      <div style={blob(brand.secondary, W * 0.55 - k * W * 0.22, H * 0.35 - k * H * 0.18, 0.14)} />
      <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)' }} />
    </AbsoluteFill>
  );
};

const renderScene = (s: Scene) => {
  switch (s.type) {
    case 'title': return <TitleScene s={s} />;
    case 'text': return <TextScene s={s} />;
    case 'clip':
    case 'image':
    case 'screenshot': return <MediaScene s={s} />;
    case 'gallery': return <GalleryScene s={s} />;
    case 'features': return <FeaturesScene s={s} />;
    case 'cta': return <CtaScene s={s} />;
    default: return null;
  }
};

// ------------------------------------------------------------------ root

export const Promo: React.FC<{ storyboard: Storyboard }> = ({ storyboard }) => {
  const { fps, width: W, height: H, durationInFrames } = useVideoConfig();
  const brand = { ...DEFAULT_BRAND, ...(storyboard.meta.brand ?? {}) };
  const ctx: Ctx = { brand, W, H, portrait: H > W * 1.05, meta: storyboard.meta };
  const music = typeof storyboard.meta.music === 'string' ? { src: storyboard.meta.music } : storyboard.meta.music;
  const hasVo = storyboard.scenes.some((s) => s.voiceover);

  // Absolute start frame of each scene, matching TransitionSeries overlap.
  let acc = 0;
  const starts = storyboard.scenes.map((s, i) => { const st = acc - overlap(storyboard, i, fps); acc = st + Math.round((s.duration ?? 3) * fps); return st; });

  return (
    <BrandCtx.Provider value={ctx}>
      <AbsoluteFill style={{ fontFamily: `${fonts.body}, system-ui, sans-serif`, color: brand.text }}>
        <Background />
        <TransitionSeries>
          {storyboard.scenes.flatMap((s, i) => {
            const seq = (
              <TransitionSeries.Sequence key={`s${i}`} durationInFrames={Math.round((s.duration ?? 3) * fps)}>
                {renderScene(s)}
              </TransitionSeries.Sequence>
            );
            if (i === 0) return [seq];
            const next = s.transition ?? 'fade';
            if (next === 'cut') return [seq];
            const presentation = next === 'slide' ? slide({ direction: 'from-right' }) : fade();
            return [<TransitionSeries.Transition key={`t${i}`} presentation={presentation as ReturnType<typeof fade>} timing={linearTiming({ durationInFrames: overlap(storyboard, i, fps) })} />, seq];
          })}
        </TransitionSeries>
        {music && (
          <Audio
            src={src(music.src)}
            trimBefore={Math.round((music.start ?? 0) * fps)}
            volume={(f) => interpolate(f, [0, 0.3 * fps, durationInFrames - 1.5 * fps, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (music.volume ?? (hasVo ? 0.35 : 0.8))}
          />
        )}
        {storyboard.scenes.map((s, i) =>
          s.voiceover ? (
            <Sequence key={`vo${i}`} from={starts[i] + Math.round((s.voiceoverDelay ?? 0.25) * fps)}>
              <Audio src={src(s.voiceover)} />
            </Sequence>
          ) : null,
        )}
      </AbsoluteFill>
    </BrandCtx.Provider>
  );
};
