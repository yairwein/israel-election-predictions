import { error } from '@sveltejs/kit';

export function requireUid(locals: App.Locals): string {
	if (!locals.uid) error(401, { message: 'נדרשת התחברות', code: 'unauthorized' });
	return locals.uid;
}

/** Reject cross-site JSON writes: require same-origin JSON requests. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
	if (!request.headers.get('content-type')?.includes('application/json')) {
		error(415, { message: 'expected JSON', code: 'bad_request' });
	}
	try {
		const body = await request.json();
		if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
		return body as Record<string, unknown>;
	} catch {
		error(400, { message: 'invalid JSON', code: 'bad_request' });
	}
}

/** Tiny in-memory per-key rate limiter (per instance). */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
	const now = Date.now();
	const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	if (arr.length >= max) error(429, { message: 'יותר מדי בקשות, נסו שוב בעוד רגע', code: 'rate_limited' });
	arr.push(now);
	hits.set(key, arr);
	if (hits.size > 50_000) hits.clear();
}
