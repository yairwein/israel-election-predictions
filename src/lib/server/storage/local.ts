import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ObjectStore, PutOptions, Stored } from './types';

/** Filesystem store for development and tests. Single-process: writes are serialized. */
export class LocalStore implements ObjectStore {
	private chain: Promise<unknown> = Promise.resolve();

	constructor(private root: string) {}

	private file(p: string): string {
		const full = path.resolve(this.root, p);
		if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error('bad path');
		return full;
	}

	private serial<T>(fn: () => Promise<T>): Promise<T> {
		const run = this.chain.then(fn, fn);
		this.chain = run.catch(() => undefined);
		return run;
	}

	private static version(raw: string): string {
		return createHash('sha1').update(raw).digest('hex');
	}

	async get<T>(p: string): Promise<Stored<T> | null> {
		try {
			const raw = await fs.readFile(this.file(p), 'utf8');
			return { data: JSON.parse(raw) as T, version: LocalStore.version(raw) };
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw e;
		}
	}

	async read<T>(p: string): Promise<T | null> {
		return (await this.get<T>(p))?.data ?? null;
	}

	put(p: string, data: unknown, opts: PutOptions = {}): Promise<boolean> {
		return this.serial(async () => {
			const fp = this.file(p);
			if (opts.ifVersion !== undefined) {
				const cur = await this.get(p);
				if (opts.ifVersion === null ? cur !== null : cur?.version !== opts.ifVersion) return false;
			}
			await fs.mkdir(path.dirname(fp), { recursive: true });
			const tmp = `${fp}.${process.pid}.${Date.now()}.tmp`;
			await fs.writeFile(tmp, JSON.stringify(data, null, 2));
			await fs.rename(tmp, fp);
			return true;
		});
	}

	delete(p: string): Promise<void> {
		return this.serial(async () => {
			await fs.rm(this.file(p), { force: true });
		});
	}

	async list(prefix: string): Promise<string[]> {
		const dir = this.file(prefix.endsWith('/') ? prefix + '.' : prefix);
		const base = path.resolve(this.root);
		const out: string[] = [];
		const walk = async (d: string) => {
			let entries;
			try {
				entries = await fs.readdir(d, { withFileTypes: true });
			} catch {
				return;
			}
			for (const e of entries) {
				const full = path.join(d, e.name);
				if (e.isDirectory()) await walk(full);
				else if (e.name.endsWith('.json')) out.push(path.relative(base, full).split(path.sep).join('/'));
			}
		};
		await walk(dir);
		return out.sort();
	}
}
