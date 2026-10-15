import { Schema } from 'mongoose';
import { NoticeCategory, NoticeStatus, NoticeTopic } from '../libs/enums/notice.enum';

const NoticeSchema = new Schema(
	{
		noticeCategory: {
			type: String,
			enum: NoticeCategory,
			required: true,
		},

		noticeStatus: {
			type: String,
			enum: NoticeStatus,
			default: NoticeStatus.ACTIVE,
		},

		noticeTopic: {
			type: String,
			enum: NoticeTopic,
			default: NoticeTopic.GENERAL,
		},

		noticeTitle: {
			type: String,
			required: true,
		},

		noticeContent: {
			type: String,
			required: true,
		},

		// Team name shown as the author on the CS page (e.g. "Customer Care")
		noticeTeam: {
			type: String,
		},

		// Optional in-site link such as /product
		noticeLink: {
			type: String,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'notices' },
);

NoticeSchema.index({ noticeCategory: 1, noticeStatus: 1, createdAt: -1 });

export default NoticeSchema;
