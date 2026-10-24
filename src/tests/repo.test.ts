import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LocalStore } from '../lib/server/storage/local';
import { PredictionRepo, LockedError, NicknameTakenError, uidFor } from '../lib/server/predictions';
import { POLL_AVERAGE } from '../lib/parties';
import { createSessionValue, readSessionValue } from '../lib/server/session';

let repo: PredictionRepo;
let store: LocalStore;
const future = new Date(Date.now() + 86_400_000);

beforeEach(() => {
	store = new LocalStore(mkdtempSync(path.join(tmpdir(), 'pred-')));
	repo = new PredictionRepo(store, 0);
});

describe('PredictionRepo', () => {
	it('creates a user with a random nickname and never exposes the email publicly', async () => {
		const u = await repo.ensureUser(uidFor('sub-1', 's3cret-s3cret-s3cret'), 'a@example.com');
		expect(u.nickname.length).toBeGreaterThan(2);
		await repo.savePrediction(u.uid, POLL_AVERAGE, 68, future);
		const all = await repo.all(true);
		expect(all).toHaveLength(1);
		expect(JSON.stringify(all)).not.toContain('example.com');
		expect(JSON.stringify(all)).not.toContain(u.uid);
		const index = await store.list('index/');
		for (const p of index) expect(JSON.stringify(await store.read(p))).not.toContain('example.com');
	});

	it('keeps every version and only the latest counts', async () => {
		const u = await repo.ensureUser('u1', 'a@x.com');
		await repo.savePrediction(u.uid, POLL_AVERAGE, null, future);
		await repo.savePrediction(u.uid, { ...POLL_AVERAGE, likud: 30, yashar: 15 }, 70, future);
		const all = await repo.all(true);
		expect(all).toHaveLength(1);
		expect(all[0].seats.likud).toBe(30);
		expect(all[0].version).toBe(2);
		const hist = await repo.history(u.uid);
		expect(hist).toHaveLength(2);
		expect(hist[0].seats.likud).toBe(30);
	});

	it('refuses to save after the lock', async () => {
		const u = await repo.ensureUser('u2', 'b@x.com');
		await expect(repo.savePrediction(u.uid, POLL_AVERAGE, null, new Date(Date.now() - 1000))).rejects.toBeInstanceOf(LockedError);
	});

	it('enforces unique nicknames, case-insensitively, and releases old ones', async () => {
		const a = await repo.ensureUser('ua', 'a@x.com');
		const b = await repo.ensureUser('ub', 'b@x.com');
		await repo.setNickname(a.uid, 'Prophet');
		await expect(repo.setNickname(b.uid, 'prophet')).rejects.toBeInstanceOf(NicknameTakenError);
		await repo.setNickname(a.uid, 'Oracle');
		await expect(repo.setNickname(b.uid, 'Prophet')).resolves.toMatchObject({ nickname: 'Prophet' });
	});

	it('updates the public nickname of an existing prediction', async () => {
		const u = await repo.ensureUser('uc', 'c@x.com');
		await repo.savePrediction(u.uid, POLL_AVERAGE, null, future);
		await repo.setNickname(u.uid, 'נביא');
		expect((await repo.all(true))[0].nickname).toBe('נביא');
	});

	it('survives concurrent saves from many users', async () => {
		const users = await Promise.all(Array.from({ length: 40 }, (_, i) => repo.ensureUser(`user-${i}`, `${i}@x.com`)));
		await Promise.all(users.map((u) => repo.savePrediction(u.uid, POLL_AVERAGE, null, future)));
		expect(await repo.all(true)).toHaveLength(40);
		expect(await repo.rebuildIndex()).toBe(40);
	});
});

describe('session cookie', () => {
	it('round-trips and rejects tampering and expiry', () => {
		const v = createSessionValue('sub-9', 'secret-secret-secret');
		expect(readSessionValue(v, 'secret-secret-secret')).toBe('sub-9');
		expect(readSessionValue(v, 'other-secret-secret')).toBeNull();
		expect(readSessionValue(v.replace(/^./, 'x'), 'secret-secret-secret')).toBeNull();
		expect(readSessionValue(v, 'secret-secret-secret', Date.now() + 31 * 86_400_000)).toBeNull();
	});
});

describe('rule-breaking predictions', () => {
	it('stay stored and editable but are left out of counted()', async () => {
		const u = await repo.ensureUser('absurd', 'x@x.com');
		const all120 = Object.fromEntries(Object.keys(POLL_AVERAGE).map((k) => [k, 0]));
		all120.haredi = 120;
		// simulate a prediction saved before the 40-seat rule existed
		await repo.savePrediction(u.uid, all120, 90, future);
		expect((await repo.all(true)).length).toBe(1);
		expect((await repo.counted(true)).length).toBe(0);
		expect(await repo.byPublicId(u.publicId)).toBeNull();
		// the owner fixes it → it counts again
		await repo.savePrediction(u.uid, POLL_AVERAGE, 70, future);
		expect((await repo.counted(true)).length).toBe(1);
		expect((await repo.byPublicId(u.publicId))?.seats.likud).toBe(POLL_AVERAGE.likud);
	});
});
