import { chromium, devices } from 'playwright';
const [base, out] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
for (const [name, ctxOpts] of [['iphone', devices['iPhone 13']], ['android-small', { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true }], ['desktop', { viewport: { width: 1280, height: 860 } }]]) {
	const ctx = await b.newContext({ ...ctxOpts, locale: 'he-IL' });
	const p = await ctx.newPage();
	await p.goto(base + '/results', { waitUntil: 'networkidle' });
	await p.locator('.hero').screenshot({ path: `${out}/stats-${name}.png` });
	const boxes = await p.locator('.stat').evaluateAll((els) => els.map((e) => {
		const r = e.getBoundingClientRect(); const v = e.querySelector('.v').getBoundingClientRect(); const l = e.querySelector('.l').getBoundingClientRect();
		return { h: Math.round(r.height), vMid: Math.round(v.left + v.width / 2 - r.left - r.width / 2), lMid: Math.round(l.left + l.width / 2 - r.left - r.width / 2), vTop: Math.round(v.top - r.top) };
	}));
	console.log(name, JSON.stringify(boxes));
	await ctx.close();
}
await b.close();
