// One "include extremes" toggle for the whole results page: it changes the party averages, the
// Knesset and turnout; the 61 odds stay the same; the choice is remembered. node scripts/extremes-check.mjs <base> <outdir>
import { chromium, devices } from 'playwright';
const [base, out] = process.argv.slice(2);
const fails = [];
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
const page = await ctx.newPage();
await page.goto(base + '/results', { waitUntil: 'networkidle' });
const toggles = await page.locator('.xt input[role=switch]').count();
if (toggles !== 1) fails.push(`expected exactly 1 toggle on the results page, found ${toggles}`);
const read = () => page.evaluate(() => ({
	bars: [...document.querySelectorAll('.bars .row .val b')].map((e) => e.textContent).join(','),
	turnout: document.querySelectorAll('.stat .v')[1]?.textContent?.trim(),
	odds: [...document.querySelectorAll('.odds .p')].map((e) => e.textContent).join(','),
	legend: [...document.querySelectorAll('.legend li')].map((e) => e.textContent).join(',')
}));
const off = await read();
const sw = page.locator('.xt').first();
await sw.scrollIntoViewIfNeeded();
await sw.screenshot({ path: `${out}/extremes-toggle-off.png` });
await sw.tap();
await page.waitForTimeout(300);
const on = await read();
await sw.screenshot({ path: `${out}/extremes-toggle-on.png` });
if (off.bars === on.bars) fails.push('party averages did not change with the toggle');
if (off.odds !== on.odds) fails.push('61 odds changed with the toggle (they should not)');
console.log('turnout off/on:', off.turnout, '/', on.turnout);
await page.reload({ waitUntil: 'networkidle' });
if (!(await page.locator('.xt input[role=switch]').isChecked())) fails.push('choice not remembered after reload');
await page.locator('.xt').first().tap();
await page.goto(base + '/method#extremes', { waitUntil: 'networkidle' });
if (!(await page.locator('#extremes').isVisible())) fails.push('explanation missing on /method');
await page.locator('#extremes').screenshot({ path: `${out}/extremes-method.png` });
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'extremes-check ok');
