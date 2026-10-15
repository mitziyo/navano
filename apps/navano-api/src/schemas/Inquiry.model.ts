import { Schema } from 'mongoose';
import { InquiryStatus, InquiryType } from '../libs/enums/inquiry.enum';

// 1:1 question from a member to the Navano team, answered by an admin
const InquirySchema = new Schema(
	{
		inquiryType: {
			type: String,
			enum: InquiryType,
			required: true,
		},

		inquiryStatus: {
			type: String,
			enum: InquiryStatus,
			default: InquiryStatus.WAIT,
		},

		inquiryTitle: {
			type: String,
			required: true,
		},

		inquiryContent: {
			type: String,
			required: true,
		},

		inquiryAnswer: {
			type: String,
		},

		answeredAt: {
			type: Date,
		},

		answeredBy: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'inquiries' },
);

InquirySchema.index({ memberId: 1, createdAt: -1 });
InquirySchema.index({ inquiryStatus: 1, createdAt: -1 });

export default InquirySchema;
