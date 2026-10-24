import { getRepo } from './repo';
import { lockAt, isDevMode, googleClientId, gaMeasurementId } from './config';
import type { UserRecord } from './predictions';
import { isCountable } from '$lib/validate';
import { DEV_EMAIL } from './dev';

export interface MeView {
	signedIn: boolean;
	devUser: boolean;
	nickname: string | null;
	publicId: string | null;
	prediction: UserRecord['prediction'];
	/** false when the saved prediction breaks the current rules and is left out of the totals */
	counted: boolean;
	historyCount: number;
}

export interface AppConfig {
	googleClientId: string;
	devMode: boolean;
	lockAt: string;
	gaId: string;
}

export function appConfig(): AppConfig {
	return { googleClientId: googleClientId(), devMode: isDevMode(), lockAt: lockAt().toISOString(), gaId: gaMeasurementId() };
}

export async function meView(locals: App.Locals, withHistory = false): Promise<MeView> {
	if (!locals.uid) return { signedIn: false, devUser: false, nickname: null, publicId: null, prediction: null, counted: true, historyCount: 0 };
	const repo = getRepo();
	const user = locals.devUser ? await repo.ensureUser(locals.uid, DEV_EMAIL) : await repo.getUser(locals.uid);
	if (!user) return { signedIn: false, devUser: false, nickname: null, publicId: null, prediction: null, counted: true, historyCount: 0 };
	const historyCount = withHistory ? (await repo.history(locals.uid)).length : 0;
	return {
		signedIn: !locals.devUser,
		devUser: locals.devUser,
		nickname: user.nickname,
		publicId: user.publicId,
		prediction: user.prediction,
		counted: user.prediction ? isCountable(user.prediction) : true,
		historyCount
	};
}
