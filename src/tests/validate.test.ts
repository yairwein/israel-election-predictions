import { describe, it, expect } from 'vitest';
import { validateSeats, cleanNickname, nicknameKey, isCountable } from '../lib/validate';
import { POLL_AVERAGE } from '../lib/parties';

describe('validateSeats', () => {
	it('accepts the poll average', () => {
		expect(validateSeats(POLL_AVERAGE).ok).toBe(true);
	});
	it('rejects wrong totals, sub-threshold, unknown parties and bad values', () => {
		expect(validateSeats({ ...POLL_AVERAGE, likud: 25 })).toEqual({ ok: false, error: 'total_not_120' });
		expect(validateSeats({ ...POLL_AVERAGE, likud: 21, amcha: 3 })).toEqual({ ok: false, error: 'below_threshold' });
		expect(validateSeats({ ...POLL_AVERAGE, foo: 1 })).toEqual({ ok: false, error: 'unknown_party' });
		expect(validateSeats({ ...POLL_AVERAGE, likud: 23.5 })).toEqual({ ok: false, error: 'invalid_value' });
		expect(validateSeats({ ...POLL_AVERAGE, likud: -1 })).toEqual({ ok: false, error: 'invalid_value' });
		expect(validateSeats({ ...POLL_AVERAGE, likud: 41, yashar: 4 })).toEqual({ ok: false, error: 'above_max' });
		expect(validateSeats({ ...POLL_AVERAGE, likud: 40, yashar: 5 }).ok).toBe(true);
		expect(validateSeats(null).ok).toBe(false);
		expect(validateSeats([1, 2]).ok).toBe(false);
	});
	it('treats missing parties as zero', () => {
		const { amcha, reservists, haredi, ...rest } = POLL_AVERAGE;
		expect(validateSeats(rest).ok).toBe(true);
	});
});

describe('nicknames', () => {
	it('accepts Hebrew and English', () => {
		expect(cleanNickname('  שועל   ממולח 42 ')).toBe('שועל ממולח 42');
		expect(cleanNickname('Yair_W')).toBe('Yair_W');
	});
	it('rejects bad input', () => {
		expect(cleanNickname('a')).toBeNull();
		expect(cleanNickname('x'.repeat(25))).toBeNull();
		expect(cleanNickname('<script>')).toBeNull();
		expect(cleanNickname('---')).toBeNull();
		expect(cleanNickname(5)).toBeNull();
	});
	it('keys are case-insensitive', () => {
		expect(nicknameKey('Yair  W')).toBe(nicknameKey('yair w'));
	});
});

describe('isCountable', () => {
	it('counts valid predictions and leaves out ones that break the rules', () => {
		expect(isCountable({ seats: POLL_AVERAGE, turnout: 70 })).toBe(true);
		expect(isCountable({ seats: POLL_AVERAGE, turnout: null })).toBe(true);
		const all120 = Object.fromEntries(Object.keys(POLL_AVERAGE).map((k) => [k, 0]));
		all120.haredi = 120;
		expect(isCountable({ seats: all120 })).toBe(false);
		expect(isCountable({ seats: POLL_AVERAGE, turnout: 95 })).toBe(false);
	});
});
