/**
 * Renders share images (1200×630 PNG) for a prediction or for the crowd average.
 * SVG → PNG with resvg and the bundled Heebo font (assets/fonts, SIL OFL).
 */
import { Resvg } from '@resvg/resvg-js';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { hemicycle, seatColors, SPECTRUM_RTL } from '$lib/hemicycle';
import { PARTY_BY_ID, type Seats } from '$lib/parties';
import { blocLines } from '$lib/share';

function fontDir(): string {
	const candidates = [path.resolve('assets/fonts'), path.resolve(process.cwd(), '../assets/fonts')];
	return candidates.find((d) => existsSync(path.join(d, 'Heebo-Regular.ttf'))) ?? candidates[0];
}

// Wrap Hebrew lines in RLM marks so trailing punctuation ("?") stays at the end of the right-to-left line.
const rtl = (s: string) => `\u200F${s}\u200F`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const W = 1200;
const H = 630;

export interface OgInput {
	title: string;
	subtitle: string;
	seats: Seats;
	footer: string;
	host: string;
}

export function ogSvg({ title, subtitle, seats, footer, host }: OgInput): string {
	const geo = hemicycle(120);
	const colors = seatColors(seats, (id) => PARTY_BY_ID[id]?.color ?? '#999', '#e3e7ef');
	// hemicycle on the left half: unit circle → 520px wide
	const cx = 300, cy = 400, R = 240;
	const dots = geo.points
		.map((p, i) => `<circle cx="${(cx + p.x * R).toFixed(1)}" cy="${(cy + p.y * R).toFixed(1)}" r="${(geo.r * R).toFixed(1)}" fill="${colors[i]}"/>`)
		.join('');

	const blocs = blocLines(seats);
	const right = W - 70;
	const blocRows = blocs
		.map((b, i) => {
			const y = 280 + i * 58;
			return `<circle cx="${right - 12}" cy="${y - 13}" r="12" fill="${b.color}"/>
				<text x="${right - 38}" y="${y}" text-anchor="end" font-size="34" fill="#3b4252">${esc(rtl(b.label))}</text>
				<text x="${640}" y="${y}" text-anchor="start" font-size="40" font-weight="800" fill="#121826">${b.seats}</text>`;
		})
		.join('');

	// Party list in two balanced rows so it never runs past the card edge.
	const parties = SPECTRUM_RTL.filter((id) => (seats[id] ?? 0) > 0).map((id) => `${PARTY_BY_ID[id].he} ${seats[id]}`);
	const half = Math.ceil(parties.length / 2);
	const chipRows = [parties.slice(0, half), parties.slice(half)]
		.filter((r) => r.length)
		.map((r, i) => `<text x="${right}" y="${H - 132 + i * 30}" text-anchor="end" font-size="21" fill="#5b6475">${esc(rtl(r.join('  ·  ')))}</text>`)
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<rect width="${W}" height="${H}" fill="#f6f7fb"/>
	<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="32" fill="#ffffff" stroke="#e3e7ef" stroke-width="2"/>
	<text x="${right}" y="118" text-anchor="end" font-size="56" font-weight="800" fill="#121826">${esc(rtl(title))}</text>
	<text x="${right}" y="176" text-anchor="end" font-size="30" fill="#5b6475">${esc(rtl(subtitle))}</text>
	${dots}
	<text x="${cx}" y="${cy - 18}" text-anchor="middle" font-size="64" font-weight="800" fill="#121826">120</text>
	${blocRows}
	${chipRows}
	<text x="${right}" y="${H - 52}" text-anchor="end" font-size="26" font-weight="800" fill="#1f5fad">${esc(rtl(footer))}</text>
	<text x="70" y="${H - 52}" text-anchor="start" font-size="24" font-weight="800" fill="#121826">${esc(host)}</text>
</svg>`;
}

/** Portrait 1080×1920 image for Instagram Stories (and WhatsApp status). */
export function storySvg({ title, subtitle, seats, footer, host }: OgInput): string {
	const SW = 1080, SH = 1920;
	const geo = hemicycle(120);
	const colors = seatColors(seats, (id) => PARTY_BY_ID[id]?.color ?? '#999', '#e3e7ef');
	const cx = SW / 2, cy = 900, R = 430;
	const dots = geo.points
		.map((p, i) => `<circle cx="${(cx + p.x * R).toFixed(1)}" cy="${(cy + p.y * R).toFixed(1)}" r="${(geo.r * R).toFixed(1)}" fill="${colors[i]}"/>`)
		.join('');
	const right = SW - 110, left = 110;
	const blocRows = blocLines(seats)
		.map((b, i) => {
			const y = 1100 + i * 92;
			return `<circle cx="${right - 16}" cy="${y - 18}" r="16" fill="${b.color}"/>
				<text x="${right - 52}" y="${y}" text-anchor="end" font-size="50" fill="#3b4252">${esc(rtl(b.label))}</text>
				<text x="${left}" y="${y}" text-anchor="start" font-size="60" font-weight="800" fill="#121826">${b.seats}</text>`;
		})
		.join('');
	const parties = SPECTRUM_RTL.filter((id) => (seats[id] ?? 0) > 0).map((id) => `${PARTY_BY_ID[id].he} ${seats[id]}`);
	const rows: string[][] = [];
	for (let i = 0; i < parties.length; i += 3) rows.push(parties.slice(i, i + 3));
	const chips = rows
		.map((r, i) => `<text x="${SW / 2}" y="${1450 + i * 52}" text-anchor="middle" font-size="34" fill="#5b6475">${esc(rtl(r.join('  ·  ')))}</text>`)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">
	<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf1fb"/><stop offset="1" stop-color="#f6f7fb"/></linearGradient></defs>
	<rect width="${SW}" height="${SH}" fill="url(#bg)"/>
	<rect x="60" y="250" width="${SW - 120}" height="1420" rx="56" fill="#ffffff" stroke="#e3e7ef" stroke-width="3"/>
	<text x="${SW / 2}" y="170" text-anchor="middle" font-size="44" font-weight="800" fill="#1f5fad">${esc(rtl('תחזית הבחירות 2026'))}</text>
	<text x="${SW / 2}" y="370" text-anchor="middle" font-size="76" font-weight="800" fill="#121826">${esc(rtl(title))}</text>
	<text x="${SW / 2}" y="440" text-anchor="middle" font-size="40" fill="#5b6475">${esc(rtl(subtitle))}</text>
	${dots}
	<text x="${cx}" y="${cy - 30}" text-anchor="middle" font-size="110" font-weight="800" fill="#121826">120</text>
	${blocRows}
	${chips}
	<text x="${SW / 2}" y="1780" text-anchor="middle" font-size="58" font-weight="800" fill="#1f5fad">${esc(rtl(footer))}</text>
	<text x="${SW / 2}" y="1850" text-anchor="middle" font-size="44" font-weight="800" fill="#121826">${esc(host)}</text>
</svg>`;
}

function render(svg: string, width: number): Buffer {
	const dir = fontDir();
	const r = new Resvg(svg, {
		fitTo: { mode: 'width', value: width },
		font: {
			fontFiles: [path.join(dir, 'Heebo-Regular.ttf'), path.join(dir, 'Heebo-ExtraBold.ttf')],
			loadSystemFonts: false,
			defaultFontFamily: 'Heebo'
		}
	});
	return r.render().asPng();
}

export function storyPng(input: OgInput): Buffer {
	return render(storySvg(input), 1080);
}

export function ogPng(input: OgInput): Buffer {
	return render(ogSvg(input), W);
}
