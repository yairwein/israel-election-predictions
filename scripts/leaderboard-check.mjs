// Leaderboard page: official results, score + tie-breaks, no Votes26.
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
	if (!/טרם הסתיימה|תוצאות סופיות/.test(status)) fails.push(`${name}: count-status notice missing (${status?.slice(0, 60)})`);
	if (/votes26\.com|Votes26/.test(await p.content())) fails.push(`${name}: Votes26 still referenced`);
	const avg = await p.locator('.avg .big').textContent().catch(() => null);
	if (!avg || isNaN(Number(avg))) fails.push(`${name}: average score missing`);
	const rows = await p.locator('.board li:not(.avgrow)').evaluateAll((els) => els.map((li) => {
		const t = (s) => li.querySelector(s)?.textContent?.trim() ?? '';
		return { rank: Number(t('.rk')), score: Number(t('.sc')), gap: t('.tb') };
	}));
	if (rows.length < 10) fails.push(`${name}: only ${rows.length} rows`);
	for (let i = 1; i < rows.length; i++) {
		const a = rows[i - 1], c = rows[i];
		if (c.score < a.score) { fails.push(`${name}: not sorted by score at row ${i}`); break; }
		const ga = a.gap === '—' ? Infinity : Number(a.gap), gc = c.gap === '—' ? Infinity : Number(c.gap);
		if (c.score === a.score && gc < ga - 0.05) { fails.push(`${name}: tie-break 1 order wrong at row ${i}`); break; }
	}
	if (!(await p.getByText('שובר שוויון 1').count()) || !(await p.getByText('שובר שוויון 2').count())) fails.push(`${name}: tie-break rules not explained`);
	await p.screenshot({ path: `${out}/leaderboard-${name}.png`, fullPage: true });
	const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	if (over > 0) fails.push(`${name}: horizontal overflow ${over}px`);
	if (name === 'iphone') console.log(`average score ${avg}; ${rows.length} forecasters; top ${JSON.stringify(rows.slice(0, 3))}`);
	await ctx.close();
}
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'leaderboard-check ok');
