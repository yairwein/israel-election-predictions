const TZ = 'Asia/Jerusalem';

export function fmtDateTime(iso: string): string {
	return new Intl.DateTimeFormat('he-IL', {
		timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
	}).format(new Date(iso));
}

export function fmtShort(iso: string): string {
	return new Intl.DateTimeFormat('he-IL', {
		timeZone: TZ, day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'
	}).format(new Date(iso));
}

export function pct(x: number, digits = 0): string {
	return `${(x * 100).toFixed(digits)}%`;
}

export function one(x: number): string {
	return (Math.round(x * 10) / 10).toFixed(1);
}

export function plural(n: number, one: string, many: string): string {
	return n === 1 ? one : many;
}
