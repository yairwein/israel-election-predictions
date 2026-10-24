<script lang="ts">
	import { hemicycle, seatColors, SPECTRUM_RTL } from '$lib/hemicycle';
	import { PARTY_BY_ID, TOTAL_SEATS, type Seats } from '$lib/parties';

	let { seats, label = '', legend = false }: { seats: Seats; label?: string; legend?: boolean } = $props();
	const geo = hemicycle(TOTAL_SEATS);
	const colors = $derived(seatColors(seats, (id) => PARTY_BY_ID[id]?.color ?? '#999', 'var(--border)', TOTAL_SEATS));
	const total = $derived(Object.values(seats).reduce((a, b) => a + b, 0));
	const items = $derived(SPECTRUM_RTL.filter((id) => (seats[id] ?? 0) > 0).map((id) => ({ ...PARTY_BY_ID[id], n: seats[id] })));
</script>

<svg viewBox="-1.05 -1.05 2.1 1.12" role="img" aria-label={label || `כנסת: ${total} מנדטים`}>
	{#each geo.points as p, i}
		<circle cx={p.x} cy={p.y} r={geo.r} fill={colors[i]} style="transition: fill 0.25s" />
	{/each}
	<text x="0" y="-0.08" text-anchor="middle" class="big">{total}</text>
	<text x="0" y="0.04" text-anchor="middle" class="small">{label || 'מנדטים'}</text>
</svg>

{#if legend && items.length}
	<ul class="legend" aria-label="מקרא, מימין לשמאל">
		{#each items as p (p.id)}
			<li><span class="dot" style="background: {p.color}"></span><span class="nm">{p.he}</span><b class="num">{p.n}</b></li>
		{/each}
	</ul>
{/if}

<style>
	svg { width: 100%; height: auto; display: block; }
	.big { font-size: 0.22px; font-weight: 800; fill: var(--text); }
	.small { font-size: 0.075px; fill: var(--muted); }
	.legend {
		list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px;
		font-size: 0.82rem; justify-content: center;
	}
	.legend li { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
	.legend .dot { width: 9px; height: 9px; }
	.legend .nm { color: var(--muted); }
	.legend b { font-weight: 700; }
</style>
