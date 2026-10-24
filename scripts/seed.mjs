// Seeds a dev-mode server with simulated voters: node scripts/seed.mjs http://localhost:3000 60
const base = process.argv[2] ?? 'http://localhost:3000';
const count = Number(process.argv[3] ?? 50);
// Name prefix for the simulated voters; use a different one to add more people instead of updating the same ones.
const prefix = process.argv[4] ?? 'seed';
const POLL = { likud: 23.25, shas: 8.17, otzma: 7.75, rzp: 6.75, utj: 7.5, amcha: 1.0, yashar: 20.83, together: 12.5, democrats: 9.08, yb: 7.08, reservists: 2.0, haredi: 0, raam: 5.58, joint: 8.5 };
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

function randomKnesset() {
	const lean = gauss() * 2.5; // shared swing between the blocs
	const right = new Set(['likud', 'shas', 'otzma', 'rzp', 'utj', 'amcha']);
	const raw = Object.fromEntries(Object.entries(POLL).map(([id, v]) => [id, Math.max(0, v + gauss() * Math.max(1, v * 0.15) + (right.has(id) ? lean : -lean) * (v / 60))]));
	const keep = Object.entries(raw).filter(([, v]) => v >= 3.9);
	const sum = keep.reduce((s, [, v]) => s + v, 0);
	const q = keep.map(([id, v]) => ({ id, q: (v * 120) / sum }));
	const out = Object.fromEntries(Object.keys(POLL).map((id) => [id, 0]));
	let given = 0;
	for (const { id, q: x } of q) { out[id] = Math.floor(x); given += out[id]; }
	q.sort((a, b) => (b.q % 1) - (a.q % 1)).slice(0, 120 - given).forEach(({ id }) => out[id]++);
	for (const id of Object.keys(out)) if (out[id] > 0 && out[id] < 4) { out.likud += out[id] - 4; out[id] = 4; }
	return out;
}

async function call(method, path, body, cookie) {
	const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
	if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${await r.text()}`);
	return { res: r, data: await r.json() };
}

let ok = 0;
await Promise.all(Array.from({ length: count }, async (_, i) => {
	const { res } = await call('POST', '/api/auth/dev', { name: `${prefix}${i}` });
	const cookie = res.headers.get('set-cookie').split(';')[0];
	const turnout = Math.random() < 0.7 ? Math.round((68 + gauss() * 3) * 10) / 10 : null;
	await call('PUT', '/api/me/prediction', { seats: randomKnesset(), turnout }, cookie);
	if (i % 7 === 0) await call('PUT', '/api/me/prediction', { seats: randomKnesset(), turnout }, cookie); // a changed vote
	ok++;
}));
const { data } = await call('GET', '/api/aggregate');
console.log(`seeded ${ok}; n=${data.n}`);
for (const s of data.aggregate.scenarios) console.log(s.id, 'coal', s.coalition.share.toFixed(2), 'opp', s.opposition.share.toFixed(2), 'neither', s.neither.share.toFixed(2));
