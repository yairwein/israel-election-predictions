/** Score = total seat difference across all parties between a prediction and the result. Lower is better; 0 is perfect. */
export function seatError(pred: Record<string, number>, actual: Record<string, number>, ids: string[]): number {
	return ids.reduce((s, id) => s + Math.abs((pred[id] ?? 0) - (actual[id] ?? 0)), 0);
}

export interface Ranked<T> { rank: number; score: number; item: T }

/** Rank by score (ties share a rank, e.g. 1, 2, 2, 4), then by who saved first. */
export function rankByScore<T extends { updatedAt: string }>(items: T[], score: (t: T) => number): Ranked<T>[] {
	const scored = items.map((item) => ({ item, score: score(item) }))
		.sort((a, b) => a.score - b.score || a.item.updatedAt.localeCompare(b.item.updatedAt));
	let rank = 0;
	let prev = -1;
	return scored.map((x, i) => {
		if (x.score !== prev) { rank = i + 1; prev = x.score; }
		return { rank, score: x.score, item: x.item };
	});
}
