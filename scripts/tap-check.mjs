// Share buttons as a phone sees them. node scripts/tap-check.mjs http://localhost:3000 outdir
import { chromium, devices } from 'playwright';
const [base, out] = [process.argv[2], process.argv[3] ?? '/tmp'];
const fails = [];
const b = await chromium.launch();

async function signedInPredict(ctx, name) {
	const page = await ctx.newPage();
	await page.goto(base + '/predict', { waitUntil: 'networkidle' });
	await page.getByPlaceholder('התחברות כמצביע בדיקה (שם)').fill(`tap-${name}-${Date.now()}`);
	await page.locator('.devbar button[type=submit]').click();
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'להתחיל מממוצע הסקרים' }).click();
	await page.locator('.actionbar .btn').click();
	await page.waitForSelector('#share');
	return page;
}

for (const [name, dev] of [['iphone', devices['iPhone 13']], ['android', devices['Pixel 7']]]) {
	const ctx = await b.newContext({ ...dev, locale: 'he-IL' });
	// Record what the page hands to the system share sheet.
	await ctx.addInitScript(() => {
		window.__shared = [];
		navigator.canShare = (d) => true;
		navigator.share = async (d) => { window.__shared.push({ files: (d.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })), text: d.text ?? null, url: d.url ?? null }); };
	});
	const page = await signedInPredict(ctx, name);
	await page.waitForTimeout(300);

	// X: the app link opens the compose screen; Android via intent:// with the web intent as fallback.
	const xa = page.locator('#share a[aria-label="שיתוף ב-X"]');
	const app = await xa.getAttribute('data-app');
	if (name === 'android') {
		if (!/^intent:\/\/post\?message=.+#Intent;scheme=twitter;package=com\.twitter\.android;S\.browser_fallback_url=https%3A%2F%2Ftwitter\.com%2Fintent%2Ftweet.+;end$/.test(app)) fails.push(`android X app link ${app}`);
	} else if (!/^twitter:\/\/post\?message=.+/.test(app)) fails.push(`iphone X app link ${app}`);
	const msg = decodeURIComponent(new URL(app.replace(/^intent:/, 'x:').split('#')[0]).searchParams.get('message') ?? '');
	if (!msg.includes('גוש נתניהו') || !/\/p\/[A-Za-z0-9_-]+\?v=\d+$/.test(msg)) fails.push(`X message ${msg}`);
	console.log(name, 'X app link →', app.slice(0, 60));

	// Without the X app installed (as here), the page must fall back to the web intent.
	for (const [label, host] of [['שיתוף ב-X', 'twitter.com|x.com'], ['שיתוף בפייסבוק', 'facebook.com']]) {
		const a = page.locator(`#share a[aria-label="${label}"]`);
		const target = await a.getAttribute('target');
		if (target === '_blank') fails.push(`${name} ${label}: target=_blank on mobile (app links will not open)`);
		const popup = page.waitForEvent('popup', { timeout: 2500 }).then(() => true).catch(() => false);
		const seen = [];
		const onReq = (r) => { if (r.isNavigationRequest()) seen.push(r.url()); };
		page.on('request', onReq);
		const nav = page.waitForEvent('framenavigated', { predicate: (f) => host.split('|').some((h) => new URL(f.url()).hostname.endsWith(h)), timeout: 8000 })
			.then(() => true)
			.catch(() => seen.some((u) => host.split('|').some((h) => u.includes(h))));
		await a.tap();
		const [p, n] = await Promise.all([popup, nav]);
		page.off('request', onReq);
		if (p) fails.push(`${name} ${label}: opened a popup on mobile`);
		if (!n) fails.push(`${name} ${label}: did not navigate to ${host}`);
		console.log(name, label, '→', page.url().slice(0, 60));
		await page.goto(base + '/predict', { waitUntil: 'networkidle' });
		await page.waitForSelector('#share');
		await page.waitForTimeout(300);
	}

	await page.locator('#share button[aria-label="שיתוף לסטורי באינסטגרם"]').tap();
	await page.waitForTimeout(800);
	const shared = await page.evaluate(() => window.__shared);
	const s = shared.at(-1);
	if (!s || s.files.length !== 1 || s.files[0].type !== 'image/png' || s.text || s.url) fails.push(`${name} instagram share payload ${JSON.stringify(s)}`);
	console.log(name, 'instagram →', JSON.stringify(s));
	await ctx.close();
}

// In-app browser / no file sharing: the story image sheet appears instead.
{
	const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
	await ctx.addInitScript(() => { navigator.canShare = () => false; });
	const page = await signedInPredict(ctx, 'inapp');
	await page.locator('#share button[aria-label="שיתוף לסטורי באינסטגרם"]').tap();
	const img = page.locator('.sheet img');
	await img.waitFor({ timeout: 5000 }).catch(() => fails.push('fallback sheet did not open'));
	await img.evaluate((el) => el.decode()).catch(() => {});
	await page.screenshot({ path: `${out}/story-sheet.png` });
	await ctx.close();
}

// The story image itself must be portrait 1080×1920.
const html = await (await fetch(base + '/results')).text();
const r = await fetch(base + '/og/average?format=story');
const buf = Buffer.from(await r.arrayBuffer());
const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
if (w !== 1080 || h !== 1920) fails.push(`story image ${w}x${h}`);
(await import('node:fs')).writeFileSync(`${out}/story.png`, buf);
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'tap-check ok');
