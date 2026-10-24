<script lang="ts">
	import Countdown from '$lib/components/Countdown.svelte';
	import Hemicycle from '$lib/components/Hemicycle.svelte';
	import GoogleButton from '$lib/components/GoogleButton.svelte';
	import { POLL_AVERAGE } from '$lib/parties';
	import { fmtDateTime, pct } from '$lib/format';
	import ScenarioToggle from '$lib/components/ScenarioToggle.svelte';
	import { scenario } from '$lib/scenario.svelte';

	let { data } = $props();
	const s = $derived(data.summary);
	const me = $derived(data.me);
	const sc = $derived(s.aggregate?.scenarios.find((x) => x.id === scenario.id));
	const canPredict = $derived(me.signedIn || me.devUser);
</script>

<div class="container">
	<section class="hero">
		<div class="copy">
			<span class="pill">הבחירות לכנסת ה-26 · {fmtDateTime(s.electionAt)}</span>
			<h1>מה יהיו התוצאות?<br /><span class="accent">חוכמת ההמונים.</span></h1>
			<p class="lead">
				חלקו 120 מנדטים בין המפלגות. אנחנו נשקלל את כל התחזיות ונחשב מה הסיכוי של כל גוש להגיע ל-61.
			</p>

			{#if s.locked}
				<div class="lock card">🔒 התחזיות ננעלו ב{fmtDateTime(s.lockAt)}. <a href="/results">לממוצע התחזיות ←</a></div>
			{:else}
				<div class="cta">
					{#if canPredict}
						<a class="btn btn-primary" href="/predict">{me.prediction ? 'עדכון התחזית שלי' : 'להוסיף תחזית'}</a>
					{:else}
						<GoogleButton clientId={data.config.googleClientId} />
					{/if}
					<a class="btn btn-ghost" href="/results">לממוצע התחזיות</a>
				</div>
				{#if !canPredict}
					<p class="faint small">ההתחברות עם Google נועדה למנוע הצבעות בוטים, ולא יעשה במייל שום שימוש. בוחרים כינוי או מקבלים כינוי אקראי.</p>
				{/if}
				<div class="countdown">
					<div class="eyebrow">אפשר לשנות את התחזית עד הנעילה, 12 שעות לפני פתיחת הקלפיות</div>
					<Countdown to={s.lockAt} />
				</div>
			{/if}
		</div>

		<div class="visual card">
			{#if s.aggregate && s.n > 0 && !s.hidden}
				<Hemicycle seats={s.aggregate.meanAllocation} label="ממוצע התחזיות" legend />
				<div class="tgl"><ScenarioToggle full /></div>
				<div class="summary">
					<div><span class="num big" style="color: var(--coalition)">{pct(sc?.coalition.share ?? 0)}</span><span>גוש נתניהו 61+</span></div>
					<div><span class="num big" style="color: var(--opposition)">{pct(sc?.opposition.share ?? 0)}</span><span>אופוזיציה 61+</span></div>
					<div><span class="num big" style="color: var(--neither)">{pct(sc?.neither.share ?? 0)}</span><span>אין 61 בלי שיתוף פעולה עם המפלגות הערביות</span></div>
				</div>
				<p class="faint small center">על סמך {s.n.toLocaleString('he-IL')} תחזיות</p>
			{:else}
				<Hemicycle seats={POLL_AVERAGE} label="ממוצע הסקרים" legend />
				<p class="faint small center">ממוצע 12 הסקרים האחרונים (16–22.10). ממוצע התחזיות יופיע כאן.</p>
			{/if}
		</div>
	</section>

	<section class="grid grid-3 section steps">
		<div class="card">
			<div class="n">1</div>
			<h3>מתחברים</h3>
			<p class="muted">עם חשבון Google, כדי למנוע הצבעות בוטים. לא יעשה במייל שום שימוש.</p>
		</div>
		<div class="card">
			<div class="n">2</div>
			<h3>מחלקים 120 מנדטים</h3>
			<p class="muted">אפשר להתחיל מממוצע הסקרים ולשנות. ואפשר לעדכן עד יום שני ב-19:00.</p>
		</div>
		<div class="card">
			<div class="n">3</div>
			<h3>משפיעים על ממוצע התחזיות</h3>
			<p class="muted">כל תחזית נכנסת לממוצע, לטווחי הטעות ולסיכוי של כל גוש להגיע ל-61.</p>
		</div>
	</section>
</div>

<style>
	.hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 40px; align-items: center; padding: 48px 0 16px; }
	h1 { font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 800; margin: 16px 0 12px; letter-spacing: -0.02em; }
	.accent { color: var(--accent); }
	.lead { font-size: 1.15rem; color: var(--muted); max-width: 34em; margin: 0 0 22px; }
	.cta { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
	.small { font-size: 0.82rem; }
	.center { text-align: center; margin: 8px 0 0; }
	.countdown { margin-top: 28px; display: flex; flex-direction: column; gap: 10px; }
	.lock { padding: 14px 18px; }
	.visual { padding: 24px; }
	.tgl { margin-top: 14px; }
	.summary { display: grid; grid-template-columns: 1fr 1fr 1.35fr; gap: 6px; margin-top: 12px; text-align: center; }
	.summary div { display: flex; flex-direction: column; }
	.summary span:last-child { font-size: 0.8rem; color: var(--muted); line-height: 1.3; }
	.summary div:last-child span:last-child { font-size: 0.74rem; text-wrap: balance; }
	.big { font-size: 1.8rem; font-weight: 800; line-height: 1.1; }
	.steps h3 { font-size: 1.1rem; margin: 10px 0 4px; }
	.steps p { margin: 0; font-size: 0.94rem; }
	.n {
		width: 32px; height: 32px; border-radius: 50%; background: var(--surface-2); color: var(--accent);
		display: grid; place-items: center; font-weight: 800;
	}
	@media (max-width: 860px) {
		.hero { grid-template-columns: 1fr; gap: 24px; padding-top: 28px; }
	}
	@media (max-width: 560px) {
		.hero { padding-top: 18px; gap: 18px; }
		.lead { font-size: 1.02rem; margin-bottom: 16px; }
		.cta .btn { flex: 1; padding: 13px 16px; }
		.visual { padding: 16px; }
		.big { font-size: 1.45rem; }
		.countdown { margin-top: 20px; }
	}
</style>
