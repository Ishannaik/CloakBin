import { describe, expect, it } from 'vitest';

import { detectLanguage } from './detectLanguage';

describe('detectLanguage', () => {
	const cases = [
		{
			name: 'JavaScript',
			code: `
				function greet(name) {
					const message = \`Hello, \${name}!\`;
					console.log(message);
					return message;
				}
			`,
			expected: 'javascript'
		},
		{
			name: 'Python',
			code: `
				def greet(name: str) -> str:
					message = f"Hello, {name}!"
					print(message)
					return message
			`,
			expected: 'python'
		},
		{
			name: 'JSON',
			code: `
				{
					"name": "cloakbin",
					"private": true,
					"features": ["encrypted", "pastebin"]
				}
			`,
			expected: 'json'
		},
		{
			name: 'Rust',
			code: `
				fn main() {
					let values: Vec<i32> = vec![1, 2, 3];
					for value in values.iter() {
						println!("value={}", value);
					}
				}
			`,
			expected: 'rust'
		}
	];

	it.each(cases)('detects $name snippets', ({ code, expected }) => {
		expect(detectLanguage(code)).toBe(expected);
	});

	it('falls back to plaintext for empty or low-confidence input', () => {
		expect(detectLanguage('')).toBe('plaintext');
		expect(detectLanguage('   \n\t')).toBe('plaintext');
		expect(detectLanguage('just a short sentence without code')).toBe('plaintext');
	});
});
