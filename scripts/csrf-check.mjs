// Cross-site form protection: only Google's redirect sign-in may receive cross-site form posts
// (including Origin "null"); everything else must come from our own origin. JSON APIs are unaffected.
// node scripts/csrf-check.mjs <base>
const base = process.argv[2];
const own = new URL(base).origin;
const fails = [];
const form = (path, origin, extra = {}) => fetch(base + path, {
	method: 'POST', redirect: 'manual',
	headers: { 'content-type': 'application/x-www-form-urlencoded', ...(origin ? { origin } : {}), ...extra },
	body: 'credential=not-real&g_csrf_token=a'
});
const cases = [
	// Google's post, as browsers actually send it after Google's own redirects
	['google redirect, Origin null', () => form('/api/auth/google/redirect', 'null', { cookie: 'g_csrf_token=a' }), (s) => s === 303],
	['google redirect, Origin accounts.google.com', () => form('/api/auth/google/redirect', 'https://accounts.google.com', { cookie: 'g_csrf_token=a' }), (s) => s === 303],
	['google redirect, no CSRF cookie', () => form('/api/auth/google/redirect', 'null'), (s) => s === 400],
	// any other path: cross-site form posts are refused
	['other path, evil origin', () => form('/api/auth/logout', 'https://evil.example'), (s) => s === 403],
	['other path, Origin null', () => form('/api/auth/logout', 'null'), (s) => s === 403],
	['other path, no Origin', () => form('/api/auth/logout', null), (s) => s === 403],
	['other path, own origin', () => form('/api/auth/logout', own), (s) => s !== 403]
];
for (const [name, run, ok] of cases) {
	const r = await run();
	const pass = ok(r.status);
	console.log(`${pass ? 'ok  ' : 'FAIL'} ${name} → ${r.status}${r.headers.get('location') ? ' ' + r.headers.get('location') : ''}`);
	if (!pass) fails.push(name);
}
// JSON API from our own page still works (logout returns 200)
const j = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json', origin: own }, body: '{}' });
if (j.status !== 200) fails.push(`JSON logout → ${j.status}`);
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'csrf-check ok');
