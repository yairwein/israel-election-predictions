import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// Google's redirect sign-in posts a form from accounts.google.com to /api/auth/google/redirect.
		// That endpoint has its own CSRF check (Google's g_csrf_token double-submit cookie).
		csrf: { trustedOrigins: ['https://accounts.google.com'] }
	}
};

export default config;
