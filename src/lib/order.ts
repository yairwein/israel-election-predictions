/**
 * Per-person random party order for the prediction form, to avoid position bias.
 *
 * Each party gets a pseudo-random key from hash(seed + party id) and the list is sorted by it.
 * With the person's public id as the seed the order is random across people but the same for one
 * person on every visit and device, so updating a prediction never reshuffles the list.
 * Keys are per party, so adding a party later only inserts it and keeps everyone else's order.
 */

/** cyrb53: small, fast, well-mixed 53-bit string hash. */
export function hash53(str: string, seed = 0): number {
	let h1 = 0xdeadbeef ^ seed;
	let h2 = 0x41c6ce57 ^ seed;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function partyOrder(seed: string, ids: readonly string[]): string[] {
	const key = new Map(ids.map((id) => [id, hash53(`${seed}:${id}`)]));
	return [...ids].sort((a, b) => key.get(a)! - key.get(b)! || (a < b ? -1 : 1));
}
