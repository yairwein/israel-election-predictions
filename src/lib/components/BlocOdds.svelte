<script lang="ts">
	import type { ScenarioStats } from '$lib/model';
	import { pct } from '$lib/format';

	let { scenarios, n }: { scenarios: ScenarioStats[]; n: number } = $props();
	let active = $state<'with_amcha' | 'without_amcha'>('with_amcha');
	const sc = $derived(scenarios.find((s) => s.id === active)!);
	const other = $derived(scenarios.find((s) => s.id !== active)!);

	const rows = $derived([
		{
			key: 'coalition',
			title: 'גוש נתניהו 61+',
			sub: active === 'with_amcha'
				? 'הליכוד, ש״ס, עוצמה יהודית, הציונות הדתית, יהדות התורה + עמך ישראל'
				: 'הליכוד, ש״ס, עוצמה יהודית, הציונות הדתית, יהדות התורה (בלי עמך ישראל)',
			o: sc.coalition,
			seats: sc.coalitionSeats,
			color: 'var(--coalition)'
		},
		{
			key: 'opposition',
			title: 'גוש האופוזיציה 61+',
			sub: active === 'with_amcha'
				? 'כל השאר, ללא המפלגות הערביות'
				: 'כל השאר כולל עמך ישראל, ללא המפלגות הערביות',
			o: sc.opposition,
			seats: sc.oppositionSeats,
			color: 'var(--opposition)'
		},
		{
			key: 'neither',
			title: 'אין 61 בלי מפלגה ערבית',
			sub: 'אף גוש לא מגיע ל-61 בלי שיתוף פעולה עם רע״ם או הרשימה המשותפת',
			o: sc.neither,
			seats: sc.arabSeats,
			color: 'var(--neither)'
		}
	]);
</script>

<div class="card odds">
	<div class="head">
		<div>
			<div class="eyebrow">סיכויים לפי תחזית הקהל</div>
			<h2>מי יגיע ל-61?</h2>
		</div>
		<div class="seg" role="tablist" aria-label="שיוך עמך ישראל">
			<button role="tab" aria-selected={active === 'with_amcha'} class:on={active === 'with_amcha'} onclick={() => (active = 'with_amcha')}>
				כולל עמך ישראל
			</button>
			<button role="tab" aria-selected={active === 'without_amcha'} class:on={active === 'without_amcha'} onclick={() => (active = 'without_amcha')}>
				בלי עמך ישראל
			</button>
		</div>
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
			{#if active === 'with_amcha'}
				בלי עמך ישראל: גוש נתניהו <b class="num">{pct(other.coalition.share)}</b>, אופוזיציה <b class="num">{pct(other.opposition.share)}</b>, אין 61 <b class="num">{pct(other.neither.share)}</b>.
			{:else}
				כולל עמך ישראל: גוש נתניהו <b class="num">{pct(other.coalition.share)}</b>, אופוזיציה <b class="num">{pct(other.opposition.share)}</b>, אין 61 <b class="num">{pct(other.neither.share)}</b>.
			{/if}
			הסיכוי = שיעור התחזיות שבהן זה קורה. בסוגריים: רווח סמך 95%.
		</p>
	{/if}
</div>

<style>
	.odds { display: flex; flex-direction: column; gap: 18px; }
	.head { display: flex; justify-content: space-between; align-items: end; gap: 12px; flex-wrap: wrap; }
	h2 { font-size: 1.5rem; font-weight: 800; }
	.seg { display: inline-flex; background: var(--surface-2); border-radius: 999px; padding: 4px; }
	.seg button {
		border: 0; background: transparent; color: var(--muted); padding: 6px 14px; border-radius: 999px;
		cursor: pointer; font-weight: 600; font-size: 0.88rem;
	}
	.seg button.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
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
		.seg { width: 100%; }
		.seg button { flex: 1; padding: 8px 6px; }
		.row { gap: 10px; }
		.p { font-size: 1.6rem; }
		.s { font-size: 0.78rem; }
	}
</style>
