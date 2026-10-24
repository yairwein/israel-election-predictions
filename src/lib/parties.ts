/**
 * Election configuration: parties, blocs and the poll baseline.
 * Edit this file to change the ballot. Everything else derives from it.
 */

export type BlocId = 'coalition' | 'swing' | 'opposition' | 'arab';

export interface Party {
	id: string;
	he: string;
	en: string;
	leaderHe: string;
	leaderEn: string;
	color: string;
	/**
	 * coalition  – always counted in the Netanyahu bloc
	 * swing      – in the Netanyahu bloc in the "with" scenario; in the "without" scenario it is
	 *              counted separately (like the Arab parties), not in the opposition (עמך ישראל)
	 * opposition – everyone else who is not an Arab party
	 * arab       – excluded from both blocs
	 */
	bloc: BlocId;
}

export const TOTAL_SEATS = 120;
export const MAJORITY = 61;
/** 3.25% threshold ≈ 3.9 seats, so a party that passes gets at least 4. */
export const MIN_SEATS = 4;

export const PARTIES: Party[] = [
	{ id: 'likud', he: 'הליכוד', en: 'Likud', leaderHe: 'בנימין נתניהו', leaderEn: 'Benjamin Netanyahu', color: '#1f5fad', bloc: 'coalition' },
	{ id: 'shas', he: 'ש״ס', en: 'Shas', leaderHe: 'אריה דרעי', leaderEn: 'Aryeh Deri', color: '#25365f', bloc: 'coalition' },
	{ id: 'otzma', he: 'עוצמה יהודית', en: 'Otzma Yehudit', leaderHe: 'איתמר בן גביר', leaderEn: 'Itamar Ben-Gvir', color: '#e8892b', bloc: 'coalition' },
	{ id: 'rzp', he: 'הציונות הדתית', en: 'Religious Zionism', leaderHe: 'בצלאל סמוטריץ׳', leaderEn: 'Bezalel Smotrich', color: '#6f8f2f', bloc: 'coalition' },
	{ id: 'noam', he: 'נועם', en: 'Noam', leaderHe: 'אבי מעוז', leaderEn: 'Avi Maoz', color: '#8a1538', bloc: 'coalition' },
	{ id: 'utj', he: 'יהדות התורה', en: 'United Torah Judaism', leaderHe: 'יעקב אשר', leaderEn: "Ya'akov Asher", color: '#4b4f58', bloc: 'coalition' },
	{ id: 'amcha', he: 'עמך ישראל', en: 'Amcha Yisrael', leaderHe: 'עופר וינטר', leaderEn: 'Ofer Winter', color: '#c49a2c', bloc: 'swing' },
	{ id: 'yashar', he: 'ישר!', en: 'Yashar', leaderHe: 'גדי איזנקוט', leaderEn: 'Gadi Eisenkot', color: '#0f9f9a', bloc: 'opposition' },
	{ id: 'together', he: 'ביחד', en: 'Together', leaderHe: 'נפתלי בנט ויאיר לפיד', leaderEn: 'Naftali Bennett & Yair Lapid', color: '#3aa0e6', bloc: 'opposition' },
	{ id: 'democrats', he: 'הדמוקרטים', en: 'The Democrats', leaderHe: 'יאיר גולן', leaderEn: 'Yair Golan', color: '#dc2f3c', bloc: 'opposition' },
	{ id: 'yb', he: 'ישראל ביתנו', en: 'Yisrael Beiteinu', leaderHe: 'אביגדור ליברמן', leaderEn: 'Avigdor Lieberman', color: '#7b4fd6', bloc: 'opposition' },
	{ id: 'reservists', he: 'המילואימניקים', en: 'The Reservists', leaderHe: 'יועז הנדל', leaderEn: 'Yoaz Hendel', color: '#7fae2e', bloc: 'opposition' },
	{ id: 'haredi', he: 'הציבור החרדי', en: 'Haredi Public', leaderHe: 'מוטי לייטנר', leaderEn: 'Moti Leitner', color: '#e3b21b', bloc: 'opposition' },
	{ id: 'raam', he: 'רע״ם', en: "Ra'am", leaderHe: 'מנסור עבאס', leaderEn: 'Mansour Abbas', color: '#14805a', bloc: 'arab' },
	{ id: 'joint', he: 'הרשימה המשותפת', en: 'Joint List', leaderHe: 'יוסף ג׳בארין', leaderEn: 'Yousef Jabareen', color: '#b8326f', bloc: 'arab' }
];

export const PARTY_IDS = PARTIES.map((p) => p.id);
export const PARTY_BY_ID: Record<string, Party> = Object.fromEntries(PARTIES.map((p) => [p.id, p]));

export type Seats = Record<string, number>;

/**
 * Seat average of the last 12 published polls (16–22 Oct 2026, source: Wikipedia,
 * "Opinion polling for the 2026 Israeli legislative election"), allocated to 120 by
 * largest remainder among parties averaging ≥ 4. Used as a reference line and as the
 * optional starting point of the prediction form.
 */
export const POLL_AVERAGE: Seats = {
	likud: 24, shas: 8, otzma: 8, rzp: 7, noam: 0, utj: 8, amcha: 0,
	yashar: 21, together: 13, democrats: 9, yb: 7, reservists: 0, haredi: 0,
	raam: 6, joint: 9
};
export const POLL_AVERAGE_RAW: Seats = {
	likud: 23.25, shas: 8.17, otzma: 7.75, rzp: 6.75, noam: 0.3, utj: 7.5, amcha: 1.0,
	yashar: 20.83, together: 12.5, democrats: 9.08, yb: 7.08, reservists: 2.0, haredi: 0,
	raam: 5.58, joint: 8.5
};

export type ScenarioId = 'with_amcha' | 'without_amcha';

export interface Scenario {
	id: ScenarioId;
	coalition: string[];
	opposition: string[];
	arab: string[];
	/** outside both blocs but not Arab: עמך ישראל in the "without" scenario */
	unaligned: string[];
}

export function getScenarios(): Scenario[] {
	const core = PARTIES.filter((p) => p.bloc === 'coalition').map((p) => p.id);
	const swing = PARTIES.filter((p) => p.bloc === 'swing').map((p) => p.id);
	const opp = PARTIES.filter((p) => p.bloc === 'opposition').map((p) => p.id);
	const arab = PARTIES.filter((p) => p.bloc === 'arab').map((p) => p.id);
	return [
		{ id: 'with_amcha', coalition: [...core, ...swing], opposition: opp, arab, unaligned: [] },
		{ id: 'without_amcha', coalition: core, opposition: opp, arab, unaligned: swing }
	];
}

export function sumOf(seats: Seats, ids: string[]): number {
	return ids.reduce((s, id) => s + (seats[id] ?? 0), 0);
}

export function emptySeats(): Seats {
	return Object.fromEntries(PARTY_IDS.map((id) => [id, 0]));
}
