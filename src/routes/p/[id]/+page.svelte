<script lang="ts">
	import Hemicycle from '$lib/components/Hemicycle.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { blocLines, shareText, sharePath } from '$lib/share';
	import { fmtShort } from '$lib/format';

	let { data } = $props();
	const p = $derived(data.prediction);
	const mine = $derived(data.me.publicId === p.publicId);
	const lines = $derived(blocLines(p.seats));
</script>

<div class="container wrap">
	<div class="card main">
		<div class="eyebrow">הבחירות לכנסת ה-26</div>
		<h1>{mine ? 'התחזית שלי' : `התחזית של ${p.nickname}`}</h1>
		<Hemicycle seats={p.seats} label="מנדטים" legend />
		<div class="blocs">
			{#each lines as l}
				<div class="bl"><span class="dot" style="background: {l.color}"></span><span>{l.label}</span><b class="num">{l.seats}</b></div>
			{/each}
			{#if p.turnout}<div class="bl"><span></span><span class="muted">אחוז הצבעה</span><b class="num">{p.turnout}%</b></div>{/if}
		</div>
		<p class="faint small">עודכן {fmtShort(p.updatedAt)}</p>
	</div>

	<div class="card cta">
		{#if mine}
			<h2>שתפו</h2>
			<ShareButtons
				url={`${data.origin}${sharePath(p.publicId, p.version)}`}
				text={shareText(p.seats, p.nickname, true)}
				image={`/og/p/${p.publicId}?v=${p.version}`}
				filename="my-elections-2026-prediction.png"
			/>
			<a class="btn btn-ghost" href="/predict">עריכת התחזית</a>
		{:else}
			<h2>ומה התחזית שלכם?</h2>
			<p class="muted">חלקו 120 מנדטים ובדקו מי צדק ב-27.10.</p>
			<a class="btn btn-primary" href="/predict">להוסיף תחזית</a>
			<a class="btn btn-ghost" href="/results">לממוצע התחזיות</a>
		{/if}
	</div>
</div>

<style>
	.wrap { max-width: 640px; padding-top: 24px; display: flex; flex-direction: column; gap: 16px; }
	h1 { font-size: 1.8rem; font-weight: 800; margin: 4px 0 12px; }
	h2 { font-size: 1.25rem; font-weight: 700; }
	.blocs { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
	.bl { display: grid; grid-template-columns: 14px 1fr auto; gap: 8px; align-items: center; }
	.bl b { font-size: 1.15rem; }
	.small { font-size: 0.8rem; margin: 10px 0 0; }
	.cta { display: flex; flex-direction: column; gap: 10px; }
	.cta p { margin: 0; }
</style>
