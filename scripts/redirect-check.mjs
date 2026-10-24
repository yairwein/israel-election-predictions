// Redirect sign-in for in-app browsers.
//  1. Normal mobile Safari/Chrome: Google is set up in popup mode (no login_uri).
//  2. X's in-app browser (by user agent): Google is set up in redirect mode with our login_uri.
//  3. The endpoint rejects a post without a matching g_csrf_token cookie, and with a bad token
//     it sends the user back to "/?signin=failed" instead of erroring.
// node scripts/redirect-check.mjs <base>
import { chromium, devices } from 'playwright';
const base = process.argv[2];
const fails = [];
const X_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.70';
const b = await chromium.launch();

async function gsiConfig(ua) {
	const ctx = await b.newContext({ ...devices['iPhone 13'], ...(ua ? { userAgent: ua } : {}), locale: 'he-IL' });
	// stub Google's script and record what our page passes to initialize()
	await ctx.route('https://accounts.google.com/gsi/client', (r) => r.fulfill({ contentType: 'text/javascript', body: `
		window.google = { accounts: { id: {
			initialize(c) { window.__gsi = { ux_mode: c.ux_mode ?? 'popup', login_uri: c.login_uri ?? null }; },
			renderButton() {}, prompt() {}, disableAutoSelect() {} } } };` }));
	const p = await ctx.newPage();
	await p.goto(base + '/predict', { waitUntil: 'networkidle' });
	await p.waitForFunction(() => window.__gsi, null, { timeout: 8000 }).catch(() => {});
	const cfg = await p.evaluate(() => window.__gsi ?? null);
	await ctx.close();
	return cfg;
}

const normal = await gsiConfig(null);
const x = await gsiConfig(X_UA);
console.log('mobile Safari →', JSON.stringify(normal));
console.log('X in-app      →', JSON.stringify(x));
if (normal?.ux_mode !== 'popup' || normal?.login_uri) fails.push('normal browser should use the popup');
if (x?.ux_mode !== 'redirect' || !x?.login_uri?.endsWith('/api/auth/google/redirect?next=%2Fpredict')) fails.push('X in-app browser should use redirect with our login_uri');

const post = (body, cookie) => fetch(base + '/api/auth/google/redirect?next=/predict', {
	method: 'POST', redirect: 'manual',
	headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://accounts.google.com', ...(cookie ? { cookie } : {}) },
	body: new URLSearchParams(body)
});
const noCookie = await post({ credential: 'x', g_csrf_token: 'abc' });
if (noCookie.status !== 400) fails.push(`missing CSRF cookie → ${noCookie.status}, expected 400`);
const mismatch = await post({ credential: 'x', g_csrf_token: 'abc' }, 'g_csrf_token=zzz');
if (mismatch.status !== 400) fails.push(`CSRF mismatch → ${mismatch.status}, expected 400`);
const badToken = await post({ credential: 'not-a-real-token', g_csrf_token: 'abc' }, 'g_csrf_token=abc');
const loc = badToken.headers.get('location');
if (badToken.status !== 303 || loc !== '/?signin=failed') fails.push(`bad token → ${badToken.status} ${loc}`);
console.log(`endpoint: no cookie ${noCookie.status} · mismatch ${mismatch.status} · bad token ${badToken.status} → ${loc}`);
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'redirect-check ok');
