<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/api';
	import { page } from '$app/state';

	let { clientId, size = 'large' }: { clientId: string; size?: 'large' | 'medium' } = $props();

	/**
	 * In-app browsers (X, Instagram, Facebook, WhatsApp, LinkedIn, TikTok…) break the Google popup:
	 * it opens as a separate tab that can't report back, leaving a blank accounts.google.com page.
	 * There we use the standard OAuth redirect instead (a plain link; see /api/auth/google/start).
	 */
	function inAppBrowser(): boolean {
		const ua = navigator.userAgent;
		return /Twitter|FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|WhatsApp|TikTok|musical_ly|Snapchat|Telegram/i.test(ua)
			|| (/iPhone|iPad/.test(ua) && !/Safari\//.test(ua) && /AppleWebKit/.test(ua));
	}
	let el = $state<HTMLDivElement>();
	let inApp = $state(false);
	let startHref = $state('/api/auth/google/start');
	let error = $state('');

	async function onCredential(res: { credential: string }) {
		error = '';
		try {
			await api('POST', '/api/auth/google', { credential: res.credential });
			await invalidateAll();
		} catch (e) {
			error = (e as Error).message;
		}
	}

	onMount(() => {
		if (!clientId) return;
		if (inAppBrowser() && (page.data as { config?: { oauthRedirect?: boolean } }).config?.oauthRedirect) {
			// Standard OAuth redirect: our server sends the tab to Google, Google sends it back.
			inApp = true;
			startHref = `/api/auth/google/start?next=${encodeURIComponent(location.pathname + location.search)}`;
			return;
		}
		let tries = 0;
		const init = () => {
			const g = window.google?.accounts?.id;
			if (!g) {
				if (tries++ < 100) setTimeout(init, 100);
				return;
			}
			g.initialize({ client_id: clientId, callback: onCredential, context: 'signin', itp_support: true });
			if (!el) return;
			g.renderButton(el, {
				type: 'standard',
				theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'filled_black' : 'outline',
				size,
				shape: 'pill',
				text: 'continue_with',
				locale: 'he'
			});
		};
		init();
	});
</script>

{#if clientId && inApp}
	<a class="glink" href={startHref}>
		<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
		<span>המשך עם Google</span>
	</a>
{:else if clientId}
	<div class="gbtn" bind:this={el}></div>
{:else}
	<span class="faint">התחברות עם Google לא הוגדרה (GOOGLE_CLIENT_ID)</span>
{/if}
{#if error}<p class="err">{error}</p>{/if}

<style>
	/* Google draws the button in an iframe whose page is light. If the iframe inherits our dark
	   color-scheme, the browser paints an opaque white backdrop behind it. Matching the iframe's
	   scheme keeps it transparent; the button itself is still dark (theme: filled_black). */
	.gbtn { min-height: 40px; display: inline-block; color-scheme: light; }
	.gbtn :global(iframe) { color-scheme: light; }
	.glink {
		display: inline-flex; align-items: center; gap: 10px; height: 40px; padding: 0 16px; border-radius: 999px;
		border: 1px solid #dadce0; background: #fff; color: #3c4043; font-weight: 500; font-size: 0.95rem;
		text-decoration: none !important; white-space: nowrap;
	}
	@media (prefers-color-scheme: dark) { .glink { background: #202124; color: #e8eaed; border-color: #5f6368; } }
	.err { color: var(--bad); font-size: 0.85rem; margin: 6px 0 0; }
</style>
