import { computeAggregate, type Aggregate } from '$lib/model';
import { getRepo } from './repo';
import { lockAt, electionAt, resultsHidden, resultsHiddenUntil } from './config';

export interface Summary {
	aggregate: Aggregate | null;
	n: number;
	hidden: boolean;
	hiddenUntil: string | null;
	lockAt: string;
	electionAt: string;
	locked: boolean;
	updatedAt: string;
}

let cached: { at: number; value: Summary } | null = null;

export async function getSummary(now = new Date()): Promise<Summary> {
	if (cached && Date.now() - cached.at < 5_000) {
		return { ...cached.value, locked: now >= lockAt(), hidden: resultsHidden(now) };
	}
	const preds = await getRepo().all();
	const hidden = resultsHidden(now);
	const value: Summary = {
		aggregate: computeAggregate(preds),
		n: preds.length,
		hidden,
		hiddenUntil: resultsHiddenUntil()?.toISOString() ?? null,
		lockAt: lockAt().toISOString(),
		electionAt: electionAt().toISOString(),
		locked: now >= lockAt(),
		updatedAt: now.toISOString()
	};
	cached = { at: Date.now(), value };
	return value;
}

/** Drops the aggregate when results are hidden, so nothing leaks through the API. */
export function publicSummary(s: Summary): Summary {
	return s.hidden ? { ...s, aggregate: null } : s;
}

export function invalidateSummary() {
	cached = null;
}
