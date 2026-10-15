import { Field, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { NoticeCategory, NoticeStatus, NoticeTopic } from '../../enums/notice.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Notice {
	@Field(() => String)
	_id!: ObjectId;

	@Field(() => NoticeCategory)
	noticeCategory!: NoticeCategory;

	@Field(() => NoticeStatus)
	noticeStatus!: NoticeStatus;

	@Field(() => NoticeTopic)
	noticeTopic!: NoticeTopic;

	@Field(() => String)
	noticeTitle!: string;

	@Field(() => String)
	noticeContent!: string;

	@Field(() => String, { nullable: true })
	noticeTeam?: string;

	@Field(() => String, { nullable: true })
	noticeLink?: string;

	@Field(() => String)
	memberId!: ObjectId;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;

	/** from aggregation **/

	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class Notices {
	@Field(() => [Notice])
	list!: Notice[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter!: TotalCounter[];
}
