import { chromium, devices } from 'playwright';
const base = process.argv[2];
const b = await chromium.launch();
for (const shot of [false, true]) {
	const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
	const p = await ctx.newPage();
	await p.goto(base + '/results', { waitUntil: 'networkidle' });
	const card = p.locator('.card', { hasText: 'איך הממוצע השתנה' });
	await card.scrollIntoViewIfNeeded();
	const paths = await card.locator('svg path').count();
	if (shot) await card.screenshot({ path: '/tmp/x.png' });
	await card.locator('svg').scrollIntoViewIfNeeded();
	await p.waitForTimeout(250);
	const box = await card.locator('svg').boundingBox();
	const hit = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e?.tagName + ' ' + (e?.closest('svg') ? 'in-svg' : 'outside'); }, [box.x + box.width * 0.3, box.y + box.height * 0.5]);
	await p.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.5);
	await p.waitForTimeout(500);
	const capText = await card.locator('.axis').textContent();
	console.log('caption has אחרי:', capText.includes('אחרי'));
	console.log('screenshot first:', shot, '| element at tap point:', hit, '| box y', Math.round(box.y), '| cursor:', await card.locator('svg line.cursor').count());
	await ctx.close();
}
await b.close();
