import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepo } from '$lib/server/repo';
import { lockAt } from '$lib/server/config';
import { LockedError } from '$lib/server/predictions';
import { invalidateSummary } from '$lib/server/aggregate';
import { validateSeats } from '$lib/validate';
import { readJson, rateLimit, requireUid } from '$lib/server/http';
import { meView } from '$lib/server/me';
import { DEV_EMAIL } from '$lib/server/dev';

const MESSAGES: Record<string, string> = {
	seats_missing: 'חסרה תחזית',
	unknown_party: 'מפלגה לא מוכרת',
	invalid_value: 'מספר מנדטים לא תקין',
	below_threshold: 'מפלגה שעוברת את אחוז החסימה מקבלת לפחות 4 מנדטים',
	total_not_120: 'סך המנדטים חייב להיות 120'
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const uid = requireUid(locals);
	rateLimit(`save:${uid}`, 30, 60_000);
	if (new Date() >= lockAt()) error(423, { message: 'התחזיות ננעלו', code: 'locked' });

	const body = await readJson(request);
	const v = validateSeats(body.seats);
	if (!v.ok) error(400, { message: MESSAGES[v.error] ?? v.error, code: v.error });

	let turnout: number | null = null;
	if (body.turnout !== null && body.turnout !== undefined && body.turnout !== '') {
		const t = Number(body.turnout);
		if (!Number.isFinite(t) || t < 40 || t > 95) error(400, { message: 'אחוז הצבעה בין 40 ל-95', code: 'invalid_turnout' });
		turnout = Math.round(t * 10) / 10;
	}

	const repo = getRepo();
	if (locals.devUser) await repo.ensureUser(uid, DEV_EMAIL);
	else if (!(await repo.getUser(uid))) error(401, { message: 'נדרשת התחברות', code: 'unauthorized' });

	try {
		await repo.savePrediction(uid, v.seats, turnout, lockAt());
	} catch (e) {
		if (e instanceof LockedError) error(423, { message: 'התחזיות ננעלו', code: 'locked' });
		throw e;
	}
	invalidateSummary();
	return json(await meView(locals));
};
