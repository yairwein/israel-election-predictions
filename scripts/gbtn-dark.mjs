// Screenshot the Google sign-in button (dark mode by default; pass 'light' as 3rd arg).
// node scripts/gbtn-dark.mjs <url> <out.png> [light|dark]
import { chromium, devices } from 'playwright';
const [url, out, scheme = 'dark'] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], colorScheme: scheme, locale: 'he-IL' });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
const frame = p.locator('.hero .gbtn iframe').first();
await frame.waitFor({ timeout: 15000 });
await p.waitForTimeout(1500);
const box = await frame.boundingBox();
const shot = await p.screenshot({ clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } });
(await import('node:fs')).writeFileSync(out, shot);
console.log('iframe', Math.round(box.width), 'x', Math.round(box.height));
await b.close();
