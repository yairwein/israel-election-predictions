/** Seat positions for a parliament half-circle, ordered left → right. */
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

/** Left-to-right order used when drawing the Knesset. */
export const SPECTRUM = [
	'joint', 'raam', 'democrats', 'together', 'yashar', 'yb', 'reservists', 'haredi',
	'amcha', 'utj', 'shas', 'likud', 'rzp', 'otzma'
];
