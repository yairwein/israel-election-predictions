import { describe, it, expect } from 'vitest';
import { predictionsCsv, csvField } from '../lib/csv';
import { POLL_AVERAGE } from '../lib/parties';

describe('CSV export', () => {
	const rows = [
		{ nickname: 'שועל, "ממולח"', updatedAt: '2026-10-24T10:00:00Z', version: 2, seats: POLL_AVERAGE, turnout: 70.5 },
		{ nickname: 'early', updatedAt: '2026-10-24T08:00:00Z', version: 1, seats: POLL_AVERAGE, turnout: null }
	];
	const csv = predictionsCsv(rows);
	const lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n');

	it('has a BOM, a header and one line per prediction, oldest first', () => {
		expect(csv.startsWith('\uFEFF')).toBe(true);
		expect(lines).toHaveLength(3);
		expect(lines[0].startsWith('כינוי,נשמר (שעון ישראל),גרסה,')).toBe(true);
		expect(lines[1].startsWith('early,2026-10-24 11:00,1,')).toBe(true); // Israel time (UTC+3 on 24.10)
	});
	it('quotes commas and quotes in nicknames', () => {
		expect(lines[2].startsWith('"שועל, ""ממולח""",')).toBe(true);
	});
	it('seat columns add up to 120 and bloc totals are right', () => {
		const header = lines[0].split(',');
		const turnoutCol = header.indexOf('אחוז הצבעה');
		const cells = lines[1].split(',');
		const seats = cells.slice(3, turnoutCol).map(Number);
		expect(seats.reduce((a, b) => a + b, 0)).toBe(120);
		expect(cells[turnoutCol]).toBe('');
		expect(header.slice(turnoutCol + 1)).toEqual(['גוש נתניהו', 'גוש נתניהו כולל עמך ישראל', 'אופוזיציה', 'מפלגות ערביות']);
	});
	it('never includes emails or ids', () => {
		expect(csv).not.toMatch(/@|publicId|uid/);
	});
	it('defuses spreadsheet formulas', () => {
		expect(csvField('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
		expect(csvField('-5')).toBe("'-5"); // text
		expect(csvField(-5)).toBe('-5'); // numbers stay numbers
		expect(csvField(70.5)).toBe('70.5');
	});
});
