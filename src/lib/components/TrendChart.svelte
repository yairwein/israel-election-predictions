<script lang="ts">
	import type { TrendPoint } from '$lib/model';
	import { PARTY_BY_ID, PARTY_IDS } from '$lib/parties';
	import { one } from '$lib/format';

	/**
	 * Party averages as predictions were added: x = number of predictions, y = seats.
	 * One line per party that matters (average ≥ 1 seat at the end). Lines end with a coloured label.
	 */
	let { trend, includeExtremes = false }: { trend: TrendPoint[]; includeExtremes?: boolean } = $props();

	const W = 360, H = 230;
	const pad = { top: 10, right: 86, bottom: 26, left: 26 };
	const iw = W - pad.left - pad.right;
	const ih = H - pad.top - pad.bottom;

	const val = (p: TrendPoint, id: string) => (includeExtremes ? p.full[id] : p.trimmed[id]) ?? 0;
	const last = $derived(trend.at(-1));
	const nMax = $derived(last?.n ?? 1);
	const shown = $derived(
		last ? PARTY_IDS.filter((id) => val(last, id) >= 1).sort((a, b) => val(last, b) - val(last, a)) : []
	);
	const yMax = $derived(Math.max(10, Math.ceil((Math.max(0, ...trend.flatMap((p) => shown.map((id) => val(p, id)))) + 1) / 5) * 5));
	// Log-like x scale would hide the late part; a plain linear scale shows the settling clearly.
	const x = (n: number) => pad.left + (nMax <= 1 ? iw : ((n - 1) / (nMax - 1)) * iw);
	const y = (v: number) => pad.top + ih - (v / yMax) * ih;

	const lines = $derived(
		shown.map((id) => ({
			id,
			color: PARTY_BY_ID[id].color,
			d: trend.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(val(p, id)).toFixed(1)}`).join(''),
			end: last ? val(last, id) : 0
		}))
	);

	// End labels: spread apart only as much as needed so they don't overlap, staying next to their line.
	const labels = $derived.by(() => {
		const items = lines.map((l) => ({ id: l.id, color: l.color, v: l.end, ly: y(l.end) })).sort((a, b) => a.ly - b.ly);
		const gap = 11;
		const bottom = pad.top + ih + 8;
		// downward pass
		for (let i = 1; i < items.length; i++) items[i].ly = Math.max(items[i].ly, items[i - 1].ly + gap);
		// upward pass from the bottom edge: only items crowded at the bottom move up
		if (items.length) items[items.length - 1].ly = Math.min(items[items.length - 1].ly, bottom);
		for (let i = items.length - 2; i >= 0; i--) items[i].ly = Math.min(items[i].ly, items[i + 1].ly - gap);
		return items;
	});
	// Short names so labels fit beside the chart.
	const SHORT: Record<string, string> = { joint: 'המשותפת', rzp: 'צ. דתית', reservists: 'מילואימניקים', haredi: 'הציבור החרדי' };
	const nameOf = (id: string) => SHORT[id] ?? PARTY_BY_ID[id].he;

	const yTicks = $derived(Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5));
	const xTicks = $derived.by(() => {
		if (nMax < 2) return [1];
		const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find((s) => nMax / s <= 5) ?? 10000;
		const t = [1];
		for (let v = step; v < nMax; v += step) t.push(v);
		if (nMax - t[t.length - 1] > step * 0.4) t.push(nMax);
		return t;
	});

	let hover = $state<TrendPoint | null>(null);
	function onMove(e: PointerEvent) {
		const svg = e.currentTarget as SVGSVGElement;
		const r = svg.getBoundingClientRect();
		const px = ((e.clientX - r.left) / r.width) * W;
		let best = trend[0];
		for (const p of trend) if (Math.abs(x(p.n) - px) < Math.abs(x(best.n) - px)) best = p;
		hover = best;
	}
</script>

{#if trend.length < 2}
	<p class="faint empty">הגרף יופיע אחרי כמה תחזיות.</p>
{:else}
	<div class="wrap" dir="ltr">
		<svg
			viewBox="0 0 {W} {H}" role="img" aria-label="ממוצע המנדטים של כל מפלגה לפי מספר התחזיות"
			onpointermove={onMove} onpointerdown={onMove} onpointerleave={(e) => { if (e.pointerType === 'mouse') hover = null; }}
		>
			{#each yTicks as t}
				<line x1={pad.left} x2={pad.left + iw} y1={y(t)} y2={y(t)} class="grid" />
				<text x={pad.left - 6} y={y(t) + 3} text-anchor="end" class="tick">{t}</text>
			{/each}
			{#each xTicks as t}
				<text x={x(t)} y={H - 8} text-anchor="middle" class="tick">{t}</text>
			{/each}

			{#each lines as l (l.id)}
				<path d={l.d} fill="none" stroke={l.color} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />
			{/each}

			{#each labels as lb (lb.id)}
				{#if Math.abs(lb.ly - y(lb.v)) > 2}
					<path d="M{pad.left + iw + 1},{y(lb.v)} L{pad.left + iw + 5},{lb.ly}" stroke={lb.color} stroke-width="0.8" fill="none" opacity="0.6" />
				{/if}
				<text x={pad.left + iw + 6} y={lb.ly + 3.5} class="lbl" fill={lb.color} text-anchor="start">
					<tspan class="lv">{one(lb.v)}</tspan> <tspan>{nameOf(lb.id)}</tspan>
				</text>
			{/each}

			{#if hover}
				<line x1={x(hover.n)} x2={x(hover.n)} y1={pad.top} y2={pad.top + ih} class="cursor" />
				{#each lines as l (l.id)}
					<circle cx={x(hover.n)} cy={y(val(hover, l.id))} r="2.6" fill={l.color} />
				{/each}
			{/if}
		</svg>
	</div>
	<p class="axis faint">
		{#if hover}
			אחרי <b class="num">{hover.n}</b> תחזיות:
			{shown.slice(0, 4).map((id) => `${PARTY_BY_ID[id].he} ${one(val(hover!, id))}`).join(' · ')}
		{:else}
			ציר אופקי: מספר התחזיות, לפי סדר השמירה. ציר אנכי: ממוצע מנדטים. געו בגרף לפרטים.
		{/if}
	</p>
{/if}

<style>
	.wrap { width: 100%; }
	svg { width: 100%; height: auto; display: block; touch-action: pan-y; }
	.grid { stroke: var(--border); stroke-width: 1; }
	.tick { font-size: 9px; fill: var(--faint); font-variant-numeric: tabular-nums; }
	.lbl { font-size: 9.5px; font-weight: 700; font-family: inherit; unicode-bidi: plaintext; }
	.lv { font-variant-numeric: tabular-nums; }
	.cursor { stroke: var(--text); stroke-width: 1; opacity: 0.35; }
	.axis { font-size: 0.78rem; margin: 6px 0 0; min-height: 2.4em; }
	.empty { margin: 0; }
</style>
