import { getScenarios, sumOf, type Seats } from './parties';

export interface BlocLine {
	key: 'coalition' | 'amcha' | 'opposition' | 'arab';
	label: string;
	seats: number;
	color: string;
}

/** Neutral bloc breakdown for sharing: the Netanyahu bloc core, עמך ישראל separately, opposition, Arab parties. */
export function blocLines(seats: Seats): BlocLine[] {
	const sc = getScenarios().find((s) => s.id === 'without_amcha')!;
	const lines: BlocLine[] = [
		{ key: 'coalition', label: 'גוש נתניהו', seats: sumOf(seats, sc.coalition), color: '#1f5fad' },
		{ key: 'amcha', label: 'עמך ישראל', seats: sumOf(seats, sc.unaligned), color: '#c49a2c' },
		{ key: 'opposition', label: 'אופוזיציה', seats: sumOf(seats, sc.opposition), color: '#0f9f9a' },
		{ key: 'arab', label: 'מפלגות ערביות', seats: sumOf(seats, sc.arab), color: '#8a93a5' }
	];
	return lines.filter((l) => l.key !== 'amcha' || l.seats > 0);
}

export function shareText(seats: Seats, nickname: string | null, mine: boolean): string {
	const l = Object.fromEntries(blocLines(seats).map((x) => [x.key, x.seats]));
	const who = mine ? 'התחזית שלי' : `התחזית של ${nickname}`;
	const amcha = l.amcha ? ` + עמך ישראל ${l.amcha}` : '';
	return `${who} לבחירות 2026: גוש נתניהו ${l.coalition}${amcha}, אופוזיציה ${l.opposition}, מפלגות ערביות ${l.arab}. מה התחזית שלכם?`;
}

export function sharePath(publicId: string, version: number): string {
	return `/p/${publicId}?v=${version}`;
}
