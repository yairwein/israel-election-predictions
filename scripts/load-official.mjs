// Loads the Central Elections Committee's national results by hand into the bucket for the leaderboard.
// The committee's site only serves real browsers, so this uses one (Playwright).
//   node scripts/load-official.mjs                       → read and check, write /tmp/official-results.json
//   node scripts/load-official.mjs gs://BUCKET           → also upload to official/results.json (gcloud signed in)
//   FINAL=1 node scripts/load-official.mjs gs://BUCKET   → mark as the final results (published in Reshumot)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const URL = 'https://votes26.bechirot.gov.il/nationalresults?lang=he';
const BALLOT_BOXES_TOTAL = Number(process.env.BALLOT_BOXES_TOTAL ?? 13171);
const L2I = {
	'מחל': 'likud', 'דרך': 'yashar', 'ודם': 'joint', 'רק': 'together', 'ג': 'utj', 'ל': 'yb', 'אמת': 'democrats',
	'ב': 'otzma', 'שס': 'shas', 'ט': 'rzp', 'עם': 'raam', 'די': 'reservists', 'ך': 'amcha', 'זך': 'haredi', 'ני': 'noam'
};
const num = (s) => Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;

const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'he-IL', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('table tr', { timeout: 30000 });
const { text, rows } = await page.evaluate(() => ({
	text: document.body.innerText,
	rows: [...document.querySelectorAll('table tr')].slice(1).map((tr) => [...tr.children].map((c) => c.textContent.trim().replace(/\s+/g, ' ')))
}));
await b.close();

const after = (label) => {
	const i = text.indexOf(label);
	if (i < 0) throw new Error(`"${label}" not found on the page`);
	return text.slice(i + label.length).split('\n').map((s) => s.trim()).find(Boolean);
};
const m = text.match(/תוצאות נכון ל-\s*(\d+)\/(\d+)\/(\d+)\s+(\d+:\d+)/);
if (!m) throw new Error('results time not found');
const [, d, mo, y, hm] = m;
const lists = rows.filter((r) => r.length >= 4).map(([name, letters, , votes]) => ({ id: L2I[letters] ?? null, name, letters, votes: num(votes) }));
const out = {
	asOf: `${y}-${mo}-${d}T${hm}:00+02:00`, // Israel winter time
	source: URL,
	final: process.env.FINAL === '1',
	eligible: num(after('מספר בעלי זכות בחירה')),
	votesCast: num(after('קולות עד עתה')),
	validVotes: num(after('קולות כשרים עד עתה')),
	invalidVotes: num(after('קולות פסולים עד עתה')),
	ballotBoxesCounted: num(after('קלפיות עד עתה')),
	ballotBoxesTotal: BALLOT_BOXES_TOTAL || null,
	lists
};
// sanity checks: refuse to upload anything that doesn't add up
const sum = lists.reduce((s, l) => s + l.votes, 0);
if (sum !== out.validVotes) throw new Error(`list votes add up to ${sum}, page says ${out.validVotes} valid votes`);
if (out.validVotes + out.invalidVotes !== out.votesCast) throw new Error('valid + invalid ≠ votes cast');
if (lists.filter((l) => l.id).length !== Object.keys(L2I).length) throw new Error('not all tracked parties found — ballot letters changed?');
writeFileSync('/tmp/official-results.json', JSON.stringify(out, null, 1));
console.log(`as of ${out.asOf} · ${out.ballotBoxesCounted}/${out.ballotBoxesTotal} ballot boxes · turnout ${((out.votesCast / out.eligible) * 100).toFixed(2)}% · final=${out.final}`);
const bucket = process.argv[2];
if (bucket) {
	execFileSync('gcloud', ['storage', 'cp', '/tmp/official-results.json', `${bucket.replace(/\/$/, '')}/official/results.json`, '--cache-control=no-store', '--content-type=application/json'], { stdio: 'inherit' });
	console.log('uploaded to', `${bucket}/official/results.json`);
}
