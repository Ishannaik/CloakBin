/**
 * MongoDB Adapter for CloakBin
 * Production database implementation
 */

import { env } from '$env/dynamic/private';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { nanoid } from 'nanoid';
import type { DatabaseAdapter, CreatePasteInput, Paste, Result } from '../types';

// Mongoose document interface
interface PasteDocument extends Document {
	_id: string;
	content: string;
	createdAt: Date;
	expiresAt: Date;
	hasPassword: boolean;
	salt: string | null;
	burnAfterRead: boolean;
}

// Mongoose schema
const pasteSchema = new Schema<PasteDocument>(
	{
		_id: { type: String, required: true }, // Use nanoid as _id
		content: { type: String, required: true },
		createdAt: { type: Date, default: Date.now },
		expiresAt: { type: Date, required: true },
		hasPassword: { type: Boolean, default: false },
		salt: { type: String, default: null },
		burnAfterRead: { type: Boolean, default: false }
	},
	{
		// TTL index: MongoDB automatically deletes documents when expiresAt is reached
		timestamps: false
	}
);

// Create TTL index for automatic expiry (using expireAfterSeconds: 0 means delete when expiresAt is reached)
pasteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Model (lazy initialization to avoid issues with hot reloading)
let PasteModel: Model<PasteDocument>;

function getModel(): Model<PasteDocument> {
	if (!PasteModel) {
		// Check if model already exists (hot reload scenario)
		// Using 'CloakPaste' to avoid conflicts with old collections
		PasteModel = mongoose.models.CloakPaste || mongoose.model<PasteDocument>('CloakPaste', pasteSchema);
	}
	return PasteModel;
}

// Connection state
let isConnected = false;

async function connectDB(): Promise<void> {
	if (isConnected) return;

	const uri = env.MONGODB_URI;
	if (!uri) {
		throw new Error('MONGODB_URI environment variable is not set');
	}

	try {
		await mongoose.connect(uri);
		isConnected = true;
		console.log('MongoDB connected');
	} catch (error) {
		console.error('MongoDB connection error:', error);
		throw error;
	}
}

export class MongoDBAdapter implements DatabaseAdapter {
	async createPaste(input: CreatePasteInput): Promise<Result<{ id: string }>> {
		try {
			await connectDB();
			const Model = getModel();

			const id = nanoid(8);
			const paste = new Model({
				_id: id,
				content: input.content,
				createdAt: new Date(),
				expiresAt: input.expiresAt,
				hasPassword: input.hasPassword ?? false,
				salt: input.salt ?? null,
				burnAfterRead: input.burnAfterRead ?? false
			});

			await paste.save();
			return { success: true, data: { id } };
		} catch (error) {
			console.error('MongoDB createPaste error:', error);
			return { success: false, error: 'Failed to create paste' };
		}
	}

	async getPaste(id: string): Promise<Result<Paste | null>> {
		try {
			await connectDB();
			const Model = getModel();

			const doc = await Model.findById(id);

			if (!doc) {
				return { success: true, data: null };
			}

			// Check if expired (TTL index should handle this, but double-check)
			const now = new Date();
			if (doc.expiresAt < now) {
				await Model.findByIdAndDelete(id);
				return { success: true, data: null };
			}

			// Convert to Paste type
			// NOTE: Do NOT delete burn-after-read pastes here!
			// The client shows a warning first, then calls DELETE explicitly after user confirms.
			const paste: Paste = {
				id: doc._id,
				content: doc.content,
				createdAt: doc.createdAt,
				expiresAt: doc.expiresAt,
				hasPassword: doc.hasPassword,
				salt: doc.salt,
				burnAfterRead: doc.burnAfterRead
			};

			return { success: true, data: paste };
		} catch (error) {
			console.error('MongoDB getPaste error:', error);
			return { success: false, error: 'Failed to get paste' };
		}
	}

	async deletePaste(id: string): Promise<Result<void>> {
		try {
			await connectDB();
			const Model = getModel();

			await Model.findByIdAndDelete(id);
			return { success: true, data: undefined };
		} catch (error) {
			console.error('MongoDB deletePaste error:', error);
			return { success: false, error: 'Failed to delete paste' };
		}
	}

	async cleanupExpired(): Promise<Result<{ deleted: number }>> {
		try {
			await connectDB();
			const Model = getModel();

			// TTL index handles this automatically, but manual cleanup is available
			const result = await Model.deleteMany({ expiresAt: { $lt: new Date() } });
			return { success: true, data: { deleted: result.deletedCount } };
		} catch (error) {
			console.error('MongoDB cleanupExpired error:', error);
			return { success: false, error: 'Failed to cleanup expired pastes' };
		}
	}

	async healthCheck(): Promise<Result<void>> {
		try {
			await connectDB();
			// Check connection state
			if (mongoose.connection.readyState === 1) {
				return { success: true, data: undefined };
			}
			return { success: false, error: 'MongoDB not connected' };
		} catch (error) {
			return { success: false, error: 'MongoDB health check failed' };
		}
	}
}
