<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/api';
	import GoogleButton from '$lib/components/GoogleButton.svelte';

	let { data, children } = $props();
	let menuOpen = $state(false);

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
	<title>תחזית הבחירות 2026 · חוכמת ההמונים</title>
	<meta name="description" content="נחשו את תוצאות הבחירות לכנסת ה-26 וראו את התחזית המשוקללת של כולם." />
	<meta property="og:title" content="תחזית הבחירות 2026 · חוכמת ההמונים" />
	<meta property="og:description" content="כמה מנדטים יקבל כל גוש? הוסיפו תחזית וראו את ממוצע התחזיות." />
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
