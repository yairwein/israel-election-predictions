<script lang="ts">
	/**
	 * Turnout guess, built for thumbs: a slider in 0.5 steps to get close, −/+ in 0.1 steps to fine-tune
	 * (hold to repeat, speeding up), and quick chips around recent elections. Optional: "בלי" clears it.
	 * The value is a string ('' = not set) to match the form.
	 */
	import { onDestroy } from 'svelte';
	import { TURNOUT_MIN as MIN, TURNOUT_MAX as MAX, TURNOUT_SLIDER_STEP, TURNOUT_FINE_STEP as FINE } from '$lib/turnout';

	let { value = $bindable(''), disabled = false }: { value?: string; disabled?: boolean } = $props();

	const LAST = 70.6; // 2022 turnout
	const chips = [65, 67.5, 70.6, 72.5, 75];

	const num = $derived(value === '' ? null : Number(value));
	const shown = $derived(num ?? LAST);
	const clamp = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 10) / 10));
	const set = (v: number) => (value = String(clamp(v)));
	const fill = $derived(`${((shown - MIN) / (MAX - MIN)) * 100}%`);
	const diff = $derived(num == null ? null : Math.round((num - LAST) * 10) / 10);

	// Press and hold −/+ to repeat: a pause, then steady steps that speed up.
	let timer: ReturnType<typeof setTimeout> | null = null;
	let held = false;
	function nudge(dir: 1 | -1) {
		const base = value === '' ? LAST : Number(value);
		set(base + dir * FINE);
	}
	function startHold(e: PointerEvent, dir: 1 | -1) {
		if (disabled || e.button > 0) return;
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		held = true;
		nudge(dir);
		let n = 0;
		const tick = () => {
			nudge(dir);
			n++;
			timer = setTimeout(tick, n < 10 ? 110 : n < 30 ? 60 : 30);
		};
		timer = setTimeout(tick, 420);
	}
	function stopHold() {
		if (timer) clearTimeout(timer);
		timer = null;
	}
	// Keyboard / screen readers: a click without a pointer press still steps once.
	function click(dir: 1 | -1) {
		if (held) {
			held = false;
			return;
		}
		nudge(dir);
	}
	onDestroy(stopHold);
</script>

<div class="tp" class:unset={num == null} class:disabled>
	<div class="head">
		<div>
			<div class="t">אחוז הצבעה צפוי <span class="faint">(לא חובה)</span></div>
			<div class="faint small">
				{#if diff == null}בבחירות 2022: <span class="num">70.6%</span>{:else if diff === 0}כמו ב-2022{:else}<span class="num">{diff > 0 ? '+' : ''}{diff}</span> לעומת 2022 (<span class="num">70.6%</span>){/if}
			</div>
		</div>
		<div class="val num" aria-live="polite">{num == null ? '—' : `${num}%`}</div>
	</div>

	<div class="ctrl">
		<button
			type="button" class="step" aria-label="הפחתה 0.1" {disabled}
			onpointerdown={(e) => startHold(e, -1)} onpointerup={stopHold} onpointercancel={stopHold} onpointerleave={stopHold}
			onclick={() => click(-1)} oncontextmenu={(e) => e.preventDefault()}
		>−</button>
		<input
			type="range" min={MIN} max={MAX} step={TURNOUT_SLIDER_STEP} value={shown} {disabled}
			style="--fill: {fill}"
			aria-label="אחוז הצבעה צפוי" aria-valuetext={num == null ? 'לא נבחר' : `${num} אחוז`}
			oninput={(e) => set(Number((e.target as HTMLInputElement).value))}
		/>
		<button
			type="button" class="step" aria-label="הוספה 0.1" {disabled}
			onpointerdown={(e) => startHold(e, 1)} onpointerup={stopHold} onpointercancel={stopHold} onpointerleave={stopHold}
			onclick={() => click(1)} oncontextmenu={(e) => e.preventDefault()}
		>+</button>
	</div>

	<div class="chips">
		{#each chips as c}
			<button type="button" class="chip num" class:on={num === c} {disabled} onclick={() => set(c)}>{c}%</button>
		{/each}
		{#if num != null}
			<button type="button" class="chip clear" {disabled} onclick={() => (value = '')}>בלי</button>
		{/if}
	</div>
</div>

<style>
	.tp { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
	.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
	.t { font-weight: 600; }
	.small { font-size: 0.8rem; }
	.val { font-size: 1.7rem; font-weight: 800; min-width: 92px; text-align: left; }
	.unset .val { color: var(--faint); }

	/* The slider runs left → right (low → high) like a number line, even in RTL. */
	.ctrl { display: flex; align-items: center; gap: 10px; direction: ltr; }
	.step {
		-webkit-user-select: none; user-select: none; -webkit-touch-callout: none; touch-action: manipulation;
		flex: none; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border);
		background: var(--surface); color: var(--text); font-size: 1.3rem; cursor: pointer; line-height: 1;
	}
	.step:hover:not(:disabled) { background: var(--surface-2); }
	input[type='range'] {
		flex: 1; min-width: 0; height: 44px; margin: 0; background: transparent; cursor: pointer;
		-webkit-appearance: none; appearance: none; touch-action: pan-y;
	}
	input[type='range']::-webkit-slider-runnable-track {
		height: 8px; border-radius: 4px;
		background: linear-gradient(to right, var(--accent) var(--fill), var(--surface-2) var(--fill));
	}
	input[type='range']::-moz-range-track { height: 8px; border-radius: 4px; background: var(--surface-2); }
	input[type='range']::-moz-range-progress { height: 8px; border-radius: 4px; background: var(--accent); }
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none; width: 28px; height: 28px; margin-top: -10px; border-radius: 50%;
		background: var(--surface); border: 3px solid var(--accent); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
	}
	input[type='range']::-moz-range-thumb {
		width: 24px; height: 24px; border-radius: 50%; background: var(--surface); border: 3px solid var(--accent);
	}
	.unset input[type='range']::-webkit-slider-runnable-track { background: var(--surface-2); }
	.unset input[type='range']::-webkit-slider-thumb { border-color: var(--faint); }
	.unset input[type='range']::-moz-range-progress { background: transparent; }

	/* Same direction as the slider: low on the left, high on the right. */
	.chips { display: flex; flex-wrap: wrap; gap: 6px; direction: ltr; }
	.chips .clear { direction: rtl; }
	.chip {
		border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 999px;
		padding: 0 12px; height: 36px; font: inherit; font-size: 0.88rem; font-weight: 600; cursor: pointer;
	}
	.chip.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
	.chip.clear { color: var(--muted); }
	.disabled { opacity: 0.6; }
	button:disabled, input:disabled { cursor: not-allowed; }
</style>
