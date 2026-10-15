import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';
import { InquiryService } from './inquiry.service';
import { Inquiries, Inquiry } from '../../libs/dto/inquiry/inquiry';
import {
	AllInquiriesInquiry,
	InquiriesInquiry,
	InquiryAnswerInput,
	InquiryInput,
} from '../../libs/dto/inquiry/inquiry.input';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class InquiryResolver {
	constructor(private readonly inquiryService: InquiryService) {}

	/** MEMBER **/

	@UseGuards(AuthGuard)
	@Mutation(() => Inquiry)
	public async createInquiry(
		@Args('input') input: InquiryInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Inquiry> {
		console.log('Mutation: createInquiry');
		return await this.inquiryService.createInquiry(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Inquiries)
	public async getMyInquiries(
		@Args('input') input: InquiriesInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Inquiries> {
		console.log('Query: getMyInquiries');
		return await this.inquiryService.getMyInquiries(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Inquiry)
	public async removeInquiry(
		@Args('inquiryId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Inquiry> {
		console.log('Mutation: removeInquiry');
		return await this.inquiryService.removeInquiry(memberId, shapeIntoMongoObjectId(input) as ObjectId);
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Inquiries)
	public async getAllInquiriesByAdmin(@Args('input') input: AllInquiriesInquiry): Promise<Inquiries> {
		console.log('Query: getAllInquiriesByAdmin');
		return await this.inquiryService.getAllInquiriesByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Inquiry)
	public async answerInquiryByAdmin(
		@Args('input') input: InquiryAnswerInput,
		@AuthMember('_id') adminId: ObjectId,
	): Promise<Inquiry> {
		console.log('Mutation: answerInquiryByAdmin');
		input._id = shapeIntoMongoObjectId(input._id) as ObjectId;
		return await this.inquiryService.answerInquiryByAdmin(adminId, input);
	}
}
