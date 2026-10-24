<script lang="ts">
	/**
	 * How each network wants to be shared to, on the web:
	 *  - X: on phones, the app's own scheme twitter://post?message= opens the compose screen directly
	 *    (the x.com web intent goes through an "open in app" page that fails in the app). Android uses
	 *    an intent:// link with the web intent as browser_fallback_url; iOS falls back to the web intent
	 *    if the page is still visible after a moment (app not installed). Desktop: the web intent
	 *    https://twitter.com/intent/tweet in a centered popup.
	 *  - Facebook: no button. Its app has no share scheme without a developer app id, and the web
	 *    sharer is unreliable on phones; the "more" button reaches Facebook through the share sheet.
	 *  - Instagram: there is no web share URL and no web "share to Instagram Stories" API (that needs
	 *    the native SDK). The only way from a web page is the system share sheet with an image file,
	 *    where Instagram appears; so we share a portrait 1080×1920 Story image. On desktop, download it.
	 */
	import { onMount } from 'svelte';

	let {
		url,
		text,
		image,
		story,
		filename = 'prediction'
	}: { url: string; text: string; image: string; story: string; filename?: string } = $props();

	let note = $state('');
	let busy = $state(false);
	let mobile = $state(false);
	let android = $state(false);
	let canShareFiles = $state(false);
	let canShareLinks = $state(false);
	let storyPreview = $state(false);

	const xHref = $derived(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
	const xMessage = $derived(encodeURIComponent(`${text} ${url}`));
	const xApp = $derived(
		android
			? `intent://post?message=${xMessage}#Intent;scheme=twitter;package=com.twitter.android;S.browser_fallback_url=${encodeURIComponent(xHref)};end`
			: `twitter://post?message=${xMessage}`
	);

	onMount(() => {
		mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
		android = /Android/i.test(navigator.userAgent);
		canShareLinks = typeof navigator.share === 'function';
		try {
			canShareFiles = !!navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] });
		} catch {
			canShareFiles = false;
		}
	});

	function desktopPopup(e: MouseEvent, href: string) {
		if (mobile) return; // phones: follow the link normally so the app can take over
		e.preventDefault();
		const w = 600, h = 560;
		const left = window.screenX + (window.outerWidth - w) / 2;
		const top = window.screenY + (window.outerHeight - h) / 2;
		const win = window.open(href, 'share', `width=${w},height=${h},left=${left},top=${top}`);
		if (!win) location.href = href; // popup blocked: go there directly
	}

	/** Phones: open the X app's compose screen; if the app isn't there, go to the web intent. */
	function shareX(e: MouseEvent) {
		if (!mobile) return desktopPopup(e, xHref);
		e.preventDefault();
		let left = false;
		const onHide = () => {
			if (document.visibilityState === 'hidden') left = true;
		};
		document.addEventListener('visibilitychange', onHide);
		window.addEventListener('pagehide', onHide);
		const timer = setTimeout(() => {
			document.removeEventListener('visibilitychange', onHide);
			window.removeEventListener('pagehide', onHide);
			if (!left && document.visibilityState === 'visible') location.href = xHref;
		}, 1600);
		window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
		location.href = xApp;
	}

	// The story image is fetched ahead of time: iOS opens the share sheet only if share() is called
	// right after the tap, without waiting for the network.
	let cached: { src: string; file: File } | null = null;
	async function storyFile(): Promise<File> {
		if (cached?.src === story) return cached.file;
		const res = await fetch(story);
		if (!res.ok) throw new Error(`image ${res.status}`);
		const file = new File([await res.blob()], `${filename}-story.png`, { type: 'image/png' });
		cached = { src: story, file };
		return file;
	}
	$effect(() => {
		void story;
		if (mobile) storyFile().catch(() => {});
	});

	async function instagram() {
		note = '';
		if (!mobile || !canShareFiles) {
			storyPreview = true;
			return;
		}
		busy = true;
		try {
			const file = cached?.src === story ? cached.file : await storyFile();
			// Only the file: adding text/url makes some apps (including Instagram) drop the image.
			await navigator.share({ files: [file] });
			note = 'בחרו Instagram ואז "סטורי". אפשר להוסיף מדבקת קישור לאתר.';
		} catch (e) {
			if ((e as Error).name !== 'AbortError') storyPreview = true;
		} finally {
			busy = false;
		}
	}

	async function more() {
		note = '';
		if (canShareLinks) {
			try {
				await navigator.share({ title: 'תחזית הבחירות 2026', text, url });
			} catch {
				/* cancelled */
			}
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
			note = 'הקישור הועתק';
		} catch {
			note = url;
		}
	}
</script>

<div class="share">
	<a
		class="sbtn x" href={xHref} target={mobile ? undefined : '_blank'} rel="noopener noreferrer"
		data-app={xApp} onclick={shareX} aria-label="שיתוף ב-X"
	>
		<svg class="xlogo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
	</a>
	<button class="sbtn ig" onclick={instagram} disabled={busy} aria-label="שיתוף לסטורי באינסטגרם">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.415.56.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.249 1.805-.413 2.227-.217.562-.477.96-.896 1.382-.42.419-.819.679-1.382.896-.422.164-1.057.36-2.227.413-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.413a3.7 3.7 0 0 1-1.381-.896 3.7 3.7 0 0 1-.896-1.382c-.164-.422-.36-1.057-.413-2.227-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.054-1.17.249-1.805.413-2.227.217-.562.477-.96.896-1.381.42-.419.819-.679 1.381-.896.422-.164 1.057-.36 2.227-.413 1.266-.058 1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 5.775.13 4.902.333 4.14.63a5.9 5.9 0 0 0-2.126 1.384A5.9 5.9 0 0 0 .63 4.14C.333 4.902.13 5.775.072 7.053.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.058 1.277.261 2.15.558 2.913a5.9 5.9 0 0 0 1.384 2.126A5.9 5.9 0 0 0 4.14 23.37c.763.297 1.636.5 2.913.558C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.277-.058 2.15-.261 2.913-.558a5.9 5.9 0 0 0 2.126-1.384 5.9 5.9 0 0 0 1.384-2.126c.297-.763.5-1.636.558-2.913.058-1.28.072-1.688.072-4.947s-.014-3.668-.072-4.948c-.058-1.277-.261-2.15-.558-2.913a5.9 5.9 0 0 0-1.384-2.126A5.9 5.9 0 0 0 19.86.63C19.097.333 18.224.13 16.947.072 15.667.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"/></svg>
		<span>סטורי</span>
	</button>
	<button class="sbtn more" onclick={more} aria-label={canShareLinks ? 'שיתוף בוואטסאפ ועוד' : 'העתקת קישור'}>
		{#if canShareLinks}
			<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>
			<span>עוד</span>
		{:else}
			<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
			<span>קישור</span>
		{/if}
	</button>
</div>
{#if note}<p class="note" role="status">{note}</p>{/if}

{#if storyPreview}
	<!-- Fallback: in-app browsers and desktop can't hand a file to Instagram. Show the story image to save. -->
	<div class="sheet" role="dialog" aria-modal="true" aria-label="תמונה לסטורי">
		<button class="backdrop" aria-label="סגירה" onclick={() => (storyPreview = false)}></button>
		<div class="panel">
			<img src={story} alt="תמונת סטורי של התחזית" width="1080" height="1920" />
			<p>
				{#if mobile}לחיצה ארוכה על התמונה ← "שמירה בתמונות", ואז מעלים אותה לסטורי באינסטגרם.{:else}שמרו את התמונה והעלו אותה לסטורי באינסטגרם מהטלפון.{/if}
			</p>
			<div class="row">
				<a class="btn btn-primary" href={story} download={`${filename}-story.png`}>הורדת התמונה</a>
				<button class="btn btn-ghost" onclick={() => (storyPreview = false)}>סגירה</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.share { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
	.sbtn {
		display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 10px;
		border-radius: 12px; border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 0.92rem;
		color: #fff; text-decoration: none !important; transition: filter 0.15s, transform 0.06s;
		-webkit-user-select: none; user-select: none;
	}
	.sbtn:hover { filter: brightness(1.08); }
	.sbtn:active { transform: scale(0.97); }
	.sbtn:disabled { opacity: 0.6; }
	.sbtn svg { width: 18px; height: 18px; flex: none; }
	.sbtn svg.xlogo { width: 21px; height: 21px; }
	.x { background: #000; }
	.ig { background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%); }
	.more { background: var(--surface-2); color: var(--text); border: 1px solid var(--border); }
	@media (prefers-color-scheme: dark) { .x { background: #fff; color: #000; } }
	.note { font-size: 0.84rem; color: var(--muted); margin: 8px 0 0; text-align: center; }

	.sheet { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-end; justify-content: center; }
	.backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.55); border: 0; }
	.panel {
		position: relative; background: var(--surface); width: 100%; max-width: 420px; max-height: 92vh; overflow: auto;
		border-radius: 20px 20px 0 0; padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
		display: flex; flex-direction: column; gap: 12px; align-items: center;
	}
	@media (min-width: 640px) { .sheet { align-items: center; } .panel { border-radius: 20px; } }
	.panel img { width: auto; max-width: 100%; max-height: 60vh; border-radius: 14px; border: 1px solid var(--border); -webkit-touch-callout: default; }
	.panel p { margin: 0; text-align: center; color: var(--muted); font-size: 0.9rem; }
	.row { display: flex; gap: 8px; width: 100%; }
	.row > * { flex: 1; }
</style>
