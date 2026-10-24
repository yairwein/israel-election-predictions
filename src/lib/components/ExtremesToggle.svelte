<script lang="ts">
	import { onMount } from 'svelte';
	import { extremes, setIncludeExtremes, restoreExtremes } from '$lib/extremes.svelte';

	let { trimPct = 10 }: { trimPct?: number } = $props();
	onMount(restoreExtremes);
</script>

<label class="xt">
	<input type="checkbox" role="switch" checked={extremes.include} onchange={(e) => setIncludeExtremes((e.target as HTMLInputElement).checked)} />
	<span class="sw" aria-hidden="true"></span>
	<span class="txt">
		כולל תחזיות קיצוניות
		<span class="faint">{extremes.include ? 'ממוצע רגיל של כל התחזיות' : `בלי ${trimPct}% הגבוהות ו-${trimPct}% הנמוכות לכל מפלגה`}</span>
	</span>
	<a href="/method#extremes" class="why">למה?</a>
</label>

<style>
	.xt { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.88rem; flex-wrap: wrap; }
	.xt input { position: absolute; opacity: 0; width: 1px; height: 1px; }
	.sw {
		flex: none; width: 42px; height: 24px; border-radius: 999px; background: var(--surface-2);
		border: 1px solid var(--border); position: relative; transition: background 0.2s;
	}
	.sw::after {
		content: ''; position: absolute; top: 2px; inset-inline-start: 2px; width: 18px; height: 18px; border-radius: 50%;
		background: var(--surface); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); transition: inset-inline-start 0.2s;
	}
	.xt input:checked + .sw { background: var(--accent); border-color: var(--accent); }
	.xt input:checked + .sw::after { inset-inline-start: 20px; }
	.xt input:focus-visible + .sw { outline: 2px solid var(--accent); outline-offset: 2px; }
	.txt { display: flex; flex-direction: column; line-height: 1.3; font-weight: 600; flex: 1; min-width: 0; }
	.txt .faint { font-weight: 400; font-size: 0.78rem; }
	.why { font-size: 0.8rem; white-space: nowrap; }
</style>
