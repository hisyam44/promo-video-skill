// Overwritten by build_remotion.mjs with the storyboard's brand fonts (Google Fonts).
import { loadFont as loadBody } from '@remotion/google-fonts/Inter';

const body = loadBody('normal', { subsets: ['latin'] }).fontFamily;
export const fonts = { body, heading: body };
