/**
 * Knesset seat allocation from vote counts, per the Knesset Elections Law:
 *  1. Lists under the threshold (3.25% of valid votes) get nothing.
 *  2. Surplus-vote agreements pair two lists; each pair competes as one unit.
 *  3. Bader–Ofer (D'Hondt) over the units for all 120 seats.
 *  4. Inside a pair, its seats are split between the two lists the same way.
 */
export const THRESHOLD = 0.0325;

export interface ListVotes { id: string; votes: number }

/** D'Hondt / Bader–Ofer: give `seats` seats to units by highest votes/(won+1), ties to more votes. */
export function dhondt(units: { key: string; votes: number }[], seats: number): Record<string, number> {
	const won: Record<string, number> = Object.fromEntries(units.map((u) => [u.key, 0]));
	for (let s = 0; s < seats; s++) {
		let best: { key: string; votes: number } | null = null;
		let bestQ = -1;
		for (const u of units) {
			const q = u.votes / (won[u.key] + 1);
			if (q > bestQ || (q === bestQ && best && u.votes > best.votes)) {
				best = u;
				bestQ = q;
			}
		}
		if (!best) break;
		won[best.key]++;
	}
	return won;
}

/**
 * @param lists      votes per list (all lists, including ones under the threshold)
 * @param agreements pairs of list ids that signed a surplus-vote agreement
 * @param total      seats to allocate (120)
 */
export function allocateKnesset(lists: ListVotes[], agreements: [string, string][], total = 120): Record<string, number> {
	const valid = lists.reduce((s, l) => s + l.votes, 0);
	const passing = lists.filter((l) => valid > 0 && l.votes >= THRESHOLD * valid);
	const pass = new Set(passing.map((l) => l.id));
	const votesOf = Object.fromEntries(passing.map((l) => [l.id, l.votes]));

	// units: a pair counts as one only if both lists passed the threshold
	const pairOf: Record<string, string> = {};
	for (const [a, b] of agreements) if (pass.has(a) && pass.has(b)) { pairOf[a] = b; pairOf[b] = a; }
	const units: { key: string; votes: number; members: string[] }[] = [];
	const done = new Set<string>();
	for (const l of passing) {
		if (done.has(l.id)) continue;
		const partner = pairOf[l.id];
		const members = partner ? [l.id, partner] : [l.id];
		members.forEach((m) => done.add(m));
		units.push({ key: members.join('+'), votes: members.reduce((s, m) => s + votesOf[m], 0), members });
	}

	const unitSeats = dhondt(units, total);
	const out: Record<string, number> = Object.fromEntries(lists.map((l) => [l.id, 0]));
	for (const u of units) {
		if (u.members.length === 1) out[u.members[0]] = unitSeats[u.key];
		else {
			const inner = dhondt(u.members.map((m) => ({ key: m, votes: votesOf[m] })), unitSeats[u.key]);
			for (const m of u.members) out[m] = inner[m];
		}
	}
	return out;
}
