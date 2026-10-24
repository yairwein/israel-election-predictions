/**
 * Prediction repository on top of the object store.
 *
 * Layout
 *   users/<uid>.json            private: email, nickname, current prediction
 *   history/<uid>/<ts>.json     every submitted version, append-only ("save all votes")
 *   nicknames/<key>.json        nickname reservation (unique, case-insensitive)
 *   index/shard-<nn>.json       public projection of current predictions, sharded so
 *                               concurrent saves rarely contend (GCS: ~1 write/s/object)
 *
 * <uid> is an HMAC of the Google subject id, so object names carry no personal data.
 * Emails are stored only in users/<uid>.json and never leave the server.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { ObjectStore } from './storage/types';
import type { Seats } from '$lib/parties';
import { nicknameKey } from '$lib/validate';
import { randomNickname } from '$lib/nickname';

export const SHARDS = 16;

export interface Prediction {
	seats: Seats;
	/** predicted turnout in percent, optional */
	turnout: number | null;
	updatedAt: string;
	version: number;
}

export interface UserRecord {
	uid: string;
	publicId: string;
	email: string;
	nickname: string;
	createdAt: string;
	updatedAt: string;
	prediction: Prediction | null;
}

export interface PublicPrediction {
	publicId: string;
	nickname: string;
	seats: Seats;
	turnout: number | null;
	updatedAt: string;
	version: number;
}

type Shard = Record<string, PublicPrediction>;

export class LockedError extends Error {
	constructor() {
		super('locked');
	}
}
export class NicknameTakenError extends Error {
	constructor() {
		super('nickname_taken');
	}
}

export function uidFor(sub: string, secret: string): string {
	return createHmac('sha256', secret).update(`uid:${sub}`).digest('hex').slice(0, 32);
}

function publicIdFor(uid: string): string {
	return createHash('sha256').update(`public:${uid}`).digest('base64url').slice(0, 10);
}

function shardOf(uid: string): string {
	const h = createHash('sha256').update(uid).digest();
	return String(h.readUInt16BE(0) % SHARDS).padStart(2, '0');
}

function nickPath(nick: string): string {
	return `nicknames/${createHash('sha256').update(nicknameKey(nick)).digest('hex').slice(0, 40)}.json`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Read-modify-write with compare-and-swap and jittered retries. */
async function update<T>(store: ObjectStore, path: string, fn: (cur: T | null) => T, attempts = 12): Promise<T> {
	for (let i = 0; i < attempts; i++) {
		const cur = await store.get<T>(path);
		const next = fn(cur?.data ?? null);
		if (await store.put(path, next, { ifVersion: cur ? cur.version : null })) return next;
		await sleep(Math.min(1500, 40 * 2 ** i) * (0.5 + Math.random()));
	}
	throw new Error(`contention on ${path}`);
}

export class PredictionRepo {
	private cache: { at: number; data: PublicPrediction[] } | null = null;

	constructor(
		private store: ObjectStore,
		private cacheMs = 10_000
	) {}

	getUser(uid: string): Promise<UserRecord | null> {
		return this.store.read<UserRecord>(`users/${uid}.json`);
	}

	/** Creates the user on first sign-in with a random unique nickname. */
	async ensureUser(uid: string, email: string): Promise<UserRecord> {
		const existing = await this.getUser(uid);
		if (existing) {
			if (email && existing.email !== email) {
				return update<UserRecord>(this.store, `users/${uid}.json`, (cur) => ({ ...(cur ?? existing), email }));
			}
			return existing;
		}
		const nickname = await this.reserveRandomNickname(uid);
		const now = new Date().toISOString();
		const user: UserRecord = { uid, publicId: publicIdFor(uid), email, nickname, createdAt: now, updatedAt: now, prediction: null };
		const created = await this.store.put(`users/${uid}.json`, user, { ifVersion: null });
		if (!created) {
			await this.releaseNickname(nickname, uid);
			return (await this.getUser(uid))!;
		}
		return user;
	}

	private async tryReserve(nick: string, uid: string): Promise<boolean> {
		const path = nickPath(nick);
		if (await this.store.put(path, { uid, nickname: nick }, { ifVersion: null })) return true;
		const cur = await this.store.read<{ uid: string }>(path);
		return cur?.uid === uid;
	}

	private async reserveRandomNickname(uid: string): Promise<string> {
		for (let i = 0; i < 8; i++) {
			const nick = randomNickname();
			if (await this.tryReserve(nick, uid)) return nick;
		}
		const nick = `${randomNickname()} ${randomBytes(2).toString('hex')}`;
		await this.tryReserve(nick, uid);
		return nick;
	}

	private async releaseNickname(nick: string, uid: string) {
		const path = nickPath(nick);
		const cur = await this.store.read<{ uid: string }>(path);
		if (cur?.uid === uid) await this.store.delete(path);
	}

	/** Sets a chosen nickname, or a random one when `nickname` is null. */
	async setNickname(uid: string, nickname: string | null): Promise<UserRecord> {
		const user = await this.getUser(uid);
		if (!user) throw new Error('no user');
		let next: string;
		if (nickname === null) {
			next = await this.reserveRandomNickname(uid);
		} else {
			if (nicknameKey(nickname) === nicknameKey(user.nickname) && nickname === user.nickname) return user;
			if (!(await this.tryReserve(nickname, uid))) throw new NicknameTakenError();
			next = nickname;
		}
		const updated = await update<UserRecord>(this.store, `users/${uid}.json`, (cur) => ({
			...(cur ?? user),
			nickname: next,
			updatedAt: new Date().toISOString()
		}));
		if (nicknameKey(user.nickname) !== nicknameKey(next)) await this.releaseNickname(user.nickname, uid);
		if (updated.prediction) await this.writeIndex(updated);
		return updated;
	}

	/** Saves a new version of the user's prediction. Refuses after the lock. */
	async savePrediction(uid: string, seats: Seats, turnout: number | null, lockAt: Date, now = new Date()): Promise<UserRecord> {
		if (now >= lockAt) throw new LockedError();
		const user = await this.getUser(uid);
		if (!user) throw new Error('no user');
		const ts = now.toISOString();
		const version = (user.prediction?.version ?? 0) + 1;
		const prediction: Prediction = { seats, turnout, updatedAt: ts, version };

		await this.store.put(`history/${uid}/${ts.replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}.json`, {
			publicId: user.publicId,
			nickname: user.nickname,
			...prediction
		});
		const updated = await update<UserRecord>(this.store, `users/${uid}.json`, (cur) => {
			const base = cur ?? user;
			return { ...base, updatedAt: ts, prediction: { ...prediction, version: (base.prediction?.version ?? 0) + 1 } };
		});
		await this.writeIndex(updated);
		return updated;
	}

	async history(uid: string): Promise<(Prediction & { nickname: string })[]> {
		const paths = await this.store.list(`history/${uid}/`);
		const items = await Promise.all(paths.map((p) => this.store.read<Prediction & { nickname: string }>(p)));
		return items.filter((x): x is Prediction & { nickname: string } => !!x).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}

	private async writeIndex(user: UserRecord) {
		if (!user.prediction) return;
		const entry: PublicPrediction = {
			publicId: user.publicId,
			nickname: user.nickname,
			seats: user.prediction.seats,
			turnout: user.prediction.turnout,
			updatedAt: user.prediction.updatedAt,
			version: user.prediction.version
		};
		await update<Shard>(this.store, `index/shard-${shardOf(user.uid)}.json`, (cur) => ({ ...(cur ?? {}), [user.publicId]: entry }));
		this.cache = null;
	}

	/** All current predictions (public fields only), cached briefly. */
	async all(fresh = false): Promise<PublicPrediction[]> {
		if (!fresh && this.cache && Date.now() - this.cache.at < this.cacheMs) return this.cache.data;
		const shards = await Promise.all(
			Array.from({ length: SHARDS }, (_, i) => this.store.read<Shard>(`index/shard-${String(i).padStart(2, '0')}.json`))
		);
		const data = shards.flatMap((s) => Object.values(s ?? {}));
		this.cache = { at: Date.now(), data };
		return data;
	}

	/** Rebuilds the public index from users/ (repair tool). */
	async rebuildIndex(): Promise<number> {
		const paths = await this.store.list('users/');
		const shards: Record<string, Shard> = {};
		let n = 0;
		for (const p of paths) {
			const u = await this.store.read<UserRecord>(p);
			if (!u?.prediction) continue;
			const s = shardOf(u.uid);
			shards[s] ??= {};
			shards[s][u.publicId] = {
				publicId: u.publicId,
				nickname: u.nickname,
				seats: u.prediction.seats,
				turnout: u.prediction.turnout,
				updatedAt: u.prediction.updatedAt,
				version: u.prediction.version
			};
			n++;
		}
		for (let i = 0; i < SHARDS; i++) {
			const s = String(i).padStart(2, '0');
			await this.store.put(`index/shard-${s}.json`, shards[s] ?? {});
		}
		this.cache = null;
		return n;
	}
}
