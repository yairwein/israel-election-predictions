// Party order on the prediction form: random per person, stable on revisit and after saving.
// node scripts/order-check.mjs http://localhost:3000
import { chromium, devices } from 'playwright';
const base = process.argv[2];
const fails = [];
const b = await chromium.launch();
const names = async (page) => page.locator('.parties .he').allTextContents();

async function voter(name) {
	const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
	const page = await ctx.newPage();
	await page.goto(base + '/predict', { waitUntil: 'networkidle' });
	await page.getByPlaceholder('התחברות כמצביע בדיקה (שם)').fill(name);
	const before = await page.evaluate(() => fetch('/api/me').then((r) => r.json()).then((d) => d.publicId));
	await page.locator('.devbar button[type=submit]').click();
	// wait until the page shows the new voter (sign-in reloads the data in the background)
	await page.waitForFunction((old) => !document.querySelector('.devbar')?.textContent?.includes('המצביע המקומי') || false, before, { timeout: 5000 }).catch(() => {});
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(600);
	return { ctx, page };
}

const stamp = Date.now();
const a = await voter(`order-a-${stamp}`);
const first = await names(a.page);
await a.page.getByRole('button', { name: 'להתחיל מממוצע הסקרים' }).click();
await a.page.locator('.actionbar .btn').click();
await a.page.waitForTimeout(900);
const afterSave = await names(a.page);
await a.page.reload({ waitUntil: 'networkidle' });
const afterReload = await names(a.page);
if (afterSave.join() !== first.join()) fails.push('order changed after saving');
if (afterReload.join() !== first.join()) fails.push('order changed on revisit');

// The same person on another device sees the same order.
const a2 = await voter(`order-a-${stamp}`);
if ((await names(a2.page)).join() !== first.join()) fails.push('order differs on a second device');

// Different people see different orders.
const seen = new Set([first.join()]);
for (let i = 0; i < 5; i++) {
	const v = await voter(`order-${i}-${stamp}`);
	seen.add((await names(v.page)).join());
	await v.ctx.close();
}
if (seen.size < 5) fails.push(`only ${seen.size} distinct orders among 6 people`);
console.log('person A:', first.slice(0, 5).join(' · '), '…');
console.log('distinct orders among 6 people:', seen.size);
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'order-check ok');
