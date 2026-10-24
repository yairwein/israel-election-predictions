// Screenshot the trend chart on a phone for a given site. node scripts/trend-live.mjs <base> <out.png>
import { chromium, devices } from 'playwright';
const [base, out] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
const p = await ctx.newPage();
await p.goto(base + '/results', { waitUntil: 'networkidle' });
const card = p.locator('.card', { hasText: 'איך הממוצע השתנה' });
if (!(await card.count())) { console.log('trend card missing'); process.exit(1); }
await card.scrollIntoViewIfNeeded();
console.log('lines:', await card.locator('svg path').count(), '| x-axis max:', (await card.locator('svg text.tick').allTextContents()).at(-1));
await card.screenshot({ path: out });
await b.close();
