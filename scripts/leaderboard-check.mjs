// Leaderboard page (data from the Votes26 live feed).
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
	if (!/תחזית, לא תוצאה.*צפוי להשתנות/.test(status)) fails.push(`${name}: default view should be the projection with its notice (${status?.slice(0, 60)})`);
	if (!(await p.locator('iframe[src*="votes26.com/embed"]').count())) fails.push(`${name}: Votes26 embed missing in the projection view`);
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
		console.log(`projected: average score ${avg}; ${rows - 1} forecasters; top score ${scores[0]}`);
		// switch to the counted-votes view
		await p.getByRole('tab', { name: 'לפי הקולות שנספרו' }).tap();
		await p.waitForURL(/by=counted/);
		await p.waitForLoadState('networkidle');
		const st = await p.locator('.status').textContent().catch(() => '');
		if (!/חלקיות, עשויות להשתנות/.test(st)) fails.push(`counted view: notice missing (${st?.slice(0, 50)})`);
		if (await p.locator('iframe[src*="votes26.com/embed"]').count()) fails.push('counted view should not show the Votes26 embed');
		if (!(await p.locator('svg[role=img] circle').count())) fails.push('counted view: Knesset chart missing');
		const cAvg = await p.locator('.avg .big').textContent().catch(() => null);
		console.log(`counted:   average score ${cAvg}`);
		await p.screenshot({ path: `${out}/leaderboard-counted.png`, fullPage: true });
		const sel = await p.getByRole('tab', { name: 'לפי הקולות שנספרו' }).getAttribute('aria-selected');
		if (sel !== 'true') fails.push('counted tab not selected');
	}
	await ctx.close();
}
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'leaderboard-check ok');
