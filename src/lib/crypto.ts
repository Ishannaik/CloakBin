/**
 * CloakBin Crypto Utilities
 * Zero-knowledge encryption using Web Crypto API (AES-256-GCM)
 *
 * The key is generated client-side and stored in the URL fragment (#)
 * Server never sees the plaintext or the key
 */

/**
 * Convert Uint8Array to base64 string without stack overflow
 * Uses chunked approach to avoid exceeding call stack size with large data
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
	const CHUNK_SIZE = 0x8000; // 32KB chunks
	let result = '';
	for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
		const chunk = bytes.subarray(i, i + CHUNK_SIZE);
		result += String.fromCharCode.apply(null, chunk as unknown as number[]);
	}
	return btoa(result);
}

/**
 * Generate a random AES-256-GCM encryption key
 * This key is generated client-side and will be stored in the URL fragment
 *
 * @returns CryptoKey that can be used for encryption/decryption
 */
export async function generateKey(): Promise<CryptoKey> {
	return await crypto.subtle.generateKey(
		{
			name: 'AES-GCM',
			length: 256
		},
		true, // extractable: true (we need to export it to base64 for URL)
		['encrypt', 'decrypt']
	);
}

/**
 * Encrypt plaintext using AES-256-GCM
 * The IV (Initialization Vector) is prepended to the ciphertext
 *
 * @param plaintext - The text to encrypt
 * @param key - The CryptoKey to use for encryption
 * @returns Base64-encoded string containing IV + ciphertext
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
	// Generate a random 12-byte IV (Initialization Vector)
	const iv = crypto.getRandomValues(new Uint8Array(12));

	// Encode plaintext to bytes
	const encoder = new TextEncoder();
	const data = encoder.encode(plaintext);

	// Encrypt the data
	const ciphertext = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv: iv
		},
		key,
		data
	);

	// Concatenate IV + ciphertext (IV is needed for decryption)
	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ciphertext), iv.length);

	// Convert to base64 for storage (using chunked approach to avoid stack overflow)
	return uint8ArrayToBase64(combined);
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Expects the IV to be prepended to the ciphertext
 *
 * @param ciphertext - Base64-encoded string containing IV + ciphertext
 * @param key - The CryptoKey to use for decryption
 * @returns Decrypted plaintext string
 */
export async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
	// Decode base64 to bytes
	const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

	// Extract IV (first 12 bytes) and ciphertext (remaining bytes)
	const iv = combined.slice(0, 12);
	const data = combined.slice(12);

	// Decrypt the data
	const plaintext = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv: iv
		},
		key,
		data
	);

	// Decode bytes to string
	const decoder = new TextDecoder();
	return decoder.decode(plaintext);
}

/**
 * Export CryptoKey to URL-safe base64 string
 * Uses base64url encoding (replaces + with -, / with _, removes =)
 *
 * @param key - The CryptoKey to export
 * @returns URL-safe base64 string representation of the key
 */
export async function keyToBase64(key: CryptoKey): Promise<string> {
	// Export the key as raw bytes
	const keyData = await crypto.subtle.exportKey('raw', key);

	// Convert to base64
	const keyArray = new Uint8Array(keyData);
	const base64 = btoa(String.fromCharCode(...keyArray));

	// Convert to URL-safe base64url format
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Import CryptoKey from URL-safe base64 string
 * Reverses the base64url encoding back to standard base64, then imports the key
 *
 * @param base64 - URL-safe base64 string representation of the key
 * @returns CryptoKey that can be used for encryption/decryption
 */
export async function base64ToKey(base64: string): Promise<CryptoKey> {
	// Convert from base64url to standard base64
	let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');

	// Add padding if needed
	const padding = (4 - (standardBase64.length % 4)) % 4;
	standardBase64 += '='.repeat(padding);

	// Decode base64 to bytes
	const keyData = Uint8Array.from(atob(standardBase64), (c) => c.charCodeAt(0));

	// Import the key
	return await crypto.subtle.importKey(
		'raw',
		keyData,
		{
			name: 'AES-GCM',
			length: 256
		},
		true, // extractable
		['encrypt', 'decrypt']
	);
}

/**
 * Generate random salt for PBKDF2 key derivation
 * @returns Base64-encoded salt string
 */
export function generateSalt(): string {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	return btoa(String.fromCharCode(...salt));
}

/**
 * Derive encryption key from password using PBKDF2
 * This is used for password-protected pastes instead of random key generation
 *
 * @param password - User's password
 * @param saltBase64 - Base64-encoded salt
 * @returns CryptoKey for encryption/decryption
 */
export async function deriveKeyFromPassword(
	password: string,
	saltBase64: string
): Promise<CryptoKey> {
	// Decode salt from base64
	const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));

	// Import password as key material
	const encoder = new TextEncoder();
	const passwordKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveBits', 'deriveKey']
	);

	// Derive AES key from password
	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: 100000,
			hash: 'SHA-256'
		},
		passwordKey,
		{ name: 'AES-GCM', length: 256 },
		true,
		['encrypt', 'decrypt']
	);
}
