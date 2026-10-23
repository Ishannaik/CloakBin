/**
 * MongoDB account store. Shares the paste adapter's mongoose connection.
 */
import mongoose, { Schema, type Model } from 'mongoose';
import { nanoid } from 'nanoid';
import { connectDB } from '../adapters/mongodb';
import type { Result } from '../types';
import type { AccountStore, Invite, Session, User } from './types';

interface UserDoc {
	_id: string;
	username: string;
	passwordHash: string;
	createdAt: Date;
	lastLoginAt: Date | null;
}
interface SessionDoc {
	_id: string; // token hash
	userId: string;
	expiresAt: Date;
}
interface InviteDoc {
	_id: string;
	tokenHash: string;
	createdAt: Date;
	expiresAt: Date;
}

const userSchema = new Schema<UserDoc>(
	{
		_id: { type: String, required: true },
		username: { type: String, required: true },
		passwordHash: { type: String, required: true },
		createdAt: { type: Date, required: true },
		lastLoginAt: { type: Date, default: null }
	},
	{ timestamps: false, versionKey: false }
);
userSchema.index({ username: 1 }, { unique: true });

const sessionSchema = new Schema<SessionDoc>(
	{
		_id: { type: String, required: true },
		userId: { type: String, required: true },
		expiresAt: { type: Date, required: true }
	},
	{ timestamps: false, versionKey: false }
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1 });

const inviteSchema = new Schema<InviteDoc>(
	{
		_id: { type: String, required: true },
		tokenHash: { type: String, required: true },
		createdAt: { type: Date, required: true },
		expiresAt: { type: Date, required: true }
	},
	{ timestamps: false, versionKey: false }
);
inviteSchema.index({ tokenHash: 1 }, { unique: true });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

function model<T>(name: string, schema: Schema<T>): Model<T> {
	return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}
const Users = () => model('CloakUser', userSchema);
const Sessions = () => model('CloakSession', sessionSchema);
const Invites = () => model('CloakInvite', inviteSchema);

// WHY: the shared connection runs with autoIndex off, so build these indexes
// once per process. The unique username index is what makes createUser race-safe.
let indexesReady: Promise<void> | null = null;
async function ready(): Promise<void> {
	await connectDB();
	if (!indexesReady) {
		indexesReady = Promise.all([
			Users().createIndexes(),
			Sessions().createIndexes(),
			Invites().createIndexes()
		])
			.then(() => undefined)
			.catch((error) => {
				indexesReady = null;
				throw error;
			});
	}
	return indexesReady;
}

const toUser = (d: UserDoc): User => ({
	id: d._id,
	username: d.username,
	passwordHash: d.passwordHash,
	createdAt: d.createdAt,
	lastLoginAt: d.lastLoginAt ?? null
});
const toInvite = (d: InviteDoc): Invite => ({
	id: d._id,
	tokenHash: d.tokenHash,
	createdAt: d.createdAt,
	expiresAt: d.expiresAt
});

async function attempt<T>(label: string, fn: () => Promise<T>): Promise<Result<T>> {
	try {
		await ready();
		return { success: true, data: await fn() };
	} catch (error) {
		console.error(`MongoDB accounts ${label} error:`, error);
		return { success: false, error: `Failed to ${label}` };
	}
}

export class MongoAccountStore implements AccountStore {
	async createUser(input: { username: string; passwordHash: string }): Promise<Result<User>> {
		try {
			await ready();
			const doc: UserDoc = {
				_id: nanoid(12),
				username: input.username,
				passwordHash: input.passwordHash,
				createdAt: new Date(),
				lastLoginAt: null
			};
			await Users().create(doc);
			return { success: true, data: toUser(doc) };
		} catch (error) {
			if ((error as { code?: number }).code === 11000) {
				return { success: false, error: 'username_taken' };
			}
			console.error('MongoDB accounts create user error:', error);
			return { success: false, error: 'Failed to create user' };
		}
	}

	getUserById(id: string) {
		return attempt('get user', async () => {
			const d = await Users().findById(id).lean<UserDoc>();
			return d ? toUser(d) : null;
		});
	}

	getUserByUsername(username: string) {
		return attempt('get user', async () => {
			const d = await Users().findOne({ username }).lean<UserDoc>();
			return d ? toUser(d) : null;
		});
	}

	listUsers() {
		return attempt('list users', async () => {
			const docs = await Users().find().sort({ createdAt: -1 }).lean<UserDoc[]>();
			return docs.map(toUser);
		});
	}

	deleteUser(id: string) {
		return attempt('delete user', async () => {
			await Sessions().deleteMany({ userId: id });
			await Users().deleteOne({ _id: id });
		});
	}

	touchLogin(id: string, at: Date) {
		return attempt('update last login', async () => {
			await Users().updateOne({ _id: id }, { $set: { lastLoginAt: at } });
		});
	}

	createSession(session: Session) {
		return attempt('create session', async () => {
			await Sessions().create({
				_id: session.tokenHash,
				userId: session.userId,
				expiresAt: session.expiresAt
			});
		});
	}

	getSession(tokenHash: string) {
		return attempt('get session', async () => {
			// The TTL monitor runs about once a minute, so filter on expiry too.
			const d = await Sessions()
				.findOne({ _id: tokenHash, expiresAt: { $gt: new Date() } })
				.lean<SessionDoc>();
			return d ? { tokenHash: d._id, userId: d.userId, expiresAt: d.expiresAt } : null;
		});
	}

	deleteSession(tokenHash: string) {
		return attempt('delete session', async () => {
			await Sessions().deleteOne({ _id: tokenHash });
		});
	}

	createInvite(invite: Invite) {
		return attempt('create invite', async () => {
			await Invites().create({
				_id: invite.id,
				tokenHash: invite.tokenHash,
				createdAt: invite.createdAt,
				expiresAt: invite.expiresAt
			});
		});
	}

	findInvite(tokenHash: string) {
		return attempt('find invite', async () => {
			const d = await Invites()
				.findOne({ tokenHash, expiresAt: { $gt: new Date() } })
				.lean<InviteDoc>();
			return d ? toInvite(d) : null;
		});
	}

	consumeInvite(tokenHash: string) {
		return attempt('use invite', async () => {
			const d = await Invites()
				.findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } })
				.lean<InviteDoc>();
			return d ? toInvite(d) : null;
		});
	}

	listInvites() {
		return attempt('list invites', async () => {
			const docs = await Invites()
				.find({ expiresAt: { $gt: new Date() } })
				.sort({ createdAt: -1 })
				.lean<InviteDoc[]>();
			return docs.map(toInvite);
		});
	}

	deleteInvite(id: string) {
		return attempt('delete invite', async () => {
			await Invites().deleteOne({ _id: id });
		});
	}
}
