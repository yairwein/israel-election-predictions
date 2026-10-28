// Reads the Central Elections Committee's national results with a real browser (the site blocks
// plain HTTP clients) and writes them to the bucket as official/latest.json for the leaderboard.
// Runs as a Cloud Run Job every few minutes (see deploy.sh). Env: GCS_BUCKET; FINAL=1 marks the final results.
import { chromium } from 'playwright';
import { Storage } from '@google-cloud/storage';

const URL = 'https://votes26.bechirot.gov.il/nationalresults?lang=he';
const LETTERS_TO_ID = {
	'מחל': 'likud', 'דרך': 'yashar', 'ודם': 'joint', 'רק': 'together', 'ג': 'utj', 'ל': 'yb', 'אמת': 'democrats',
	'ב': 'otzma', 'שס': 'shas', 'ט': 'rzp', 'עם': 'raam', 'די': 'reservists', 'ך': 'amcha', 'זך': 'haredi', 'ני': 'noam'
};
const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;

const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'he-IL', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('table tr', { timeout: 30000 });
const data = await page.evaluate(() => {
	const text = document.body.innerText;
	const after = (label) => {
		const i = text.indexOf(label);
		if (i < 0) return null;
		return text.slice(i + label.length).trim().split('\n').map((s) => s.trim()).find((s) => s);
	};
	const rows = [...document.querySelectorAll('table tr')].slice(1).map((tr) => [...tr.children].map((c) => c.textContent.trim().replace(/\s+/g, ' ')));
	return {
		asOfText: (text.match(/תוצאות נכון ל-\s*([\d/]+\s+[\d:]+)/) || [])[1] ?? null,
		eligible: after('מספר בעלי זכות בחירה'),
		votesCounted: after('קולות עד עתה'),
		ballotBoxes: after('קלפיות עד עתה'),
		validVotes: after('קולות כשרים עד עתה'),
		rows
	};
});
await b.close();

const [d, m, rest] = (data.asOfText ?? '').split('/');
const [y, hm] = (rest ?? '').split(/\s+/);
// committee time is Israel time (UTC+2 in late October)
const asOf = data.asOfText ? new Date(`${y}-${m}-${d}T${hm}:00+02:00`).toISOString() : new Date().toISOString();
const lists = data.rows.filter((r) => r.length >= 4).map(([name, letters, , votes]) => ({ id: LETTERS_TO_ID[letters] ?? null, name, letters, votes: num(votes) }));
const out = {
	asOf,
	fetchedAt: new Date().toISOString(),
	eligible: num(data.eligible),
	votesCounted: num(data.votesCounted),
	validVotes: num(data.validVotes),
	ballotBoxes: num(data.ballotBoxes),
	final: process.env.FINAL === '1',
	lists
};
if (lists.length < 10 || !out.validVotes) throw new Error(`unexpected page content (${lists.length} lists, ${out.validVotes} valid votes)`);
const tracked = lists.filter((l) => l.id).length;
if (tracked < 12) throw new Error(`only ${tracked} known parties found — ballot letters changed?`);
console.log(`as of ${out.asOf} · ${out.validVotes.toLocaleString()} valid votes · ${out.ballotBoxes} ballot boxes · ${lists.length} lists (${tracked} tracked)`);
const bucketName = process.env.GCS_BUCKET;
if (!bucketName) throw new Error('GCS_BUCKET is required');
const file = new Storage().bucket(bucketName).file('official/latest.json');
const [exists] = await file.exists();
if (exists) {
	const [cur] = await file.download();
	const prev = JSON.parse(cur.toString('utf8'));
	if (prev.final && !out.final) { console.log('final results already stored; not overwriting'); process.exit(0); }
	if (prev.asOf === out.asOf && prev.validVotes === out.validVotes) { console.log('no change'); process.exit(0); }
}
await file.save(JSON.stringify(out), { contentType: 'application/json', resumable: false, metadata: { cacheControl: 'no-store' } });
console.log('uploaded');
