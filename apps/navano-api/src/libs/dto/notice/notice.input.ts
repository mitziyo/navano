import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Matches, Max, Min } from 'class-validator';
import type { ObjectId } from 'mongoose';
import { NoticeCategory, NoticeStatus, NoticeTopic } from '../../enums/notice.enum';

// In-site paths only (e.g. /product?input=...), never external URLs
export const NOTICE_LINK_PATTERN = /^\/[^\s]*$/;

@InputType()
export class NoticeInput {
	@IsNotEmpty()
	@Field(() => NoticeCategory)
	noticeCategory!: NoticeCategory;

	@IsOptional()
	@Field(() => NoticeTopic, { nullable: true })
	noticeTopic?: NoticeTopic;

	@IsOptional()
	@Field(() => NoticeStatus, { nullable: true })
	noticeStatus?: NoticeStatus;

	@IsNotEmpty()
	@Length(3, 150)
	@Field(() => String)
	noticeTitle!: string;

	@IsNotEmpty()
	@Length(3, 3000)
	@Field(() => String)
	noticeContent!: string;

	@IsOptional()
	@Length(2, 50)
	@Field(() => String, { nullable: true })
	noticeTeam?: string;

	@IsOptional()
	@Matches(NOTICE_LINK_PATTERN)
	@Length(1, 300)
	@Field(() => String, { nullable: true })
	noticeLink?: string;

	memberId?: ObjectId;
}

@InputType()
class NISearch {
	@IsNotEmpty()
	@Field(() => NoticeCategory)
	noticeCategory!: NoticeCategory;

	@IsOptional()
	@Field(() => NoticeTopic, { nullable: true })
	noticeTopic?: NoticeTopic;

	@IsOptional()
	@Length(1, 100)
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class NoticesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Max(100)
	@Field(() => Int)
	limit!: number;

	@IsNotEmpty()
	@Field(() => NISearch)
	search!: NISearch;
}

@InputType()
class ANISearch {
	@IsOptional()
	@Field(() => NoticeCategory, { nullable: true })
	noticeCategory?: NoticeCategory;

	@IsOptional()
	@Field(() => NoticeStatus, { nullable: true })
	noticeStatus?: NoticeStatus;

	@IsOptional()
	@Length(1, 100)
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class AllNoticesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Max(100)
	@Field(() => Int)
	limit!: number;

	@IsOptional()
	@IsIn(['createdAt', 'updatedAt', 'noticeTitle'])
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsNotEmpty()
	@Field(() => ANISearch)
	search!: ANISearch;
}
