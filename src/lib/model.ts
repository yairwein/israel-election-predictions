/**
 * The crowd model. Pure functions only (unit-tested in src/tests/model.test.ts).
 *
 * Every saved prediction is one full 120-seat Knesset. The model treats the set of
 * predictions as the crowd's belief distribution:
 *  - party seats and turnout: a trimmed mean by default (the highest and lowest TRIM of the predictions
 *    for that party are set aside, the rest averaged), so a few extreme predictions can't move it;
 *    the plain mean is kept too for the "include extremes" view. Plus a 95% margin, median and
 *    10th–90th percentile range
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

export interface Center {
	mean: number;
	/** 95% margin of error of that mean (± seats or points) */
	margin: number;
}

export interface PartyStats {
	id: string;
	/** trimmed mean (extremes set aside); the default everywhere */
	mean: number;
	/** 95% margin of error of the trimmed mean (± seats) */
	margin: number;
	/** plain mean of all predictions, extremes included */
	full: Center;
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
	turnout: { n: number; mean: number; margin: number; full: Center; p10: number; p90: number } | null;
	/** the trimmed-mean forecast rounded to a 120-seat Knesset (threshold applied) */
	meanAllocation: Seats;
	/** the same with plain means, extremes included */
	fullAllocation: Seats;
	/** share of predictions set aside at each end per party / for turnout */
	trim: number;
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

/** Share set aside at each end for the trimmed mean: 10% lowest + 10% highest. */
export const TRIM = 0.1;

/**
 * Trimmed mean: sort, drop floor(n·trim) values at each end, average the rest.
 * With fewer than 10 values nothing is dropped. Also returns the kept values for the margin.
 */
export function trimmed(xs: number[], trim = TRIM): { mean: number; kept: number[] } {
	const s = [...xs].sort((a, b) => a - b);
	const k = Math.floor(s.length * trim);
	const kept = k > 0 ? s.slice(k, s.length - k) : s;
	return { mean: mean(kept), kept };
}

/** 95% margin of a trimmed mean, using the winsorized standard deviation (Tukey–McLaughlin). */
export function trimmedMargin(xs: number[], trim = TRIM): number {
	const n = xs.length;
	if (n < 2) return 0;
	const s = [...xs].sort((a, b) => a - b);
	const k = Math.floor(n * trim);
	const h = n - 2 * k;
	if (h < 2) return 0;
	const w = s.map((x, i) => (i < k ? s[k] : i >= n - k ? s[n - k - 1] : x));
	// Standard error of the trimmed mean ≈ s_w / ((1 − 2γ)·√n), with γ the share actually trimmed.
	const g = k / n;
	return (1.96 * stdev(w)) / ((1 - 2 * g) * Math.sqrt(n));
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
			mean: trimmed(xs).mean,
			margin: trimmedMargin(xs),
			full: { mean: mean(xs), margin: margin95(xs) },
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
		? {
				n: t.length,
				mean: trimmed(t).mean,
				margin: trimmedMargin(t),
				full: { mean: mean(t), margin: margin95(t) },
				p10: quantile(t, 0.1),
				p90: quantile(t, 0.9)
			}
		: null;

	const empty = Object.fromEntries(PARTY_IDS.map((id) => [id, 0]));
	const means: Seats = Object.fromEntries(parties.map((p) => [p.id, p.mean]));
	const fullMeans: Seats = Object.fromEntries(parties.map((p) => [p.id, p.full.mean]));
	return {
		n,
		parties,
		scenarios,
		turnout,
		meanAllocation: n ? allocate(means) : empty,
		fullAllocation: n ? allocate(fullMeans) : empty,
		trim: TRIM
	};
}

export interface TrendPoint {
	/** number of predictions counted at this point */
	n: number;
	/** when the n-th prediction was saved */
	at: string;
	/** party averages at this point, extremes set aside (default) */
	trimmed: Seats;
	/** party averages at this point, all predictions */
	full: Seats;
}

/** Which prefix sizes to sample: every k up to 20, then evenly spaced, always the last one. */
export function trendSamples(n: number, maxPoints = 80): number[] {
	if (n <= maxPoints) return Array.from({ length: n }, (_, i) => i + 1);
	const out = new Set<number>();
	for (let k = 1; k <= 20; k++) out.add(k);
	const rest = maxPoints - 20;
	for (let i = 1; i <= rest; i++) out.add(Math.round(20 + ((n - 20) * i) / rest));
	out.add(n);
	return [...out].sort((a, b) => a - b);
}

/** Trimmed mean from a histogram of integer seat counts (same rule as `trimmed`). */
function trimmedFromHist(h: Int32Array, sum: number, k: number, cut: number): number {
	let s = sum;
	let left = cut;
	for (let v = 0; v < h.length && left > 0; v++) {
		const take = Math.min(h[v], left);
		s -= take * v;
		left -= take;
	}
	left = cut;
	for (let v = h.length - 1; v >= 0 && left > 0; v--) {
		const take = Math.min(h[v], left);
		s -= take * v;
		left -= take;
	}
	return s / (k - 2 * cut);
}

/**
 * How the party averages moved as predictions were added, in the order they were saved
 * (each person's current version). Point k is the average of the first k predictions.
 * Uses running histograms, so it is O(n · parties) and cheap even for many predictions.
 */
export function computeTrend(preds: (PredictionInput & { updatedAt: string })[], maxPoints = 80): TrendPoint[] {
	const sorted = [...preds].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
	const n = sorted.length;
	const samples = new Set(trendSamples(n, maxPoints));
	const hist: Record<string, Int32Array> = Object.fromEntries(PARTY_IDS.map((id) => [id, new Int32Array(TOTAL_SEATS + 1)]));
	const sums: Record<string, number> = Object.fromEntries(PARTY_IDS.map((id) => [id, 0]));
	const r2 = (x: number) => Math.round(x * 100) / 100;
	const out: TrendPoint[] = [];
	for (let i = 0; i < n; i++) {
		const p = sorted[i];
		for (const id of PARTY_IDS) {
			const v = Math.max(0, Math.min(TOTAL_SEATS, Math.round(p.seats[id] ?? 0)));
			hist[id][v]++;
			sums[id] += v;
		}
		const k = i + 1;
		if (!samples.has(k)) continue;
		const cut = Math.floor(k * TRIM);
		const trimmedSeats: Seats = {};
		const fullSeats: Seats = {};
		for (const id of PARTY_IDS) {
			fullSeats[id] = r2(sums[id] / k);
			trimmedSeats[id] = r2(cut > 0 ? trimmedFromHist(hist[id], sums[id], k, cut) : sums[id] / k);
		}
		out.push({ n: k, at: p.updatedAt, trimmed: trimmedSeats, full: fullSeats });
	}
	return out;
}
