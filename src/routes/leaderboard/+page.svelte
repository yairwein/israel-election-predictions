<script lang="ts">
	import Hemicycle from '$lib/components/Hemicycle.svelte';
	import { fmtDateTime } from '$lib/format';

	let { data } = $props();
	const lb = $derived(data.lb);
	const projected = $derived(data.source === 'projected');
	const mine = $derived(lb?.rows.find((r) => r.publicId === data.myPublicId) ?? null);
	const countedPct = $derived(lb && lb.stationsTotal ? Math.round((lb.stations / lb.stationsTotal) * 1000) / 10 : 0);
	let showAll = $state(false);
	const visible = $derived(lb ? (showAll ? lb.rows : lb.rows.slice(0, 50)) : []);

	// Votes26 embed posts its content height; resize the iframe (only messages from votes26.com).
	let v26 = $state<HTMLIFrameElement>();
	$effect(() => {
		const onMsg = (e: MessageEvent) => {
			if (e.origin !== 'https://votes26.com' || !e.data?.votes26Height || !v26) return;
			if (v26.contentWindow === e.source) v26.style.height = `${Number(e.data.votes26Height)}px`;
		};
		addEventListener('message', onMsg);
		return () => removeEventListener('message', onMsg);
	});
</script>

<svelte:head><title>טבלת המנחשים · תחזית הבחירות 2026</title></svelte:head>

<div class="container">
	<section class="head">
		<div class="eyebrow">אחרי הבחירות</div>
		<h1>טבלת המנחשים</h1>
		<p class="muted">מי ניחש הכי קרוב לתוצאות. הציון: סך הפער במנדטים בין התחזית לתוצאה, בכל המפלגות. ציון נמוך יותר הוא טוב יותר, ו-0 הוא ניחוש מושלם.</p>
		<div class="seg" role="tablist" aria-label="לפי מה לדרג">
			<a role="tab" href="/leaderboard" aria-selected={projected} class:on={projected} data-sveltekit-noscroll data-sveltekit-replacestate>
				לפי התחזית
			</a>
			<a role="tab" href="/leaderboard?by=counted" aria-selected={!projected} class:on={!projected} data-sveltekit-noscroll data-sveltekit-replacestate>
				לפי הקולות שנספרו
			</a>
		</div>
		<p class="faint segnote">
			{#if projected}
				המנדטים לפי התחזית החיה של <a href="https://votes26.com" target="_blank" rel="noopener noreferrer">Votes26</a>, שמעריכה את התוצאה הסופית מהקלפיות שנספרו.
			{:else}
				המנדטים מחושבים מהקולות שוועדת הבחירות ספרה עד עכשיו (דרך <a href="https://votes26.com" target="_blank" rel="noopener noreferrer">Votes26</a>), בלי תחזית.
			{/if}
		</p>
	</section>

	{#if !lb}
		<div class="card empty">
			<h2>עוד אין תוצאות</h2>
			<p class="muted">הטבלה תתעדכן אוטומטית כשיתחילו להגיע תוצאות.</p>
		</div>
	{:else}
		<div class="card status" class:final={lb.final} role="note">
			{#if lb.final}
				<b>תוצאות סופיות.</b>
			{:else}
				<b>{projected ? 'תחזית, לא תוצאה' : 'תוצאות חלקיות, עשויות להשתנות'}, והדירוג צפוי להשתנות.</b>
				נספרו <span class="num">{lb.stations.toLocaleString('he-IL')}</span> מתוך <span class="num">{lb.stationsTotal.toLocaleString('he-IL')}</span> קלפיות
				(<span class="num">{countedPct}%</span>), עודכן {fmtDateTime(lb.updatedAt)}.
				התוצאות הסופיות יפורסמו עד 4 בנובמבר, ועד אז המקומות בטבלה עוד יזוזו.
			{/if}
		</div>

		<div class="grid grid-2 section">
			<div class="card">
				{#if projected}
					<div class="eyebrow">התחזית של Votes26</div>
					<h3 class="ttl">חלוקת המנדטים הצפויה</h3>
					<iframe
						bind:this={v26}
						src="https://votes26.com/embed?el=seats&e=26"
						title="Votes26 — Seats by list"
						width="100%"
						height="470"
						style="border:0;max-width:820px;width:100%"
						loading="lazy"
						allow="clipboard-write"
					></iframe>
				{:else}
					<div class="eyebrow">התוצאה עד עכשיו</div>
					<h3 class="ttl">חלוקת המנדטים לפי הקולות שנספרו</h3>
					<Hemicycle seats={lb.seats} label="תוצאות" legend />
					<p class="note faint">חישוב שלנו מהקולות שנספרו: אחוז חסימה 3.25%, שיטת בדר-עופר והסכמי עודפים. אחוזי הקולות מעוגלים, כך שמפלגה על הגבול יכולה לזוז במנדט.</p>
				{/if}
			</div>
			<div class="card avg">
				<div class="eyebrow">ממוצע התחזיות</div>
				<h3 class="ttl">איך יצא הניחוש המשותף?</h3>
				<div class="big num">{lb.average.score}</div>
				<div class="muted">ציון של ממוצע התחזיות</div>
				<p class="avgline">
					הממוצע ניחש טוב יותר מ-<b class="num">{lb.average.beats.toLocaleString('he-IL')}</b> מתוך <span class="num">{lb.n.toLocaleString('he-IL')}</span> המנחשים
					(<span class="num">{lb.n ? Math.round((lb.average.beats / lb.n) * 100) : 0}%</span>), והיה מדורג במקום <b class="num">{lb.average.rankAmong}</b>.
				</p>
				{#if mine}
					<div class="mine">
						<div class="eyebrow">התחזית שלך</div>
						<div><b class="num">מקום {mine.rank}</b> · ציון <b class="num">{mine.score}</b></div>
					</div>
				{/if}
			</div>
		</div>

		<div class="card section">
			<div class="eyebrow">כל המנחשים</div>
			<h3 class="ttl">הדירוג</h3>
			<ol class="board">
				<li class="avgrow">
					<span class="rk faint">—</span>
					<span class="nm">ממוצע התחזיות</span>
					<span class="sc num">{lb.average.score}</span>
				</li>
				{#each visible as r (r.publicId)}
					<li class:me={r.publicId === data.myPublicId}>
						<span class="rk num">{r.rank}</span>
						<a class="nm" href="/p/{r.publicId}">{r.nickname}</a>
						<span class="sc num">{r.score}</span>
					</li>
				{/each}
			</ol>
			{#if lb.rows.length > 50 && !showAll}
				<button class="btn btn-ghost more" onclick={() => (showAll = true)}>להציג את כל {lb.rows.length.toLocaleString('he-IL')} המנחשים</button>
			{/if}
			<p class="note faint">הדירוג צפוי להשתנות עד פרסום התוצאות הסופיות. בשוויון מוקדם יותר מי ששמר את התחזית קודם. כל תחזית לפי הגרסה האחרונה שנשמרה לפני הנעילה.</p>
		</div>
	{/if}
</div>

<style>
	.head { padding: 32px 0 8px; }
	h1 { font-size: 2.1rem; font-weight: 800; margin: 4px 0; }
	.head p { margin: 0; max-width: 42em; }
	.seg { display: flex; background: var(--surface-2); border-radius: 14px; padding: 4px; gap: 2px; margin-top: 16px; max-width: 420px; }
	.seg a { flex: 1; text-align: center; padding: 9px 8px; border-radius: 11px; color: var(--muted); font-weight: 600; font-size: 0.9rem; text-decoration: none !important; }
	.seg a.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
	.segnote { font-size: 0.82rem; margin: 8px 0 0 !important; }
	.empty { text-align: center; padding: 40px 22px; margin: 20px 0; }
	.status { margin: 18px 0 0; padding: 14px 18px; line-height: 1.6; border-color: color-mix(in srgb, var(--warn) 40%, var(--border)); background: color-mix(in srgb, var(--warn) 7%, var(--surface)); }
	.status b { color: var(--warn); }
	.status.final { border-color: color-mix(in srgb, var(--good) 40%, var(--border)); background: color-mix(in srgb, var(--good) 7%, var(--surface)); }
	.status.final b { color: var(--good); }
	.ttl { font-size: 1.15rem; font-weight: 700; margin: 2px 0 12px; }
	.note { font-size: 0.78rem; margin: 10px 0 0; }
	iframe { display: block; margin: 0 auto; border-radius: 12px; }
	.avg .big { font-size: 3rem; font-weight: 800; line-height: 1; }
	.avgline { margin: 12px 0 0; color: var(--muted); }
	.mine { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
	.board { list-style: none; margin: 0; padding: 0; }
	.board li { display: grid; grid-template-columns: 44px 1fr auto; gap: 10px; align-items: center; padding: 9px 4px; border-bottom: 1px solid var(--border); }
	.board li.me { background: color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 10px; }
	.board li.avgrow { background: var(--surface-2); border-radius: 10px; font-weight: 600; }
	.rk { font-weight: 700; color: var(--muted); }
	.nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
	.sc { font-weight: 800; font-size: 1.05rem; }
	.more { margin-top: 14px; width: 100%; }
</style>
