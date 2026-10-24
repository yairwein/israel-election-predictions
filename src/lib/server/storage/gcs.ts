import { Storage, type Bucket } from '@google-cloud/storage';
import type { ObjectStore, PutOptions, Stored } from './types';

/** Google Cloud Storage store. Uses object generations for compare-and-swap. */
export class GcsStore implements ObjectStore {
	private bucket: Bucket;

	constructor(bucketName: string, private prefix = '') {
		this.bucket = new Storage().bucket(bucketName);
	}

	private name(p: string): string {
		return this.prefix ? `${this.prefix.replace(/\/$/, '')}/${p}` : p;
	}

	async get<T>(p: string): Promise<Stored<T> | null> {
		const file = this.bucket.file(this.name(p));
		try {
			const [[contents], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
			return { data: JSON.parse(contents.toString('utf8')) as T, version: String(meta.generation) };
		} catch (e) {
			if ((e as { code?: number }).code === 404) return null;
			throw e;
		}
	}

	async read<T>(p: string): Promise<T | null> {
		try {
			const [contents] = await this.bucket.file(this.name(p)).download();
			return JSON.parse(contents.toString('utf8')) as T;
		} catch (e) {
			if ((e as { code?: number }).code === 404) return null;
			throw e;
		}
	}

	async put(p: string, data: unknown, opts: PutOptions = {}): Promise<boolean> {
		const file = this.bucket.file(this.name(p));
		const preconditionOpts =
			opts.ifVersion === undefined ? undefined : { ifGenerationMatch: opts.ifVersion === null ? 0 : Number(opts.ifVersion) };
		try {
			await file.save(JSON.stringify(data), {
				contentType: 'application/json',
				resumable: false,
				metadata: { cacheControl: 'no-store' },
				preconditionOpts
			});
			return true;
		} catch (e) {
			if ((e as { code?: number }).code === 412) return false;
			throw e;
		}
	}

	async delete(p: string): Promise<void> {
		await this.bucket.file(this.name(p)).delete({ ignoreNotFound: true });
	}

	async list(prefix: string): Promise<string[]> {
		const [files] = await this.bucket.getFiles({ prefix: this.name(prefix), autoPaginate: true });
		const strip = this.prefix ? this.prefix.replace(/\/$/, '').length + 1 : 0;
		return files.map((f) => f.name.slice(strip)).filter((n) => n.endsWith('.json'));
	}
}
