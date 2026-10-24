/**
 * The crowd model. Pure functions only (unit-tested in src/tests/model.test.ts).
 *
 * Every saved prediction is one full 120-seat Knesset. The model treats the set of
 * predictions as the crowd's belief distribution:
 *  - party seats: mean, 95% margin of error of the mean, median and 10th–90th percentile range
 *  - bloc outcomes: the share of predictions in which each outcome happens, with a
 *    95% Wilson interval. The three outcomes are mutually exclusive and always sum to 100%:
 *      coalition  – the Netanyahu bloc has 61+
 *      opposition – the non-Arab opposition has 61+
 *      neither    – nobody reaches 61 on its own (without an Arab party, and in the
 *                   "without Amcha" scenario also without Amcha Yisrael)
 */
import {
	PARTY_IDS,
	MAJORITY,
	TOTAL_SEATS,
	getScenarios,
	sumOf,
	type Seats,
	type ScenarioId
} from './parties';

/** 3.25% of 120 seats. Used only to round the average into a plausible Knesset. */
export const THRESHOLD_SEATS = 3.9;

export interface PredictionInput {
	seats: Seats;
	turnout?: number | null;
}

export interface Interval {
	lo: number;
	hi: number;
}

export interface PartyStats {
	id: string;
	mean: number;
	/** 95% margin of error of the mean (± seats) */
	margin: number;
	median: number;
	p10: number;
	p90: number;
	/** share of predictions in which the party passes the threshold */
	passShare: number;
}

export interface Outcome {
	count: number;
	share: number;
	ci: Interval;
}

export interface Spread {
	mean: number;
	median: number;
	p10: number;
	p90: number;
}

export interface ScenarioStats {
	id: ScenarioId;
	coalition: Outcome;
	opposition: Outcome;
	neither: Outcome;
	coalitionSeats: Spread;
	oppositionSeats: Spread;
	arabSeats: Spread;
	/** parties outside both blocs that are not Arab (Amcha in the "without" scenario) */
	unalignedSeats: Spread;
	/** how many predictions gave the Netanyahu bloc each number of seats (non-zero only) */
	histogram: { seats: number; count: number }[];
}

export interface Aggregate {
	n: number;
	parties: PartyStats[];
	scenarios: ScenarioStats[];
	turnout: { n: number; mean: number; margin: number; p10: number; p90: number } | null;
	/** the mean forecast rounded to a 120-seat Knesset (threshold applied) */
	meanAllocation: Seats;
}

export function mean(xs: number[]): number {
	return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Sample standard deviation. */
export function stdev(xs: number[]): number {
	if (xs.length < 2) return 0;
	const m = mean(xs);
	return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Quantile with linear interpolation (R type 7). */
export function quantile(xs: number[], q: number): number {
	if (!xs.length) return 0;
	const s = [...xs].sort((a, b) => a - b);
	const pos = (s.length - 1) * q;
	const lo = Math.floor(pos);
	const hi = Math.ceil(pos);
	return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** 95% Wilson score interval for a proportion k/n. */
export function wilson(k: number, n: number, z = 1.96): Interval {
	if (n === 0) return { lo: 0, hi: 0 };
	const p = k / n;
	const d = 1 + (z * z) / n;
	const c = (p + (z * z) / (2 * n)) / d;
	const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
	return { lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
}

function margin95(xs: number[]): number {
	return xs.length < 2 ? 0 : (1.96 * stdev(xs)) / Math.sqrt(xs.length);
}

function spread(xs: number[]): Spread {
	return { mean: mean(xs), median: quantile(xs, 0.5), p10: quantile(xs, 0.1), p90: quantile(xs, 0.9) };
}

function outcome(count: number, n: number): Outcome {
	return { count, share: n ? count / n : 0, ci: wilson(count, n) };
}

/**
 * Rounds fractional seats to a 120-seat Knesset: parties under the threshold get 0,
 * the rest are scaled to 120 and rounded by largest remainder (Hare).
 */
export function allocate(values: Seats, threshold = THRESHOLD_SEATS, total = TOTAL_SEATS): Seats {
	const ids = Object.keys(values);
	const eligible = ids.filter((id) => values[id] >= threshold);
	const out: Seats = Object.fromEntries(ids.map((id) => [id, 0]));
	const sum = eligible.reduce((s, id) => s + values[id], 0);
	if (sum <= 0) return out;
	const quotas = eligible.map((id) => ({ id, q: (values[id] * total) / sum }));
	let given = 0;
	for (const { id, q } of quotas) {
		out[id] = Math.floor(q);
		given += out[id];
	}
	quotas
		.sort((a, b) => b.q - Math.floor(b.q) - (a.q - Math.floor(a.q)))
		.slice(0, total - given)
		.forEach(({ id }) => (out[id] += 1));
	return out;
}

export function computeAggregate(preds: PredictionInput[]): Aggregate {
	const n = preds.length;

	const parties: PartyStats[] = PARTY_IDS.map((id) => {
		const xs = preds.map((p) => p.seats[id] ?? 0);
		return {
			id,
			mean: mean(xs),
			margin: margin95(xs),
			median: quantile(xs, 0.5),
			p10: quantile(xs, 0.1),
			p90: quantile(xs, 0.9),
			passShare: n ? xs.filter((x) => x > 0).length / n : 0
		};
	});

	const scenarios: ScenarioStats[] = getScenarios().map((sc) => {
		const coal = preds.map((p) => sumOf(p.seats, sc.coalition));
		const opp = preds.map((p) => sumOf(p.seats, sc.opposition));
		const arab = preds.map((p) => sumOf(p.seats, sc.arab));
		const unaligned = preds.map((p) => sumOf(p.seats, sc.unaligned));
		const c = coal.filter((x) => x >= MAJORITY).length;
		const o = opp.filter((x) => x >= MAJORITY).length;
		const counts = new Map<number, number>();
		for (const x of coal) counts.set(x, (counts.get(x) ?? 0) + 1);
		return {
			id: sc.id,
			coalition: outcome(c, n),
			opposition: outcome(o, n),
			neither: outcome(n - c - o, n),
			coalitionSeats: spread(coal),
			oppositionSeats: spread(opp),
			arabSeats: spread(arab),
			unalignedSeats: spread(unaligned),
			histogram: [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([seats, count]) => ({ seats, count }))
		};
	});

	const t = preds.map((p) => p.turnout).filter((x): x is number => typeof x === 'number');
	const turnout = t.length
		? { n: t.length, mean: mean(t), margin: margin95(t), p10: quantile(t, 0.1), p90: quantile(t, 0.9) }
		: null;

	const means: Seats = Object.fromEntries(parties.map((p) => [p.id, p.mean]));
	return { n, parties, scenarios, turnout, meanAllocation: n ? allocate(means) : Object.fromEntries(PARTY_IDS.map((id) => [id, 0])) };
}
