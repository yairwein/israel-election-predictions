<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/api';
	import Hemicycle from '$lib/components/Hemicycle.svelte';
	import Countdown from '$lib/components/Countdown.svelte';
	import GoogleButton from '$lib/components/GoogleButton.svelte';
	import {
		PARTIES, POLL_AVERAGE, TOTAL_SEATS, MAJORITY, MIN_SEATS, getScenarios, sumOf, emptySeats, type Seats
	} from '$lib/parties';
	import { validateSeats } from '$lib/validate';
	import { fmtDateTime, fmtShort } from '$lib/format';
	import ScenarioToggle from '$lib/components/ScenarioToggle.svelte';
	import { scenario } from '$lib/scenario.svelte';

	let { data } = $props();
	const me = $derived(data.me);
	const canPredict = $derived(me.signedIn || me.devUser);

	let now = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});
	const locked = $derived(now >= new Date(data.config.lockAt).getTime());

	// --- prediction form ---
	// Starts from the saved prediction; the identity effect below resets it on sign-in changes.
	const initial = untrack(() => data.me.prediction);
	let seats = $state<Seats>({ ...(initial?.seats ?? emptySeats()) });
	let turnout = $state<string>(initial?.turnout != null ? String(initial.turnout) : '');
	let saving = $state(false);
	let message = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

	const total = $derived(Object.values(seats).reduce((a, b) => a + b, 0));
	const remaining = $derived(TOTAL_SEATS - total);
	const valid = $derived(validateSeats(seats).ok);
	const saved = $derived(data.me.prediction?.seats);
	const dirty = $derived(
		!saved ||
			PARTIES.some((p) => (saved[p.id] ?? 0) !== (seats[p.id] ?? 0)) ||
			(data.me.prediction?.turnout ?? '') !== (turnout === '' ? '' : Number(turnout))
	);
	const scenarios = getScenarios();
	const sc = $derived(scenarios.find((x) => x.id === scenario.id)!);
	const blocs = $derived({
		coal: sumOf(seats, sc.coalition),
		opp: sumOf(seats, sc.opposition),
		unaligned: sumOf(seats, sc.unaligned),
		arab: sumOf(seats, sc.arab)
	});

	function setSeat(id: string, v: number) {
		v = Math.max(0, Math.min(TOTAL_SEATS, Math.round(v)));
		if (v > 0 && v < MIN_SEATS) v = (seats[id] ?? 0) > v ? 0 : MIN_SEATS;
		seats[id] = v;
		message = null;
	}
	function inc(id: string) {
		setSeat(id, (seats[id] ?? 0) === 0 ? MIN_SEATS : (seats[id] ?? 0) + 1);
	}
	function dec(id: string) {
		const cur = seats[id] ?? 0;
		setSeat(id, cur <= MIN_SEATS ? 0 : cur - 1);
	}
	function onInput(id: string, e: Event) {
		const raw = (e.target as HTMLInputElement).value;
		const v = raw === '' ? 0 : Number(raw);
		if (Number.isFinite(v)) seats[id] = Math.max(0, Math.min(TOTAL_SEATS, Math.round(v)));
		message = null;
	}
	function onBlur(id: string) {
		const v = seats[id] ?? 0;
		if (v > 0 && v < MIN_SEATS) seats[id] = MIN_SEATS;
	}
	function usePolls() {
		seats = { ...POLL_AVERAGE };
		message = null;
	}
	function clearAll() {
		seats = emptySeats();
		message = null;
	}
	function restore() {
		seats = { ...(data.me.prediction?.seats ?? emptySeats()) };
		turnout = data.me.prediction?.turnout != null ? String(data.me.prediction.turnout) : '';
		message = null;
	}

	async function save() {
		saving = true;
		message = null;
		try {
			await api('PUT', '/api/me/prediction', { seats, turnout: turnout === '' ? null : Number(turnout) });
			await invalidateAll();
			message = { kind: 'ok', text: 'התחזית נשמרה. אפשר לעדכן עד הנעילה.' };
		} catch (e) {
			message = { kind: 'err', text: (e as Error).message };
		} finally {
			saving = false;
		}
	}

	// --- nickname ---
	let editingNick = $state(false);
	let nick = $state('');
	let nickErr = $state('');
	let nickBusy = $state(false);
	async function saveNick(random = false) {
		nickBusy = true;
		nickErr = '';
		try {
			await api('PUT', '/api/me/nickname', { nickname: random ? null : nick });
			await invalidateAll();
			editingNick = false;
		} catch (e) {
			nickErr = (e as Error).message;
		} finally {
			nickBusy = false;
		}
	}

	// --- dev mode: simulate other voters ---
	let devName = $state('');
	async function devSignIn() {
		if (!devName.trim()) return;
		await api('POST', '/api/auth/dev', { name: devName });
		await invalidateAll();
		devName = '';
		restore();
	}
	async function devSignOut() {
		await api('POST', '/api/auth/logout', {});
		await invalidateAll();
		restore();
	}
	// When the signed-in identity changes (not on every reload), reset the form from the server.
	const identity = $derived(data.me.publicId);
	$effect(() => {
		void identity;
		untrack(() => restore());
	});
</script>

<svelte:head><title>התחזית שלי · תחזית הבחירות 2026</title></svelte:head>

<div class="container">
	<section class="head">
		<div>
			<div class="eyebrow">התחזית שלי</div>
			<h1>איך תיראה הכנסת ה-26?</h1>
			<p class="muted">
				חלקו 120 מנדטים. מפלגה שעוברת את אחוז החסימה (3.25%) מקבלת לפחות 4.
				{#if !locked}אפשר לעדכן עד {fmtDateTime(data.config.lockAt)}.{/if}
			</p>
		</div>
		{#if !locked}
			<div class="lockbox">
				<span class="eyebrow">ננעל בעוד</span>
				<Countdown to={data.config.lockAt} compact />
			</div>
		{/if}
	</section>

	{#if data.config.devMode}
		<div class="devbar">
			<b>מצב פיתוח</b>
			<span class="muted">התחברות לא חובה. {me.devUser ? 'אתם המצביע המקומי.' : `מחוברים כ-${me.nickname}.`}</span>
			<form onsubmit={(e) => { e.preventDefault(); devSignIn(); }}>
				<input placeholder="התחברות כמצביע בדיקה (שם)" bind:value={devName} dir="ltr" />
				<button class="btn btn-ghost btn-sm" type="submit">התחברות</button>
			</form>
			{#if !me.devUser}<button class="btn btn-ghost btn-sm" onclick={devSignOut}>חזרה למצביע המקומי</button>{/if}
			{#if data.config.googleClientId && me.devUser}<GoogleButton clientId={data.config.googleClientId} size="medium" />{/if}
		</div>
	{/if}

	{#if !canPredict}
		<div class="card signin">
			<h2>מתחברים כדי לנחש</h2>
			<p class="muted">ההתחברות עם Google נועדה למנוע הצבעות בוטים: תחזית אחת לכל אדם. לא יעשה במייל שום שימוש. תבחרו כינוי, או שנבחר בשבילכם.</p>
			<GoogleButton clientId={data.config.googleClientId} />
		</div>
	{:else}
		<div class="card nickcard">
			<div>
				<div class="eyebrow">הכינוי הציבורי שלך</div>
				{#if editingNick}
					<form class="nickform" onsubmit={(e) => { e.preventDefault(); saveNick(); }}>
						<input bind:value={nick} maxlength="24" minlength="2" placeholder="כינוי" />
						<button class="btn btn-primary btn-sm" disabled={nickBusy}>שמירה</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => (editingNick = false)}>ביטול</button>
					</form>
					{#if nickErr}<p class="err">{nickErr}</p>{/if}
				{:else}
					<div class="nick">{me.nickname}</div>
				{/if}
			</div>
			{#if !editingNick}
				<div class="nickbtns">
					<button class="btn btn-ghost btn-sm" onclick={() => { nick = me.nickname ?? ''; editingNick = true; nickErr = ''; }}>בחירת כינוי</button>
					<button class="btn btn-ghost btn-sm" disabled={nickBusy} onclick={() => saveNick(true)}>🎲 כינוי אקראי</button>
				</div>
			{/if}
		</div>

		{#if locked}
			<div class="card lockedmsg">🔒 התחזיות ננעלו ב{fmtDateTime(data.config.lockAt)}. {#if data.me.prediction}זו התחזית הסופית שלך.{:else}לא נשמרה תחזית.{/if}</div>
		{/if}

		<div class="layout">
			<div class="card form">
				<div class="toolbar">
					<button class="btn btn-ghost btn-sm" onclick={usePolls} disabled={locked}>להתחיל מממוצע הסקרים</button>
					<button class="btn btn-ghost btn-sm" onclick={clearAll} disabled={locked}>איפוס</button>
					{#if data.me.prediction && dirty}<button class="btn btn-ghost btn-sm" onclick={restore}>חזרה לגרסה השמורה</button>{/if}
				</div>

				<ul class="parties">
					{#each PARTIES as p (p.id)}
						{@const v = seats[p.id] ?? 0}
						<li class:zero={v === 0}>
							<span class="bar" style="width: {(v / 40) * 100}%; background: {p.color}"></span>
							<span class="dot" style="background: {p.color}"></span>
							<div class="pname">
								<div class="he">{p.he}</div>
								<div class="leader faint">{p.leaderHe}</div>
							</div>
							<div class="stepper">
								<button aria-label="הפחתה ל{p.he}" onclick={() => dec(p.id)} disabled={locked || v === 0}>−</button>
								<input
									type="number" inputmode="numeric" min="0" max="120" value={v} disabled={locked}
									aria-label="מנדטים ל{p.he}"
									oninput={(e) => onInput(p.id, e)} onblur={() => onBlur(p.id)}
								/>
								<button aria-label="הוספה ל{p.he}" onclick={() => inc(p.id)} disabled={locked || remaining <= 0 || (v === 0 && remaining < MIN_SEATS)}>+</button>
							</div>
						</li>
					{/each}
				</ul>

				<label class="turnout">
					<span>אחוז הצבעה צפוי <span class="faint">(לא חובה)</span></span>
					<span class="tin">
						<input type="number" inputmode="decimal" min="40" max="95" step="0.1" placeholder="70.6" bind:value={turnout} disabled={locked} />
						<span class="faint">%</span>
					</span>
					<span class="faint small">בבחירות 2022: 70.6%</span>
				</label>
			</div>

			<aside class="side">
				<div class="card sticky">
					<Hemicycle {seats} label={remaining === 0 ? 'מנדטים' : `נותרו ${remaining}`} legend />
					<div class="total" class:ok={remaining === 0} class:over={remaining < 0}>
						{#if remaining === 0}✓ בדיוק 120{:else if remaining > 0}נותרו <b class="num">{remaining}</b> מנדטים{:else}עודף של <b class="num">{-remaining}</b>{/if}
					</div>

					<ScenarioToggle full />
					<div class="blocs">
						<div class="bl">
							<span class="dot" style="background: var(--coalition)"></span>
							<span>גוש נתניהו</span>
							<b class="num" class:maj={blocs.coal >= MAJORITY}>{blocs.coal}</b>
						</div>
						<div class="bl">
							<span class="dot" style="background: var(--opposition)"></span>
							<span>אופוזיציה</span>
							<b class="num" class:maj={blocs.opp >= MAJORITY}>{blocs.opp}</b>
						</div>
						{#if sc.unaligned.length}
							<div class="bl">
								<span class="dot" style="background: #c49a2c"></span>
								<span>עמך ישראל (לא משוייכת)</span>
								<b class="num">{blocs.unaligned}</b>
							</div>
						{/if}
						<div class="bl">
							<span class="dot" style="background: var(--neither)"></span>
							<span>מפלגות ערביות</span>
							<b class="num">{blocs.arab}</b>
						</div>
					</div>

					<button class="btn btn-primary save" onclick={save} disabled={locked || !valid || saving || !dirty}>
						{saving ? 'שומר…' : data.me.prediction ? (dirty ? 'עדכון התחזית' : 'נשמר ✓') : 'שמירת התחזית'}
					</button>
					{#if message}<p class={message.kind === 'ok' ? 'okmsg' : 'err'}>{message.text}</p>{/if}
					{#if data.me.prediction}
						<p class="faint small center">נשמר לאחרונה {fmtShort(data.me.prediction.updatedAt)} · גרסה {data.me.prediction.version}</p>
					{/if}
				</div>
			</aside>
		</div>

		{#if !locked}
			<div class="actionbar" role="region" aria-label="שמירה">
				<div class="ab-info">
					<div class="ab-total" class:ok={remaining === 0} class:over={remaining < 0}>
						{#if remaining === 0}✓ 120{:else if remaining > 0}נותרו <b class="num">{remaining}</b>{:else}עודף <b class="num">{-remaining}</b>{/if}
					</div>
					<div class="ab-blocs num">
						<span style="color: var(--coalition)">{blocs.coal}</span>
						<span class="faint">·</span>
						<span style="color: var(--opposition)">{blocs.opp}</span>
						<span class="faint">·</span>
						<span class="faint">{blocs.arab}</span>
					</div>
				</div>
				<button class="btn btn-primary" onclick={save} disabled={!valid || saving || !dirty}>
					{saving ? 'שומר…' : data.me.prediction ? (dirty ? 'עדכון' : 'נשמר ✓') : 'שמירה'}
				</button>
			</div>
			{#if message}<div class="toast {message.kind}" role="status">{message.text}</div>{/if}
		{/if}

		{#if data.history.length > 1}
			<div class="card section">
				<div class="eyebrow">כל הגרסאות שלך נשמרות</div>
				<h3 class="ttl">היסטוריה</h3>
				<ul class="history">
					{#each data.history as h}
						<li>
							<span class="faint">{fmtShort(h.updatedAt)}</span>
							<span class="num">גוש נתניהו {sumOf(h.seats, sc.coalition)} · אופוזיציה {sumOf(h.seats, sc.opposition)} · ערביות {sumOf(h.seats, sc.arab)}</span>
							<span class="faint">גרסה {h.version}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>

<style>
	.head { display: flex; justify-content: space-between; align-items: end; gap: 16px; padding: 32px 0 16px; flex-wrap: wrap; }
	h1 { font-size: 2.1rem; font-weight: 800; margin: 4px 0; }
	.head p { margin: 0; max-width: 40em; }
	.lockbox { display: flex; flex-direction: column; align-items: end; font-size: 1.3rem; font-weight: 700; }
	.devbar {
		display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 10px 14px; margin-bottom: 16px;
		border: 1px dashed #d79b00; border-radius: 14px; background: color-mix(in srgb, #ffd666 14%, transparent); font-size: 0.9rem;
	}
	.devbar form { display: flex; gap: 6px; }
	.devbar input, .nickform input {
		padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface);
	}
	.signin { text-align: center; padding: 40px 22px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
	.signin p { max-width: 36em; margin: 0 0 8px; }
	.nickcard { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px 22px; margin-bottom: 16px; }
	.nick { font-size: 1.3rem; font-weight: 700; }
	.nickform { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
	.nickbtns { display: flex; gap: 8px; flex-wrap: wrap; }
	.lockedmsg { margin-bottom: 16px; padding: 14px 20px; }
	.layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
	.toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
	.parties { list-style: none; margin: 0; padding: 0; }
	.parties li {
		position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 8px;
		border-bottom: 1px solid var(--border); overflow: hidden;
	}
	.parties li:last-child { border-bottom: 0; }
	.parties li .bar { position: absolute; inset-inline-start: 0; top: 0; bottom: 0; opacity: 0.09; transition: width 0.25s ease; max-width: 100%; }
	.parties li.zero .pname { opacity: 0.65; }
	.pname { flex: 1; min-width: 0; position: relative; }
	.he { font-weight: 600; }
	.leader { font-size: 0.78rem; }
	.stepper { display: flex; align-items: center; gap: 4px; position: relative; direction: ltr; }
	.stepper button {
		width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface);
		color: var(--text); font-size: 1.2rem; cursor: pointer; line-height: 1;
	}
	.stepper button:hover:not(:disabled) { background: var(--surface-2); }
	.stepper button:disabled { opacity: 0.35; cursor: not-allowed; }
	.stepper input {
		width: 52px; height: 36px; text-align: center; border: 1px solid var(--border); border-radius: 10px;
		background: var(--surface-2); font-weight: 700; font-size: 1.05rem; -moz-appearance: textfield; appearance: textfield;
	}
	.stepper input::-webkit-outer-spin-button, .stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
	.turnout { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
	.tin { display: inline-flex; align-items: center; gap: 4px; direction: ltr; }
	.tin input { width: 80px; height: 36px; text-align: center; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-2); }
	.small { font-size: 0.8rem; }
	.center { text-align: center; margin: 8px 0 0; }
	.sticky { position: sticky; top: 80px; display: flex; flex-direction: column; gap: 12px; }
	.total { text-align: center; font-weight: 600; color: var(--warn); }
	.total.ok { color: var(--good); }
	.total.over { color: var(--bad); }
	.blocs { display: flex; flex-direction: column; gap: 4px; padding: 10px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
	.bl { display: grid; grid-template-columns: 14px 1fr auto; gap: 8px; align-items: center; }
	.bl b { font-size: 1.1rem; }
	.maj { color: var(--good); }
	.save { width: 100%; padding: 12px; font-size: 1.05rem; }
	.err { color: var(--bad); font-size: 0.88rem; margin: 0; }
	.okmsg { color: var(--good); font-size: 0.88rem; margin: 0; text-align: center; }
	.ttl { font-size: 1.15rem; font-weight: 700; margin: 2px 0 10px; }
	.history { list-style: none; padding: 0; margin: 0; }
	.history li { display: flex; gap: 14px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; flex-wrap: wrap; }
	.actionbar, .toast { display: none; }
	@media (max-width: 860px) {
		.layout { grid-template-columns: 1fr; }
		.side { order: -1; }
		.sticky { position: static; }
		.sticky .save, .sticky .err, .sticky .okmsg { display: none; }
		.container { padding-bottom: 96px; }
		.actionbar {
			display: flex; position: fixed; inset-inline: 0; bottom: 0; z-index: 30; align-items: center; gap: 12px;
			padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
			background: color-mix(in srgb, var(--surface) 90%, transparent);
			backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px);
			border-top: 1px solid var(--border);
		}
		.actionbar .btn { padding: 12px 28px; font-size: 1.05rem; }
		.ab-info { flex: 1; display: flex; flex-direction: column; line-height: 1.2; }
		.ab-total { font-weight: 700; color: var(--warn); }
		.ab-total.ok { color: var(--good); }
		.ab-total.over { color: var(--bad); }
		.ab-blocs { font-size: 0.85rem; font-weight: 700; display: flex; gap: 4px; }
		.toast {
			display: block; position: fixed; inset-inline: 16px; bottom: calc(76px + env(safe-area-inset-bottom)); z-index: 31;
			padding: 10px 14px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border);
			box-shadow: var(--shadow); font-size: 0.9rem; text-align: center;
		}
		.toast.ok { color: var(--good); }
		.toast.err { color: var(--bad); }
	}
	@media (max-width: 560px) {
		h1 { font-size: 1.6rem; }
		.head { padding-top: 20px; }
		.lockbox { flex-direction: row; align-items: center; gap: 8px; font-size: 1rem; }
		.card.form { padding: 12px 10px; }
		.parties li { gap: 10px; padding: 8px 4px; }
		.stepper button { width: 42px; height: 42px; }
		.stepper input { width: 48px; height: 42px; }
		.leader { font-size: 0.72rem; }
		.side .card { padding: 14px; }
		.nickcard { padding: 14px 16px; }
		.nick { font-size: 1.1rem; }
		.devbar form { width: 100%; }
		.devbar input { flex: 1; min-width: 0; }
	}
</style>
