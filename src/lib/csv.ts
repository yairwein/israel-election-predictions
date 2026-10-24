/**
 * Raw data export: every counted prediction as CSV. Public fields only (nickname, time, seats,
 * turnout, bloc totals) — never emails or internal ids.
 */
import { PARTY_BY_ID, getScenarios, sumOf } from './parties';
import { SPECTRUM_RTL } from './hemicycle';

export interface CsvPrediction {
	nickname: string;
	updatedAt: string;
	version: number;
	seats: Record<string, number>;
	turnout: number | null;
}

/** Quote a CSV field when needed (RFC 4180). Text that a spreadsheet would run as a formula is defused. */
export function csvField(v: string | number | null | undefined): string {
	if (v === null || v === undefined) return '';
	let s = String(v);
	if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
	return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function israelTime(iso: string): string {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
	}).formatToParts(new Date(iso));
	const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
	return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`;
}

export function predictionsCsv(preds: CsvPrediction[]): string {
	const [withAmcha, withoutAmcha] = getScenarios();
	const header = [
		'כינוי', 'נשמר (שעון ישראל)', 'גרסה',
		...SPECTRUM_RTL.map((id) => PARTY_BY_ID[id].he),
		'אחוז הצבעה',
		'גוש נתניהו', 'גוש נתניהו כולל עמך ישראל', 'אופוזיציה', 'מפלגות ערביות'
	];
	const rows = [...preds]
		.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
		.map((p) => [
			p.nickname,
			israelTime(p.updatedAt),
			p.version,
			...SPECTRUM_RTL.map((id) => p.seats[id] ?? 0),
			p.turnout,
			sumOf(p.seats, withoutAmcha.coalition),
			sumOf(p.seats, withAmcha.coalition),
			sumOf(p.seats, withAmcha.opposition),
			sumOf(p.seats, withAmcha.arab)
		]);
	// BOM so Excel opens the Hebrew correctly; CRLF line ends per RFC 4180.
	return '\uFEFF' + [header, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}
