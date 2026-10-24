// Turnout picker on a phone: slider drag, +/- , chips, clear, and that the value saves. node scripts/turnout-check.mjs http://localhost:3000 outdir
import { chromium, devices } from 'playwright';
const [base, out] = [process.argv[2], process.argv[3]];
const fails = [];
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
const page = await ctx.newPage();
await page.goto(base + '/predict', { waitUntil: 'networkidle' });
await page.getByPlaceholder('התחברות כמצביע בדיקה (שם)').fill(`turnout-${Date.now()}`);
await page.locator('.devbar button[type=submit]').click();
await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: 'להתחיל מממוצע הסקרים' }).click();
const tp = page.locator('.tp');
await tp.scrollIntoViewIfNeeded();
const val = () => tp.locator('.val').textContent();
await tp.screenshot({ path: `${out}/turnout-unset.png` });
if ((await val()) !== '—') fails.push(`initial ${await val()}`);

await tp.getByRole('button', { name: '72.5%' }).tap();
if ((await val()) !== '72.5%') fails.push(`chip → ${await val()}`);
await tp.getByRole('button', { name: 'הוספה' }).tap();
await tp.getByRole('button', { name: 'הוספה' }).tap();
if ((await val()) !== '73.5%') fails.push(`+ + → ${await val()}`);
await tp.getByRole('button', { name: 'הפחתה' }).tap();
if ((await val()) !== '73%') fails.push(`- → ${await val()}`);

// drag the slider thumb toward the right (higher)
const r = await tp.locator('input[type=range]').boundingBox();
await page.mouse.move(r.x + r.width * 0.66, r.y + r.height / 2);
await page.mouse.down();
await page.mouse.move(r.x + r.width * 0.9, r.y + r.height / 2, { steps: 8 });
await page.mouse.up();
const dragged = parseFloat(await val());
if (!(dragged > 80)) fails.push(`drag → ${await val()}`);
await tp.screenshot({ path: `${out}/turnout-set.png` });
// chips and slider agree: the lowest chip sits on the left
const order = await tp.locator('.chip.num').evaluateAll((els) => els.map((e) => ({ t: e.textContent, x: e.getBoundingClientRect().left })).sort((a, b) => a.x - b.x).map((e) => e.t));
if (order[0] !== '65%') fails.push(`chips order left→right ${order.join(',')}`);

await tp.getByRole('button', { name: '70.6%' }).tap();
await page.locator('.actionbar .btn').tap();
await page.waitForTimeout(900);
const me = await page.evaluate(() => fetch('/api/me').then((r) => r.json()));
if (me.prediction?.turnout !== 70.6) fails.push(`saved turnout ${me.prediction?.turnout}`);

await tp.getByRole('button', { name: 'בלי' }).tap();
if ((await val()) !== '—') fails.push(`clear → ${await val()}`);
await page.locator('.actionbar .btn').tap();
await page.waitForTimeout(900);
const me2 = await page.evaluate(() => fetch('/api/me').then((r) => r.json()));
if (me2.prediction?.turnout !== null) fails.push(`cleared turnout saved as ${me2.prediction?.turnout}`);
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'turnout-check ok');
