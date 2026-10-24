<script lang="ts">
	import { onMount } from 'svelte';

	let { to, compact = false }: { to: string; compact?: boolean } = $props();
	let now = $state(Date.now());

	onMount(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});

	const left = $derived(Math.max(0, new Date(to).getTime() - now));
	const parts = $derived({
		d: Math.floor(left / 86_400_000),
		h: Math.floor((left / 3_600_000) % 24),
		m: Math.floor((left / 60_000) % 60),
		s: Math.floor((left / 1000) % 60)
	});
	const pad = (n: number) => String(n).padStart(2, '0');
</script>

{#if compact}
	<span class="num">{parts.d > 0 ? `${parts.d}d ` : ''}{pad(parts.h)}:{pad(parts.m)}:{pad(parts.s)}</span>
{:else}
	<div class="cd num" aria-label="זמן עד הנעילה">
		<div><b>{parts.d}</b><span>ימים</span></div>
		<div><b>{pad(parts.h)}</b><span>שעות</span></div>
		<div><b>{pad(parts.m)}</b><span>דקות</span></div>
		<div><b>{pad(parts.s)}</b><span>שניות</span></div>
	</div>
{/if}

<style>
	.cd { display: flex; gap: 10px; direction: rtl; }
	.cd div {
		background: var(--surface-2); border-radius: 14px; padding: 10px 0; width: 68px;
		display: flex; flex-direction: column; align-items: center;
	}
	.cd b { font-size: 1.6rem; font-weight: 700; line-height: 1.1; }
	.cd span { font-size: 0.72rem; color: var(--muted); }
	@media (max-width: 560px) {
		.cd { gap: 8px; }
		.cd div { width: auto; flex: 1; }
		.cd b { font-size: 1.35rem; }
	}
</style>
