// UI smoke test + screenshots at phone/desktop sizes: node scripts/screens.mjs http://localhost:3000 out/
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';
const out = process.argv[3] ?? 'screens';
mkdirSync(out, { recursive: true });

const targets = [
	{ name: 'iphone', ctx: { ...devices['iPhone 13'] } },
	{ name: 'android-small', ctx: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
	{ name: 'desktop', ctx: { viewport: { width: 1280, height: 860 } } }
];
const pages = ['/', '/predict', '/results', '/method'];
const problems = [];

const browser = await chromium.launch();
for (const t of targets) {
	const ctx = await browser.newContext({ ...t.ctx, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
	const page = await ctx.newPage();
	page.on('pageerror', (e) => problems.push(`${t.name}: pageerror ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && !/gsi|accounts\.google/.test(m.text()) && problems.push(`${t.name}: console ${m.text()}`));
	for (const p of pages) {
		await page.goto(base + p, { waitUntil: 'networkidle' });
		await page.waitForTimeout(400);
		// horizontal overflow check: nothing may be wider than the viewport
		const overflow = await page.evaluate(() => {
			const w = document.documentElement.clientWidth;
			const bad = [];
			for (const el of document.querySelectorAll('body *')) {
				const r = el.getBoundingClientRect();
				if (r.width > 0 && (r.right > w + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed') bad.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} [${Math.round(r.left)},${Math.round(r.right)}]`);
			}
			return { scroll: document.documentElement.scrollWidth - w, bad: bad.slice(0, 5) };
		});
		if (overflow.scroll > 0 || overflow.bad.length) problems.push(`${t.name} ${p}: overflow ${overflow.scroll}px ${overflow.bad.join(' | ')}`);
		// tap targets on mobile
		if (t.ctx.isMobile) {
			const small = await page.evaluate(() =>
				[...document.querySelectorAll('button, a.btn, input')]
					.filter((el) => el.offsetParent !== null)
					.map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 20), w: r.width, h: r.height }; })
					.filter((r) => r.h < 32 || r.w < 32)
			);
			if (small.length) problems.push(`${t.name} ${p}: small tap targets ${JSON.stringify(small.slice(0, 4))}`);
		}
		const slug = p === '/' ? 'home' : p.slice(1);
		await page.screenshot({ path: `${out}/${t.name}-${slug}.png`, fullPage: true });
	}

	// interaction on /predict: start from polls, bump a party, save
	let step = '';
	const go = async (label, fn) => { step = label; await fn(); };
	if (t.name !== 'desktop') try {
		await page.goto(base + '/predict', { waitUntil: 'networkidle' });
		await go('dev-signin', async () => {
			await page.getByPlaceholder('התחברות כמצביע בדיקה (שם)').fill(`ui-${t.name}-${Date.now()}`);
			await page.locator('.devbar button[type=submit]').click({ timeout: 5000 });
			await page.waitForLoadState('networkidle');
		});
		await go('polls', () => page.getByRole('button', { name: 'להתחיל מממוצע הסקרים' }).click({ timeout: 5000 }));
		await go('dec', () => page.getByRole('button', { name: 'הפחתה להליכוד' }).click({ timeout: 5000 }));
		await go('inc', () => page.getByRole('button', { name: 'הוספה לישר!' }).click({ timeout: 5000 }));
		await page.screenshot({ path: `${out}/${t.name}-predict-editing.png` });
		const save = page.locator('.actionbar .btn');
		if (!(await save.isVisible())) problems.push(`${t.name}: mobile action bar not visible`);
		await go('save', () => save.click({ timeout: 5000 }));
		await page.waitForTimeout(800);
		await page.screenshot({ path: `${out}/${t.name}-predict-saved.png` });
		const txt = await save.textContent();
		if (!txt?.includes('נשמר')) problems.push(`${t.name}: save did not complete (${txt})`);
		// menu
		await page.goto(base + '/results', { waitUntil: 'networkidle' });
		await go('menu-open', () => page.getByRole('button', { name: 'תפריט' }).click({ timeout: 5000 }));
		await page.screenshot({ path: `${out}/${t.name}-menu.png` });
		await go('menu-close', () => page.getByRole('button', { name: 'תפריט' }).click({ timeout: 5000 }));
		await go('tab', () => page.getByRole('tab', { name: 'עמך ישראל לא משוייכת לגוש' }).first().click({ timeout: 5000 }));
		await go('toggles-in-sync', async () => {
			const states = await page.getByRole('tab', { name: 'עמך ישראל לא משוייכת לגוש' }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-selected')));
			if (states.length < 2 || states.some((x) => x !== 'true')) throw new Error(`toggles out of sync: ${states}`);
		});
		await page.screenshot({ path: `${out}/${t.name}-results-without.png`, fullPage: true });
		await go('persisted', async () => {
			await page.goto(base + '/predict', { waitUntil: 'networkidle' });
			const sel = await page.getByRole('tab', { name: 'עמך ישראל לא משוייכת לגוש' }).first().getAttribute('aria-selected');
			if (sel !== 'true') throw new Error('scenario choice not kept across pages');
			await page.getByRole('tab', { name: 'עמך ישראל בגוש נתניהו' }).first().click();
		});
	} catch (e) {
		problems.push(`${t.name}: interaction failed at ${step}: ${e.message.split('\n').slice(0, 12).join(' / ')}`);
		await page.screenshot({ path: `${out}/${t.name}-FAIL.png` });
	}
	// Hemicycle legend reads right → left from the right wing, and the chart puts the right wing on the right.
	await page.goto(base + '/results', { waitUntil: 'networkidle' });
	const lg = await page.evaluate(() => {
		const items = [...document.querySelectorAll('.legend li')].map((li) => ({ t: li.textContent, x: li.getBoundingClientRect().left }));
		const circles = [...document.querySelectorAll('svg[role=img] circle')].map((c) => ({ x: c.getBoundingClientRect().left, f: c.getAttribute('fill') }));
		circles.sort((a, b) => b.x - a.x);
		return { firstLegend: items[0]?.t, firstX: items[0]?.x, secondX: items[1]?.x, rightmostFill: circles[0]?.f };
	});
	if (!lg.firstLegend?.includes('עוצמה יהודית')) problems.push(`${t.name}: legend should start with עוצמה יהודית, got ${lg.firstLegend}`);
	if (!(lg.firstX > lg.secondX)) problems.push(`${t.name}: legend is not right-to-left`);
	if (lg.rightmostFill !== '#e8892b') problems.push(`${t.name}: rightmost seat should be עוצמה יהודית, got ${lg.rightmostFill}`);
	await ctx.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems');
