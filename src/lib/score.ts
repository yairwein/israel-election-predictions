/** Score = total seat difference across all parties between a prediction and the result. Lower is better; 0 is perfect. */
export function seatError(pred: Record<string, number>, actual: Record<string, number>, ids: string[]): number {
	return ids.reduce((s, id) => s + Math.abs((pred[id] ?? 0) - (actual[id] ?? 0)), 0);
}

export interface Scored<T> {
	rank: number;
	score: number;
	/** |predicted turnout − actual turnout| in points, or null when no turnout was predicted */
	turnoutGap: number | null;
	item: T;
}

/**
 * Ranking: 1) seat score (lower is better), 2) tie-break 1: predicted turnout closest to the actual
 * turnout (no turnout predicted ranks after any turnout), 3) tie-break 2: first to lock in the
 * prediction (earliest final save). Only entries equal on all three share a rank.
 */
export function rankPredictions<T extends { updatedAt: string; turnout: number | null }>(
	items: T[],
	score: (t: T) => number,
	actualTurnout: number
): Scored<T>[] {
	const scored = items.map((item) => ({
		item,
		score: score(item),
		turnoutGap: item.turnout == null ? null : Math.round(Math.abs(item.turnout - actualTurnout) * 100) / 100
	}));
	const gap = (g: number | null) => (g == null ? Number.POSITIVE_INFINITY : g);
	scored.sort((a, b) => a.score - b.score || gap(a.turnoutGap) - gap(b.turnoutGap) || a.item.updatedAt.localeCompare(b.item.updatedAt));
	let rank = 0;
	return scored.map((x, i) => {
		const p = scored[i - 1];
		if (!p || p.score !== x.score || p.turnoutGap !== x.turnoutGap || p.item.updatedAt !== x.item.updatedAt) rank = i + 1;
		return { rank, ...x };
	});
}
