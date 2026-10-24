// OAuth redirect sign-in for in-app browsers.
//  1. Normal mobile browser: Google's popup button. X in-app browser: a plain link to /api/auth/google/start.
//  2. /start sends the browser to Google with the exact registered redirect_uri and a state cookie.
//  3. /redirect rejects a wrong state and a fake code (back to "/?signin=failed").
// Run against a server that has GOOGLE_CLIENT_SECRET set. node scripts/redirect-check.mjs <base>
import { chromium, devices } from 'playwright';
const base = process.argv[2];
const fails = [];
const X_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.70';
const b = await chromium.launch();
async function button(ua) {
	const ctx = await b.newContext({ ...devices['iPhone 13'], ...(ua ? { userAgent: ua } : {}), locale: 'he-IL' });
	await ctx.route('https://accounts.google.com/gsi/client', (r) => r.fulfill({ contentType: 'text/javascript', body: `
		window.google = { accounts: { id: { initialize() {}, renderButton(el) { el.dataset.gsi = '1'; }, prompt() {}, disableAutoSelect() {} } } };` }));
	const p = await ctx.newPage();
	await p.goto(base + '/predict', { waitUntil: 'networkidle' });
	await p.waitForTimeout(500);
	const r = await p.evaluate(() => ({ link: document.querySelector('a.glink')?.getAttribute('href') ?? null, popup: !!document.querySelector('.gbtn[data-gsi]') }));
	await ctx.close();
	return r;
}
const normal = await button(null);
const x = await button(X_UA);
console.log('mobile Safari →', JSON.stringify(normal));
console.log('X in-app      →', JSON.stringify(x));
if (!normal.popup || normal.link) fails.push('normal browser should get the Google popup button');
if (x.link !== '/api/auth/google/start?next=%2Fpredict') fails.push(`X in-app browser should get the OAuth link, got ${x.link}`);

const start = await fetch(base + '/api/auth/google/start?next=/predict', { redirect: 'manual' });
const loc = new URL(start.headers.get('location') ?? 'about:blank');
const cookies = start.headers.getSetCookie?.() ?? [];
const state = cookies.find((c) => c.startsWith('oauth_state='))?.split(';')[0].split('=')[1];
console.log('start →', start.status, loc.origin + loc.pathname, '| redirect_uri', loc.searchParams.get('redirect_uri'), '| state cookie', state ? 'set' : 'missing');
if (start.status !== 302 || loc.origin !== 'https://accounts.google.com') fails.push('start should redirect to Google');
if (!loc.searchParams.get('redirect_uri')?.endsWith('/api/auth/google/redirect')) fails.push('redirect_uri must be the exact registered address');
if (!state || loc.searchParams.get('state') !== state) fails.push('state must match the cookie');

const cb = (q, cookie) => fetch(base + '/api/auth/google/redirect?' + q, { redirect: 'manual', headers: cookie ? { cookie } : {} });
const wrong = await cb('code=x&state=wrong', `oauth_state=${state}`);
const fake = await cb(`code=fake&state=${state}`, `oauth_state=${state}`);
console.log(`callback: wrong state ${wrong.status} → ${wrong.headers.get('location')} · fake code ${fake.status} → ${fake.headers.get('location')}`);
if (wrong.headers.get('location') !== '/?signin=failed') fails.push('wrong state should fail');
if (fake.headers.get('location') !== '/?signin=failed') fails.push('fake code should fail');
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'redirect-check ok');
