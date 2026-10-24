// The 40-seat rule end to end: API rejects >40, a stored old rule-breaking prediction is left out of
// the totals and its public page, the owner sees a notice and can fix it. Uses a local dev server and its DATA_DIR.
// node scripts/absurd-check.mjs http://localhost:3000 /tmp/elx-data
import { chromium, devices } from 'playwright';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const [base, dataDir] = process.argv.slice(2);
const fails = [];
const J = { 'content-type': 'application/json' };
const seats = { likud: 24, shas: 8, otzma: 8, rzp: 7, utj: 8, yashar: 21, together: 13, democrats: 9, yb: 7, raam: 6, joint: 9 };
const agg = () => fetch(base + '/api/aggregate').then((r) => r.json());

const name = `absurd-${Date.now()}`;
const login = await fetch(base + '/api/auth/dev', { method: 'POST', headers: J, body: JSON.stringify({ name }) });
const cookie = login.headers.get('set-cookie').split(';')[0];
const put = (s) => fetch(base + '/api/me/prediction', { method: 'PUT', headers: { ...J, cookie }, body: JSON.stringify({ seats: s, turnout: 70 }) });

// 1) API rejects 41
const r41 = await put({ ...seats, likud: 41, yashar: 4 });
const b41 = await r41.json();
if (r41.status !== 400 || b41.code !== 'above_max') fails.push(`41 seats → ${r41.status} ${b41.code}`);
// 40 is fine
if ((await put({ ...seats, likud: 40, yashar: 5 })).status !== 200) fails.push('40 seats rejected');

// 2) simulate an old rule-breaking prediction stored before the rule: edit the files directly
const me = await (await fetch(base + '/api/me', { headers: { cookie } })).json();
const pid = me.publicId;
const before = await agg();
const all120 = Object.fromEntries(Object.keys(me.prediction.seats).map((k) => [k, 0]));
all120.haredi = 120;
const usersDir = path.join(dataDir, 'users');
for (const f of readdirSync(usersDir)) {
	const fp = path.join(usersDir, f); const u = JSON.parse(readFileSync(fp, 'utf8'));
	if (u.publicId === pid) { u.prediction.seats = all120; writeFileSync(fp, JSON.stringify(u)); }
}
const idxDir = path.join(dataDir, 'index');
for (const f of readdirSync(idxDir)) {
	const fp = path.join(idxDir, f); const s = JSON.parse(readFileSync(fp, 'utf8'));
	if (s[pid]) { s[pid].seats = all120; writeFileSync(fp, JSON.stringify(s)); }
}
await new Promise((r) => setTimeout(r, 11000)); // let the server's 10s caches expire
const after = await agg();
if (after.n !== before.n - 1) fails.push(`totals n ${before.n} → ${after.n}, expected one fewer`);
const haredi = after.aggregate.parties.find((p) => p.id === 'haredi').mean;
if (haredi > 5) fails.push(`haredi mean ${haredi} — the 120 prediction is still counted`);
const pub = await fetch(base + `/p/${pid}`);
if (pub.status !== 404) fails.push(`public page of a rule-breaking prediction → ${pub.status}`);

// 3) the owner sees the notice and can fix it in the form
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
await ctx.addCookies([{ name: cookie.split('=')[0], value: cookie.split('=').slice(1).join('='), url: base }]);
const page = await ctx.newPage();
await page.goto(base + '/predict', { waitUntil: 'networkidle' });
if (!(await page.locator('.notcounted').isVisible())) fails.push('owner does not see the "not counted" notice');
if (await page.locator('#share').count()) fails.push('share card shown for a rule-breaking prediction');
await page.locator('.notcounted').screenshot({ path: '/tmp/notcounted.png' }).catch(() => {});
await page.getByRole('button', { name: 'להתחיל מממוצע הסקרים' }).click();
await page.locator('.actionbar .btn').click();
await page.waitForTimeout(1200);
if (await page.locator('.notcounted').count()) fails.push('notice still shown after fixing');
await b.close();
await new Promise((r) => setTimeout(r, 6000));
const fixed = await agg();
if (fixed.n !== before.n) fails.push(`after fixing n ${fixed.n}, expected ${before.n}`);
console.log(`n before ${before.n} · with 120-seat prediction ${after.n} · after fix ${fixed.n}`);
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'absurd-check ok');
