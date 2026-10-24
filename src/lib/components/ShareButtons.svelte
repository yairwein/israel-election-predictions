<script lang="ts">
	/**
	 * Share links as social sites expect them:
	 *  - X: web intent (https://x.com/intent/post) with text + url; X builds the card from our og: tags.
	 *  - Facebook: sharer.php with the url only (Facebook ignores prefilled text); the card comes from og: tags.
	 *  - Instagram has no web share link. On phones we use the native share sheet with the image file
	 *    (Instagram appears there for stories/posts); otherwise we download the image and copy the caption.
	 */
	let { url, text, image, filename = 'prediction.png' }: { url: string; text: string; image: string; filename?: string } = $props();

	let note = $state('');
	let busy = $state(false);

	const xHref = $derived(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
	const fbHref = $derived(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);

	function popup(e: MouseEvent, href: string) {
		// Desktop: small centered window, the usual pattern. Phones: let the link open the app / new tab.
		if (matchMedia('(pointer: coarse)').matches) return;
		e.preventDefault();
		const w = 600, h = 560;
		const left = window.screenX + (window.outerWidth - w) / 2;
		const top = window.screenY + (window.outerHeight - h) / 2;
		window.open(href, 'share', `width=${w},height=${h},left=${left},top=${top},noopener`);
	}

	let cached: { src: string; file: File } | null = null;
	async function imageFile(): Promise<File> {
		if (cached?.src === image) return cached.file;
		const res = await fetch(image);
		const file = new File([await res.blob()], filename, { type: 'image/png' });
		cached = { src: image, file };
		return file;
	}
	// Fetch ahead of time: iOS only opens the share sheet if share() runs right after the tap.
	$effect(() => {
		void image;
		imageFile().catch(() => {});
	});

	async function instagram() {
		busy = true;
		note = '';
		try {
			const file = await imageFile();
			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({ files: [file], text: `${text} ${url}` });
				return;
			}
			const a = document.createElement('a');
			a.href = URL.createObjectURL(file);
			a.download = filename;
			a.click();
			setTimeout(() => URL.revokeObjectURL(a.href), 5000);
			await navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {});
			note = 'התמונה ירדה והטקסט הועתק. העלו אותה לאינסטגרם (סטורי או פוסט) והדביקו את הקישור.';
		} catch (e) {
			if ((e as Error).name !== 'AbortError') note = 'לא הצלחנו לשתף. אפשר לשמור את התמונה ולהעלות ידנית.';
		} finally {
			busy = false;
		}
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			note = 'הקישור הועתק';
		} catch {
			note = url;
		}
	}

	async function native() {
		try {
			await navigator.share({ title: 'תחזית הבחירות 2026', text, url });
		} catch {
			/* cancelled */
		}
	}
	const canNative = typeof navigator !== 'undefined' && 'share' in navigator;
</script>

<div class="share">
	<a class="sbtn x" href={xHref} target="_blank" rel="noopener noreferrer" onclick={(e) => popup(e, xHref)} aria-label="שיתוף ב-X">
		<svg class="xlogo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
	</a>
	<a class="sbtn fb" href={fbHref} target="_blank" rel="noopener noreferrer" onclick={(e) => popup(e, fbHref)} aria-label="שיתוף בפייסבוק">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
		<span>פייסבוק</span>
	</a>
	<button class="sbtn ig" onclick={instagram} disabled={busy} aria-label="שיתוף באינסטגרם">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.415.56.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.249 1.805-.413 2.227-.217.562-.477.96-.896 1.382-.42.419-.819.679-1.382.896-.422.164-1.057.36-2.227.413-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.413a3.7 3.7 0 0 1-1.381-.896 3.7 3.7 0 0 1-.896-1.382c-.164-.422-.36-1.057-.413-2.227-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.054-1.17.249-1.805.413-2.227.217-.562.477-.96.896-1.381.42-.419.819-.679 1.381-.896.422-.164 1.057-.36 2.227-.413 1.266-.058 1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 5.775.13 4.902.333 4.14.63a5.9 5.9 0 0 0-2.126 1.384A5.9 5.9 0 0 0 .63 4.14C.333 4.902.13 5.775.072 7.053.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.058 1.277.261 2.15.558 2.913a5.9 5.9 0 0 0 1.384 2.126A5.9 5.9 0 0 0 4.14 23.37c.763.297 1.636.5 2.913.558C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.277-.058 2.15-.261 2.913-.558a5.9 5.9 0 0 0 2.126-1.384 5.9 5.9 0 0 0 1.384-2.126c.297-.763.5-1.636.558-2.913.058-1.28.072-1.688.072-4.947s-.014-3.668-.072-4.948c-.058-1.277-.261-2.15-.558-2.913a5.9 5.9 0 0 0-1.384-2.126A5.9 5.9 0 0 0 19.86.63C19.097.333 18.224.13 16.947.072 15.667.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"/></svg>
		<span>אינסטגרם</span>
	</button>
	{#if canNative}
		<button class="sbtn more" onclick={native} aria-label="שיתוף נוסף">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>
			<span>עוד</span>
		</button>
	{:else}
		<button class="sbtn more" onclick={copy} aria-label="העתקת קישור">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
			<span>קישור</span>
		</button>
	{/if}
</div>
{#if note}<p class="note" role="status">{note}</p>{/if}

<style>
	.share { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
	.sbtn {
		display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 0 10px;
		border-radius: 12px; border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 0.92rem;
		color: #fff; text-decoration: none !important; transition: filter 0.15s, transform 0.06s;
	}
	.sbtn:hover { filter: brightness(1.08); }
	.sbtn:active { transform: scale(0.98); }
	.sbtn:disabled { opacity: 0.6; }
	.sbtn svg { width: 18px; height: 18px; flex: none; }
	.sbtn svg.xlogo { width: 21px; height: 21px; }
	.x { background: #000; }
	.fb { background: #1877f2; }
	.ig { background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%); }
	.more { background: var(--surface-2); color: var(--text); border: 1px solid var(--border); }
	@media (prefers-color-scheme: dark) { .x { background: #fff; color: #000; } }
	.note { font-size: 0.84rem; color: var(--muted); margin: 8px 0 0; text-align: center; }
	@media (max-width: 420px) {
		.share { grid-template-columns: repeat(2, 1fr); }
	}
</style>
