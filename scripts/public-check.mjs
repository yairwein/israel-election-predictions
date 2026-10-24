// Production-mode check: the forecast is public; voting needs a sign-in. node scripts/public-check.mjs http://localhost:3001
const base = process.argv[2] ?? 'http://localhost:3001';
const fails = [];
const get = async (p) => { const r = await fetch(base + p, { redirect: 'manual' }); return { status: r.status, text: await r.text() }; };

for (const p of ['/', '/results', '/method', '/api/aggregate', '/predict']) {
	const r = await get(p);
	if (r.status !== 200) fails.push(`${p} → ${r.status}`);
}
const results = await get('/results');
if (!results.text.includes('מי יגיע ל-61?')) fails.push('/results does not show the bloc odds when signed out');
const agg = JSON.parse((await get('/api/aggregate')).text);
if (!agg.aggregate || agg.n < 1) fails.push('/api/aggregate has no data when signed out');
const home = await get('/');
if (!home.text.includes('googletagmanager.com/gtag/js?id=G-')) fails.push('GA tag missing in production');
const save = await fetch(base + '/api/me/prediction', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' });
if (save.status !== 401) fails.push(`anonymous save → ${save.status}, expected 401`);
const dev = await fetch(base + '/api/auth/dev', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"x"}' });
if (dev.status !== 404) fails.push(`dev login in production → ${dev.status}, expected 404`);
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'public-check ok');
