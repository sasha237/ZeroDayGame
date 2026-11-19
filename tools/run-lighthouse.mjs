import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = path.join(root, '.lh-tmp');
if (process.platform === 'win32') {
  mkdirSync(temporary, { recursive: true });
  process.env.TMP = process.env.TEMP = temporary;
}
const require = createRequire(import.meta.url);
const lighthouseModule = require('lighthouse');
const lighthouse = lighthouseModule.default ?? lighthouseModule;
const chromeLauncher = require('chrome-launcher');
const chrome = await chromeLauncher.launch({
  ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});
try {
  const target = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:4173/';
  const result = await lighthouse(target, {
    port: chrome.port,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    quiet: true,
    formFactor: 'desktop',
    screenEmulation: { disabled: true },
  });
  console.log(Object.fromEntries(Object.entries(result.lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)])));
} finally {
  try { await chrome.kill(); } catch (error) { console.warn(error instanceof Error ? error.message : error); }
}
