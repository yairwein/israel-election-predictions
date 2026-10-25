<script lang="ts">
	import type { PartyStats } from '$lib/model';
	import { wilson } from '$lib/model';
	import { PARTY_BY_ID } from '$lib/parties';
	import { pct } from '$lib/format';

	/**
	 * Parties whose place in the Knesset is in doubt: the share of predictions in which each one
	 * passes the threshold, with a 95% Wilson interval. A party is "small" while it passes in less
	 * than 90% of predictions.
	 */
	let { parties, n }: { parties: PartyStats[]; n: number } = $props();

	const SMALL_BELOW = 0.9;
	const list = $derived(
		parties
			.filter((p) => p.passShare < SMALL_BELOW)
			.map((p) => {
				const k = Math.round(p.passShare * n);
				return { ...p, party: PARTY_BY_ID[p.id], k, ci: wilson(k, n) };
			})
			.sort((a, b) => b.passShare - a.passShare)
	);
</script>

{#if list.length}
	<div class="card sp">
		<div class="eyebrow">מפלגות קטנות</div>
		<h3 class="ttl">הסיכוי לעבור את אחוז החסימה</h3>
		<ul>
			{#each list as p (p.id)}
				<li>
					<div class="top">
						<span class="name"><span class="dot" style="background: {p.party.color}"></span>{p.party.he}</span>
						<b class="num">{pct(p.passShare)}</b>
					</div>
					<div class="track" aria-hidden="true">
						<div class="ci" style="inset-inline-start: {p.ci.lo * 100}%; width: {(p.ci.hi - p.ci.lo) * 100}%"></div>
						<div class="fill" style="width: {p.passShare * 100}%; background: {p.party.color}"></div>
					</div>
					<div class="sub faint">
						עוברת ב-<span class="num">{p.k.toLocaleString('he-IL')}</span> מתוך <span class="num">{n.toLocaleString('he-IL')}</span> תחזיות
						· טווח <span class="num" dir="ltr">{pct(p.ci.lo)}–{pct(p.ci.hi)}</span>
					</div>
				</li>
			{/each}
		</ul>
		<p class="note faint">שיעור התחזיות שבהן המפלגה מקבלת 4 מנדטים או יותר. מוצגות מפלגות שעוברות בפחות מ-90% מהתחזיות.</p>
	</div>
{/if}

<style>
	.sp ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
	.top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
	.name { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
	.top b { font-size: 1.35rem; font-weight: 800; }
	.track { position: relative; height: 10px; border-radius: 5px; background: var(--surface-2); margin: 6px 0 4px; overflow: hidden; }
	.fill { position: absolute; inset-inline-start: 0; top: 0; bottom: 0; border-radius: 5px; transition: width 0.4s ease; }
	.ci { position: absolute; top: 0; bottom: 0; background: var(--text); opacity: 0.12; }
	.sub { font-size: 0.78rem; }
	.note { font-size: 0.78rem; margin: 14px 0 0; }
	.ttl { font-size: 1.15rem; font-weight: 700; margin: 2px 0 14px; }
</style>
