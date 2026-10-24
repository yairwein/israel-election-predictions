import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepo } from '$lib/server/repo';
import { NicknameTakenError } from '$lib/server/predictions';
import { cleanNickname } from '$lib/validate';
import { readJson, rateLimit, requireUid } from '$lib/server/http';
import { meView } from '$lib/server/me';
import { DEV_EMAIL } from '$lib/server/dev';
import { invalidateSummary } from '$lib/server/aggregate';

/** { nickname: "..." } to choose, { nickname: null } for a random one. */
export const PUT: RequestHandler = async ({ request, locals }) => {
	const uid = requireUid(locals);
	rateLimit(`nick:${uid}`, 20, 60_000);
	const body = await readJson(request);
	let nick: string | null = null;
	if (body.nickname !== null) {
		nick = cleanNickname(body.nickname);
		if (!nick) error(400, { message: 'כינוי באורך 2–24 תווים: אותיות, מספרים ורווחים', code: 'invalid_nickname' });
	}
	const repo = getRepo();
	if (locals.devUser) await repo.ensureUser(uid, DEV_EMAIL);
	try {
		await repo.setNickname(uid, nick);
	} catch (e) {
		if (e instanceof NicknameTakenError) error(409, { message: 'הכינוי תפוס', code: 'nickname_taken' });
		throw e;
	}
	invalidateSummary();
	return json(await meView(locals));
};
