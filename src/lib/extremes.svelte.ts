/**
 * Whether the averages include extreme predictions. Default: no (trimmed means).
 * One shared choice across pages, remembered on the device.
 */
const KEY = 'include_extremes';

export const extremes = $state<{ include: boolean }>({ include: false });

export function setIncludeExtremes(v: boolean) {
	extremes.include = v;
	try {
		localStorage.setItem(KEY, v ? '1' : '0');
	} catch {
		/* private mode */
	}
}

export function restoreExtremes() {
	try {
		extremes.include = localStorage.getItem(KEY) === '1';
	} catch {
		/* private mode */
	}
}
