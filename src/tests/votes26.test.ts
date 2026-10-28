import { describe, it, expect } from 'vitest';
import { parseVotes26 } from '../lib/server/votes26';

// Shape of https://votes26.com/api/v1/elections/26/live (trimmed), with seats/shares like the real feed.
const parties = [
	['מחל', 27, 0.2081], ['דרך', 21, 0.1706], ['ודם', 12, 0.0852], ['רק', 11, 0.0921], ['ג', 7, 0.0643], ['ל', 8, 0.0606],
	['אמת', 8, 0.0708], ['ב', 7, 0.0569], ['שס', 6, 0.0545], ['ט', 6, 0.0522], ['עם', 7, 0.0384], ['די', 0, 0.0269],
	['ך', 0, 0.0171], ['זך', 0, 0.0025], ['ני', 0, 0.0019], ['נר', 0, 0.0018]
].map(([code, seats, obs]) => ({ code, seats, obs }));
const feed = (over = {}) => ({
	updated_at_utc: '2026-10-28T05:27:40.558Z', stations_total: 12856, is_official_result: false, publishable: true,
	checkpoints: [{ stations: 6456, validObs: 2746397, parties }], ...over
});

describe('Votes26 feed', () => {
	it('reads the projection and the official count', () => {
		const v = parseVotes26(feed() as never)!;
		expect(v.projected.likud).toBe(27);
		expect(Object.values(v.projected).reduce((a, b) => a + b, 0)).toBe(120);
		expect(Object.values(v.counted).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(118);
		expect(v.counted.reservists).toBe(0); // under 3.25%
		expect(v.counted.likud).toBeGreaterThan(20);
		expect(v.stations).toBe(6456);
		expect(v.final).toBe(false);
	});
	it('ignores unpublishable or malformed data', () => {
		expect(parseVotes26(feed({ publishable: false }) as never)).toBeNull();
		expect(parseVotes26(feed({ checkpoints: [] }) as never)).toBeNull();
	});
});
