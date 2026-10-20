import React from 'react';
import { Composition } from 'remotion';
import { Promo, totalFrames } from './Promo';
import type { Storyboard } from './types';
import storyboardJson from '../public/storyboard.json';

const storyboard = storyboardJson as unknown as Storyboard;
const fps = storyboard.meta.fps ?? 30;
const sized = (width: number, height: number): Storyboard => ({ ...storyboard, meta: { ...storyboard.meta, width, height } });

// Promo uses the storyboard's own size; the others reflow the same scenes for social formats.
const variants: { id: string; sb: Storyboard }[] = [
  { id: 'Promo', sb: storyboard },
  { id: 'PromoVertical', sb: sized(1080, 1920) },
  { id: 'PromoSquare', sb: sized(1080, 1080) },
  { id: 'PromoLandscape', sb: sized(1920, 1080) },
];

export const RemotionRoot: React.FC = () => (
  <>
    {variants.map(({ id, sb }) => (
      <Composition key={id} id={id} component={Promo} durationInFrames={totalFrames(sb, fps)} fps={fps}
        width={sb.meta.width ?? 1920} height={sb.meta.height ?? 1080} defaultProps={{ storyboard: sb }} />
    ))}
  </>
);
