<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import BlocOdds from '$lib/components/BlocOdds.svelte';
	import PartyBars from '$lib/components/PartyBars.svelte';
	import Hemicycle from '$lib/components/Hemicycle.svelte';
	import Histogram from '$lib/components/Histogram.svelte';
	import { fmtDateTime, fmtShort, one } from '$lib/format';

	let { data } = $props();
	const s = $derived(data.summary);
	const agg = $derived(s.aggregate);
	let histScenario = $state<'with_amcha' | 'without_amcha'>('with_amcha');

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
				<div class="v num">{s.n.toLocaleString('he-IL')}</div>
				<div class="l">חזאים</div>
			</div>
			{#if agg?.turnout}
				<div class="stat">
					<div class="v num">{one(agg.turnout.mean)}%</div>
					<div class="l">אחוז הצבעה צפוי <span class="num faint">±{one(agg.turnout.margin)}</span></div>
				</div>
			{/if}
			<div class="stat">
				<div class="v">{s.locked ? '🔒' : '✍️'}</div>
				<div class="l">{s.locked ? 'התחזיות נעולות' : `ננעל ${fmtShort(s.lockAt)}`}</div>
			</div>
		</div>
	</section>

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
				<Hemicycle seats={agg.meanAllocation} label="ממוצע התחזיות" />
				<p class="note faint">הממוצע מעוגל לכנסת של 120, מפלגות שממוצען מתחת לאחוז החסימה לא מקבלות מושבים.</p>
			</div>
			<div class="card">
				<div class="head-row">
					<div>
						<div class="eyebrow">התפלגות התחזיות</div>
						<h3 class="ttl">כמה מנדטים לגוש נתניהו?</h3>
					</div>
					<select bind:value={histScenario} aria-label="תרחיש">
						<option value="with_amcha">כולל עמך ישראל</option>
						<option value="without_amcha">בלי עמך ישראל</option>
					</select>
				</div>
				{#each agg.scenarios.filter((x) => x.id === histScenario) as sc}
					<Histogram data={sc.histogram} />
					<div class="blocs">
						<div><span class="dot" style="background: var(--coalition)"></span> גוש נתניהו <b class="num">{one(sc.coalitionSeats.mean)}</b> <span class="faint num">({one(sc.coalitionSeats.p10)}–{one(sc.coalitionSeats.p90)})</span></div>
						<div><span class="dot" style="background: var(--opposition)"></span> אופוזיציה <b class="num">{one(sc.oppositionSeats.mean)}</b> <span class="faint num">({one(sc.oppositionSeats.p10)}–{one(sc.oppositionSeats.p90)})</span></div>
						{#if sc.id === 'without_amcha'}
							<div><span class="dot" style="background: #c49a2c"></span> עמך ישראל (בנפרד) <b class="num">{one(sc.unalignedSeats.mean)}</b> <span class="faint num">({one(sc.unalignedSeats.p10)}–{one(sc.unalignedSeats.p90)})</span></div>
						{/if}
						<div><span class="dot" style="background: var(--neither)"></span> מפלגות ערביות <b class="num">{one(sc.arabSeats.mean)}</b> <span class="faint num">({one(sc.arabSeats.p10)}–{one(sc.arabSeats.p90)})</span></div>
					</div>
				{/each}
			</div>
		</div>

		<div class="card section">
			<div class="eyebrow">לפי מפלגה</div>
			<h3 class="ttl">מנדטים צפויים</h3>
			<PartyBars parties={agg.parties} />
		</div>

		{#if data.recent.length}
			<div class="card section">
				<div class="eyebrow">פעילות אחרונה</div>
				<h3 class="ttl">תחזיות אחרונות</h3>
				<ul class="recent">
					{#each data.recent as r}
						<li>
							<span class="nick">{r.nickname}</span>
							<span class="mini num" title="גוש נתניהו (כולל עמך ישראל) / אופוזיציה / ערביות">
								<b style="color: var(--coalition)">{r.coalition}</b> · <b style="color: var(--opposition)">{r.opposition}</b> · <b class="faint">{r.arab}</b>
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
	.stat { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 10px 16px; min-width: 110px; }
	.stat .v { font-size: 1.6rem; font-weight: 800; line-height: 1.1; }
	.stat .l { font-size: 0.8rem; color: var(--muted); }
	.empty { text-align: center; padding: 48px 22px; margin: 28px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
	.ttl { font-size: 1.15rem; font-weight: 700; margin: 2px 0 14px; }
	.note { font-size: 0.78rem; margin: 10px 0 0; }
	.head-row { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
	select { font: inherit; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); }
	.blocs { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; font-size: 0.92rem; }
	.blocs div { display: flex; align-items: center; gap: 8px; }
	.recent { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0 24px; }
	.recent li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
	.nick { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.when { font-size: 0.78rem; }
	.mini { font-size: 0.9rem; }
	@media (max-width: 560px) {
		.hero { padding-top: 20px; }
		h1 { font-size: 1.8rem; }
		.stats { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
		.stat { min-width: 0; padding: 8px 10px; }
		.stat .v { font-size: 1.25rem; }
		.stat .l { font-size: 0.72rem; }
		.recent { grid-template-columns: 1fr; }
	}
</style>
