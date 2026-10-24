<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/api';
	import GoogleButton from '$lib/components/GoogleButton.svelte';

	let { data, children } = $props();
	let menuOpen = $state(false);

	// Pages may provide `og` from their load; otherwise the crowd average card is used.
	const og = $derived.by(() => {
		const o = (page.data as { og?: { title?: string; description?: string; image?: string; path?: string } }).og ?? {};
		return {
			title: o.title ?? 'תחזית הבחירות 2026 · ממוצע התחזיות',
			description: o.description ?? 'כמה מנדטים יקבל כל גוש? הוסיפו תחזית וראו את ממוצע התחזיות.',
			image: data.origin + (o.image ?? '/og/average'),
			url: data.origin + (o.path ?? page.url.pathname)
		};
	});

	const links = [
		{ href: '/', label: 'ראשי' },
		{ href: '/predict', label: 'התחזית שלי' },
		{ href: '/results', label: 'ממוצע התחזיות' },
		{ href: '/method', label: 'איך זה עובד' }
	];

	async function signOut() {
		await api('POST', '/api/auth/logout', {});
		window.google?.accounts?.id?.disableAutoSelect();
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{og.title}</title>
	<meta name="description" content={og.description} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="תחזית הבחירות 2026" />
	<meta property="og:locale" content="he_IL" />
	<meta property="og:title" content={og.title} />
	<meta property="og:description" content={og.description} />
	<meta property="og:url" content={og.url} />
	<meta property="og:image" content={og.image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={og.title} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:creator" content="@yairwein" />
	<meta name="twitter:title" content={og.title} />
	<meta name="twitter:description" content={og.description} />
	<meta name="twitter:image" content={og.image} />
	<link rel="canonical" href={og.url} />
	{#if data.config.gaId}
		<!-- Google tag (gtag.js). GA4 enhanced measurement records client-side navigations. -->
		<script async src="https://www.googletagmanager.com/gtag/js?id={data.config.gaId}"></script>
		{@html `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(data.config.gaId)});</script>`}
	{/if}
</svelte:head>

<header class="top">
	<div class="container bar">
		<a href="/" class="brand">
			<svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="var(--accent)"/><path d="M12 44a20 20 0 0 1 40 0" fill="none" stroke="var(--accent-ink)" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="44" r="5" fill="var(--accent-ink)"/></svg>
			<span>תחזית הבחירות <b>2026</b></span>
		</a>
		<nav class:open={menuOpen}>
			{#each links as l}
				<a href={l.href} class:active={page.url.pathname === l.href} onclick={() => (menuOpen = false)}>{l.label}</a>
			{/each}
			{#if data.me.signedIn}
				<button class="navout" onclick={() => { menuOpen = false; signOut(); }}>יציאה ({data.me.nickname})</button>
			{/if}
		</nav>
		<div class="auth">
			{#if data.me.signedIn}
				<span class="pill" title="הכינוי הציבורי שלך">{data.me.nickname}</span>
				<button class="btn btn-ghost btn-sm" onclick={signOut}>יציאה</button>
			{:else if data.me.devUser}
				<span class="pill dev" title="NODE_ENV=dev: login is optional">פיתוח<span class="devnick"> · {data.me.nickname}</span></span>
			{:else}
				<span class="gwrap"><GoogleButton clientId={data.config.googleClientId} size="medium" /></span>
			{/if}
		</div>
		<button class="menu btn btn-ghost btn-sm" aria-label="תפריט" onclick={() => (menuOpen = !menuOpen)}>☰</button>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer class="container foot faint">
	<p>
		אתר עצמאי, לא קשור לאף מפלגה. כתובת המייל משמשת למניעת הצבעות בוטים, ולא יעשה בה שום שימוש.
		ממוצע התחזיות אינו סקר דעת קהל.
	</p>
	<div class="credits">
		<span>פיתוח: <a href="https://x.com/yairwein" target="_blank" rel="noopener noreferrer" dir="ltr">@yairwein</a> ב-X</span>
		<span aria-hidden="true">·</span>
		<a href="https://github.com/yairwein/israel-election-predictions" target="_blank" rel="noopener noreferrer" class="gh">
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
			קוד פתוח ב-GitHub (MIT)
		</a>
	</div>
</footer>

<style>
	.top {
		position: sticky; top: 0; z-index: 20;
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: saturate(180%) blur(14px);
		-webkit-backdrop-filter: saturate(180%) blur(14px);
		border-bottom: 1px solid var(--border);
	}
	.bar { display: flex; align-items: center; gap: 20px; height: 64px; }
	.brand { display: flex; align-items: center; gap: 10px; color: var(--text); font-weight: 600; text-decoration: none !important; white-space: nowrap; }
	.brand b { color: var(--accent); }
	nav { display: flex; gap: 4px; flex: 1; }
	nav a { color: var(--muted); padding: 6px 12px; border-radius: 999px; font-weight: 500; text-decoration: none !important; }
	nav a:hover { color: var(--text); background: var(--surface-2); }
	nav a.active { color: var(--text); background: var(--surface-2); }
	.auth { display: flex; align-items: center; gap: 8px; }
	.dev { background: #fff3d6; color: #8a5a00; }
	.menu { display: none; }
	main { min-height: calc(100vh - 200px); }
	.credits { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 4px; }
	.credits a { color: var(--muted); font-weight: 600; }
	.credits a:hover { color: var(--text); }
	.gh { display: inline-flex; align-items: center; gap: 6px; }
	.foot { font-size: 0.82rem; padding-top: 24px; padding-bottom: 40px; border-top: 1px solid var(--border); margin-top: 40px; }

	.navout { display: none; }
	@media (max-width: 760px) {
		.bar { gap: 10px; height: 56px; }
		.navout {
			display: block; text-align: start; background: none; border: 0; color: var(--bad); padding: 10px 12px; cursor: pointer;
		}
		.auth .btn { display: none; }
		.auth .pill { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; }
		.devnick { display: none; }
		.brand { min-width: 0; flex: 1; }
		.brand span { overflow: hidden; text-overflow: ellipsis; }
		.auth { min-width: 0; }
		.gwrap { display: none; }
		.brand span { font-size: 0.95rem; }
		.menu { display: inline-flex; }
		nav {
			display: none; position: absolute; top: 56px; inset-inline: 0; flex-direction: column;
			background: var(--surface); border-bottom: 1px solid var(--border); padding: 8px 16px 14px; box-shadow: var(--shadow);
		}
		nav.open { display: flex; }
		nav a { padding: 12px; font-size: 1.05rem; }
		.auth { margin-inline-start: auto; }
	}
</style>
