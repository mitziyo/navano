import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';
import { NoticeService } from './notice.service';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import { AllNoticesInquiry, NoticeInput, NoticesInquiry } from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class NoticeResolver {
	constructor(private readonly noticeService: NoticeService) {}

	/** PUBLIC **/

	@Query(() => Notices)
	public async getNotices(@Args('input') input: NoticesInquiry): Promise<Notices> {
		console.log('Query: getNotices');
		return await this.noticeService.getNotices(input);
	}

	@Query(() => Notice)
	public async getNotice(@Args('noticeId') input: string): Promise<Notice> {
		console.log('Query: getNotice');
		return await this.noticeService.getNotice(shapeIntoMongoObjectId(input) as ObjectId);
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Notice)
	public async createNotice(@Args('input') input: NoticeInput, @AuthMember('_id') memberId: ObjectId): Promise<Notice> {
		console.log('Mutation: createNotice');
		return await this.noticeService.createNotice(memberId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Notice)
	public async updateNotice(@Args('input') input: NoticeUpdate): Promise<Notice> {
		console.log('Mutation: updateNotice');
		input._id = shapeIntoMongoObjectId(input._id) as ObjectId;
		return await this.noticeService.updateNotice(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Notice)
	public async removeNotice(@Args('noticeId') input: string): Promise<Notice> {
		console.log('Mutation: removeNotice');
		return await this.noticeService.removeNotice(shapeIntoMongoObjectId(input) as ObjectId);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Notices)
	public async getAllNoticesByAdmin(@Args('input') input: AllNoticesInquiry): Promise<Notices> {
		console.log('Query: getAllNoticesByAdmin');
		return await this.noticeService.getAllNoticesByAdmin(input);
	}
}
