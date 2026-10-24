import { chromium, devices } from 'playwright';
const [base, out] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
const p = await ctx.newPage();
await p.goto(base + '/results', { waitUntil: 'networkidle' });
const card = p.locator('.card', { hasText: 'איך מתחלקים 120 המנדטים?' });
await card.scrollIntoViewIfNeeded();
await card.screenshot({ path: `${out}/balance-with.png` });
await card.getByRole('tab', { name: 'עמך ישראל לא משוייכת לגוש' }).click();
await card.screenshot({ path: `${out}/balance-without.png` });
// geometry: coalition starts at the right edge, opposition at the left edge, 61 line at the middle
const g = await card.evaluate((el) => {
	const bar = el.querySelector('.bar').getBoundingClientRect();
	const segs = [...el.querySelectorAll('.seg')].map((s) => { const r = s.getBoundingClientRect(); return { t: s.title, l: Math.round(r.left - bar.left), r: Math.round(bar.right - r.right) }; });
	const mid = el.querySelector('.mid').getBoundingClientRect();
	return { w: Math.round(bar.width), first: segs[0], last: segs.at(-1), mid: Math.round(bar.right - mid.left) };
});
console.log(JSON.stringify(g));
await b.close();
