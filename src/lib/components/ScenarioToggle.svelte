<script lang="ts">
	import { onMount } from 'svelte';
	import { scenario, setScenario, restoreScenario, SCENARIO_LABELS, SCENARIO_ORDER } from '$lib/scenario.svelte';

	let { full = false }: { full?: boolean } = $props();
	onMount(restoreScenario);
</script>

<div class="seg" class:full role="tablist" aria-label="שיוך עמך ישראל">
	{#each SCENARIO_ORDER as id}
		<button role="tab" aria-selected={scenario.id === id} class:on={scenario.id === id} onclick={() => setScenario(id)}>
			{SCENARIO_LABELS[id]}
		</button>
	{/each}
</div>

<style>
	.seg { display: inline-flex; background: var(--surface-2); border-radius: 14px; padding: 4px; gap: 2px; }
	.seg.full { display: flex; width: 100%; }
	.seg button {
		flex: 1; border: 0; background: transparent; color: var(--muted); padding: 7px 12px; border-radius: 11px;
		cursor: pointer; font-weight: 600; font-size: 0.86rem; line-height: 1.25; min-height: 36px;
	}
	.seg button.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
	@media (max-width: 560px) {
		.seg { display: flex; width: 100%; }
		.seg button { padding: 7px 6px; font-size: 0.82rem; }
	}
</style>
