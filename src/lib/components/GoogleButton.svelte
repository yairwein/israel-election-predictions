<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/api';

	let { clientId, size = 'large' }: { clientId: string; size?: 'large' | 'medium' } = $props();

	/**
	 * In-app browsers (X, Instagram, Facebook, WhatsApp, LinkedIn, TikTok…) break the Google popup:
	 * it opens as a separate tab that can't report back, leaving a blank accounts.google.com page.
	 * There we sign in by redirect instead: the same tab goes to Google and comes back signed in.
	 */
	function inAppBrowser(): boolean {
		const ua = navigator.userAgent;
		return /Twitter|FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|WhatsApp|TikTok|musical_ly|Snapchat|Telegram/i.test(ua)
			|| (/iPhone|iPad/.test(ua) && !/Safari\//.test(ua) && /AppleWebKit/.test(ua));
	}
	let el = $state<HTMLDivElement>();
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
		let tries = 0;
		const init = () => {
			const g = window.google?.accounts?.id;
			if (!g) {
				if (tries++ < 100) setTimeout(init, 100);
				return;
			}
			const next = location.pathname + location.search;
			if (inAppBrowser()) {
				g.initialize({
					client_id: clientId,
					callback: onCredential,
					ux_mode: 'redirect',
					login_uri: `${location.origin}/api/auth/google/redirect?next=${encodeURIComponent(next)}`,
					context: 'signin'
				});
			} else {
				g.initialize({ client_id: clientId, callback: onCredential, context: 'signin', itp_support: true });
			}
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

{#if clientId}
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
	.err { color: var(--bad); font-size: 0.85rem; margin: 6px 0 0; }
</style>
