import fs from 'node:fs';
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);

// build_remotion.mjs points this at the headless Chrome that Playwright already installed for
// the skill, so Remotion doesn't download its own copy (~570 MB) into every project.
try {
  const { executable } = JSON.parse(fs.readFileSync('remotion.browser.json', 'utf8'));
  if (executable && fs.existsSync(executable)) Config.setBrowserExecutable(executable);
} catch {
  // no shared browser: Remotion downloads chrome-headless-shell on first render
}
