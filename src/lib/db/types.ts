/**
 * CloakBin Database Types & Adapter Interface
 * Adapter pattern allows swapping database implementations
 */

export interface Paste {
	id: string;
	content: string; // encrypted ciphertext
	createdAt: Date;
	expiresAt: Date;
	// Privacy: No viewCount tracking - zero-knowledge principle
	hasPassword: boolean; // true if password-protected
	salt: string | null; // PBKDF2 salt (null if no password)
	burnAfterRead: boolean; // true if delete after first view
	language: string; // detected language (e.g., "javascript", "python", "plaintext")
}

export interface CreatePasteInput {
	content: string;
	expiresAt: Date;
	hasPassword?: boolean;
	salt?: string | null;
	burnAfterRead?: boolean;
	language?: string;
}

export type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface DatabaseAdapter {
	createPaste(input: CreatePasteInput): Promise<Result<{ id: string }>>;
	getPaste(id: string): Promise<Result<Paste | null>>;
	deletePaste(id: string): Promise<Result<void>>;
	cleanupExpired(): Promise<Result<{ deleted: number }>>;
	healthCheck(): Promise<Result<void>>;
}

// ============================================
// Admin Types (for admin dashboard)
// ============================================

export interface AdminPasteStats {
	total: number;
	today: number;
	withPassword: number;
	burnAfterRead: number;
	totalSizeBytes: number;
	avgSizeBytes: number;
}

export interface PasteListItem {
	id: string;
	createdAt: Date;
	expiresAt: Date;
	hasPassword: boolean;
	burnAfterRead: boolean;
	sizeBytes: number;
}

export interface PasteListOptions {
	page?: number;
	limit?: number;
	hasPassword?: boolean;
	burnAfterRead?: boolean;
	search?: string;
	sortBy?: 'createdAt' | 'expiresAt';
	sortOrder?: 'asc' | 'desc';
}

export interface DailyCount {
	date: string;
	count: number;
}

/**
 * Extended adapter for admin operations
 * Adds stats, listing, and bulk operations
 */
export interface AdminAdapter extends DatabaseAdapter {
	// Stats for dashboard
	getPasteStats(): Promise<Result<AdminPasteStats>>;
	getDailyPasteCounts(days: number): Promise<Result<DailyCount[]>>;

	// Paste list (metadata only - zero knowledge)
	listPastes(
		options: PasteListOptions
	): Promise<Result<{ pastes: PasteListItem[]; total: number }>>;

	// Bulk operations
	deletePastes(ids: string[]): Promise<Result<{ deleted: number }>>;
}
