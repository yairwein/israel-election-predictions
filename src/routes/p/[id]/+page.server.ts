import { error } from '@sveltejs/kit';
import { publicOrigin } from '$lib/server/config';
import type { PageServerLoad } from './$types';
import { getRepo } from '$lib/server/repo';

/** Public page for one prediction: shows only the nickname and the seats. */
export const load: PageServerLoad = async ({ params, url }) => {
	const p = await getRepo().byPublicId(params.id);
	if (!p) error(404, { message: 'התחזית לא נמצאה' });
	return {
		prediction: { publicId: p.publicId, nickname: p.nickname, seats: p.seats, turnout: p.turnout, updatedAt: p.updatedAt, version: p.version },
		origin: publicOrigin(url),
		og: {
			title: `התחזית של ${p.nickname} · בחירות 2026`,
			description: 'כמה מנדטים יקבל כל גוש? הוסיפו את התחזית שלכם וראו את ממוצע התחזיות.',
			image: `/og/p/${p.publicId}?v=${p.version}`,
			path: `/p/${p.publicId}`
		}
	};
};
