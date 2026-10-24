<script lang="ts">
	import type { PartyStats } from '$lib/model';
	import { PARTY_BY_ID, POLL_AVERAGE_RAW } from '$lib/parties';
	import { one, pct } from '$lib/format';

	let { parties }: { parties: PartyStats[] } = $props();
	const sorted = $derived([...parties].sort((a, b) => b.mean - a.mean));
	const max = $derived(Math.max(30, ...parties.map((p) => p.p90), ...Object.values(POLL_AVERAGE_RAW)));
	const x = (v: number) => `${(v / max) * 100}%`;
</script>

<div class="bars">
	<div class="legend faint">
		<span><i class="lg-mean"></i>ממוצע הקהל ± טעות</span>
		<span><i class="lg-range"></i>טווח 10%–90%</span>
		<span><i class="lg-poll"></i>ממוצע הסקרים</span>
	</div>
	{#each sorted as p (p.id)}
		{@const party = PARTY_BY_ID[p.id]}
		<div class="row">
			<div class="name">
				<span class="dot" style="background: {party.color}"></span>
				<div>
					<div class="he">{party.he}</div>
					<div class="leader faint">{party.leaderHe}</div>
				</div>
			</div>
			<div class="track" title="10%–90%: {one(p.p10)}–{one(p.p90)} · עוברת אחוז חסימה ב-{pct(p.passShare)} מהתחזיות">
				<div class="range" style="inset-inline-start: {x(p.p10)}; width: calc({x(p.p90)} - {x(p.p10)}); background: {party.color}"></div>
				<div class="bar" style="width: {x(p.mean)}; background: {party.color}"></div>
				{#if p.margin > 0}
					<div class="err" style="inset-inline-start: {x(Math.max(0, p.mean - p.margin))}; width: {x(2 * p.margin)}"></div>
				{/if}
				<div class="poll" style="inset-inline-start: {x(POLL_AVERAGE_RAW[p.id] ?? 0)}"></div>
			</div>
			<div class="val num">
				<b>{one(p.mean)}</b><span class="faint">±{one(p.margin)}</span>
			</div>
		</div>
	{/each}
</div>

<style>
	.bars { display: flex; flex-direction: column; gap: 6px; }
	.legend { display: flex; gap: 16px; font-size: 0.78rem; flex-wrap: wrap; margin-bottom: 6px; }
	.legend span { display: inline-flex; align-items: center; gap: 6px; }
	.legend i { display: inline-block; width: 18px; height: 8px; border-radius: 4px; }
	.lg-mean { background: var(--text); }
	.lg-range { background: var(--text); opacity: 0.18; }
	.lg-poll { width: 2px !important; height: 14px !important; background: var(--text); border-radius: 1px !important; }
	.row { display: grid; grid-template-columns: 170px 1fr 84px; gap: 12px; align-items: center; padding: 6px 0; }
	.name { display: flex; align-items: center; gap: 10px; min-width: 0; }
	.he { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.leader { font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.track { position: relative; height: 22px; background: var(--surface-2); border-radius: 6px; }
	.range { position: absolute; top: 0; bottom: 0; opacity: 0.18; border-radius: 6px; }
	.bar { position: absolute; inset-inline-start: 0; top: 5px; bottom: 5px; border-radius: 4px; transition: width 0.4s ease; }
	.err { position: absolute; top: 2px; bottom: 2px; border: 2px solid var(--text); border-top: 0; border-bottom: 0; opacity: 0.55; }
	.poll { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--text); border-radius: 1px; opacity: 0.7; }
	.val { text-align: left; display: flex; gap: 4px; align-items: baseline; justify-content: flex-end; }
	.val b { font-size: 1.1rem; }
	.val span { font-size: 0.78rem; }
	@media (max-width: 560px) {
		.row { grid-template-columns: 112px 1fr 70px; gap: 8px; }
		.leader { display: none; }
	}
</style>
