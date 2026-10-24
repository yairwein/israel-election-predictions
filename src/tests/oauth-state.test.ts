import { describe, it, expect } from 'vitest';
import { signState, readState } from '../lib/server/google';

const secret = 'test-secret-test-secret';
describe('signed OAuth state', () => {
	it('round-trips the return path', () => {
		expect(readState(signState('/results', secret), secret)).toBe('/results');
	});
	it('rejects tampering, another secret and expiry', () => {
		const s = signState('/predict', secret);
		const [p, sig] = s.split('.');
		const forged = Buffer.from(JSON.stringify({ b: '//evil.example', e: 9e9, n: 'x' })).toString('base64url');
		expect(readState(`${forged}.${sig}`, secret)).toBeNull();
		expect(readState(s, 'other-secret-other-secret')).toBeNull();
		expect(readState(s, secret, Date.now() + 16 * 60_000)).toBeNull();
		expect(readState(`${p}`, secret)).toBeNull();
		expect(readState(null, secret)).toBeNull();
	});
	it('only returns same-site paths', () => {
		expect(readState(signState('https://evil.example/x', secret), secret)).toBe('/predict');
		expect(readState(signState('//evil.example', secret), secret)).toBe('/predict');
	});
});
