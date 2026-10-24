/**
 * Minimal object store. Two backends: the local filesystem (dev/testing) and Google Cloud
 * Storage (Cloud Run). Versions give compare-and-swap writes, so concurrent instances
 * never lose an update.
 */
export interface Stored<T> {
	data: T;
	/** opaque version: GCS generation, or a content hash locally */
	version: string;
}

export interface PutOptions {
	/** undefined: overwrite. null: only if the object does not exist. string: only if it is at this version. */
	ifVersion?: string | null;
}

export interface ObjectStore {
	get<T>(path: string): Promise<Stored<T> | null>;
	/** Like get, without the version (one request on GCS). */
	read<T>(path: string): Promise<T | null>;
	/** Returns false if the ifVersion precondition failed. */
	put(path: string, data: unknown, opts?: PutOptions): Promise<boolean>;
	delete(path: string): Promise<void>;
	/** Object paths under a prefix. */
	list(prefix: string): Promise<string[]>;
}
