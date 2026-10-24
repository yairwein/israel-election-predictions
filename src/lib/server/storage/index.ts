import { env } from '$env/dynamic/private';
import type { ObjectStore } from './types';
import { LocalStore } from './local';
import { GcsStore } from './gcs';

let instance: ObjectStore | null = null;

export function getStore(): ObjectStore {
	if (!instance) {
		if (env.STORAGE_BACKEND === 'gcs') {
			if (!env.GCS_BUCKET) throw new Error('GCS_BUCKET is required when STORAGE_BACKEND=gcs');
			instance = new GcsStore(env.GCS_BUCKET, env.GCS_PREFIX ?? '');
		} else {
			instance = new LocalStore(env.DATA_DIR || './data');
		}
	}
	return instance;
}
