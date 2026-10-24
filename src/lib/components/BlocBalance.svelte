<script lang="ts">
	import type { ScenarioStats } from '$lib/model';
	import { TOTAL_SEATS, MAJORITY } from '$lib/parties';
	import { one } from '$lib/format';

	/**
	 * Average split of the 120 seats between the blocs, right to left:
	 * Netanyahu bloc from the right edge, opposition from the left edge, the rest in the middle.
	 * Whoever crosses the middle line has a majority. Shaded edges = 10%–90% range of the predictions.
	 */
	let { sc }: { sc: ScenarioStats } = $props();

	const pct = (v: number) => `${(v / TOTAL_SEATS) * 100}%`;
	const segs = $derived(
		[
			{ key: 'coalition', label: 'גוש נתניהו', v: sc.coalitionSeats, color: 'var(--coalition)' },
			{ key: 'amcha', label: 'עמך ישראל', v: sc.unalignedSeats, color: '#c49a2c' },
			{ key: 'arab', label: 'מפלגות ערביות', v: sc.arabSeats, color: 'var(--neither)' },
			{ key: 'opposition', label: 'אופוזיציה', v: sc.oppositionSeats, color: 'var(--opposition)' }
		].filter((s) => s.key !== 'amcha' || s.v.mean > 0.05)
	);
	const coal = $derived(sc.coalitionSeats);
	const opp = $derived(sc.oppositionSeats);
</script>

<div class="bb">
	<div class="track" role="img" aria-label="ממוצע הגושים: גוש נתניהו {one(coal.mean)}, אופוזיציה {one(opp.mean)}">
		<div class="bar">
			{#each segs as s (s.key)}
				<div class="seg" style="width: {pct(s.v.mean)}; background: {s.color}" title="{s.label}: {one(s.v.mean)}">
					{#if s.v.mean >= 9}<span class="num">{Math.round(s.v.mean)}</span>{/if}
				</div>
			{/each}
		</div>
		<!-- 10%–90% range of where each big bloc ends -->
		<div class="range" style="inset-inline-start: {pct(coal.p10)}; width: {pct(Math.max(0.6, coal.p90 - coal.p10))}" title="גוש נתניהו: {one(coal.p10)}–{one(coal.p90)}"></div>
		<div class="range" style="inset-inline-end: {pct(opp.p10)}; width: {pct(Math.max(0.6, opp.p90 - opp.p10))}" title="אופוזיציה: {one(opp.p10)}–{one(opp.p90)}"></div>
		<div class="mid" style="inset-inline-start: {pct(MAJORITY - 0.5)}"><span>61</span></div>
	</div>

	<div class="rows">
		{#each segs as s (s.key)}
			<div class="row">
				<span class="dot" style="background: {s.color}"></span>
				<span class="lbl">{s.label}</span>
				<b class="num" class:maj={(s.key === 'coalition' || s.key === 'opposition') && s.v.mean >= MAJORITY}>{one(s.v.mean)}</b>
				<span class="faint num rng">{one(s.v.p10)}–{one(s.v.p90)}</span>
			</div>
		{/each}
	</div>
	<p class="note faint">
		הפס מראה את ממוצע המנדטים של כל גוש. גוש שחוצה את הקו האמצעי (61) מגיע לרוב. הטווח בצד: 80% מהתחזיות נמצאות בו.
	</p>
</div>

<style>
	.bb { display: flex; flex-direction: column; gap: 14px; }
	.track { position: relative; padding: 18px 0 10px; }
	.bar { display: flex; height: 40px; border-radius: 10px; overflow: hidden; background: var(--surface-2); }
	.seg { height: 100%; display: flex; align-items: center; justify-content: center; transition: width 0.4s ease; min-width: 0; }
	.seg span { color: #fff; font-weight: 800; font-size: 0.95rem; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
	.range {
		position: absolute; bottom: 2px; height: 5px; border-radius: 3px; background: var(--text); opacity: 0.35;
	}
	.mid { position: absolute; top: 0; bottom: 0; width: 0; border-inline-start: 2px dashed var(--text); }
	.mid span {
		position: absolute; top: -2px; transform: translateX(50%); inset-inline-start: 0;
		font-size: 0.75rem; font-weight: 800; background: var(--surface); padding: 0 4px; line-height: 1.2;
	}
	.rows { display: flex; flex-direction: column; gap: 6px; }
	.row { display: grid; grid-template-columns: 14px 1fr auto 76px; gap: 8px; align-items: center; font-size: 0.94rem; }
	.row b { font-size: 1.05rem; }
	.rng { font-size: 0.78rem; text-align: left; }
	.maj { color: var(--good); }
	.note { font-size: 0.78rem; margin: 0; }
</style>
