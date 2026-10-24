import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// The built-in cross-site form check is replaced by an equivalent one in hooks.server.ts, which
		// exempts only Google's redirect sign-in. Google posts that form with Origin "null" (after its own
		// redirects), which no allow-list can match; the endpoint has Google's g_csrf_token check instead.
		csrf: { trustedOrigins: ['*'] }
	}
};

export default config;
