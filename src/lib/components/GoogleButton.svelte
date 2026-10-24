<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/api';

	let { clientId, size = 'large' }: { clientId: string; size?: 'large' | 'medium' } = $props();
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
