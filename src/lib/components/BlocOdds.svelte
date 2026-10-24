<script lang="ts">
	import type { ScenarioStats } from '$lib/model';
	import { pct } from '$lib/format';
	import ScenarioToggle from './ScenarioToggle.svelte';
	import { scenario, SCENARIO_LABELS } from '$lib/scenario.svelte';

	let { scenarios, n }: { scenarios: ScenarioStats[]; n: number } = $props();
	const active = $derived(scenario.id);
	const sc = $derived(scenarios.find((s) => s.id === active)!);
	const other = $derived(scenarios.find((s) => s.id !== active)!);

	const rows = $derived([
		{
			key: 'coalition',
			title: 'גוש נתניהו 61+',
			sub: active === 'with_amcha'
				? 'הליכוד, ש״ס, עוצמה יהודית, הציונות הדתית, נועם, יהדות התורה + עמך ישראל'
				: 'הליכוד, ש״ס, עוצמה יהודית, הציונות הדתית, נועם, יהדות התורה',
			o: sc.coalition,
			seats: sc.coalitionSeats,
			color: 'var(--coalition)'
		},
		{
			key: 'opposition',
			title: 'גוש האופוזיציה 61+',
			sub: active === 'with_amcha'
				? 'כל השאר, ללא המפלגות הערביות'
				: 'כל השאר, ללא המפלגות הערביות ועמך ישראל',
			o: sc.opposition,
			seats: sc.oppositionSeats,
			color: 'var(--opposition)'
		},
		{
			key: 'neither',
			title: active === 'with_amcha' ? 'אין 61 בלי מפלגה ערבית' : 'אין 61 בלי מפלגה ערבית או עמך ישראל',
			sub: active === 'with_amcha'
				? 'אף גוש לא מגיע ל-61 בלי שיתוף פעולה עם רע״ם או הרשימה המשותפת'
				: 'אף גוש לא מגיע ל-61 בלי רע״ם, הרשימה המשותפת או עמך ישראל',
			o: sc.neither,
			seats: sc.arabSeats,
			color: 'var(--neither)'
		}
	]);
</script>

<div class="card odds">
	<div class="head">
		<div>
			<div class="eyebrow">סיכויים לפי ממוצע התחזיות</div>
			<h2>מי יגיע ל-61?</h2>
		</div>
		<ScenarioToggle />
	</div>

	<div class="stack" aria-hidden="true">
		{#each rows as r}
			{#if r.o.share > 0}
				<div style="flex: {r.o.share}; background: {r.color}" title="{r.title}: {pct(r.o.share)}"></div>
			{/if}
		{/each}
		{#if n === 0}<div style="flex: 1; background: var(--surface-2)"></div>{/if}
	</div>

	<div class="rows">
		{#each rows as r}
			<div class="row">
				<span class="swatch" style="background: {r.color}"></span>
				<div class="txt">
					<div class="t">{r.title}</div>
					<div class="s">{r.sub}</div>
				</div>
				<div class="val">
					<div class="p num">{n ? pct(r.o.share) : '—'}</div>
					{#if n > 1}
						<div class="ci num" title="רווח סמך 95%">{pct(r.o.ci.lo)}–{pct(r.o.ci.hi)}</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if n}
		<p class="foot">
			כש{SCENARIO_LABELS[other.id]}: גוש נתניהו <b class="num">{pct(other.coalition.share)}</b>, אופוזיציה <b class="num">{pct(other.opposition.share)}</b>, אין 61 <b class="num">{pct(other.neither.share)}</b>.
			הסיכוי = שיעור התחזיות שבהן זה קורה. בסוגריים: רווח סמך 95%.
		</p>
	{/if}
</div>

<style>
	.odds { display: flex; flex-direction: column; gap: 18px; }
	.head { display: flex; justify-content: space-between; align-items: end; gap: 12px; flex-wrap: wrap; }
	h2 { font-size: 1.5rem; font-weight: 800; }
	.stack { display: flex; height: 14px; border-radius: 999px; overflow: hidden; gap: 2px; background: var(--surface-2); }
	.stack div { transition: flex 0.4s ease; }
	.rows { display: flex; flex-direction: column; }
	.row { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-top: 1px solid var(--border); }
	.row:first-child { border-top: 0; padding-top: 4px; }
	.swatch { width: 12px; height: 40px; border-radius: 6px; flex: none; }
	.txt { flex: 1; min-width: 0; }
	.t { font-weight: 700; font-size: 1.05rem; }
	.s { color: var(--muted); font-size: 0.84rem; }
	.val { text-align: left; }
	.p { font-size: 2rem; font-weight: 800; line-height: 1; }
	.ci { font-size: 0.78rem; color: var(--faint); margin-top: 4px; }
	.foot { font-size: 0.82rem; color: var(--muted); margin: 0; }
	@media (max-width: 560px) {
		h2 { font-size: 1.3rem; }
		.row { gap: 10px; }
		.p { font-size: 1.6rem; }
		.s { font-size: 0.78rem; }
	}
</style>
