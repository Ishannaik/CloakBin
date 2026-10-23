/**
 * Password hashing with Node's built-in scrypt (no native dependency).
 * Stored format: scrypt$N$r$p$<salt b64>$<hash b64>, so parameters can change later.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'crypto';

const N = 32768;
const R = 8;
const P = 1;
const KEY_LEN = 64;
// 128 * N * r = 32 MiB per hash; leave headroom over Node's 32 MiB default.
const MAX_MEM = 64 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)));
	});
}

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const hash = await scrypt(password, salt, KEY_LEN, { N, r: R, p: P, maxmem: MAX_MEM });
	return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [, n, r, p, saltB64, hashB64] = parts;
	const expected = Buffer.from(hashB64, 'base64');
	try {
		const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
			N: Number(n),
			r: Number(r),
			p: Number(p),
			maxmem: MAX_MEM
		});
		return actual.length === expected.length && timingSafeEqual(actual, expected);
	} catch {
		return false;
	}
}
