<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import BlocOdds from '$lib/components/BlocOdds.svelte';
	import PartyBars from '$lib/components/PartyBars.svelte';
	import Hemicycle from '$lib/components/Hemicycle.svelte';
	import Histogram from '$lib/components/Histogram.svelte';
	import BlocBalance from '$lib/components/BlocBalance.svelte';
	import ScenarioToggle from '$lib/components/ScenarioToggle.svelte';
	import { scenario } from '$lib/scenario.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import ExtremesToggle from '$lib/components/ExtremesToggle.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';
	import { extremes } from '$lib/extremes.svelte';
	import { fmtDateTime, fmtShort, one } from '$lib/format';

	let { data } = $props();
	const s = $derived(data.summary);
	const agg = $derived(s.aggregate);
	const allocation = $derived(agg ? (extremes.include ? agg.fullAllocation : agg.meanAllocation) : null);
	const turnoutMean = $derived(agg?.turnout ? (extremes.include ? agg.turnout.full.mean : agg.turnout.mean) : 0);
	const turnoutMargin = $derived(agg?.turnout ? (extremes.include ? agg.turnout.full.margin : agg.turnout.margin) : 0);
	const trimPct = $derived(Math.round((agg?.trim ?? 0.1) * 100));
	const lockDay = $derived(
		new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric' }).format(new Date(s.lockAt))
	);
	const lockTime = $derived(
		new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' }).format(new Date(s.lockAt))
	);

	onMount(() => {
		const t = setInterval(() => invalidate('app:summary'), 30_000);
		return () => clearInterval(t);
	});
</script>

<svelte:head><title>ממוצע התחזיות · תחזית הבחירות 2026</title></svelte:head>

<div class="container">
	<section class="hero">
		<div>
			<div class="eyebrow">הבחירות לכנסת ה-26 · {fmtDateTime(s.electionAt)}</div>
			<h1>ממוצע התחזיות</h1>
			<p class="muted">ממוצע כל התחזיות, עם טווחי טעות. מתעדכן כל 30 שניות.</p>
		</div>
		<div class="stats">
			<div class="stat">
				<div class="v"><span class="num">{s.n.toLocaleString('he-IL')}</span></div>
				<div class="l">חזאים וחזאיות</div>
			</div>
			{#if agg?.turnout}
				<div class="stat">
					<div class="v"><span class="num">{one(turnoutMean)}%</span></div>
					<div class="l">
						אחוז הצבעה צפוי
						{#if agg.turnout.n > 1 && turnoutMargin >= 0.05}<span class="num faint">±{one(turnoutMargin)}</span>{/if}
					</div>
				</div>
			{/if}
			<div class="stat">
				{#if s.locked}
					<div class="v">🔒</div>
					<div class="l">התחזיות נעולות</div>
				{:else}
					<div class="v"><span class="num">{lockDay}</span></div>
					<div class="l">ננעל ב-<span class="num">{lockTime}</span></div>
				{/if}
			</div>
		</div>
	</section>

	{#if agg && s.n > 0 && !s.hidden}
		<div class="xtrow"><ExtremesToggle {trimPct} /></div>
	{/if}

	{#if s.hidden}
		<div class="card empty">
			<h2>התוצאות מוסתרות עד {s.hiddenUntil ? fmtDateTime(s.hiddenUntil) : 'מועד מאוחר יותר'}</h2>
			<p class="muted">בינתיים אפשר להוסיף או לעדכן תחזית.</p>
			<a class="btn btn-primary" href="/predict">לתחזית שלי</a>
		</div>
	{:else if !agg || s.n === 0}
		<div class="card empty">
			<h2>עדיין אין תחזיות</h2>
			<p class="muted">היו הראשונים.</p>
			<a class="btn btn-primary" href="/predict">להוסיף תחזית</a>
		</div>
	{:else}
		<div class="section">
			<BlocOdds scenarios={agg.scenarios} n={s.n} />
		</div>

		<div class="grid grid-2 section">
			<div class="card">
				<div class="eyebrow">הכנסת לפי ממוצע התחזיות</div>
				<h3 class="ttl">חלוקת 120 המנדטים</h3>
				<Hemicycle seats={allocation ?? agg.meanAllocation} label="ממוצע התחזיות" legend />
				<p class="note faint">הממוצע מעוגל לכנסת של 120, מפלגות שממוצען מתחת לאחוז החסימה לא מקבלות מושבים.</p>
			</div>
			<div class="card">
				<div class="eyebrow">ממוצע הגושים</div>
				<h3 class="ttl">איך מתחלקים 120 המנדטים?</h3>
				<div class="tgl"><ScenarioToggle full /></div>
				{#each agg.scenarios.filter((x) => x.id === scenario.id) as sc (sc.id)}
					<BlocBalance {sc} />
					{#if s.n >= 10}
						<details class="dist">
							<summary>התפלגות: כמה מנדטים נתנו לגוש נתניהו</summary>
							<Histogram data={sc.histogram} />
						</details>
					{/if}
				{/each}
			</div>
		</div>

		<div class="card section">
			<div class="eyebrow">לפי מפלגה</div>
			<h3 class="ttl">מנדטים צפויים</h3>
			<PartyBars parties={agg.parties} includeExtremes={extremes.include} />
		</div>

		{#if data.trend.length >= 2}
			<div class="card section">
				<div class="eyebrow">יציבות התחזית</div>
				<h3 class="ttl">איך הממוצע השתנה ככל שנוספו תחזיות</h3>
				<TrendChart trend={data.trend} includeExtremes={extremes.include} />
			</div>
		{/if}

		<div class="card section">
			<div class="eyebrow">שתפו</div>
			<h3 class="ttl">הזמינו חברים להוסיף תחזית</h3>
			<ShareButtons
				url={`${data.origin}/results`}
				text={`ממוצע התחזיות לבחירות 2026, על סמך ${s.n.toLocaleString('he-IL')} תחזיות. מה התחזית שלכם?`}
				image="/og/average"
				story="/og/average?format=story"
				filename="elections-2026-average"
			/>
		</div>

		{#if data.recent.length}
			<div class="card section">
				<div class="recent-head">
					<div>
						<div class="eyebrow">פעילות אחרונה</div>
						<h3 class="ttl">תחזיות אחרונות</h3>
					</div>
					<a class="btn btn-ghost btn-sm dl" href="/api/predictions.csv" download>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0-5-5m5 5 5-5M5 19h14"/></svg>
						הורדת כל הנתונים (CSV)
					</a>
				</div>
				<ul class="recent">
					{#each data.recent as r}
						<li>
							<span class="nick">{r.nickname}</span>
							<span class="mini num" title="גוש נתניהו / אופוזיציה / מפלגות ערביות">
								<b style="color: var(--coalition)">{scenario.id === 'with_amcha' ? r.coalition : r.coalitionCore}</b> · <b style="color: var(--opposition)">{r.opposition}</b> · <b class="faint">{r.arab}</b>
							</span>
							<span class="faint when">{fmtShort(r.updatedAt)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>

<style>
	.hero { display: flex; justify-content: space-between; align-items: end; gap: 20px; padding: 36px 0 8px; flex-wrap: wrap; }
	h1 { font-size: 2.4rem; font-weight: 800; margin: 4px 0; }
	.stats { display: flex; gap: 12px; flex-wrap: wrap; }
	.stat {
		background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 12px 16px; min-width: 120px;
		display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 4px; text-align: center;
	}
	.stat .v { font-size: 1.6rem; font-weight: 800; line-height: 1.1; height: 1.8rem; display: flex; align-items: center; }
	.stat .l { font-size: 0.8rem; color: var(--muted); line-height: 1.3; }
	.empty { text-align: center; padding: 48px 22px; margin: 28px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
	.ttl { font-size: 1.15rem; font-weight: 700; margin: 2px 0 14px; }
	.note { font-size: 0.78rem; margin: 10px 0 0; }
	.tgl { margin-bottom: 14px; }
	.xtrow {
		margin: 18px 0 0; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
	}
	.dist { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 12px; }
	.dist summary { cursor: pointer; font-weight: 600; font-size: 0.9rem; color: var(--muted); margin-bottom: 10px; }
	.recent-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
	.recent-head .ttl { margin-bottom: 10px; }
	.dl { gap: 6px; }
	.recent { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0 24px; }
	.recent li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
	.nick { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.when { font-size: 0.78rem; }
	.mini { font-size: 0.9rem; }
	@media (max-width: 560px) {
		.hero { padding-top: 20px; }
		h1 { font-size: 1.8rem; }
		.stats { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
		.stat { min-width: 0; padding: 10px 6px; }
		.stat .v { font-size: 1.3rem; height: 1.5rem; }
		.stat .l { font-size: 0.72rem; }
		.recent { grid-template-columns: 1fr; }
	}
</style>
