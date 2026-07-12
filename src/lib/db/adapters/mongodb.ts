/**
 * MongoDB Adapter for CloakBin
 * Production database implementation
 */

import { env } from '$env/dynamic/private';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { nanoid } from 'nanoid';
import type {
	AdminAdapter,
	AdminPasteStats,
	CreatePasteInput,
	DailyCount,
	Paste,
	PasteListItem,
	PasteListOptions,
	Result
} from '../types';

// Mongoose document interface
interface PasteDocument extends Omit<Document, '_id'> {
	_id: string;
	content: string;
	createdAt: Date;
	expiresAt: Date;
	hasPassword: boolean;
	salt: string | null;
	burnAfterRead: boolean;
	language: string;
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
		burnAfterRead: { type: Boolean, default: false },
		language: { type: String, default: 'plaintext' }
	},
	{
		// TTL index: MongoDB automatically deletes documents when expiresAt is reached
		timestamps: false
	}
);

// Create TTL index for automatic expiry (using expireAfterSeconds: 0 means delete when expiresAt is reached)
pasteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
pasteSchema.index({ createdAt: -1 }); // For default admin sort (newest first)

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

// In-flight connection promise guards against concurrent connect() calls on cold starts
let connectionPromise: Promise<void> | null = null;

async function connectDB(): Promise<void> {
	if (mongoose.connection.readyState === 1) return;
	if (connectionPromise) return connectionPromise;

	const uri = env.MONGODB_URI;
	if (!uri) {
		throw new Error('MONGODB_URI environment variable is not set');
	}

	connectionPromise = mongoose
		.connect(uri, { autoIndex: false, maxPoolSize: 10, bufferCommands: false })
		.then(async () => {
			// autoIndex is off (don't rebuild indexes on every serverless cold start).
			// Create them explicitly so the TTL (expiresAt) + createdAt indexes still exist.
			await getModel().createIndexes();
			console.log('MongoDB connected');
		})
		.catch((error) => {
			connectionPromise = null; // Allow retry on next request
			console.error('MongoDB connection error:', error);
			throw error;
		});

	return connectionPromise;
}

// Short-lived in-process cache for the expensive stats aggregation (scans all content)
type StatsCache = { data: AdminPasteStats; ts: number };
let statsCache: StatsCache | null = null;
const STATS_CACHE_TTL = 30_000; // 30 seconds

type DailyCountsCache = { data: DailyCount[]; ts: number };
const dailyCountsCache = new Map<number, DailyCountsCache>();

export class MongoDBAdapter implements AdminAdapter {
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
				burnAfterRead: input.burnAfterRead ?? false,
				language: input.language ?? 'plaintext'
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

			// PERF: .lean() bypasses Mongoose document hydration — returns a plain JS object.
			// Saves ~10-20% CPU per paste read. Safe here: we only map to a DTO, no .save() calls.
			const doc = await Model.findById(id).lean();

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
				burnAfterRead: doc.burnAfterRead,
				language: doc.language || 'plaintext'
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

	async burnPaste(id: string): Promise<Result<Paste | null>> {
		try {
			await connectDB();
			const Model = getModel();

			// Atomically find, verify burnAfterRead, and delete in one operation
			const doc = await Model.findOneAndDelete({
				_id: id,
				burnAfterRead: true,
				expiresAt: { $gt: new Date() }
			});

			if (!doc) {
				return { success: true, data: null };
			}

			const paste: Paste = {
				id: doc._id,
				content: doc.content,
				createdAt: doc.createdAt,
				expiresAt: doc.expiresAt,
				hasPassword: doc.hasPassword,
				salt: doc.salt,
				burnAfterRead: doc.burnAfterRead,
				language: doc.language || 'plaintext'
			};

			return { success: true, data: paste };
		} catch (error) {
			console.error('MongoDB burnPaste error:', error);
			return { success: false, error: 'Failed to burn paste' };
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


	// ============================================
	// Admin methods
	// ============================================

	async getPasteStats(): Promise<Result<AdminPasteStats>> {
		try {
			// Serve cached stats if fresh — the $strLenBytes aggregation scans all content
			if (statsCache && Date.now() - statsCache.ts < STATS_CACHE_TTL) {
				return { success: true, data: statsCache.data };
			}

			await connectDB();
			const Model = getModel();

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const [total, todayCount, features, storage] = await Promise.all([
				Model.countDocuments(),
				Model.countDocuments({ createdAt: { $gte: today } }),
				Model.aggregate([
					{
						$group: {
							_id: null,
							withPassword: { $sum: { $cond: ['$hasPassword', 1, 0] } },
							burnAfterRead: { $sum: { $cond: ['$burnAfterRead', 1, 0] } }
						}
					}
				]),
				Model.aggregate([
					{
						$group: {
							_id: null,
							totalSize: { $sum: { $strLenBytes: '$content' } },
							avgSize: { $avg: { $strLenBytes: '$content' } }
						}
					}
				])
			]);

			const data: AdminPasteStats = {
				total,
				today: todayCount,
				withPassword: features[0]?.withPassword || 0,
				burnAfterRead: features[0]?.burnAfterRead || 0,
				totalSizeBytes: storage[0]?.totalSize || 0,
				avgSizeBytes: Math.round(storage[0]?.avgSize || 0)
			};
			statsCache = { data, ts: Date.now() };
			return { success: true, data };
		} catch (error) {
			console.error('MongoDB getPasteStats error:', error);
			return { success: false, error: 'Failed to get paste stats' };
		}
	}

	async getDailyPasteCounts(days: number): Promise<Result<DailyCount[]>> {
		try {
			const cached = dailyCountsCache.get(days);
			if (cached && Date.now() - cached.ts < STATS_CACHE_TTL) {
				return { success: true, data: cached.data };
			}

			await connectDB();
			const Model = getModel();

			const startDate = new Date();
			startDate.setDate(startDate.getDate() - days);
			startDate.setHours(0, 0, 0, 0);

			const results = await Model.aggregate([
				{ $match: { createdAt: { $gte: startDate } } },
				{
					$group: {
						_id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
						count: { $sum: 1 }
					}
				},
				{ $sort: { _id: 1 } }
			]);

			const data = results.map((r) => ({ date: r._id, count: r.count }));
			dailyCountsCache.set(days, { data, ts: Date.now() });
			return { success: true, data };
		} catch (error) {
			console.error('MongoDB getDailyPasteCounts error:', error);
			return { success: false, error: 'Failed to get daily counts' };
		}
	}

	async listPastes(
		options: PasteListOptions
	): Promise<Result<{ pastes: PasteListItem[]; total: number }>> {
		try {
			await connectDB();
			const Model = getModel();

			const {
				page = 1,
				limit = 20,
				hasPassword,
				burnAfterRead,
				search,
				sizeMin,
				sizeMax,
				createdAfter,
				createdBefore,
				status,
				sortBy = 'createdAt',
				sortOrder = 'desc'
			} = options;

			const skip = (page - 1) * limit;
			const now = new Date();
			const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

			const filter: Record<string, unknown> = {};
			if (hasPassword !== undefined) filter.hasPassword = hasPassword;
			if (burnAfterRead !== undefined) filter.burnAfterRead = burnAfterRead;
			if (search) filter._id = { $regex: search, $options: 'i' };

			// Date filter
			if (createdAfter || createdBefore) {
				const createdAtFilter: Record<string, Date> = {};
				if (createdAfter) createdAtFilter.$gte = createdAfter;
				if (createdBefore) createdAtFilter.$lte = createdBefore;
				filter.createdAt = createdAtFilter;
			}

			// Status filter
			if (status === 'expired') {
				filter.expiresAt = { $lt: now };
			} else if (status === 'expiring') {
				filter.expiresAt = { $gte: now, $lt: in24Hours };
			} else if (status === 'active') {
				filter.expiresAt = { $gte: in24Hours };
			}

			const needsSizeFilter = sizeMin !== undefined || sizeMax !== undefined;
			const needsSizeSort = sortBy === 'encryptedSize';
			const sortDirection = sortOrder === 'asc' ? 1 : -1;
			const sortField = needsSizeSort ? 'contentSize' : sortBy;

			// PERF: never fetch content field — always use aggregation so $strLenBytes
			// computes size in-DB. When filtering/sorting by size we must compute it BEFORE
			// sort/filter; otherwise we compute it AFTER $limit (only N docs, not the whole set).
			const earlySize = needsSizeFilter || needsSizeSort;

			const basePipeline: Parameters<typeof Model.aggregate>[0] = [{ $match: filter }];

			if (earlySize) {
				basePipeline.push({
					$addFields: { contentSize: { $strLenBytes: { $ifNull: ['$content', ''] } } }
				});
				if (needsSizeFilter) {
					const sizeMatch: Record<string, unknown> = {};
					if (sizeMin !== undefined) sizeMatch.$gte = sizeMin;
					if (sizeMax !== undefined) sizeMatch.$lte = sizeMax;
					basePipeline.push({ $match: { contentSize: sizeMatch } });
				}
			}

			const countPipeline = [...basePipeline, { $count: 'total' }];

			const dataPipeline: Parameters<typeof Model.aggregate>[0] = [
				...basePipeline,
				{ $sort: { [sortField]: sortDirection as 1 | -1 } },
				{ $skip: skip },
				{ $limit: limit },
				// Compute size AFTER pagination — only runs on the N returned docs
				...(!earlySize
					? [{ $addFields: { contentSize: { $strLenBytes: { $ifNull: ['$content', ''] } } } }]
					: []),
				{
					$project: {
						_id: 1,
						createdAt: 1,
						expiresAt: 1,
						hasPassword: 1,
						burnAfterRead: 1,
						contentSize: 1
					}
				}
			];

			const [docs, countResult] = await Promise.all([
				Model.aggregate(dataPipeline),
				Model.aggregate(countPipeline)
			]);

			return {
				success: true,
				data: {
					pastes: docs.map((d) => ({
						id: d._id,
						createdAt: d.createdAt,
						expiresAt: d.expiresAt,
						hasPassword: d.hasPassword,
						burnAfterRead: d.burnAfterRead,
						sizeBytes: d.contentSize || 0
					})),
					total: countResult[0]?.total || 0
				}
			};
		} catch (error) {
			console.error('MongoDB listPastes error:', error);
			return { success: false, error: 'Failed to list pastes' };
		}
	}

	async deletePastes(ids: string[]): Promise<Result<{ deleted: number }>> {
		try {
			await connectDB();
			const Model = getModel();

			const result = await Model.deleteMany({ _id: { $in: ids } });
			return { success: true, data: { deleted: result.deletedCount } };
		} catch (error) {
			console.error('MongoDB deletePastes error:', error);
			return { success: false, error: 'Failed to delete pastes' };
		}
	}
}
