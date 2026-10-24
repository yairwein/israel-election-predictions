// The three bloc odds on the home page at phone sizes, plus an overflow check.
// node scripts/home-odds-shot.mjs <url> <outdir>
import { chromium, devices } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch();
for (const [name, opts] of [['iphone', devices['iPhone 13']], ['android-small', { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true }]]) {
	const ctx = await b.newContext({ ...opts, locale: 'he-IL' });
	const p = await ctx.newPage();
	await p.goto(url, { waitUntil: 'networkidle' });
	const el = p.locator('.summary');
	await el.scrollIntoViewIfNeeded();
	await p.locator('.visual').screenshot({ path: `${out}/home-odds-${name}.png` });
	const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	console.log(name, 'overflow', over);
	await ctx.close();
}
await b.close();
