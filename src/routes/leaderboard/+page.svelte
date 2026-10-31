<script lang="ts">
	import Hemicycle from '$lib/components/Hemicycle.svelte';
	import { fmtDateTime } from '$lib/format';

	let { data } = $props();
	const lb = $derived(data.lb);
	const off = $derived(lb?.official);
	const mine = $derived(lb?.rows.find((r) => r.publicId === data.myPublicId) ?? null);
	const countedPct = $derived(off?.ballotBoxesTotal ? Math.round((off.ballotBoxesCounted / off.ballotBoxesTotal) * 1000) / 10 : null);
	let showAll = $state(false);
	const visible = $derived(lb ? (showAll ? lb.rows : lb.rows.slice(0, 50)) : []);
	const lockFmt = (iso: string) =>
		new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
	const n1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
</script>

<svelte:head><title>טבלת המנחשים · תחזית הבחירות 2026</title></svelte:head>

<div class="container">
	<section class="head">
		<div class="eyebrow">אחרי הבחירות</div>
		<h1>טבלת המנחשים</h1>
		<p class="muted">מי ניחש הכי קרוב לתוצאות הרשמיות של ועדת הבחירות המרכזית.</p>
	</section>

	{#if !lb || !off}
		<div class="card empty">
			<h2>עוד אין תוצאות</h2>
			<p class="muted">הטבלה תתפרסם כשנטען את תוצאות ועדת הבחירות.</p>
		</div>
	{:else}
		<div class="card status" class:final={off.final} role="note">
			{#if off.final}
				<b>תוצאות סופיות</b> של ועדת הבחירות המרכזית, כפי שפורסמו ברשומות.
			{:else}
				<b>הספירה טרם הסתיימה: התוצאות והדירוג עוד עשויים להשתנות.</b>
				לפי ספירת ועדת הבחירות נכון ל-{fmtDateTime(off.asOf)}:
				<span class="num">{off.ballotBoxesCounted.toLocaleString('he-IL')}</span>
				{#if off.ballotBoxesTotal}מתוך <span class="num">{off.ballotBoxesTotal.toLocaleString('he-IL')}</span>{/if} קלפיות
				{#if countedPct}(<span class="num">{countedPct}%</span>){/if}.
				התוצאות הסופיות יפורסמו ברשומות עד 4 בנובמבר, ואז נעדכן את הטבלה.
			{/if}
		</div>

		<div class="grid grid-2 section">
			<div class="card">
				<div class="eyebrow">{off.final ? 'התוצאה' : 'התוצאה לפי הספירה'}</div>
				<h3 class="ttl">חלוקת המנדטים</h3>
				<Hemicycle seats={lb.seats} label="תוצאות" legend />
				<div class="facts">
					<div><b class="num">{n1(off.turnout)}%</b><span class="faint">אחוז הצבעה</span></div>
					<div><b class="num">{off.votesCast.toLocaleString('he-IL')}</b><span class="faint">מצביעים</span></div>
					<div><b class="num">{off.validVotes.toLocaleString('he-IL')}</b><span class="faint">קולות כשרים</span></div>
				</div>
				<p class="note faint">
					המנדטים מחושבים מהקולות הרשמיים: אחוז חסימה 3.25%, שיטת בדר-עופר והסכמי עודפים. אחוז הצבעה = מצביעים ÷ בעלי זכות בחירה
					(<span class="num">{off.eligible.toLocaleString('he-IL')}</span>).
				</p>
			</div>
			<div class="card avg">
				<div class="eyebrow">ממוצע התחזיות</div>
				<h3 class="ttl">איך יצא הניחוש המשותף?</h3>
				<div class="big num">{lb.average.score}</div>
				<div class="muted">ציון של ממוצע התחזיות</div>
				<p class="avgline">
					הממוצע ניחש טוב יותר מ-<b class="num">{lb.average.beats.toLocaleString('he-IL')}</b> מתוך <span class="num">{lb.n.toLocaleString('he-IL')}</span> המנחשים
					(<span class="num">{lb.n ? Math.round((lb.average.beats / lb.n) * 100) : 0}%</span>), והיה מדורג במקום <b class="num">{lb.average.rankAmong}</b>.
					{#if lb.average.turnout}אחוז ההצבעה הממוצע שנוחש: <b class="num">{n1(lb.average.turnout)}%</b>.{/if}
				</p>
				{#if mine}
					<div class="mine">
						<div class="eyebrow">התחזית שלך</div>
						<div>
							<b class="num">מקום {mine.rank}</b> · ציון <b class="num">{mine.score}</b>
							{#if mine.turnoutGap != null}· פער באחוז ההצבעה <b class="num">{n1(mine.turnoutGap)}</b>{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="card section">
			<div class="eyebrow">כל המנחשים</div>
			<h3 class="ttl">הדירוג</h3>
			<div class="rules">
				<div><b>ציון:</b> סך הפער במנדטים בין התחזית לתוצאה, בכל המפלגות. נמוך יותר עדיף, 0 הוא ניחוש מושלם.</div>
				<div><b>שובר שוויון 1:</b> אחוז ההצבעה שנוחש הקרוב ביותר לאחוז ההצבעה בפועל (מי שלא ניחש אחוז הצבעה אחרי מי שניחש).</div>
				<div><b>שובר שוויון 2:</b> מי שנעל את התחזית ראשון (השמירה האחרונה מוקדמת יותר).</div>
			</div>
			<div class="thead" aria-hidden="true">
				<span>#</span><span>כינוי</span><span>ציון</span><span>פער הצבעה</span><span>ננעלה</span>
			</div>
			<ol class="board">
				<li class="avgrow">
					<span class="rk faint">—</span>
					<span class="nm">ממוצע התחזיות</span>
					<span class="sc num">{lb.average.score}</span>
					<span class="tb num faint">{lb.average.turnout ? n1(Math.abs(lb.average.turnout - off.turnout)) : '—'}</span>
					<span class="tb faint">—</span>
				</li>
				{#each visible as r (r.publicId)}
					<li class:me={r.publicId === data.myPublicId}>
						<span class="rk num">{r.rank}</span>
						<a class="nm" href="/p/{r.publicId}">{r.nickname}</a>
						<span class="sc num">{r.score}</span>
						<span class="tb num" title={r.turnout != null ? `ניחש ${r.turnout}%` : 'לא ניחש אחוז הצבעה'}>{r.turnoutGap != null ? n1(r.turnoutGap) : '—'}</span>
						<span class="tb num faint">{lockFmt(r.lockedAt)}</span>
					</li>
				{/each}
			</ol>
			{#if lb.rows.length > 50 && !showAll}
				<button class="btn btn-ghost more" onclick={() => (showAll = true)}>להציג את כל {lb.rows.length.toLocaleString('he-IL')} המנחשים</button>
			{/if}
			<p class="note faint">
				{#if !off.final}הדירוג עוד עשוי להשתנות עד פרסום התוצאות הסופיות. {/if}כל תחזית לפי הגרסה האחרונה שנשמרה לפני הנעילה.
				"פער הצבעה" הוא ההפרש בנקודות אחוז בין אחוז ההצבעה שנוחש לאחוז ההצבעה בפועל.
			</p>
		</div>
	{/if}
</div>

<style>
	.head { padding: 32px 0 8px; }
	h1 { font-size: 2.1rem; font-weight: 800; margin: 4px 0; }
	.head p { margin: 0; max-width: 42em; }
	.empty { text-align: center; padding: 40px 22px; margin: 20px 0; }
	.status { margin: 18px 0 0; padding: 14px 18px; line-height: 1.6; border-color: color-mix(in srgb, var(--warn) 40%, var(--border)); background: color-mix(in srgb, var(--warn) 7%, var(--surface)); }
	.status b { color: var(--warn); }
	.status.final { border-color: color-mix(in srgb, var(--good) 40%, var(--border)); background: color-mix(in srgb, var(--good) 7%, var(--surface)); }
	.status.final b { color: var(--good); }
	.ttl { font-size: 1.15rem; font-weight: 700; margin: 2px 0 12px; }
	.note { font-size: 0.78rem; margin: 10px 0 0; }
	.facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; text-align: center; }
	.facts div { display: flex; flex-direction: column; }
	.facts b { font-size: 1.05rem; }
	.facts span { font-size: 0.75rem; }
	.avg .big { font-size: 3rem; font-weight: 800; line-height: 1; }
	.avgline { margin: 12px 0 0; color: var(--muted); }
	.mine { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
	.rules { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--muted); margin-bottom: 12px; }
	.rules b { color: var(--text); }
	.thead, .board li { display: grid; grid-template-columns: 36px 1fr 44px 58px 78px; gap: 8px; align-items: center; }
	.thead { font-size: 0.72rem; color: var(--faint); padding: 0 4px 6px; border-bottom: 1px solid var(--border); }
	.board { list-style: none; margin: 0; padding: 0; }
	.board li { padding: 9px 4px; border-bottom: 1px solid var(--border); }
	.board li.me { background: color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 10px; }
	.board li.avgrow { background: var(--surface-2); border-radius: 10px; font-weight: 600; }
	.rk { font-weight: 700; color: var(--muted); }
	.nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
	.sc { font-weight: 800; font-size: 1.05rem; }
	.tb { font-size: 0.82rem; }
	.more { margin-top: 14px; width: 100%; }
	@media (max-width: 420px) {
		.thead, .board li { grid-template-columns: 30px 1fr 38px 50px 66px; gap: 6px; }
		.tb { font-size: 0.76rem; }
	}
</style>
