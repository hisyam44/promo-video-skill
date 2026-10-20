// Device frames: browser window, plain card, phone (iOS / Android) and tablet.
// Geometry is computed from the media's aspect ratio so the capture fills the screen exactly;
// phones/tablets add a status bar above the capture (captures exclude it, see shot-plan.md).
import React from 'react';
import type { FrameKind, DeviceStyle } from './types';

export const BAR = 46; // browser chrome height

export type FrameSpec = {
  kind: FrameKind;
  style: DeviceStyle;
  ar: number; // media width / height
  statusBarRatio: number; // status bar height / screen width (0 = none)
  topColor?: string;
  bottomColor?: string;
  bodyColor?: string;
  homeIndicator?: boolean;
  url?: string;
};

// Bezel size relative to screen width (portrait) or screen height (landscape).
const bezelK = (kind: FrameKind) => (kind === 'phone' ? 0.045 : kind === 'tablet' ? 0.035 : 0);

export type Geometry = { totalW: number; totalH: number; screenW: number; mediaH: number; statusH: number; bezel: number; landscape: boolean };

export function geometry(spec: FrameSpec, maxW: number, maxH: number): Geometry {
  const { kind, ar } = spec;
  const landscape = ar > 1;
  if (kind === 'browser') {
    const screenW = Math.min(maxW, (maxH - BAR) * ar);
    const mediaH = screenW / ar;
    return { totalW: screenW, totalH: mediaH + BAR, screenW, mediaH, statusH: 0, bezel: 0, landscape };
  }
  if (kind === 'plain' || kind === 'none') {
    const screenW = Math.min(maxW, maxH * ar);
    return { totalW: screenW, totalH: screenW / ar, screenW, mediaH: screenW / ar, statusH: 0, bezel: 0, landscape };
  }
  // phone / tablet. Unknowns: screen width w. Bezel is k * (short side of the screen).
  const k = bezelK(kind);
  const sr = landscape ? 0 : spec.statusBarRatio;
  // portrait: short side = w;  landscape: short side = media height = w / ar
  const short = (w: number) => (landscape ? w / ar : w);
  const totalW = (w: number) => w + 2 * k * short(w);
  const totalH = (w: number) => w / ar + sr * w + 2 * k * short(w);
  // Whole pixels everywhere: fractional edges show up as hairlines between status bar and app.
  const w = Math.floor(Math.min(maxW / (totalW(1)), maxH / (totalH(1))));
  const bezel = Math.round(k * short(w));
  const mediaH = Math.round(w / ar);
  const statusH = Math.round(sr * w);
  return { totalW: w + 2 * bezel, totalH: mediaH + statusH + 2 * bezel, screenW: w, mediaH, statusH, bezel, landscape };
}

const luminance = (hex?: string) => {
  if (!hex) return 0;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const [r, g, b] = (full.match(/../g) ?? ['00', '00', '00']).map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const inkOn = (bg?: string) => (luminance(bg) > 0.4 ? '#0b0b0f' : '#ffffff');

const StatusBar: React.FC<{ h: number; w: number; style: DeviceStyle; bg: string; tablet: boolean }> = ({ h, w, style, bg, tablet }) => {
  const ink = inkOn(bg);
  const fs = tablet ? h * 0.52 : style === 'ios' ? h * 0.3 : h * 0.42;
  const icon = fs * 0.85;
  const sidePad = style === 'ios' && !tablet ? w * 0.09 : w * 0.05;
  return (
    <div style={{ height: h, background: bg, display: 'flex', alignItems: style === 'ios' && !tablet ? 'center' : 'center', justifyContent: 'space-between', padding: `0 ${sidePad}px`, color: ink, fontWeight: 600, fontSize: fs, letterSpacing: '-0.01em', fontFamily: '-apple-system, "SF Pro Text", Inter, Roboto, system-ui, sans-serif', paddingTop: style === 'ios' && !tablet ? h * 0.12 : 0 }}>
      <span>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: icon * 0.35 }}>
        <svg width={icon * 1.1} height={icon * 0.8} viewBox="0 0 22 16">{[0, 1, 2, 3].map((i) => <rect key={i} x={i * 5.6} y={12 - i * 3.6} width={4} height={4 + i * 3.6} rx={1} fill={ink} />)}</svg>
        <svg width={icon * 1.05} height={icon * 0.8} viewBox="0 0 20 15"><path d="M10 14.5 L13.2 10.9 A4.6 4.6 0 0 0 6.8 10.9 Z M3.4 7.6 A9.4 9.4 0 0 1 16.6 7.6 L14.9 9.5 A6.9 6.9 0 0 0 5.1 9.5 Z M0 4.2 A14.2 14.2 0 0 1 20 4.2 L18.3 6.1 A11.7 11.7 0 0 0 1.7 6.1 Z" fill={ink} /></svg>
        <svg width={icon * 1.7} height={icon * 0.8} viewBox="0 0 30 14"><rect x={0.8} y={0.8} width={24} height={12.4} rx={3.6} fill="none" stroke={ink} strokeOpacity={0.45} strokeWidth={1.4} /><rect x={2.6} y={2.6} width={19} height={8.8} rx={2} fill={ink} /><rect x={26.4} y={4.6} width={2} height={4.8} rx={1} fill={ink} fillOpacity={0.45} /></svg>
      </span>
    </div>
  );
};

export const DeviceFrame: React.FC<{ spec: FrameSpec; g: Geometry; children: React.ReactNode; surface: string; muted: string; glow: string; style?: React.CSSProperties }> = ({ spec, g, children, surface, muted, glow, style }) => {
  const shadow = `0 50px 120px -30px rgba(0,0,0,.75), 0 0 140px -40px ${glow}`;
  if (spec.kind === 'browser') {
    return (
      <div style={{ position: 'relative', flex: 'none', width: g.totalW, height: g.totalH, borderRadius: 22, overflow: 'hidden', background: surface, boxShadow: `${shadow}, 0 0 0 1px rgba(255,255,255,.08)`, ...style }}>
        <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: 'rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <i key={c} style={{ width: 13, height: 13, borderRadius: '50%', background: c, display: 'block' }} />)}
          {spec.url && <span style={{ margin: '0 auto', transform: 'translateX(-30px)', padding: '6px 26px', borderRadius: 9, fontSize: 17, color: muted, background: 'rgba(255,255,255,.06)' }}>{spec.url}</span>}
        </div>
        <div style={{ width: g.screenW, height: g.mediaH, overflow: 'hidden', background: '#000', position: 'relative' }}>{children}</div>
      </div>
    );
  }
  if (spec.kind === 'plain' || spec.kind === 'none') {
    return <div style={{ position: 'relative', flex: 'none', width: g.totalW, height: g.totalH, borderRadius: spec.kind === 'none' ? 0 : 22, overflow: 'hidden', background: '#000', boxShadow: spec.kind === 'none' ? undefined : `${shadow}, 0 0 0 1px rgba(255,255,255,.08)`, ...style }}>{children}</div>;
  }

  // ---- phone / tablet
  const phone = spec.kind === 'phone';
  const ios = spec.style !== 'android';
  const short = Math.min(g.screenW, g.mediaH + g.statusH);
  const outerR = phone ? short * (ios ? 0.165 : 0.12) : short * 0.07;
  const innerR = Math.max(4, outerR - g.bezel * 0.9);
  const body = spec.bodyColor ?? '#1b1b20';
  const screenH = g.mediaH + g.statusH;
  const top = spec.topColor ?? '#000000';
  // Side buttons (drawn outside the body edge).
  const btn = (side: 'left' | 'right', at: number, len: number) => {
    const thick = Math.max(3, g.bezel * 0.16);
    const along = g.landscape ? g.totalW : g.totalH;
    const pos = g.landscape
      ? { top: side === 'left' ? -thick + 1 : undefined, bottom: side === 'right' ? -thick + 1 : undefined, left: along * at, width: along * len, height: thick }
      : { left: side === 'left' ? -thick + 1 : undefined, right: side === 'right' ? -thick + 1 : undefined, top: along * at, height: along * len, width: thick };
    return <div key={`${side}${at}`} style={{ position: 'absolute', ...pos, background: `linear-gradient(90deg, #2c2c33, ${body})`, borderRadius: thick }} />;
  };
  const cutout = (() => {
    if (!phone) {
      // tablet: camera dot centred in the bezel
      const d = g.bezel * 0.32;
      return g.landscape
        ? <div style={{ position: 'absolute', left: g.bezel / 2 - d / 2, top: g.totalH / 2 - d / 2, width: d, height: d, borderRadius: '50%', background: '#0a0a0c', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }} />
        : <div style={{ position: 'absolute', top: g.bezel / 2 - d / 2, left: g.totalW / 2 - d / 2, width: d, height: d, borderRadius: '50%', background: '#0a0a0c', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }} />;
    }
    if (ios) {
      const long = short * 0.31, thin = short * 0.092, gap = short * 0.03;
      return g.landscape
        ? <div style={{ position: 'absolute', left: g.bezel + gap, top: g.totalH / 2 - long / 2, width: thin, height: long, borderRadius: thin, background: '#000', zIndex: 3 }} />
        : <div style={{ position: 'absolute', top: g.bezel + gap, left: g.totalW / 2 - long / 2, width: long, height: thin, borderRadius: thin, background: '#000', zIndex: 3 }} />;
    }
    const d = short * 0.065;
    return g.landscape
      ? <div style={{ position: 'absolute', left: g.bezel + d * 0.6, top: g.totalH / 2 - d / 2, width: d, height: d, borderRadius: '50%', background: '#000', zIndex: 3 }} />
      : <div style={{ position: 'absolute', top: g.bezel + (g.statusH ? g.statusH / 2 - d / 2 : d * 0.5), left: g.totalW / 2 - d / 2, width: d, height: d, borderRadius: '50%', background: '#000', zIndex: 3 }} />;
  })();
  const homeInk = inkOn(spec.bottomColor ?? '#000000');
  return (
    <div style={{ position: 'relative', flex: 'none', width: g.totalW, height: g.totalH, ...style }}>
      {phone && (g.landscape ? [btn('left', 0.2, 0.08), btn('left', 0.3, 0.12), btn('right', 0.28, 0.16)] : [btn('left', 0.17, 0.05), btn('left', 0.25, 0.09), btn('left', 0.36, 0.09), btn('right', 0.27, 0.14)])}
      <div style={{ position: 'absolute', inset: 0, borderRadius: outerR, background: `linear-gradient(145deg, #34343c 0%, ${body} 22%, ${body} 78%, #2a2a31 100%)`, boxShadow: `${shadow}, inset 0 0 0 ${Math.max(1.5, g.bezel * 0.06)}px rgba(255,255,255,.14), inset 0 0 0 ${Math.max(3, g.bezel * 0.16)}px rgba(0,0,0,.6)` }} />
      <div style={{ position: 'absolute', left: g.bezel, top: g.bezel, width: g.screenW, height: screenH, borderRadius: innerR, overflow: 'hidden', background: top }}>
        {g.statusH > 0 && <StatusBar h={g.statusH + 1} w={g.screenW} style={ios ? 'ios' : 'android'} bg={top} tablet={!phone} />}
        <div style={{ position: 'relative', width: g.screenW, height: g.mediaH, marginTop: g.statusH > 0 ? -1 : 0, overflow: 'hidden', background: '#000' }}>{children}</div>
        {ios && spec.homeIndicator !== false && <div style={{ position: 'absolute', bottom: short * 0.016, left: '50%', width: short * (phone ? 0.34 : 0.2), height: Math.max(3, short * 0.011), transform: 'translateX(-50%)', borderRadius: 99, background: homeInk, opacity: 0.6 }} />}
      </div>
      {cutout}
    </div>
  );
};

// Generic store badges (text only; for official badge artwork pass `badges` image paths instead).
export const StoreBadge: React.FC<{ store: 'app-store' | 'google-play'; height: number }> = ({ store, height }) => {
  const small = store === 'app-store' ? 'Download on the' : 'GET IT ON';
  const big = store === 'app-store' ? 'App Store' : 'Google Play';
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', gap: height * 0.22, padding: `0 ${height * 0.38}px`, borderRadius: height * 0.22, background: '#000', border: '1.5px solid rgba(255,255,255,.55)', color: '#fff', fontFamily: '-apple-system, Inter, Roboto, system-ui, sans-serif' }}>
      {store === 'app-store'
        ? <svg width={height * 0.48} height={height * 0.48} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M8 16.5 L12 8.5 L16 16.5 M9.4 13.8 H14.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg width={height * 0.46} height={height * 0.46} viewBox="0 0 24 24"><path d="M5 3 L19 12 L5 21 Z" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" /></svg>}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontSize: height * 0.2, opacity: 0.9, letterSpacing: store === 'google-play' ? '.06em' : 0 }}>{small}</span>
        <span style={{ fontSize: height * 0.36, fontWeight: 600, letterSpacing: '-0.01em' }}>{big}</span>
      </div>
    </div>
  );
};
