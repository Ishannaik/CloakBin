/**
 * CloakBin Database Types & Adapter Interface
 * Adapter pattern allows swapping database implementations
 */

// TODO: Add zod dependency: pnpm add zod

// TODO: Define Zod schemas for input validation
// - CreatePasteInput: content (string, max 10MB), expiresAt (Date)
// - Paste: id, content, createdAt, expiresAt (no viewCount for privacy)

// TODO: Define Result type for consistent error handling
// - { success: true, data: T } or { success: false, error: string }

// TODO: Define DatabaseAdapter interface
// - createPaste(input): Promise<Result<{ id: string }>>
// - getPaste(id): Promise<Result<Paste | null>>
// - deletePaste(id): Promise<Result<void>>
// - cleanupExpired(): Promise<Result<{ deleted: number }>>
// - healthCheck(): Promise<Result<void>>

export interface Paste {
	id: string;
	content: string; // encrypted ciphertext
	createdAt: Date;
	expiresAt: Date;
	// Privacy: No viewCount tracking - zero-knowledge principle
	hasPassword: boolean;      // true if password-protected
	salt: string | null;       // PBKDF2 salt (null if no password)
	burnAfterRead: boolean;    // true if delete after first view
}

export interface CreatePasteInput {
	content: string;
	expiresAt: Date;
	// NEW FIELDS:
	hasPassword?: boolean;
	salt?: string | null;
	burnAfterRead?: boolean;
}

export type Result<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export interface DatabaseAdapter {
	createPaste(input: CreatePasteInput): Promise<Result<{ id: string }>>;
	getPaste(id: string): Promise<Result<Paste | null>>;
	deletePaste(id: string): Promise<Result<void>>;
	cleanupExpired(): Promise<Result<{ deleted: number }>>;
	healthCheck(): Promise<Result<void>>;
}
