<script lang="ts">
	import { MAJORITY } from '$lib/parties';

	let { data }: { data: { seats: number; count: number }[] } = $props();
	const lo = $derived(Math.min(44, ...data.map((d) => d.seats)));
	const hi = $derived(Math.max(76, ...data.map((d) => d.seats)));
	const max = $derived(Math.max(1, ...data.map((d) => d.count)));
	const bins = $derived(
		Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((s) => ({ s, c: data.find((d) => d.seats === s)?.count ?? 0 }))
	);
</script>

<div class="hist" dir="ltr">
	<div class="cols">
		{#each bins as b}
			<div class="col" title="{b.s} מנדטים: {b.c}">
				<div class="b" class:win={b.s >= MAJORITY} style="height: {(b.c / max) * 100}%"></div>
			</div>
		{/each}
	</div>
	<div class="axis num">
		<span>{lo}</span>
		<span class="mid" style="left: {((MAJORITY - lo) / (hi - lo + 1)) * 100}%">61</span>
		<span>{hi}</span>
	</div>
</div>

<style>
	.hist { width: 100%; }
	.cols { display: flex; align-items: flex-end; height: 120px; gap: 2px; border-bottom: 1px solid var(--border); }
	.col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
	.b { width: 100%; background: var(--opposition); border-radius: 3px 3px 0 0; min-height: 0; transition: height 0.4s; }
	.b.win { background: var(--coalition); }
	.axis { position: relative; display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--faint); margin-top: 4px; }
	.mid { position: absolute; transform: translateX(-50%); color: var(--text); font-weight: 700; }
</style>
