// Leaderboard page against a local dev server whose DATA_DIR has official/latest.json.
// node scripts/leaderboard-check.mjs <base> <outdir>
import { chromium, devices } from 'playwright';
const [base, out] = process.argv.slice(2);
const fails = [];
const b = await chromium.launch();
for (const [name, opts] of [['iphone', devices['iPhone 13']], ['android-small', { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
	const ctx = await b.newContext({ ...opts, locale: 'he-IL' });
	const p = await ctx.newPage();
	await p.goto(base + '/leaderboard', { waitUntil: 'networkidle' });
	const status = await p.locator('.status').textContent().catch(() => '');
	if (!/חלקיות, עשויות להשתנות/.test(status)) fails.push(`${name}: partial-results notice missing (${status?.slice(0, 60)})`);
	const avg = await p.locator('.avg .big').textContent().catch(() => null);
	if (!avg || isNaN(Number(avg))) fails.push(`${name}: average score missing`);
	const rows = await p.locator('.board li').count();
	if (rows < 10) fails.push(`${name}: only ${rows} rows`);
	const scores = (await p.locator('.board li:not(.avgrow) .sc').allTextContents()).map(Number);
	if (scores.some((s, i) => i && s < scores[i - 1])) fails.push(`${name}: not sorted by score`);
	await p.screenshot({ path: `${out}/leaderboard-${name}.png`, fullPage: true });
	const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	if (over > 0) fails.push(`${name}: horizontal overflow ${over}px`);
	if (name === 'iphone') {
		console.log(`official: average score ${avg}; ${rows - 1} forecasters; top score ${scores[0]}`);
		// switch to the Votes26 view
		await p.getByRole('tab', { name: 'לפי תחזית Votes26' }).tap();
		await p.waitForURL(/by=votes26/);
		await p.waitForLoadState('networkidle');
		const st = await p.locator('.status').textContent().catch(() => '');
		if (!/תחזית, לא תוצאה/.test(st)) fails.push(`votes26 view: notice missing (${st?.slice(0, 50)})`);
		const v26avg = await p.locator('.avg .big').textContent().catch(() => null);
		const v26rows = await p.locator('.board li').count();
		console.log(`votes26:  average score ${v26avg}; ${v26rows - 1} forecasters`);
		if (!v26avg) fails.push('votes26 view: no average score');
		await p.screenshot({ path: `${out}/leaderboard-votes26.png`, fullPage: true });
		const sel = await p.getByRole('tab', { name: 'לפי תחזית Votes26' }).getAttribute('aria-selected');
		if (sel !== 'true') fails.push('votes26 tab not selected');
	}
	await ctx.close();
}
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'leaderboard-check ok');
