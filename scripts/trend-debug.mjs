import { chromium, devices } from 'playwright';
const base = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
const p = await ctx.newPage();
p.on('console', (m) => console.log('console:', m.text()));
await p.goto(base + '/results', { waitUntil: 'networkidle' });
const card = p.locator('.card', { hasText: 'איך הממוצע השתנה' });
await card.scrollIntoViewIfNeeded();
await card.locator('svg').evaluate((svg) => {
	for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointerleave', 'pointercancel', 'touchstart', 'click'])
		svg.addEventListener(t, (e) => console.log('event', t, e.pointerType ?? ''));
});
const box = await card.locator('svg').boundingBox();
await p.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.5);
await p.waitForTimeout(400);
console.log('cursor lines:', await card.locator('svg line.cursor').count());
await b.close();
