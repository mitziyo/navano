import { Schema } from 'mongoose';

// One refresh token per logged-in device; only its sha256 hash is stored
const SessionSchema = new Schema(
	{
		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		tokenHash: {
			type: String,
			required: true,
			unique: true,
		},

		expiresAt: {
			type: Date,
			required: true,
		},
	},
	{ timestamps: true, collection: 'sessions' },
);

// Mongo removes a session once it expires
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default SessionSchema;
