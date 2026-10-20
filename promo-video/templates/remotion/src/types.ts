// Mirrors references/storyboard.md. Paths are relative to public/ (build_remotion.mjs rewrites them
// and fills in the media/device fields marked "auto").
export type Brand = {
  primary?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  text?: string;
  muted?: string;
  font?: string;
  headingFont?: string;
};

export type Zoom = { from?: number; to?: number; focus?: [number, number] };
export type FrameKind = 'browser' | 'plain' | 'phone' | 'tablet' | 'none';
export type DeviceStyle = 'ios' | 'android';
export type Store = 'app-store' | 'google-play';

export type Media = {
  src?: string;
  from?: number;
  frame?: FrameKind;
  deviceStyle?: DeviceStyle;
  zoom?: Zoom;
  // auto (from ffprobe + captures/manifest.json)
  mediaWidth?: number;
  mediaHeight?: number;
  statusBarRatio?: number;
  topColor?: string;
  bottomColor?: string;
};

export type Scene = Media & {
  type: 'title' | 'text' | 'clip' | 'image' | 'screenshot' | 'features' | 'gallery' | 'cta';
  transition?: 'fade' | 'slide' | 'cut'; // how this scene enters (default fade)
  duration?: number;
  heading?: string;
  subheading?: string;
  badge?: string;
  kicker?: string;
  url?: string;
  button?: string;
  logo?: boolean;
  items?: (string | { text: string; icon?: string })[];
  devices?: Media[]; // gallery
  stores?: Store[];
  badges?: string[]; // official store badge images
  voiceover?: string;
  voiceoverDelay?: number;
};

export type Storyboard = {
  meta: {
    title?: string;
    width?: number;
    height?: number;
    fps?: number;
    transition?: number;
    url?: string;
    logo?: string;
    brand?: Brand;
    device?: 'desktop' | 'phone' | 'tablet';
    deviceStyle?: DeviceStyle;
    deviceColor?: string;
    statusBar?: boolean;
    homeIndicator?: boolean;
    stores?: Store[];
    music?: string | { src: string; volume?: number; start?: number };
  };
  scenes: Scene[];
};
