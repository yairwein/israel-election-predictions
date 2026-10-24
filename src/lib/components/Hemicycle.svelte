<script lang="ts">
	import { hemicycle, SPECTRUM } from '$lib/hemicycle';
	import { PARTY_BY_ID, TOTAL_SEATS, type Seats } from '$lib/parties';

	let { seats, label = '' }: { seats: Seats; label?: string } = $props();
	const geo = hemicycle(TOTAL_SEATS);

	const colors = $derived.by(() => {
		const out: string[] = [];
		// Draw right-to-left (Hebrew reading order): the spectrum is listed left → right.
		for (const id of SPECTRUM) for (let i = 0; i < (seats[id] ?? 0); i++) out.push(PARTY_BY_ID[id]?.color ?? '#999');
		while (out.length < TOTAL_SEATS) out.push('var(--border)');
		return out.slice(0, TOTAL_SEATS);
	});
	const total = $derived(Object.values(seats).reduce((a, b) => a + b, 0));
</script>

<svg viewBox="-1.05 -1.05 2.1 1.12" role="img" aria-label={label || `כנסת: ${total} מנדטים`}>
	{#each geo.points as p, i}
		<circle cx={p.x} cy={p.y} r={geo.r} fill={colors[i]} style="transition: fill 0.25s" />
	{/each}
	<text x="0" y="-0.08" text-anchor="middle" class="big">{total}</text>
	<text x="0" y="0.04" text-anchor="middle" class="small">{label || 'מנדטים'}</text>
</svg>

<style>
	svg { width: 100%; height: auto; display: block; }
	.big { font-size: 0.22px; font-weight: 800; fill: var(--text); }
	.small { font-size: 0.075px; fill: var(--muted); }
</style>
