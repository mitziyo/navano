import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length, Matches } from 'class-validator';
import type { ObjectId } from 'mongoose';
import { NoticeCategory, NoticeStatus, NoticeTopic } from '../../enums/notice.enum';

@InputType()
export class NoticeUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id!: ObjectId;

	@IsOptional()
	@Field(() => NoticeCategory, { nullable: true })
	noticeCategory?: NoticeCategory;

	@IsOptional()
	@Field(() => NoticeTopic, { nullable: true })
	noticeTopic?: NoticeTopic;

	@IsOptional()
	@Field(() => NoticeStatus, { nullable: true })
	noticeStatus?: NoticeStatus;

	@IsOptional()
	@Length(3, 150)
	@Field(() => String, { nullable: true })
	noticeTitle?: string;

	@IsOptional()
	@Length(3, 3000)
	@Field(() => String, { nullable: true })
	noticeContent?: string;

	@IsOptional()
	@Length(2, 50)
	@Field(() => String, { nullable: true })
	noticeTeam?: string;

	// Empty string clears the link
	@IsOptional()
	@Matches(/^(\/[^\s]*)?$/)
	@Field(() => String, { nullable: true })
	noticeLink?: string;
}
