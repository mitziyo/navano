import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Max, Min } from 'class-validator';
import type { ObjectId } from 'mongoose';
import { InquiryStatus, InquiryType } from '../../enums/inquiry.enum';

@InputType()
export class InquiryInput {
	@IsNotEmpty()
	@Field(() => InquiryType)
	inquiryType!: InquiryType;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	inquiryTitle!: string;

	@IsNotEmpty()
	@Length(10, 2000)
	@Field(() => String)
	inquiryContent!: string;

	memberId?: ObjectId;
}

@InputType()
export class InquiriesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Max(100)
	@Field(() => Int)
	limit!: number;
}

@InputType()
class AIISearch {
	@IsOptional()
	@Field(() => InquiryStatus, { nullable: true })
	inquiryStatus?: InquiryStatus;

	@IsOptional()
	@Field(() => InquiryType, { nullable: true })
	inquiryType?: InquiryType;
}

@InputType()
export class AllInquiriesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Max(100)
	@Field(() => Int)
	limit!: number;

	// Accepted for the shared admin list helpers; inquiries are always newest first
	@IsOptional()
	@IsIn(['createdAt'])
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsNotEmpty()
	@Field(() => AIISearch)
	search!: AIISearch;
}

@InputType()
export class InquiryAnswerInput {
	@IsNotEmpty()
	@Field(() => String)
	_id!: ObjectId;

	@IsNotEmpty()
	@Length(2, 3000)
	@Field(() => String)
	inquiryAnswer!: string;
}
