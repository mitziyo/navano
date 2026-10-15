import { Field, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { InquiryStatus, InquiryType } from '../../enums/inquiry.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Inquiry {
	@Field(() => String)
	_id!: ObjectId;

	@Field(() => InquiryType)
	inquiryType!: InquiryType;

	@Field(() => InquiryStatus)
	inquiryStatus!: InquiryStatus;

	@Field(() => String)
	inquiryTitle!: string;

	@Field(() => String)
	inquiryContent!: string;

	@Field(() => String, { nullable: true })
	inquiryAnswer?: string;

	@Field(() => Date, { nullable: true })
	answeredAt?: Date;

	@Field(() => String, { nullable: true })
	answeredBy?: ObjectId;

	@Field(() => String)
	memberId!: ObjectId;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;

	/** from aggregation (admin inbox) **/

	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class Inquiries {
	@Field(() => [Inquiry])
	list!: Inquiry[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter!: TotalCounter[];
}
