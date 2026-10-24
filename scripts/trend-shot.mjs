// Screenshot the trend chart on phones; check it renders and responds to the extremes toggle.
// node scripts/trend-shot.mjs <base> <outdir>
import { chromium, devices } from 'playwright';
const [base, out] = process.argv.slice(2);
const fails = [];
const b = await chromium.launch();
for (const [name, opts] of [['iphone', devices['iPhone 13']], ['android-small', { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
	const ctx = await b.newContext({ ...opts, locale: 'he-IL' });
	const p = await ctx.newPage();
	await p.goto(base + '/results', { waitUntil: 'networkidle' });
	const card = p.locator('.card', { hasText: 'איך הממוצע השתנה' });
	if (!(await card.count())) { fails.push(`${name}: trend card missing`); continue; }
	await card.scrollIntoViewIfNeeded();
	const paths = await card.locator('svg path').count();
	if (paths < 5) fails.push(`${name}: only ${paths} lines`);
	await card.screenshot({ path: `${out}/trend-${name}.png` });
	if (name === 'iphone') {
		// touching the chart shows the values at that point, and they stay after the finger lifts.
		// (the screenshot above can scroll the page, so measure the chart again right before tapping)
		await card.locator('svg').scrollIntoViewIfNeeded();
		await p.waitForTimeout(250);
		const box = await card.locator('svg').boundingBox();
		await p.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.5);
		// the cursor is a vertical line (zero width), so wait for it to exist, not to be "visible"
		await card.locator('svg line.cursor').waitFor({ state: 'attached', timeout: 3000 }).catch(() => fails.push('touching the chart shows no readout'));
		const cap = await card.locator('.axis').textContent();
		if (!cap.includes('אחרי')) fails.push(`caption after touch: ${cap}`);
		await card.screenshot({ path: `${out}/trend-${name}-touch.png` });
		// the page's extremes switch changes the lines
		const before = await card.locator('svg path').first().getAttribute('d');
		await p.locator('.xt').first().tap();
		await p.waitForTimeout(200);
		const after = await card.locator('svg path').first().getAttribute('d');
		if (before === after) fails.push('trend lines did not change with the extremes toggle');
		await p.locator('.xt').first().tap();
		await p.waitForTimeout(200);
	}
	const lab = await card.evaluate((el) => {
		const svg = el.querySelector('svg').getBoundingClientRect();
		return [...el.querySelectorAll('text.lbl')].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent.trim(), right: r.right - svg.right }; });
	});
	const clipped = lab.filter((l) => l.right > 1);
	if (clipped.length) fails.push(`${name}: labels cut off on the right: ${clipped.map((l) => l.t).join(', ')}`);
	const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	if (over > 0) fails.push(`${name}: horizontal overflow ${over}px`);
	await ctx.close();
}
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'trend-check ok');
