/** Seat positions for a parliament half-circle, ordered left → right on screen. */
export interface SeatPoint {
	x: number;
	y: number;
}

export function hemicycle(total = 120, rows = 8, inner = 0.38): { points: SeatPoint[]; r: number } {
	const radii = Array.from({ length: rows }, (_, i) => inner + ((1 - inner) * i) / (rows - 1));
	const sumR = radii.reduce((a, b) => a + b, 0);
	const counts = radii.map((r) => Math.round((total * r) / sumR));
	counts[rows - 1] += total - counts.reduce((a, b) => a + b, 0);

	const pts: { x: number; y: number; a: number; r: number }[] = [];
	radii.forEach((r, i) => {
		const n = counts[i];
		for (let j = 0; j < n; j++) {
			const a = n === 1 ? Math.PI / 2 : Math.PI * (1 - j / (n - 1));
			pts.push({ x: r * Math.cos(a), y: -r * Math.sin(a), a, r });
		}
	});
	pts.sort((p, q) => q.a - p.a || p.r - q.r);
	const dot = ((1 - inner) / (rows - 1)) * 0.42;
	return { points: pts.map(({ x, y }) => ({ x, y })), r: dot };
}

/**
 * Political order read right → left, as in Hebrew: the right wing sits on the right of the
 * chart and the list starts there. The legend uses the same order.
 */
export const SPECTRUM_RTL = [
	'otzma', 'rzp', 'likud', 'shas', 'utj', 'amcha', 'haredi', 'reservists', 'yb',
	'yashar', 'together', 'democrats', 'raam', 'joint'
];

/** Seat colors in on-screen left → right order, so the first party of SPECTRUM_RTL lands on the far right. */
export function seatColors(seats: Record<string, number>, colorOf: (id: string) => string, empty: string, total = 120): string[] {
	const out: string[] = [];
	for (const id of [...SPECTRUM_RTL].reverse()) for (let i = 0; i < (seats[id] ?? 0); i++) out.push(colorOf(id));
	while (out.length < total) out.push(empty);
	return out.slice(0, total);
}
