import { getStore } from './storage';
import { PredictionRepo } from './predictions';

let repo: PredictionRepo | null = null;

export function getRepo(): PredictionRepo {
	repo ??= new PredictionRepo(getStore());
	return repo;
}
