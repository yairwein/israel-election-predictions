// "מפלגות קטנות" card: lists parties that pass in <90% of predictions with their pass rate, matching
// the API. node scripts/small-parties-check.mjs <base> <outdir>
import { chromium, devices } from 'playwright';
const [base, out] = process.argv.slice(2);
const fails = [];
const agg = await (await fetch(base + '/api/aggregate')).json();
const expected = agg.aggregate.parties.filter((p) => p.passShare < 0.9).sort((a, b) => b.passShare - a.passShare)
	.map((p) => `${Math.round(p.passShare * 100)}%`);
const b = await chromium.launch();
for (const [name, opts] of [['iphone', devices['iPhone 13']], ['android-small', { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
	const ctx = await b.newContext({ ...opts, locale: 'he-IL' });
	const p = await ctx.newPage();
	await p.goto(base + '/results', { waitUntil: 'networkidle' });
	const card = p.locator('.card.sp');
	if (!(await card.count())) { fails.push(`${name}: card missing`); await ctx.close(); continue; }
	await card.scrollIntoViewIfNeeded();
	const shown = await card.locator('.top b').allTextContents();
	if (shown.join() !== expected.join()) fails.push(`${name}: shows ${shown.join(',')} expected ${expected.join(',')}`);
	await card.screenshot({ path: `${out}/small-parties-${name}.png` });
	const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	if (over > 0) fails.push(`${name}: horizontal overflow ${over}px`);
	await ctx.close();
}
await b.close();
console.log('expected:', expected.join(' · '));
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'small-parties-check ok');
